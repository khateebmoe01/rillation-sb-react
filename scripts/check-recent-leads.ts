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

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Checking recent Barakat Transport leads...\n')

  const { data: leads, error } = await supabase
    .from('all_leads')
    .select('email, campaign_name, industry, company_domain, growth_score, tech_stack, custom_variables_jsonb')
    .eq('client', 'Barakat Transport')
    .like('campaign_name', 'Barakat Transport - All Job Titles%')
    .gte('created_time', '2026-01-23')
    .order('created_time', { ascending: false })
    .limit(3)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${leads?.length || 0} leads`)

  for (const lead of leads || []) {
    console.log('\n' + '='.repeat(60))
    console.log('Email:', lead.email)
    console.log('Campaign:', lead.campaign_name)
    console.log('Industry:', lead.industry || 'NULL')
    console.log('Company Domain:', lead.company_domain || 'NULL')
    console.log('Growth Score:', lead.growth_score || 'NULL')
    console.log('Tech Stack:', lead.tech_stack || 'NULL')
    console.log('Custom Variables JSONB:')
    console.log(JSON.stringify(lead.custom_variables_jsonb, null, 2))
  }

  // Now check what Bison API returns for this campaign
  console.log('\n\n' + '='.repeat(60))
  console.log('Checking Bison API for this campaign...')

  const { data: client } = await supabase
    .from('Clients')
    .select('"Api Key - Bison"')
    .eq('Business', 'Barakat Transport')
    .single()

  if (client && client['Api Key - Bison']) {
    const { data: campaign } = await supabase
      .from('Campaigns')
      .select('campaign_id')
      .eq('client', 'Barakat Transport')
      .like('campaign_name', 'Barakat Transport - All Job Titles%')
      .limit(1)
      .single()

    if (campaign) {
      console.log('\nFetching sample lead from Bison API...')
      const apiKey = client['Api Key - Bison']
      const res = await fetch(`https://send.rillationrevenue.com/api/campaigns/${campaign.campaign_id}/leads?per_page=1`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      })

      if (res.ok) {
        const json = await res.json()
        const leads = json.data || json.leads || json
        if (leads && leads[0]) {
          console.log('\nSample lead from Bison API:')
          console.log(JSON.stringify(leads[0], null, 2))
        }
      } else {
        console.log('Error fetching from Bison:', res.status)
      }
    }
  }
}

main().catch(console.error)
