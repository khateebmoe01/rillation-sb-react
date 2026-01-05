// Script to run the sync-meetings-booked edge function
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runSync() {
  console.log('Invoking sync-meetings-booked edge function...')
  console.log('This may take a while depending on the number of leads...\n')

  try {
    const { data, error } = await supabase.functions.invoke('sync-meetings-booked', {
      body: {},
    })

    if (error) {
      console.error('Error:', error)
      process.exit(1)
    }

    console.log('Sync completed successfully!')
    console.log('\nResults:')
    console.log(JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('Failed to invoke function:', err)
    process.exit(1)
  }
}

runSync()









