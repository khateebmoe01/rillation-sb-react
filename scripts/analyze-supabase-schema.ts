// Comprehensive Supabase Schema Analysis Script
// Analyzes replies, engaged_leads, and meetings_booked tables
// Run with: npx tsx scripts/analyze-supabase-schema.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY)')
  console.error('\nYou can also use SUPABASE_SERVICE_ROLE_KEY for full access')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

interface TableStats {
  totalRows: number
  sampleRow: any
  columnCounts: Record<string, { total: number; nonNull: number; null: number; percentage: number }>
  uniqueValues: Record<string, Set<string | number | boolean>>
  dateRanges: Record<string, { min: string | null; max: string | null }>
}

async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `
  }).catch(async () => {
    // Fallback: try direct query
    const { data: sampleData } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (sampleData && sampleData.length > 0) {
      return Object.keys(sampleData[0]).map(key => ({
        column_name: key,
        data_type: typeof sampleData[0][key],
        is_nullable: 'unknown',
        column_default: null
      }))
    }
    return []
  })

  if (error) {
    console.warn(`⚠️  Could not fetch column info for ${tableName}, using sample data method`)
    return []
  }

  return data as ColumnInfo[]
}

async function analyzeTable(tableName: string): Promise<TableStats> {
  console.log(`\n📊 Analyzing table: ${tableName}`)
  console.log('━'.repeat(60))

  // Get total count
  const { count: totalRows } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (totalRows === null || totalRows === 0) {
    console.log(`⚠️  Table ${tableName} is empty or doesn't exist`)
    return {
      totalRows: 0,
      sampleRow: null,
      columnCounts: {},
      uniqueValues: {},
      dateRanges: {}
    }
  }

  console.log(`✅ Total rows: ${totalRows.toLocaleString()}`)

  // Get sample row
  const { data: sampleData } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  const sampleRow = sampleData && sampleData.length > 0 ? sampleData[0] : null

  // Get all columns from sample
  const columns = sampleRow ? Object.keys(sampleRow) : []

  // Analyze each column
  const columnCounts: Record<string, { total: number; nonNull: number; null: number; percentage: number }> = {}
  const uniqueValues: Record<string, Set<string | number | boolean>> = {}
  const dateRanges: Record<string, { min: string | null; max: string | null }> = {}

  // Fetch data in batches to analyze
  const BATCH_SIZE = 1000
  let offset = 0
  let hasMore = true
  const allData: any[] = []

  console.log(`📥 Fetching data for analysis...`)
  while (hasMore && offset < totalRows && offset < 10000) { // Limit to 10k rows for analysis
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error(`❌ Error fetching batch:`, error)
      break
    }

    if (data && data.length > 0) {
      allData.push(...data)
      offset += BATCH_SIZE
      hasMore = data.length === BATCH_SIZE
      process.stdout.write(`\r   Fetched ${Math.min(offset, totalRows)} / ${totalRows} rows...`)
    } else {
      hasMore = false
    }
  }
  console.log('') // New line after progress

  // Analyze columns
  for (const col of columns) {
    const values = allData.map(row => row[col])
    const nonNull = values.filter(v => v !== null && v !== undefined).length
    const nullCount = values.length - nonNull
    const percentage = values.length > 0 ? (nonNull / values.length) * 100 : 0

    columnCounts[col] = {
      total: values.length,
      nonNull,
      null: nullCount,
      percentage: Math.round(percentage * 100) / 100
    }

    // Track unique values (limit to 50 for display)
    const uniqueSet = new Set<string | number | boolean>()
    values.forEach(v => {
      if (v !== null && v !== undefined) {
        const str = String(v)
        if (uniqueSet.size < 50) {
          uniqueSet.add(str.length > 100 ? str.substring(0, 100) : str)
        }
      }
    })
    uniqueValues[col] = uniqueSet

    // Track date ranges for date/timestamp columns
    if (col.includes('date') || col.includes('time') || col.includes('created') || col.includes('updated')) {
      const dates = values
        .filter(v => v !== null && v !== undefined)
        .map(v => new Date(v))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())

      if (dates.length > 0) {
        dateRanges[col] = {
          min: dates[0].toISOString(),
          max: dates[dates.length - 1].toISOString()
        }
      }
    }
  }

  return {
    totalRows,
    sampleRow,
    columnCounts,
    uniqueValues,
    dateRanges
  }
}

function printTableAnalysis(tableName: string, stats: TableStats) {
  console.log(`\n📋 Table: ${tableName}`)
  console.log('━'.repeat(60))
  console.log(`Total Rows: ${stats.totalRows.toLocaleString()}`)
  
  if (!stats.sampleRow) {
    console.log('⚠️  No data in table')
    return
  }

  const columns = Object.keys(stats.sampleRow)
  console.log(`\n📊 Column Analysis (${columns.length} columns):`)
  console.log('─'.repeat(60))

  // Sort columns by completeness (most complete first)
  const sortedColumns = Object.entries(stats.columnCounts)
    .sort((a, b) => b[1].percentage - a[1].percentage)

  for (const [col, counts] of sortedColumns) {
    const sampleValue = stats.sampleRow[col]
    const sampleType = typeof sampleValue
    const sampleDisplay = sampleValue === null || sampleValue === undefined
      ? 'null'
      : String(sampleValue).length > 30
      ? String(sampleValue).substring(0, 30) + '...'
      : String(sampleValue)

    const completeness = counts.percentage >= 90 ? '✅' : counts.percentage >= 50 ? '⚠️' : '❌'
    
    console.log(`\n${completeness} ${col}`)
    console.log(`   Type: ${sampleType}`)
    console.log(`   Completeness: ${counts.percentage.toFixed(1)}% (${counts.nonNull.toLocaleString()} / ${counts.total.toLocaleString()} non-null)`)
    console.log(`   Sample: ${sampleDisplay}`)

    // Show unique values if reasonable
    if (stats.uniqueValues[col] && stats.uniqueValues[col].size <= 20 && stats.uniqueValues[col].size > 0) {
      const uniqueVals = Array.from(stats.uniqueValues[col]).slice(0, 10)
      console.log(`   Unique values (sample): ${uniqueVals.join(', ')}`)
    } else if (stats.uniqueValues[col] && stats.uniqueValues[col].size > 20) {
      console.log(`   Unique values: ${stats.uniqueValues[col].size} distinct`)
    }

    // Show date range if available
    if (stats.dateRanges[col]) {
      const { min, max } = stats.dateRanges[col]
      console.log(`   Date range: ${min?.split('T')[0]} to ${max?.split('T')[0]}`)
    }
  }
}

async function analyzeRelationships() {
  console.log(`\n\n🔗 Relationship Analysis`)
  console.log('━'.repeat(60))

  // Check if emails link between tables
  const { data: repliesSample } = await supabase
    .from('replies')
    .select('from_email, lead_id, campaign_id')
    .limit(100)

  const { data: leadsSample } = await supabase
    .from('engaged_leads')
    .select('email, lead_id')
    .limit(100)

  const { data: meetingsSample } = await supabase
    .from('meetings_booked')
    .select('email, campaign_id')
    .limit(100)

  if (repliesSample && leadsSample) {
    const replyEmails = new Set(repliesSample.map(r => r.from_email?.toLowerCase()).filter(Boolean))
    const leadEmails = new Set(leadsSample.map(l => l.email?.toLowerCase()).filter(Boolean))
    const overlap = [...replyEmails].filter(e => leadEmails.has(e)).length
    
    console.log(`\n📧 Email Linking:`)
    console.log(`   Replies with emails: ${replyEmails.size}`)
    console.log(`   Engaged leads with emails: ${leadEmails.size}`)
    console.log(`   Overlap: ${overlap} emails appear in both`)
  }

  if (repliesSample && meetingsSample) {
    const replyEmails = new Set(repliesSample.map(r => r.from_email?.toLowerCase()).filter(Boolean))
    const meetingEmails = new Set(meetingsSample.map(m => m.email?.toLowerCase()).filter(Boolean))
    const overlap = [...replyEmails].filter(e => meetingEmails.has(e)).length
    
    console.log(`\n📧 Reply → Meeting Linking:`)
    console.log(`   Replies with emails: ${replyEmails.size}`)
    console.log(`   Meetings with emails: ${meetingEmails.size}`)
    console.log(`   Overlap: ${overlap} emails appear in both`)
  }
}

async function main() {
  console.log('🚀 Supabase Schema Analysis')
  console.log('═'.repeat(60))
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`Key: ${supabaseKey.substring(0, 20)}...`)

  const tables = ['replies', 'engaged_leads', 'meetings_booked']
  const analyses: Record<string, TableStats> = {}

  for (const table of tables) {
    try {
      analyses[table] = await analyzeTable(table)
      printTableAnalysis(table, analyses[table])
    } catch (error) {
      console.error(`\n❌ Error analyzing ${table}:`, error)
    }
  }

  // Relationship analysis
  try {
    await analyzeRelationships()
  } catch (error) {
    console.error(`\n❌ Error analyzing relationships:`, error)
  }

  // Summary report
  console.log(`\n\n📈 Summary Report`)
  console.log('═'.repeat(60))

  console.log(`\n✅ Useful Data Points:`)
  
  // Replies analysis
  if (analyses.replies) {
    const replies = analyses.replies
    console.log(`\n📧 Replies Table:`)
    console.log(`   - Total replies: ${replies.totalRows.toLocaleString()}`)
    if (replies.columnCounts.category) {
      console.log(`   - Category column: ${replies.columnCounts.category.percentage.toFixed(1)}% complete`)
    }
    if (replies.columnCounts.text_body) {
      console.log(`   - Text body: ${replies.columnCounts.text_body.percentage.toFixed(1)}% complete`)
    }
    if (replies.columnCounts.date_received) {
      console.log(`   - Date received: ${replies.columnCounts.date_received.percentage.toFixed(1)}% complete`)
    }
  }

  // Engaged leads analysis
  if (analyses.engaged_leads) {
    const leads = analyses.engaged_leads
    console.log(`\n👥 Engaged Leads Table:`)
    console.log(`   - Total leads: ${leads.totalRows.toLocaleString()}`)
    
    const stageColumns = ['showed_up_to_disco', 'qualified', 'demo_booked', 'showed_up_to_demo', 'proposal_sent', 'pilot_accepted', 'closed']
    const stageCounts = stageColumns
      .filter(col => leads.columnCounts[col])
      .map(col => ({ col, count: leads.columnCounts[col].nonNull }))
    
    console.log(`   - Stage tracking columns: ${stageCounts.length}`)
    stageCounts.forEach(({ col, count }) => {
      console.log(`     • ${col}: ${count.toLocaleString()} leads`)
    })

    const firmographicColumns = ['company_size', 'annual_revenue', 'industry', 'company_hq_city', 'company_hq_state']
    const firmographicComplete = firmographicColumns
      .filter(col => leads.columnCounts[col] && leads.columnCounts[col].percentage > 50)
      .length
    
    console.log(`   - Firmographic data: ${firmographicComplete}/${firmographicColumns.length} columns >50% complete`)
  }

  // Meetings analysis
  if (analyses.meetings_booked) {
    const meetings = analyses.meetings_booked
    console.log(`\n📅 Meetings Booked Table:`)
    console.log(`   - Total meetings: ${meetings.totalRows.toLocaleString()}`)
    
    const firmographicColumns = ['company_size', 'annual_revenue', 'industry']
    const firmographicComplete = firmographicColumns
      .filter(col => meetings.columnCounts[col] && meetings.columnCounts[col].percentage > 50)
      .length
    
    console.log(`   - Firmographic enrichment: ${firmographicComplete}/${firmographicColumns.length} columns >50% complete`)
  }

  console.log(`\n\n✅ Analysis Complete!`)
}

main().catch(console.error)




