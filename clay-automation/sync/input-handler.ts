import * as fs from 'fs'
import * as path from 'path'
import { supabase } from '../config/env.config.js'

export interface InputData {
  rows: Record<string, unknown>[]
  columns: string[]
  source: 'csv' | 'supabase' | 'manual'
}

// Read input from CSV file
export async function readCSV(filePath: string): Promise<InputData> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`)
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  const lines = content.trim().split('\n')

  if (lines.length === 0) {
    return { rows: [], columns: [], source: 'csv' }
  }

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse rows
  const rows: Record<string, unknown>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, unknown> = {}

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || ''
    }

    rows.push(row)
  }

  console.log(`Read ${rows.length} rows from CSV`)

  return {
    rows,
    columns: headers,
    source: 'csv',
  }
}

// Simple CSV line parser (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

// Read input from Supabase table
export async function readFromSupabase(
  tableName: string,
  filters?: Record<string, unknown>,
  limit?: number
): Promise<InputData> {
  let query = supabase.from(tableName).select('*')

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value)
    }
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to read from Supabase: ${error.message}`)
  }

  const rows = data || []
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  console.log(`Read ${rows.length} rows from Supabase table: ${tableName}`)

  return {
    rows,
    columns,
    source: 'supabase',
  }
}

// Create input data from manual rows
export function createManualInput(rows: Record<string, unknown>[]): InputData {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []

  return {
    rows,
    columns,
    source: 'manual',
  }
}

// Write results to CSV
export async function writeCSV(
  filePath: string,
  data: Record<string, unknown>[],
  columns?: string[]
): Promise<void> {
  if (data.length === 0) {
    console.log('No data to write')
    return
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  const dir = path.dirname(absolutePath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const cols = columns || Object.keys(data[0])
  const lines: string[] = []

  // Header
  lines.push(cols.map(escapeCSV).join(','))

  // Rows
  for (const row of data) {
    const values = cols.map((col) => escapeCSV(String(row[col] || '')))
    lines.push(values.join(','))
  }

  fs.writeFileSync(absolutePath, lines.join('\n'))
  console.log(`Wrote ${data.length} rows to ${absolutePath}`)
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export default {
  readCSV,
  readFromSupabase,
  createManualInput,
  writeCSV,
}
