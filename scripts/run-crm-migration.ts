/**
 * Script to run CRM migration on engaged_leads table
 * Run with: npx tsx scripts/run-crm-migration.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const migrations = [
  // Contact fields
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS full_name TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS lead_phone TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT`,
  
  // Organization fields
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS company_phone TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS company_website TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS num_locations INTEGER`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS main_product_service TEXT`,
  
  // Scheduling fields
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS meeting_link TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS rescheduling_link TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS next_touchpoint DATE`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS last_contact TIMESTAMPTZ`,
  
  // Communication & Meta
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS context TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS lead_source TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS assignee TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'new'`,
]

async function runMigration() {
  console.log('Running CRM migration on engaged_leads table...\n')
  
  for (const sql of migrations) {
    const columnMatch = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)
    const columnName = columnMatch ? columnMatch[1] : 'unknown'
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
      
      if (error) {
        // Try alternative approach - just log and continue
        console.log(`⚠️  ${columnName}: ${error.message}`)
      } else {
        console.log(`✓ Added column: ${columnName}`)
      }
    } catch (err: any) {
      console.log(`⚠️  ${columnName}: ${err.message || 'Failed'}`)
    }
  }
  
  console.log('\nMigration complete!')
  console.log('\nNote: If columns already exist, they were skipped.')
  console.log('You may need to run this migration manually in Supabase SQL Editor if RPC is not available.')
}

runMigration().catch(console.error)
