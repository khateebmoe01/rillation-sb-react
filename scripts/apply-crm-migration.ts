/**
 * Apply CRM migration to engaged_leads table using Supabase Management API
 * Run with: npx tsx scripts/apply-crm-migration.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pfxgcavxdktxooiqthoi.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

// SQL statements to run (split into individual statements for error handling)
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
  console.log('🚀 Running CRM migration on engaged_leads table...\n')
  
  // First, test connection by fetching one row
  const { data: testData, error: testError } = await supabase
    .from('engaged_leads')
    .select('id')
    .limit(1)
  
  if (testError) {
    console.error('❌ Failed to connect to database:', testError.message)
    process.exit(1)
  }
  
  console.log('✓ Connected to database\n')
  
  // For each migration, we'll use a workaround since we can't run raw SQL
  // We'll check if the column exists by trying to select it
  
  const columnsToAdd = [
    'full_name', 'lead_phone', 'linkedin_url',
    'company_phone', 'company_website', 'num_locations', 'main_product_service',
    'meeting_date', 'meeting_link', 'rescheduling_link', 'next_touchpoint', 'last_contact',
    'context', 'lead_source', 'assignee', 'notes', 'stage'
  ]
  
  // Check which columns already exist
  const { data: sampleRow, error: sampleError } = await supabase
    .from('engaged_leads')
    .select('*')
    .limit(1)
  
  if (sampleError) {
    console.error('❌ Error fetching sample:', sampleError.message)
    process.exit(1)
  }
  
  const existingColumns = sampleRow && sampleRow[0] ? Object.keys(sampleRow[0]) : []
  
  console.log('📋 Existing columns:', existingColumns.length)
  console.log('📋 Columns to check:', columnsToAdd.length)
  
  const missingColumns = columnsToAdd.filter(col => !existingColumns.includes(col))
  const existingNewColumns = columnsToAdd.filter(col => existingColumns.includes(col))
  
  console.log('\n✓ Already exist:', existingNewColumns.join(', ') || 'none')
  console.log('⚠️ Missing columns:', missingColumns.join(', ') || 'none')
  
  if (missingColumns.length > 0) {
    console.log('\n⚠️ The following columns need to be added manually in Supabase SQL Editor:')
    console.log('---')
    missingColumns.forEach(col => {
      const type = col === 'num_locations' ? 'INTEGER' : 
                   col === 'meeting_date' || col === 'last_contact' ? 'TIMESTAMPTZ' :
                   col === 'next_touchpoint' ? 'DATE' : 'TEXT'
      const defaultVal = col === 'stage' ? " DEFAULT 'new'" : ''
      console.log(`ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS ${col} ${type}${defaultVal};`)
    })
    console.log('---')
  } else {
    console.log('\n✅ All CRM columns already exist!')
  }
  
  // Check current columns
  console.log('\n📊 Current engaged_leads table has', existingColumns.length, 'columns')
}

runMigration().catch(console.error)
