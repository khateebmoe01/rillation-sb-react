/**
 * FAST Sync All Leads - Optimized for speed
 * 
 * - Uses max API pagination (15 per page is API limit)
 * - Bulk upserts with onConflict
 * - Parallel campaign processing
 * - Minimal delays
 * 
 * Usage: npx tsx scripts/fast-sync-leads.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...vals] = trimmed.split('=')
      if (key && vals.length > 0) {
        const value = vals.join('=').replace(/^["']|["']$/g, '')
        if (!process.env[key]) process.env[key] = value
      }
    }
  }
}
loadEnv()

const BISON_API = 'https://send.rillationrevenue.com/api'
const PER_PAGE = 100 // Request more, API will cap at 15
const BATCH_SIZE = 1000 // Supabase batch size
const PARALLEL_CAMPAIGNS = 3 // Process campaigns in parallel

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface Workspace { name: string; apiKey: string }
interface Campaign { campaign_id: string; campaign_name: string; client: string }

let totalFetched = 0
let totalUpserted = 0
let errors = 0

async function fetchAllLeadsForCampaign(campaignId: string, apiKey: string): Promise<any[]> {
  const allLeads: any[] = []
  let page = 1
  let lastPage = 1
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
  }
  
  while (page <= lastPage) {
    try {
      const url = `${BISON_API}/campaigns/${campaignId}/leads?page=${page}&per_page=${PER_PAGE}`
      const res = await fetch(url, { headers })
      
      if (!res.ok) {
        if (res.status === 404 || res.status === 400) break
        throw new Error(`API ${res.status}`)
      }
      
      const json = await res.json()
      
      // Get leads
      let leads: any[] = []
      if (Array.isArray(json)) leads = json
      else if (json.data && Array.isArray(json.data)) leads = json.data
      else if (json.leads && Array.isArray(json.leads)) leads = json.leads
      
      leads = leads.filter(l => l && l.email)
      if (leads.length === 0) break
      
      allLeads.push(...leads)
      
      // Pagination
      if (json.meta?.last_page) lastPage = json.meta.last_page
      else if (leads.length < 15) break // API caps at 15
      
      page++
    } catch (e) {
      break
    }
  }
  
  return allLeads
}

function transformLead(lead: any, workspace: string, campaign: Campaign) {
  if (!lead.email) return null
  const email = lead.email.trim().toLowerCase()
  if (!email.includes('@')) return null
  
  // Extract custom vars
  const customVars: Record<string, any> = {}
  const customVarsJsonb: Record<string, any> = {}
  
  const varMappings: Record<string, string> = {
    'company_domain': 'company_domain', 'domain': 'company_domain',
    'profile_url': 'profile_url', 'linkedin_url': 'profile_url',
    'company_linkedin': 'company_linkedin', 'linkedin': 'company_linkedin',
    'industry': 'industry',
    'seniority_level': 'seniority_level', 'seniority': 'seniority_level',
    'annual_revenue': 'annual_revenue', 'revenue': 'annual_revenue',
    'company_size': 'company_size', 'employees': 'company_size',
    'year_founded': 'year_founded', 'founded': 'year_founded',
    'company_hq_city': 'company_hq_city', 'city': 'company_hq_city', 'hq_city': 'company_hq_city',
    'company_hq_state': 'company_hq_state', 'state': 'company_hq_state', 'hq_state': 'company_hq_state',
    'company_hq_country': 'company_hq_country', 'country': 'company_hq_country', 'hq_country': 'company_hq_country',
    'tech_stack': 'tech_stack', 'technologies': 'tech_stack',
    'is_hiring': 'is_hiring', 'hiring': 'is_hiring',
    'business_model': 'business_model',
    'funding_stage': 'funding_stage', 'funding': 'funding_stage',
    'growth_score': 'growth_score',
    'specialty_signal_a': 'specialty_signal_a',
    'specialty_signal_b': 'specialty_signal_b',
    'specialty_signal_c': 'specialty_signal_c',
    'specialty_signal_d': 'specialty_signal_d',
  }
  
  if (lead.custom_variables && Array.isArray(lead.custom_variables)) {
    for (const v of lead.custom_variables) {
      if (!v?.name) continue
      const name = v.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
      const value = v.value || null
      if (value) {
        customVarsJsonb[v.name] = value
        const mapped = varMappings[name]
        if (mapped) {
          if (mapped === 'is_hiring') customVars[mapped] = value.toLowerCase() === 'true' || value === '1'
          else if (mapped === 'year_founded') {
            const parsed = parseInt(value)
            customVars[mapped] = isNaN(parsed) ? null : parsed
          }
          else customVars[mapped] = value
        }
      }
    }
  }
  
  const firstName = lead.first_name?.trim() || null
  const lastName = lead.last_name?.trim() || null
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null
  
  return {
    email,
    campaign_id: campaign.campaign_id,
    client: workspace,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    campaign_name: campaign.campaign_name,
    created_time: lead.created_at ? new Date(lead.created_at).toISOString() : null,
    job_title: lead.title?.trim() || null,
    company: lead.company?.trim() || null,
    industry: customVars.industry || null,
    seniority_level: customVars.seniority_level || null,
    company_domain: customVars.company_domain || null,
    profile_url: customVars.profile_url || null,
    company_linkedin: customVars.company_linkedin || null,
    annual_revenue: customVars.annual_revenue || null,
    company_size: customVars.company_size || null,
    year_founded: customVars.year_founded || null,
    company_hq_city: customVars.company_hq_city || null,
    company_hq_state: customVars.company_hq_state || null,
    company_hq_country: customVars.company_hq_country || null,
    tech_stack: customVars.tech_stack || null,
    is_hiring: customVars.is_hiring || null,
    business_model: customVars.business_model || null,
    funding_stage: customVars.funding_stage || null,
    growth_score: customVars.growth_score || null,
    specialty_signal_a: customVars.specialty_signal_a || null,
    specialty_signal_b: customVars.specialty_signal_b || null,
    specialty_signal_c: customVars.specialty_signal_c || null,
    specialty_signal_d: customVars.specialty_signal_d || null,
    emails_sent: lead.overall_stats?.emails_sent || 0,
    replies: lead.overall_stats?.replies || 0,
    unique_replies: lead.overall_stats?.replies || 0,
    custom_variables_jsonb: Object.keys(customVarsJsonb).length > 0 ? customVarsJsonb : {},
  }
}

async function upsertBatch(records: any[]): Promise<number> {
  if (records.length === 0) return 0
  
  try {
    const { error } = await supabase
      .from('all_leads')
      .upsert(records, { 
        onConflict: 'email,campaign_id,client',
        ignoreDuplicates: false 
      })
    
    if (error) {
      console.error(`  Upsert error: ${error.message}`)
      errors++
      return 0
    }
    return records.length
  } catch (e) {
    errors++
    return 0
  }
}

async function processCampaign(campaign: Campaign, apiKey: string): Promise<number> {
  const leads = await fetchAllLeadsForCampaign(campaign.campaign_id, apiKey)
  if (leads.length === 0) return 0
  
  const records = leads
    .map(l => transformLead(l, campaign.client, campaign))
    .filter(Boolean)
  
  totalFetched += records.length
  
  // Upsert in batches
  let upserted = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    upserted += await upsertBatch(batch)
  }
  
  totalUpserted += upserted
  return records.length
}

async function processWorkspace(workspace: Workspace) {
  console.log(`\n🏢 ${workspace.name}`)
  
  const { data: campaigns } = await supabase
    .from('Campaigns')
    .select('campaign_id, campaign_name, client')
    .eq('client', workspace.name)
  
  if (!campaigns || campaigns.length === 0) {
    console.log('   No campaigns')
    return
  }
  
  console.log(`   ${campaigns.length} campaigns`)
  
  // Process campaigns in parallel batches
  for (let i = 0; i < campaigns.length; i += PARALLEL_CAMPAIGNS) {
    const batch = campaigns.slice(i, i + PARALLEL_CAMPAIGNS)
    const results = await Promise.all(
      batch.map(c => processCampaign(c, workspace.apiKey))
    )
    
    for (let j = 0; j < batch.length; j++) {
      const name = batch[j].campaign_name?.substring(0, 30) || batch[j].campaign_id
      console.log(`   ✓ ${name}: ${results[j]} leads`)
    }
  }
}

async function main() {
  console.log('🚀 FAST Sync All Leads')
  console.log('━'.repeat(50))
  const startTime = Date.now()
  
  // Get workspaces
  const { data: clients } = await supabase
    .from('Clients')
    .select('Business, "Api Key - Bison"')
    .order('Business')
  
  const workspaces: Workspace[] = (clients || [])
    .filter(c => c.Business && c['Api Key - Bison'])
    .map(c => ({ name: c.Business, apiKey: c['Api Key - Bison'] }))
  
  console.log(`Found ${workspaces.length} workspaces\n`)
  
  // Process all workspaces
  for (const ws of workspaces) {
    await processWorkspace(ws)
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  
  console.log('\n' + '━'.repeat(50))
  console.log(`✅ COMPLETE in ${duration}s`)
  console.log(`   Fetched: ${totalFetched.toLocaleString()}`)
  console.log(`   Upserted: ${totalUpserted.toLocaleString()}`)
  console.log(`   Errors: ${errors}`)
}

main().catch(console.error)



