import { supabase } from './supabase'

// Table Registry - All tables and their date columns
export const TABLE_DATE_COLUMNS = {
  campaign_reporting: { column: 'date', type: 'DATE' },
  replies: { column: 'date_received', type: 'TIMESTAMPTZ' },
  meetings_booked: { column: 'created_time', type: 'TIMESTAMPTZ' },
  engaged_leads: { column: 'date_created', type: 'DATE' },
  funnel_forecasts: { column: null, type: 'MONTH/YEAR integers' },
  Clients: { column: null, type: 'No date filter' },
  client_targets: { column: null, type: 'No date filter' },
  inboxes: { column: null, type: 'No date filter' },
  storeleads: { column: null, type: 'No date filter' },
  Campaigns: { column: null, type: 'No date filter' },
} as const

export type TableName = keyof typeof TABLE_DATE_COLUMNS

// Query log entry interface
export interface QueryLogEntry {
  timestamp: string
  table: string
  filters: string[]
  rowCount: number
  hitLimit: boolean
  error?: string
}

// Global query log
let queryLog: QueryLogEntry[] = []

// Get query log
export function getQueryLog(): QueryLogEntry[] {
  return [...queryLog]
}

// Clear query log
export function clearQueryLog(): void {
  queryLog = []
}

// Format date for query
function formatDateForQuery(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format date for query end of day (for TIMESTAMPTZ)
function formatDateForQueryEndOfDay(date: Date): string {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  return formatDateForQuery(nextDay)
}

// Log a query
function logQuery(
  table: string,
  filters: string[],
  rowCount: number,
  error?: string
): void {
  const entry: QueryLogEntry = {
    timestamp: new Date().toISOString(),
    table,
    filters,
    rowCount,
    hitLimit: rowCount === 1000,
    error,
  }
  queryLog.push(entry)
  console.log('[DEBUG QUERY]', entry)
}

// Wrapper to log Supabase queries
export async function loggedQuery<T>(
  table: TableName,
  queryBuilder: any,
  description?: string
): Promise<{ data: T[] | null; error: any; count: number }> {
  const filters: string[] = []
  if (description) filters.push(`Description: ${description}`)

  try {
    // Execute query with count
    const { data, error, count } = await queryBuilder

    if (error) {
      logQuery(table, [...filters, `ERROR: ${error.message}`], 0, error.message)
      return { data: null, error, count: 0 }
    }

    const rowCount = data?.length || 0
    const totalCount = count || rowCount

    // Try to extract filter info from query builder (if possible)
    // Note: Supabase query builder doesn't expose filters easily, so we'll log what we can
    logQuery(table, filters, rowCount)

    return { data: data as T[], error: null, count: totalCount }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logQuery(table, [...filters, `EXCEPTION: ${errorMsg}`], 0, errorMsg)
    return { data: null, error: err, count: 0 }
  }
}

// Test query results interface
export interface TestQueryResult {
  table: string
  dateColumn: string | null
  dateColumnType: string
  totalCount: number
  november2025: number
  december2025: number
  sumNovDec: number
  validation: 'pass' | 'fail' | 'warning'
  error?: string
}

// Run test queries for a specific table
export async function runTestQueries(table: TableName): Promise<TestQueryResult> {
  const tableInfo = TABLE_DATE_COLUMNS[table]
  const dateColumn = tableInfo.column
  const dateColumnType = tableInfo.type

  const result: TestQueryResult = {
    table,
    dateColumn,
    dateColumnType,
    totalCount: 0,
    november2025: 0,
    december2025: 0,
    sumNovDec: 0,
    validation: 'pass',
  }

  try {
    // Total count (no date filter)
    const { count: totalCount, error: totalError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      result.error = totalError.message
      result.validation = 'fail'
      return result
    }

    result.totalCount = totalCount || 0

    // If table has no date column, skip date-specific tests
    if (!dateColumn) {
      result.validation = 'warning'
      return result
    }

    // November 2025: 2025-11-01 to 2025-11-30
    const novStart = '2025-11-01'
    const novEnd = '2025-11-30'
    const novEndNextDay = '2025-12-01' // For TIMESTAMPTZ

    // December 2025: 2025-12-01 to 2025-12-31
    const decStart = '2025-12-01'
    const decEnd = '2025-12-31'
    const decEndNextDay = '2026-01-01' // For TIMESTAMPTZ

    // Build November query
    let novQuery = supabase.from(table).select('*', { count: 'exact', head: true })
    if (dateColumnType === 'TIMESTAMPTZ') {
      novQuery = novQuery.gte(dateColumn, novStart).lt(dateColumn, novEndNextDay)
    } else {
      novQuery = novQuery.gte(dateColumn, novStart).lte(dateColumn, novEnd)
    }

    const { count: novCount, error: novError } = await novQuery

    if (novError) {
      result.error = novError.message
      result.validation = 'fail'
      return result
    }

    result.november2025 = novCount || 0

    // Build December query
    let decQuery = supabase.from(table).select('*', { count: 'exact', head: true })
    if (dateColumnType === 'TIMESTAMPTZ') {
      decQuery = decQuery.gte(dateColumn, decStart).lt(dateColumn, decEndNextDay)
    } else {
      decQuery = decQuery.gte(dateColumn, decStart).lte(dateColumn, decEnd)
    }

    const { count: decCount, error: decError } = await decQuery

    if (decError) {
      result.error = decError.message
      result.validation = 'fail'
      return result
    }

    result.december2025 = decCount || 0
    result.sumNovDec = result.november2025 + result.december2025

    // Validation: Nov + Dec should be <= Total (unless there's data outside these months)
    if (result.sumNovDec > result.totalCount) {
      result.validation = 'fail'
    } else if (result.sumNovDec === 0 && result.totalCount > 0) {
      result.validation = 'warning' // No data in Nov/Dec but data exists
    } else {
      result.validation = 'pass'
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
    result.validation = 'fail'
  }

  return result
}

// Run test queries for all tables
export async function runAllTestQueries(): Promise<TestQueryResult[]> {
  const tables = Object.keys(TABLE_DATE_COLUMNS) as TableName[]
  const results: TestQueryResult[] = []

  for (const table of tables) {
    const result = await runTestQueries(table)
    results.push(result)
  }

  return results
}


