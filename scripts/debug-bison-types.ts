import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugBisonTypes() {
  console.log('🔍 Fetching clients and their Bison API data...\n')

  // Get clients
  const { data: clients, error } = await supabase
    .from('Clients')
    .select('Business, "Api Key - Bison"')

  if (error) {
    console.error('Error fetching clients:', error)
    return
  }

  if (!clients || clients.length === 0) {
    console.log('No clients found')
    return
  }

  for (const client of clients) {
    const businessName = client.Business
    const apiKey = client['Api Key - Bison']

    if (!apiKey) {
      console.log(`❌ ${businessName}: No API key`)
      continue
    }

    console.log(`\n📊 ${businessName}`)
    console.log('=' .repeat(50))

    try {
      // Fetch first page of inboxes
      const res = await fetch('https://send.rillationrevenue.com/api/sender-emails?per_page=100', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (!res.ok) {
        console.error(`API error: ${res.status}`)
        continue
      }

      const json = await res.json()
      const inboxes = json.data || json || []

      // Count types
      const typeCounts: Record<string, number> = {}
      const typeExamples: Record<string, string[]> = {}

      for (const inbox of inboxes) {
        const type = inbox.type || inbox.account_type || 'undefined'
        typeCounts[type] = (typeCounts[type] || 0) + 1
        
        if (!typeExamples[type]) {
          typeExamples[type] = []
        }
        if (typeExamples[type].length < 2) {
          typeExamples[type].push(inbox.email || inbox.email_address || 'no email')
        }
      }

      console.log(`Total inboxes: ${inboxes.length}`)
      console.log('\nTypes found:')
      for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`)
        console.log(`    Examples: ${typeExamples[type].join(', ')}`)
      }

      // Show a sample inbox structure
      if (inboxes.length > 0) {
        console.log('\nSample inbox structure:')
        console.log(JSON.stringify({
          id: inboxes[0].id,
          email: inboxes[0].email || inboxes[0].email_address,
          type: inboxes[0].type,
          account_type: inboxes[0].account_type,
          status: inboxes[0].status,
        }, null, 2))
      }

    } catch (err) {
      console.error(`Error fetching data: ${err}`)
    }
  }
}

debugBisonTypes()
