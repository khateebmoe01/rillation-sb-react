// Script to check columns in engaged_leads table
// Run with: npx tsx check_engaged_leads_columns.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEngagedLeadsColumns() {
  try {
    // Try to fetch one row with all columns to see what exists
    const { data, error } = await supabase
      .from('engaged_leads')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Error fetching from engaged_leads:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('\n=== Columns found in engaged_leads table ===\n')
      const columns = Object.keys(data[0])
      columns.sort()
      
      columns.forEach(col => {
        const value = data[0][col]
        const type = typeof value
        const sample = value !== null && value !== undefined 
          ? String(value).substring(0, 50) 
          : 'null'
        console.log(`${col.padEnd(30)} | Type: ${type.padEnd(10)} | Sample: ${sample}`)
      })
      
      console.log('\n=== Firmographic-related columns ===\n')
      const firmographicKeywords = ['size', 'industry', 'revenue', 'employee', 'location', 'city', 'state', 'country', 'company']
      const firmographicCols = columns.filter(col => 
        firmographicKeywords.some(keyword => col.toLowerCase().includes(keyword))
      )
      
      if (firmographicCols.length > 0) {
        firmographicCols.forEach(col => {
          console.log(`  - ${col}`)
        })
      } else {
        console.log('  No firmographic columns found with common keywords')
      }
      
    } else {
      console.log('No data found in engaged_leads table')
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

checkEngagedLeadsColumns()



