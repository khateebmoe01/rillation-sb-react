/**
 * TURBO Sync Leads - Maximum speed
 * 
 * - Parallel API calls within campaigns (fetches multiple pages at once)
 * - All campaigns in a workspace run in parallel
 * - Live progress updates
 * 
 * Usage: npx tsx scripts/turbo-sync-leads.ts
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
const PARALLEL_PAGES = 10 // Fetch 10 pages in parallel
const BATCH_SIZE = 500

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

let totalFetched = 0
let totalUpserted = 0
let errors = 0

async function fetchPage(campaignId: string, apiKey: string, page: number): Promise<{ leads: any[], lastPage: number }> {
  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
  const url = `${BISON_API}/campaigns/${campaignId}/leads?page=${page}&per_page=100`
  
  try {
    const res = await fetch(url, { headers })
    if (!res.ok) return { leads: [], lastPage: 0 }
    
    const json = await res.json()
    let leads: any[] = []
    if (Array.isArray(json)) leads = json
    else if (json.data) leads = json.data
    else if (json.leads) leads = json.leads
    
    const lastPage = json.meta?.last_page || (leads.length < 15 ? page : page + 1)
    return { leads: leads.filter(l => l?.email), lastPage }
  } catch {
    return { leads: [], lastPage: 0 }
  }
}

async function fetchAllLeads(campaignId: string, apiKey: string): Promise<any[]> {
  // First get page 1 to know last_page
  const first = await fetchPage(campaignId, apiKey, 1)
  if (first.leads.length === 0) return []
  
  const allLeads = [...first.leads]
  const lastPage = first.lastPage
  
  if (lastPage <= 1) return allLeads
  
  // Fetch remaining pages in parallel batches
  for (let startPage = 2; startPage <= lastPage; startPage += PARALLEL_PAGES) {
    const pagePromises: Promise<{ leads: any[], lastPage: number }>[] = []
    
    for (let p = startPage; p < startPage + PARALLEL_PAGES && p <= lastPage; p++) {
      pagePromises.push(fetchPage(campaignId, apiKey, p))
    }
    
    const results = await Promise.all(pagePromises)
    for (const r of results) {
      allLeads.push(...r.leads)
    }
  }
  
  return allLeads
}

function transform(lead: any, client: string, campaignId: string, campaignName: string) {
  if (!lead.email) return null
  const email = lead.email.trim().toLowerCase()
  if (!email.includes('@')) return null
  
  const vars: Record<string, any> = {}
  const jsonb: Record<string, any> = {}
  
  const mappings: Record<string, string> = {
    'company_domain': 'company_domain', 'domain': 'company_domain',
    'profile_url': 'profile_url', 'linkedin_url': 'profile_url',
    'industry': 'industry', 'seniority_level': 'seniority_level', 'seniority': 'seniority_level',
    'annual_revenue': 'annual_revenue', 'revenue': 'annual_revenue',
    'company_size': 'company_size', 'employees': 'company_size',
    'year_founded': 'year_founded', 'founded': 'year_founded',
    'company_hq_city': 'company_hq_city', 'city': 'company_hq_city',
    'company_hq_state': 'company_hq_state', 'state': 'company_hq_state',
    'company_hq_country': 'company_hq_country', 'country': 'company_hq_country',
    'tech_stack': 'tech_stack', 'is_hiring': 'is_hiring', 'hiring': 'is_hiring',
    'business_model': 'business_model', 'funding_stage': 'funding_stage',
    'growth_score': 'growth_score',
    'specialty_signal_a': 'specialty_signal_a', 'specialty_signal_b': 'specialty_signal_b',
    'specialty_signal_c': 'specialty_signal_c', 'specialty_signal_d': 'specialty_signal_d',
  }
  
  if (lead.custom_variables && Array.isArray(lead.custom_variables)) {
    for (const v of lead.custom_variables) {
      if (!v?.name) continue
      const name = v.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
      if (v.value) {
        jsonb[v.name] = v.value
        const mapped = mappings[name]
        if (mapped) {
          if (mapped === 'is_hiring') vars[mapped] = v.value.toLowerCase() === 'true'
          else if (mapped === 'year_founded') vars[mapped] = parseInt(v.value) || null
          else vars[mapped] = v.value
        }
      }
    }
  }
  
  return {
    email, campaign_id: campaignId, client,
    first_name: lead.first_name?.trim() || null,
    last_name: lead.last_name?.trim() || null,
    full_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || null,
    campaign_name: campaignName,
    created_time: lead.created_at ? new Date(lead.created_at).toISOString() : null,
    job_title: lead.title?.trim() || null,
    company: lead.company?.trim() || null,
    industry: vars.industry || null,
    seniority_level: vars.seniority_level || null,
    company_domain: vars.company_domain || null,
    profile_url: vars.profile_url || null,
    company_linkedin: vars.company_linkedin || null,
    annual_revenue: vars.annual_revenue || null,
    company_size: vars.company_size || null,
    year_founded: vars.year_founded || null,
    company_hq_city: vars.company_hq_city || null,
    company_hq_state: vars.company_hq_state || null,
    company_hq_country: vars.company_hq_country || null,
    tech_stack: vars.tech_stack || null,
    is_hiring: vars.is_hiring || null,
    business_model: vars.business_model || null,
    funding_stage: vars.funding_stage || null,
    growth_score: vars.growth_score || null,
    specialty_signal_a: vars.specialty_signal_a || null,
    specialty_signal_b: vars.specialty_signal_b || null,
    specialty_signal_c: vars.specialty_signal_c || null,
    specialty_signal_d: vars.specialty_signal_d || null,
    emails_sent: lead.overall_stats?.emails_sent || 0,
    replies: lead.overall_stats?.replies || 0,
    unique_replies: lead.overall_stats?.replies || 0,
    custom_variables_jsonb: Object.keys(jsonb).length > 0 ? jsonb : {},
  }
}

async function upsertBatch(records: any[]): Promise<number> {
  if (records.length === 0) return 0
  try {
    const { error } = await supabase
      .from('all_leads')
      .upsert(records, { onConflict: 'email,campaign_id,client', ignoreDuplicates: false })
    if (error) { errors++; return 0 }
    return records.length
  } catch { errors++; return 0 }
}

async function processCampaign(
  campaignId: string, 
  campaignName: string, 
  client: string, 
  apiKey: string
): Promise<number> {
  const leads = await fetchAllLeads(campaignId, apiKey)
  if (leads.length === 0) return 0
  
  const records = leads.map(l => transform(l, client, campaignId, campaignName)).filter(Boolean)
  totalFetched += records.length
  
  let upserted = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    upserted += await upsertBatch(records.slice(i, i + BATCH_SIZE))
  }
  totalUpserted += upserted
  return records.length
}

async function main() {
  console.log('⚡ TURBO Sync Leads')
  console.log('━'.repeat(50))
  const startTime = Date.now()
  
  const { data: clients } = await supabase
    .from('Clients')
    .select('Business, "Api Key - Bison"')
    .order('Business')
  
  const workspaces = (clients || [])
    .filter(c => c.Business && c['Api Key - Bison'])
    .map(c => ({ name: c.Business, apiKey: c['Api Key - Bison'] }))
  
  console.log(`${workspaces.length} workspaces\n`)
  
  for (const ws of workspaces) {
    const wsStart = Date.now()
    console.log(`🏢 ${ws.name}`)
    
    const { data: campaigns } = await supabase
      .from('Campaigns')
      .select('campaign_id, campaign_name, client')
      .eq('client', ws.name)
    
    if (!campaigns || campaigns.length === 0) {
      console.log('   No campaigns\n')
      continue
    }
    
    // Process ALL campaigns in parallel
    const results = await Promise.allSettled(
      campaigns.map(c => processCampaign(c.campaign_id, c.campaign_name, ws.name, ws.apiKey))
    )
    
    let wsTotal = 0
    for (let i = 0; i < campaigns.length; i++) {
      const r = results[i]
      const count = r.status === 'fulfilled' ? r.value : 0
      wsTotal += count
      const name = campaigns[i].campaign_name?.substring(0, 35) || campaigns[i].campaign_id
      console.log(`   ${count > 0 ? '✓' : '-'} ${name}: ${count}`)
    }
    
    const wsDuration = ((Date.now() - wsStart) / 1000).toFixed(1)
    console.log(`   Total: ${wsTotal.toLocaleString()} in ${wsDuration}s\n`)
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('━'.repeat(50))
  console.log(`✅ DONE in ${duration}s`)
  console.log(`   Fetched: ${totalFetched.toLocaleString()}`)
  console.log(`   Upserted: ${totalUpserted.toLocaleString()}`)
  console.log(`   Errors: ${errors}`)
}

main().catch(console.error)


