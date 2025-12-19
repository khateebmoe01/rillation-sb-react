/**
 * Backfill script to populate sequence_step_stats for all existing rows in campaign_reporting
 * 
 * This script:
 * - Fetches all rows from campaign_reporting table
 * - For each row, calls Bison APIs to get sequence step stats and copy
 * - Merges the data and strips HTML from email bodies
 * - Updates the sequence_step_stats JSONB column
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Simple .env file parser
function loadEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {}
  if (!fs.existsSync(filePath)) return env
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      env[key] = value
    }
  }
  
  return env
}

// Load environment variables from .env files
const envVars = {
  ...loadEnvFile(path.join(process.cwd(), '.env.local')),
  ...loadEnvFile(path.join(process.cwd(), '.env')),
  ...process.env
}

// Load environment variables
const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or Supabase key environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper functions
const toInt = (val: any): number => {
  if (val === undefined || val === null) return 0
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10)
    return isNaN(parsed) ? 0 : parsed
  }
  return typeof val === 'number' ? val : 0
}

const stripHtml = (html: string | null | undefined): string => {
  if (!html || typeof html !== 'string') return ''
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '')
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

// Cache for API keys by client
const apiKeyCache = new Map<string, string | null>()

async function getApiKey(clientName: string | null): Promise<string | null> {
  if (!clientName) return null

  // Check cache first
  if (apiKeyCache.has(clientName)) {
    return apiKeyCache.get(clientName) || null
  }

  try {
    const { data, error } = await supabase
      .from('Clients')
      .select('"Api Key - Bison"')
      .eq('Business', clientName)
      .single()

    if (error || !data) {
      apiKeyCache.set(clientName, null)
      return null
    }

    const apiKey = data['Api Key - Bison'] || null
    apiKeyCache.set(clientName, apiKey)
    return apiKey
  } catch (err) {
    console.error(`Exception in getApiKey for ${clientName}:`, err)
    apiKeyCache.set(clientName, null)
    return null
  }
}

async function fetchSequenceSteps(campaignId: string, apiKey: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://send.rillationrevenue.com/api/campaigns/v1.1/${campaignId}/sequence-steps`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      }
    )

    if (!res.ok) {
      // If campaign has no sequence, return empty array
      if (res.status === 400 || res.status === 404) {
        return []
      }
      console.error(`Error fetching sequence steps for campaign ${campaignId}: ${res.status}`)
      return []
    }

    const json = await res.json()
    return json.data?.sequence_steps || []
  } catch (err) {
    console.error(`Exception fetching sequence steps for campaign ${campaignId}:`, err)
    return []
  }
}

async function fetchStats(
  campaignId: string,
  apiKey: string,
  date: string,
  stepCopyMap: Record<number, any>
): Promise<any[] | null> {
  try {
    const res = await fetch(`https://send.rillationrevenue.com/api/campaigns/${campaignId}/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        start_date: date,
        end_date: date
      })
    })

    // Handle campaigns with no sequence
    if (res.status === 400) {
      const txt = await res.text()
      if (txt.includes('can only be viewed for campaigns with a sequence')) {
        return [] // Return empty array for campaigns without sequence
      }
    }

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`fetchStats error for campaign ${campaignId} (${date}): ${res.status} - ${txt}`)
    }

    const json = await res.json()
    const statsData = json.data || json

    if (!statsData || typeof statsData !== 'object') {
      return []
    }

    // Merge stats with copy (using cached stepCopyMap)
    const enrichedStats = (statsData.sequence_step_stats || []).map((stat: any) => {
      const copyData = stepCopyMap[stat.sequence_step_id] || {}
      
      return {
        sent: toInt(stat.sent),
        order: toInt(copyData.order),
        bounced: toInt(stat.bounced),
        variant: copyData.variant === true || copyData.variant === 'true',
        email_body: copyData.email_body || '',
        interested: toInt(stat.interested),
        thread_reply: copyData.thread_reply === true || copyData.thread_reply === 'true',
        unique_opens: toInt(stat.unique_opens),
        unsubscribed: toInt(stat.unsubscribed),
        wait_in_days: toInt(copyData.wait_in_days),
        email_subject: copyData.email_subject || '',
        unique_replies: toInt(stat.unique_replies),
        leads_contacted: toInt(stat.leads_contacted),
        sequence_step_id: toInt(stat.sequence_step_id)
      }
    })

    return enrichedStats
  } catch (err: any) {
    console.error(`Exception in fetchStats for campaign ${campaignId} on ${date}:`, err.message)
    throw err
  }
}

async function updateSequenceStepStats(
  rowId: number,
  sequenceStepStats: any[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('campaign_reporting')
      .update({ sequence_step_stats: sequenceStepStats })
      .eq('id', rowId)

    if (error) {
      console.error(`Error updating row ${rowId}:`, error.message)
      return false
    }

    return true
  } catch (err: any) {
    console.error(`Exception updating row ${rowId}:`, err.message)
    return false
  }
}

async function backfillSequenceStats() {
  console.log('Starting backfill of sequence_step_stats...\n')

  // Fetch all rows from campaign_reporting
  console.log('Fetching all rows from campaign_reporting...')
  const { data: rows, error: fetchError } = await supabase
    .from('campaign_reporting')
    .select('id, campaign_id, client, date')
    .order('id')

  if (fetchError) {
    console.error('Error fetching rows:', fetchError.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('No rows found in campaign_reporting')
    return
  }

  console.log(`Found ${rows.length} rows to process\n`)

  let processed = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const errorLog: Array<{ rowId: number; campaignId: string; date: string; error: string }> = []

  // Cache sequence steps by campaign_id (they don't change per date)
  const sequenceStepsCache = new Map<string, any[]>()

  // Track start time for progress updates
  const startTime = Date.now()
  const progressUpdateInterval = 100 // Show summary every 100 rows

  // Process in batches to show progress
  const batchSize = 50
  const totalBatches = Math.ceil(rows.length / batchSize)

  // Helper function to show progress summary
  const showProgressSummary = () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const rate = processed > 0 ? (processed / (Date.now() - startTime) * 1000 * 60).toFixed(1) : '0'
    const remaining = processed > 0 ? Math.ceil((rows.length - processed) / (processed / ((Date.now() - startTime) / 1000))) : 0
    const remainingMinutes = Math.floor(remaining / 60)
    const remainingSeconds = remaining % 60
    
    console.log('\n' + '='.repeat(70))
    console.log(`PROGRESS UPDATE - ${new Date().toLocaleTimeString()}`)
    console.log('='.repeat(70))
    console.log(`Processed: ${processed}/${rows.length} (${((processed / rows.length) * 100).toFixed(1)}%)`)
    console.log(`Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`)
    console.log(`Elapsed: ${elapsed}s | Rate: ~${rate} rows/min`)
    if (remaining > 0) {
      console.log(`Estimated remaining: ~${remainingMinutes}m ${remainingSeconds}s`)
    }
    console.log('='.repeat(70) + '\n')
  }

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * batchSize
    const batchEnd = Math.min(batchStart + batchSize, rows.length)
    const batch = rows.slice(batchStart, batchEnd)

    console.log(`\nProcessing batch ${batchIndex + 1}/${totalBatches} (rows ${batchStart + 1}-${batchEnd})`)

    for (const row of batch) {
      processed++

      try {
        const { campaign_id, client, date: dateValue, id } = row

        // Ensure date is in YYYY-MM-DD format
        const date = dateValue instanceof Date 
          ? dateValue.toISOString().split('T')[0] 
          : typeof dateValue === 'string' 
            ? dateValue.split('T')[0] 
            : dateValue

        // Get API key for this client
        const apiKey = await getApiKey(client)
        if (!apiKey) {
          console.log(`  [${processed}/${rows.length}] Skipping row ${id}: No API key for client "${client}"`)
          skipped++
          continue
        }

        // Fetch sequence steps (copy/content) - cache by campaign_id
        let sequenceSteps = sequenceStepsCache.get(campaign_id)
        if (!sequenceSteps) {
          sequenceSteps = await fetchSequenceSteps(campaign_id, apiKey)
          sequenceStepsCache.set(campaign_id, sequenceSteps)
          // Add delay after fetching sequence steps
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        
        // Create lookup map for copy by step ID
        const stepCopyMap: Record<number, any> = {}
        for (const step of sequenceSteps) {
          stepCopyMap[step.id] = {
            email_subject: step.email_subject || '',
            email_body: stripHtml(step.email_body),
            order: toInt(step.order),
            wait_in_days: toInt(step.wait_in_days),
            variant: step.variant || false,
            thread_reply: step.thread_reply || false
          }
        }

        // Fetch stats for this date
        const sequenceStepStats = await fetchStats(campaign_id, apiKey, date, stepCopyMap)

        // Update the row with sequence_step_stats
        // If null, it means there was an error - store empty array
        const statsToStore = sequenceStepStats === null ? [] : sequenceStepStats

        const success = await updateSequenceStepStats(id, statsToStore)

        if (success) {
          updated++
          const statsCount = Array.isArray(statsToStore) ? statsToStore.length : 0
          console.log(
            `  [${processed}/${rows.length}] ✓ Updated row ${id} (campaign: ${campaign_id}, date: ${date}) - ${statsCount} sequence steps`
          )
        } else {
          errors++
          errorLog.push({
            rowId: id,
            campaignId: campaign_id,
            date: date,
            error: 'Failed to update database'
          })
        }

        // Add delay between API calls
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (err: any) {
        errors++
        const errorMsg = err.message || 'Unknown error'
        console.error(`  [${processed}/${rows.length}] ✗ Error processing row ${row.id}:`, errorMsg)
        errorLog.push({
          rowId: row.id,
          campaignId: row.campaign_id || 'unknown',
          date: row.date || 'unknown',
          error: errorMsg
        })

        // Add delay even on error
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Show periodic progress summary
      if (processed % progressUpdateInterval === 0) {
        showProgressSummary()
      }
    }

    // Show summary after each batch
    if ((batchIndex + 1) % 2 === 0 || batchIndex === totalBatches - 1) {
      showProgressSummary()
    }

    // Add delay between batches
    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('BACKFILL SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total rows: ${rows.length}`)
  console.log(`Processed: ${processed}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log('='.repeat(60))

  if (errorLog.length > 0) {
    console.log('\nERROR LOG:')
    errorLog.forEach((err) => {
      console.log(`  Row ${err.rowId} (campaign: ${err.campaignId}, date: ${err.date}): ${err.error}`)
    })
  }

  console.log('\nBackfill completed!')
}

// Run the script
backfillSequenceStats().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
