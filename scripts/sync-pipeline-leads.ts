/**
 * Script to sync pipeline leads from Airtable CSV to Supabase engaged_leads table
 * 
 * CSV Columns mapping:
 * - Lead Name → full_name
 * - Email → email
 * - Qualified? → qualified
 * - Disco Show? → showed_up_to_disco
 * - Booked Demo? → demo_booked (same as Demo Booked?)
 * - Closed? → closed
 * - Demo Show? → showed_up_to_demo
 * - Booked Follow Up? → (not directly mapped)
 * - Demo Booked? → demo_booked
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface PipelineLead {
  full_name: string
  email: string
  qualified: boolean
  showed_up_to_disco: boolean
  demo_booked: boolean
  closed: boolean
  showed_up_to_demo: boolean
}

function parseCSV(csvContent: string): PipelineLead[] {
  const lines = csvContent.trim().split('\n')
  const leads: PipelineLead[] = []
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Parse CSV handling quoted fields
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current.trim())
    
    const [leadName, email, qualified, discoShow, bookedDemo, closed, demoShow, bookedFollowUp, demoBooked] = fields
    
    // Skip if no email
    if (!email || email.trim() === '') continue
    
    // Check if any field has "checked"
    const hasCheck = (val: string) => val?.toLowerCase() === 'checked'
    
    const hasAnyCheck = hasCheck(qualified) || hasCheck(discoShow) || hasCheck(bookedDemo) || 
                        hasCheck(closed) || hasCheck(demoShow) || hasCheck(demoBooked)
    
    if (hasAnyCheck) {
      leads.push({
        full_name: leadName?.replace(/^"|"$/g, '').trim() || '',
        email: email.trim().toLowerCase(),
        qualified: hasCheck(qualified),
        showed_up_to_disco: hasCheck(discoShow),
        demo_booked: hasCheck(bookedDemo) || hasCheck(demoBooked),
        closed: hasCheck(closed),
        showed_up_to_demo: hasCheck(demoShow),
      })
    }
  }
  
  // Remove duplicates by email, keeping the one with most checks
  const uniqueLeads = new Map<string, PipelineLead>()
  for (const lead of leads) {
    const existing = uniqueLeads.get(lead.email)
    if (!existing) {
      uniqueLeads.set(lead.email, lead)
    } else {
      // Merge - keep true values from both
      uniqueLeads.set(lead.email, {
        ...existing,
        qualified: existing.qualified || lead.qualified,
        showed_up_to_disco: existing.showed_up_to_disco || lead.showed_up_to_disco,
        demo_booked: existing.demo_booked || lead.demo_booked,
        closed: existing.closed || lead.closed,
        showed_up_to_demo: existing.showed_up_to_demo || lead.showed_up_to_demo,
      })
    }
  }
  
  return Array.from(uniqueLeads.values())
}

async function syncLeads(csvPath: string) {
  console.log('Reading CSV file...')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  
  console.log('Parsing leads with funnel marks...')
  const leads = parseCSV(csvContent)
  
  console.log(`\nFound ${leads.length} leads with funnel progress:\n`)
  
  // Print all emails
  leads.forEach((lead, i) => {
    const stages = []
    if (lead.qualified) stages.push('Qualified')
    if (lead.showed_up_to_disco) stages.push('Disco Show')
    if (lead.demo_booked) stages.push('Demo Booked')
    if (lead.showed_up_to_demo) stages.push('Demo Show')
    if (lead.closed) stages.push('Closed')
    console.log(`${i + 1}. ${lead.email} - ${stages.join(', ')}`)
  })
  
  console.log('\n--- Syncing to Supabase engaged_leads ---\n')
  
  let updated = 0
  let inserted = 0
  let errors = 0
  
  for (const lead of leads) {
    // Check if lead exists by email
    const { data: existing, error: selectError } = await supabase
      .from('engaged_leads')
      .select('id, email')
      .eq('email', lead.email)
      .maybeSingle()
    
    if (selectError) {
      console.error(`Error checking ${lead.email}:`, selectError.message)
      errors++
      continue
    }
    
    if (existing) {
      // Update existing lead
      const { error: updateError } = await supabase
        .from('engaged_leads')
        .update({
          qualified: lead.qualified,
          showed_up_to_disco: lead.showed_up_to_disco,
          demo_booked: lead.demo_booked,
          showed_up_to_demo: lead.showed_up_to_demo,
          closed: lead.closed,
          full_name: lead.full_name || existing.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      
      if (updateError) {
        console.error(`Error updating ${lead.email}:`, updateError.message)
        errors++
      } else {
        console.log(`✓ Updated: ${lead.email}`)
        updated++
      }
    } else {
      // Insert new lead
      const { error: insertError } = await supabase
        .from('engaged_leads')
        .insert({
          email: lead.email,
          full_name: lead.full_name,
          qualified: lead.qualified,
          showed_up_to_disco: lead.showed_up_to_disco,
          demo_booked: lead.demo_booked,
          showed_up_to_demo: lead.showed_up_to_demo,
          closed: lead.closed,
          client: 'Rillation Revenue', // Default client
          date_created: new Date().toISOString().split('T')[0],
        })
      
      if (insertError) {
        console.error(`Error inserting ${lead.email}:`, insertError.message)
        errors++
      } else {
        console.log(`+ Inserted: ${lead.email}`)
        inserted++
      }
    }
  }
  
  console.log('\n--- Summary ---')
  console.log(`Total leads processed: ${leads.length}`)
  console.log(`Updated: ${updated}`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Errors: ${errors}`)
}

// Run the script
const csvPath = process.argv[2] || '/Users/mokhateeb/Downloads/Opportunities-Stages-2.csv'
syncLeads(csvPath).catch(console.error)












