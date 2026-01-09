import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pfxgcavxdktxooiqthoi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeGdjYXZ4ZGt0eG9vaXF0aG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk5NTEwMSwiZXhwIjoyMDc4NTcxMTAxfQ.fo0jfTS0YAUh9pEEnjEgf5gIVzbTYhlMFkptcGQ1vvo'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250109000000_add_mentions_to_iteration_logs.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  
  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`Executing ${statements.length} SQL statements...`)
  
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 60)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: queryError } = await supabase.from('_migrations').select('*').limit(0)
        // If that works, try using the REST API endpoint
        console.log('RPC not available, trying direct connection...')
      }
    } catch (err) {
      console.error(`Error executing statement:`, err)
    }
  }
  
  console.log('Migration applied!')
}

// Alternative: Use direct PostgreSQL connection via pg
import pg from 'pg'
const { Client } = pg

async function applyMigrationDirect() {
  // Use connection pooling from Supabase
  const connectionString = `postgresql://postgres.pfxgcavxdktxooiqthoi:${process.env.DB_PASSWORD || ''}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    console.log('Connected to database')
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250109000000_add_mentions_to_iteration_logs.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    
    await client.query(sql)
    console.log('Migration applied successfully!')
  } catch (err) {
    console.error('Error applying migration:', err)
  } finally {
    await client.end()
  }
}

// Try the direct approach
applyMigrationDirect().catch(console.error)
