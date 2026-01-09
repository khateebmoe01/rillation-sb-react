import pg from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg

// Get the migration SQL
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationPath = path.join(__dirname, '../supabase/migrations/20250109000000_add_mentions_to_iteration_logs.sql')
const sql = fs.readFileSync(migrationPath, 'utf-8')

// Supabase connection details
const projectRef = 'pfxgcavxdktxooiqthoi'
const supabaseUrl = `https://${projectRef}.supabase.co`
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeGdjYXZ4ZGt0eG9vaXF0aG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk5NTEwMSwiZXhwIjoyMDc4NTcxMTAxfQ.fo0jfTS0YAUh9pEEnjEgf5gIVzbTYhlMFkptcGQ1vvo'

// Try to get connection string from Supabase API or environment
async function getConnectionString() {
  // Try environment variable first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // Try constructing from Supabase project
  // For Supabase, we typically need the direct connection string
  // Format: postgresql://postgres.[ref]:[password]@[host]:5432/postgres
  // But we need the password which isn't available via API
  
  // Alternative: Use connection pooler with service role
  // But this won't work for DDL statements
  
  // Best approach: Use Supabase REST API to execute via Management API
  // But that's not publicly available
  
  throw new Error('DATABASE_URL environment variable not set. Please set it with your Supabase Postgres connection string.')
}

async function executeSQL() {
  try {
    // Get connection string
    const connectionString = await getConnectionString()
    
    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    })

    await client.connect()
    console.log('✓ Connected to database')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Executing ${statements.length} SQL statements...`)

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`\nExecuting: ${statement.substring(0, 60)}...`)
        await client.query(statement)
        console.log('✓ Success')
      }
    }

    console.log('\n✓ Migration applied successfully!')
    await client.end()
  } catch (error) {
    console.error('Error applying migration:', error)
    process.exit(1)
  }
}

// Alternative: Use Supabase HTTP endpoint if connection string not available
// We'll use the Supabase Management API or try direct REST API
async function executeViaAPI() {
  // This is a workaround - Supabase doesn't expose SQL execution via public API
  // So we'll need the actual connection string
  console.log('Direct SQL execution requires DATABASE_URL connection string.')
  console.log('You can get it from: https://supabase.com/dashboard/project/pfxgcavxdktxooiqthoi/settings/database')
  console.log('\nOr run the SQL manually in the SQL Editor.')
}

// Run
if (process.env.DATABASE_URL) {
  executeSQL()
} else {
  executeViaAPI()
  // Still try to construct connection if possible
  // For now, let's use the Supabase connection pooler format
  // But we need the password from the user
  console.log('\nPlease set DATABASE_URL environment variable with your Supabase connection string.')
  console.log('Example: DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"')
}
