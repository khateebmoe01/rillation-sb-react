/**
 * Sync All Leads to Supabase
 * 
 * Fetches all leads from all campaigns across all workspaces via the Bison API
 * and syncs them to the Supabase all_leads table.
 * 
 * Features:
 * - Handles 10s of thousands of leads
 * - 3k pagination limit per API call
 * - Varying column schemas per workspace
 * - Custom variables handling
 * - Efficient batch upserting
 * - Progress tracking and error handling
 * 
 * Usage:
 *   npx tsx scripts/sync-all-leads.ts
 *   npx tsx scripts/sync-all-leads.ts --workspace "Client Name"
 *   npx tsx scripts/sync-all-leads.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env file manually
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
}

loadEnvFile()

// Configuration
const BISON_API_BASE = 'https://send.rillationrevenue.com/api'
const PER_PAGE = 200 // API limit per page (safer than 3k to avoid timeouts)
const SUPABASE_BATCH_SIZE = 500 // Leads per Supabase upsert batch
const API_DELAY_MS = 100 // Delay between API calls to avoid rate limiting
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

// Environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  console.error('Or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Types
interface Workspace {
  name: string
  apiKey: string
}

interface Campaign {
  campaign_id: string
  campaign_name: string
  client: string
}

interface LeadData {
  id?: number
  email?: string
  first_name?: string
  last_name?: string
  title?: string
  company?: string
  phone?: string
  linkedin_url?: string
  tags?: Array<{ id: number; name: string }> | Array<number>
  custom_variables?: Array<{ name: string; value: string }>
  lead_campaign_data?: Array<{
    campaign_id?: number
    campaign_name?: string
    name?: string
    id?: number
  }>
  created_at?: string
  updated_at?: string
  overall_stats?: {
    emails_sent?: number
    opens?: number
    replies?: number
  }
  [key: string]: any // Allow additional fields
}

interface LeadRecord {
  // Required fields
  email: string
  campaign_id: string
  client: string
  // Optional fields matching all_leads table schema
  first_name: string | null
  last_name: string | null
  campaign_name: string | null
  created_time: string | null
  industry: string | null
  job_title: string | null
  seniority_level: string | null
  company: string | null
  company_domain: string | null
  annual_revenue: string | null
  company_size: string | null
  year_founded: string | null
  company_hq_city: string | null
  company_hq_state: string | null
  company_hq_country: string | null
  tech_stack: string | null
  is_hiring: boolean | null
  specialty_signal_a: string | null
  specialty_signal_b: string | null
  specialty_signal_c: string | null
  specialty_signal_d: string | null
  status: string | null
  emails_sent: number | null
  replies: number | null
  unique_replies: number | null
}

interface SyncStats {
  workspacesProcessed: number
  campaignsProcessed: number
  totalLeadsFetched: number
  inserted: number
  updated: number
  errors: number
  skipped: number
  startTime: Date
  endTime?: Date
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const workspaceFilter = args.includes('--workspace') 
  ? args[args.indexOf('--workspace') + 1] 
  : null
const campaignFilter = args.includes('--campaign')
  ? args[args.indexOf('--campaign') + 1]
  : null

// Global stats
const stats: SyncStats = {
  workspacesProcessed: 0,
  campaignsProcessed: 0,
  totalLeadsFetched: 0,
  inserted: 0,
  updated: 0,
  errors: 0,
  skipped: 0,
  startTime: new Date()
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function logProgress(message: string) {
  const elapsed = formatDuration(Date.now() - stats.startTime.getTime())
  console.log(`[${elapsed}] ${message}`)
}

// API Functions
async function fetchWithRetry(
  url: string, 
  headers: Record<string, string>, 
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { headers, method: 'GET' })
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
        console.warn(`   ⚠️ Rate limited, waiting ${retryAfter}s...`)
        await sleep(retryAfter * 1000)
        continue
      }
      
      return response
    } catch (error) {
      if (attempt === retries) throw error
      console.warn(`   ⚠️ Request failed (attempt ${attempt}/${retries}), retrying in ${RETRY_DELAY_MS}ms...`)
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }
  
  throw new Error(`Failed after ${retries} retries`)
}

async function fetchWorkspaces(): Promise<Workspace[]> {
  logProgress('📋 Fetching workspaces from Clients table...')
  
  const { data, error } = await supabase
    .from('Clients')
    .select('Business, "Api Key - Bison"')
    .order('Business')
  
  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`)
  }
  
  const workspaces: Workspace[] = []
  
  for (const client of data || []) {
    const name = client.Business
    const apiKey = client['Api Key - Bison']
    
    if (!name || !apiKey) continue
    
    // Apply workspace filter if specified
    if (workspaceFilter && name !== workspaceFilter) continue
    
    workspaces.push({ name, apiKey })
  }
  
  logProgress(`   Found ${workspaces.length} workspaces with API keys`)
  return workspaces
}

async function fetchCampaignsForWorkspace(workspace: Workspace): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('Campaigns')
    .select('campaign_id, campaign_name, client')
    .eq('client', workspace.name)
  
  if (error) {
    console.warn(`   ⚠️ Failed to fetch campaigns for ${workspace.name}: ${error.message}`)
    return []
  }
  
  let campaigns = (data || []).filter(c => c.campaign_id)
  
  // Apply campaign filter if specified
  if (campaignFilter) {
    campaigns = campaigns.filter(c => c.campaign_id === campaignFilter)
  }
  
  return campaigns
}

async function fetchLeadsForCampaign(
  campaignId: string, 
  apiKey: string
): Promise<LeadData[]> {
  const allLeads: LeadData[] = []
  let page = 1
  let hasMore = true
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
  
  while (hasMore) {
    const url = `${BISON_API_BASE}/campaigns/${campaignId}/leads?page=${page}&per_page=${PER_PAGE}`
    
    try {
      const response = await fetchWithRetry(url, headers)
      
      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          // Campaign doesn't exist or has no leads
          break
        }
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText.substring(0, 200)}`)
      }
      
      const json = await response.json()
      
      // Extract leads from response (handle different response structures)
      let leads: LeadData[] = []
      if (Array.isArray(json)) {
        leads = json
      } else if (json.data && Array.isArray(json.data)) {
        leads = json.data
      } else if (json.leads && Array.isArray(json.leads)) {
        leads = json.leads
      }
      
      // Filter valid leads (must have email)
      leads = leads.filter(l => l && typeof l === 'object' && l.email)
      
      if (leads.length === 0) {
        hasMore = false
        break
      }
      
      allLeads.push(...leads)
      
      // Check pagination
      if (json.meta) {
        const currentPage = json.meta.current_page || page
        const lastPage = json.meta.last_page
        hasMore = lastPage && currentPage < lastPage
      } else if (json.links && !json.links.next) {
        hasMore = false
      } else if (leads.length < PER_PAGE) {
        hasMore = false
      }
      
      page++
      
      // Rate limiting delay
      if (hasMore) {
        await sleep(API_DELAY_MS)
      }
      
    } catch (error) {
      console.warn(`      ⚠️ Error fetching page ${page}: ${error instanceof Error ? error.message : error}`)
      hasMore = false
    }
  }
  
  return allLeads
}

// Data transformation functions
function parseDateTime(dtStr: string | undefined | null): string | null {
  if (!dtStr) return null
  try {
    const date = new Date(dtStr)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

function extractCustomVariables(
  customVars: Array<{ name: string; value: string }> | undefined
): Record<string, any> {
  const mapped: Record<string, any> = {
    company_domain: null,
    industry: null,
    seniority_level: null,
    annual_revenue: null,
    company_size: null,
    year_founded: null,
    company_hq_city: null,
    company_hq_state: null,
    company_hq_country: null,
    tech_stack: null,
    is_hiring: null,
    specialty_signal_a: null,
    specialty_signal_b: null,
    specialty_signal_c: null,
    specialty_signal_d: null,
  }
  
  if (!customVars || !Array.isArray(customVars)) {
    return mapped
  }
  
  // Known field mappings (case-insensitive)
  const knownMappings: Record<string, string> = {
    'company_domain': 'company_domain',
    'companydomain': 'company_domain',
    'domain': 'company_domain',
    'industry': 'industry',
    'seniority_level': 'seniority_level',
    'seniority': 'seniority_level',
    'level': 'seniority_level',
    'annual_revenue': 'annual_revenue',
    'annualrevenue': 'annual_revenue',
    'revenue': 'annual_revenue',
    'company_size': 'company_size',
    'companysize': 'company_size',
    'employees': 'company_size',
    'employee_count': 'company_size',
    'year_founded': 'year_founded',
    'yearfounded': 'year_founded',
    'founded': 'year_founded',
    'founded_year': 'year_founded',
    'company_hq_city': 'company_hq_city',
    'hq_city': 'company_hq_city',
    'city': 'company_hq_city',
    'company_hq_state': 'company_hq_state',
    'hq_state': 'company_hq_state',
    'state': 'company_hq_state',
    'company_hq_country': 'company_hq_country',
    'hq_country': 'company_hq_country',
    'country': 'company_hq_country',
    'tech_stack': 'tech_stack',
    'techstack': 'tech_stack',
    'technologies': 'tech_stack',
    'is_hiring': 'is_hiring',
    'ishiring': 'is_hiring',
    'hiring': 'is_hiring',
    'specialty_signal_a': 'specialty_signal_a',
    'specialty_signal_b': 'specialty_signal_b',
    'specialty_signal_c': 'specialty_signal_c',
    'specialty_signal_d': 'specialty_signal_d',
  }
  
  for (const varItem of customVars) {
    if (!varItem || typeof varItem !== 'object' || !varItem.name) continue
    
    const varName = varItem.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
    const varValue = varItem.value || null
    
    // Check if it's a known field
    const mappedField = knownMappings[varName]
    if (mappedField && varValue) {
      // Handle boolean for is_hiring
      if (mappedField === 'is_hiring') {
        mapped[mappedField] = varValue.toLowerCase() === 'true' || varValue === '1'
      } else {
        mapped[mappedField] = varValue
      }
    }
  }
  
  return mapped
}

function extractCampaignInfo(
  leadData: LeadData,
  fallbackCampaignId: string,
  fallbackCampaignName: string
): { campaignId: string | null; campaignName: string | null } {
  // First try custom variables
  const customVars = leadData.custom_variables || []
  for (const v of customVars) {
    if (v.name?.toLowerCase() === 'campaign_name' && v.value) {
      return { 
        campaignId: fallbackCampaignId, 
        campaignName: v.value 
      }
    }
  }
  
  // Then try lead_campaign_data
  const leadCampaignData = leadData.lead_campaign_data || []
  if (leadCampaignData.length > 0) {
    const first = leadCampaignData[0]
    return {
      campaignId: String(first.campaign_id || first.id || fallbackCampaignId),
      campaignName: first.campaign_name || first.name || fallbackCampaignName
    }
  }
  
  // Use fallback
  return { campaignId: fallbackCampaignId, campaignName: fallbackCampaignName }
}

function transformLeadToRecord(
  lead: LeadData,
  workspace: string,
  campaign: Campaign
): LeadRecord | null {
  // Email is required
  if (!lead.email) return null
  
  const email = lead.email.trim().toLowerCase()
  if (!email || !email.includes('@')) return null
  
  // Extract custom variables
  const customVars = extractCustomVariables(lead.custom_variables)
  
  // Extract campaign info
  const { campaignId, campaignName } = extractCampaignInfo(
    lead, 
    campaign.campaign_id, 
    campaign.campaign_name
  )
  
  // campaign_id is required - skip if missing
  if (!campaignId) return null
  
  // Extract stats
  const stats = lead.overall_stats || {}
  
  return {
    // Required fields
    email,
    campaign_id: campaignId,
    client: workspace,
    // Optional fields
    first_name: lead.first_name?.trim() || null,
    last_name: lead.last_name?.trim() || null,
    campaign_name: campaignName,
    created_time: parseDateTime(lead.created_at),
    industry: customVars.industry,
    job_title: lead.title?.trim() || null,
    seniority_level: customVars.seniority_level,
    company: lead.company?.trim() || null,
    company_domain: customVars.company_domain,
    annual_revenue: customVars.annual_revenue,
    company_size: customVars.company_size,
    year_founded: customVars.year_founded,
    company_hq_city: customVars.company_hq_city,
    company_hq_state: customVars.company_hq_state,
    company_hq_country: customVars.company_hq_country,
    tech_stack: customVars.tech_stack,
    is_hiring: customVars.is_hiring,
    specialty_signal_a: customVars.specialty_signal_a,
    specialty_signal_b: customVars.specialty_signal_b,
    specialty_signal_c: customVars.specialty_signal_c,
    specialty_signal_d: customVars.specialty_signal_d,
    status: null, // Can be updated later
    emails_sent: stats.emails_sent || 0,
    replies: stats.replies || 0,
    unique_replies: stats.replies || 0, // Use same value as replies
  }
}

// Supabase insert functions
async function insertLeadsBatch(leads: LeadRecord[]): Promise<{ inserted: number; skipped: number; errors: number }> {
  if (leads.length === 0) {
    return { inserted: 0, skipped: 0, errors: 0 }
  }
  
  if (dryRun) {
    console.log(`      [DRY RUN] Would insert ${leads.length} leads`)
    return { inserted: leads.length, skipped: 0, errors: 0 }
  }
  
  try {
    // First, check which emails+campaign_id combinations already exist
    const emailCampaignPairs = leads.map(l => `${l.email}|${l.campaign_id}`)
    
    // Query existing leads in batches of 100 emails
    const existingPairs = new Set<string>()
    for (let i = 0; i < leads.length; i += 100) {
      const batch = leads.slice(i, i + 100)
      const emails = batch.map(l => l.email)
      
      const { data: existing } = await supabase
        .from('all_leads')
        .select('email, campaign_id')
        .in('email', emails)
      
      if (existing) {
        for (const row of existing) {
          existingPairs.add(`${row.email}|${row.campaign_id}`)
        }
      }
    }
    
    // Filter out leads that already exist
    const newLeads = leads.filter(l => !existingPairs.has(`${l.email}|${l.campaign_id}`))
    const skipped = leads.length - newLeads.length
    
    if (newLeads.length === 0) {
      return { inserted: 0, skipped, errors: 0 }
    }
    
    // Insert new leads in batches
    let totalInserted = 0
    let totalErrors = 0
    
    for (let i = 0; i < newLeads.length; i += 100) {
      const batch = newLeads.slice(i, i + 100)
      
      const { error } = await supabase
        .from('all_leads')
        .insert(batch)
      
      if (error) {
        // Try individual inserts for error recovery
        for (const lead of batch) {
          const { error: singleError } = await supabase
            .from('all_leads')
            .insert(lead)
          
          if (singleError) {
            totalErrors++
          } else {
            totalInserted++
          }
        }
      } else {
        totalInserted += batch.length
      }
    }
    
    return { inserted: totalInserted, skipped, errors: totalErrors }
    
  } catch (error) {
    console.error(`      ❌ Unexpected error in batch insert: ${error instanceof Error ? error.message : error}`)
    return { inserted: 0, skipped: 0, errors: leads.length }
  }
}

// Main processing functions
async function processCampaign(
  campaign: Campaign,
  workspace: Workspace
): Promise<{ fetched: number; processed: number; errors: number }> {
  const leads = await fetchLeadsForCampaign(campaign.campaign_id, workspace.apiKey)
  
  if (leads.length === 0) {
    return { fetched: 0, processed: 0, errors: 0 }
  }
  
  // Transform leads
  const records: LeadRecord[] = []
  let skipped = 0
  
  for (const lead of leads) {
    const record = transformLeadToRecord(lead, workspace.name, campaign)
    if (record) {
      records.push(record)
    } else {
      skipped++
    }
  }
  
  if (skipped > 0) {
    stats.skipped += skipped
  }
  
  // Insert in batches
  let totalInserted = 0
  let totalSkipped = 0
  let totalErrors = 0
  
  for (let i = 0; i < records.length; i += SUPABASE_BATCH_SIZE) {
    const batch = records.slice(i, i + SUPABASE_BATCH_SIZE)
    const result = await insertLeadsBatch(batch)
    totalInserted += result.inserted
    totalSkipped += result.skipped
    totalErrors += result.errors
  }
  
  stats.skipped += totalSkipped
  
  return { 
    fetched: leads.length, 
    processed: totalInserted, 
    errors: totalErrors 
  }
}

async function processWorkspace(workspace: Workspace): Promise<void> {
  logProgress(`\n🏢 Processing workspace: ${workspace.name}`)
  
  const campaigns = await fetchCampaignsForWorkspace(workspace)
  
  if (campaigns.length === 0) {
    logProgress(`   ⚠️ No campaigns found for ${workspace.name}`)
    return
  }
  
  logProgress(`   📊 Found ${campaigns.length} campaigns`)
  
  let workspaceLeads = 0
  let workspaceProcessed = 0
  let workspaceErrors = 0
  
  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i]
    const progress = `[${i + 1}/${campaigns.length}]`
    
    process.stdout.write(`   ${progress} ${campaign.campaign_name?.substring(0, 40)}... `)
    
    try {
      const result = await processCampaign(campaign, workspace)
      
      workspaceLeads += result.fetched
      workspaceProcessed += result.processed
      workspaceErrors += result.errors
      stats.campaignsProcessed++
      
      if (result.fetched > 0) {
        console.log(`✓ ${result.fetched} leads fetched, ${result.processed} synced`)
      } else {
        console.log(`- no leads`)
      }
      
    } catch (error) {
      console.log(`❌ ${error instanceof Error ? error.message : error}`)
      stats.errors++
    }
    
    // Small delay between campaigns
    await sleep(50)
  }
  
  stats.totalLeadsFetched += workspaceLeads
  stats.inserted += workspaceProcessed
  stats.errors += workspaceErrors
  stats.workspacesProcessed++
  
  logProgress(`   ✅ Workspace complete: ${workspaceLeads} leads fetched, ${workspaceProcessed} synced`)
}

// Main entry point
async function main() {
  console.log('═'.repeat(60))
  console.log('🚀 Sync All Leads to Supabase')
  console.log('═'.repeat(60))
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`)
  if (workspaceFilter) console.log(`Workspace filter: ${workspaceFilter}`)
  if (campaignFilter) console.log(`Campaign filter: ${campaignFilter}`)
  console.log('─'.repeat(60))
  
  try {
    // Fetch all workspaces
    const workspaces = await fetchWorkspaces()
    
    if (workspaces.length === 0) {
      console.log('❌ No workspaces to process')
      process.exit(1)
    }
    
    // Process each workspace
    for (const workspace of workspaces) {
      await processWorkspace(workspace)
    }
    
    // Final summary
    stats.endTime = new Date()
    const duration = stats.endTime.getTime() - stats.startTime.getTime()
    
    console.log('\n' + '═'.repeat(60))
    console.log('📊 SYNC COMPLETE - SUMMARY')
    console.log('═'.repeat(60))
    console.log(`Duration: ${formatDuration(duration)}`)
    console.log(`Workspaces processed: ${stats.workspacesProcessed}`)
    console.log(`Campaigns processed: ${stats.campaignsProcessed}`)
    console.log(`Total leads fetched: ${stats.totalLeadsFetched.toLocaleString()}`)
    console.log(`Leads synced: ${stats.inserted.toLocaleString()}`)
    console.log(`Leads skipped (invalid): ${stats.skipped.toLocaleString()}`)
    console.log(`Errors: ${stats.errors}`)
    
    if (dryRun) {
      console.log('\n⚠️ DRY RUN - No changes were made to the database')
    }
    
    console.log('═'.repeat(60))
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run
main()

