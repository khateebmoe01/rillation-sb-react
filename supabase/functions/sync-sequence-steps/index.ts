import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BISON_API_BASE = 'https://send.rillationrevenue.com/api/campaigns/v1.1'

interface SequenceStep {
  id: number
  email_subject: string
  order: string
  email_body: string
  wait_in_days: string
  variant: boolean
  variant_from_step_id: number | null
  attachments: unknown[]
  thread_reply: boolean
}

interface BisonResponse {
  data?: {
    sequence_id: number
    sequence_steps: SequenceStep[]
  }
}

interface Campaign {
  campaign_id: string
  client: string | null
}

interface Client {
  Business: string
  'Api Key - Bison': string | null
}

// Background sync function
async function syncSequenceSteps() {
  console.log('Starting sequence steps sync...')
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Get all campaigns
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('Campaigns')
      .select('campaign_id, client')
    
    if (campaignsError) {
      console.error(`Failed to fetch campaigns: ${campaignsError.message}`)
      return
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('No campaigns found')
      return
    }

    console.log(`Found ${campaigns.length} campaigns to sync`)

    // Step 2: Get all clients with their API keys
    const { data: clients, error: clientsError } = await supabaseClient
      .from('Clients')
      .select('"Business", "Api Key - Bison"')
    
    if (clientsError) {
      console.error(`Failed to fetch clients: ${clientsError.message}`)
      return
    }

    // Create a map of client name -> API key
    const clientApiKeys: Record<string, string> = {}
    for (const client of (clients as Client[]) || []) {
      if (client.Business && client['Api Key - Bison']) {
        clientApiKeys[client.Business] = client['Api Key - Bison']
      }
    }

    let totalSynced = 0
    let totalErrors = 0

    // Step 3: For each campaign, fetch sequence steps from Bison API
    for (const campaign of campaigns as Campaign[]) {
      const { campaign_id, client } = campaign

      if (!campaign_id) {
        console.log('Skipping campaign with no campaign_id')
        continue
      }

      if (!client || !clientApiKeys[client]) {
        console.log(`Skipping campaign ${campaign_id}: No API key for client "${client}"`)
        continue
      }

      const apiKey = clientApiKeys[client]

      try {
        // Call Bison API
        const response = await fetch(`${BISON_API_BASE}/${campaign_id}/sequence-steps`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          console.error(`Campaign ${campaign_id}: API returned ${response.status}`)
          totalErrors++
          continue
        }

        const data: BisonResponse = await response.json()

        if (!data.data || !data.data.sequence_steps || data.data.sequence_steps.length === 0) {
          console.log(`Campaign ${campaign_id}: No sequence steps found`)
          continue
        }

        const { sequence_id, sequence_steps } = data.data

        // Step 4: Upsert sequence steps into database
        const stepsToInsert = sequence_steps.map((step) => ({
          campaign_id,
          client,
          sequence_id,
          step_id: step.id,
          email_subject: step.email_subject,
          order: parseInt(step.order, 10) || 0,
          email_body: step.email_body,
          wait_in_days: parseInt(step.wait_in_days, 10) || 0,
          variant: step.variant,
          variant_from_step_id: step.variant_from_step_id,
          attachments: step.attachments,
          thread_reply: step.thread_reply,
        }))

        // Use upsert to avoid duplicates - match on campaign_id + step_id
        const { error: insertError } = await supabaseClient
          .from('sequence_steps')
          .upsert(stepsToInsert, {
            onConflict: 'campaign_id,step_id',
            ignoreDuplicates: false,
          })

        if (insertError) {
          // If upsert with conflict fails, try inserting only new records
          const { data: existingSteps } = await supabaseClient
            .from('sequence_steps')
            .select('step_id')
            .eq('campaign_id', campaign_id)

          const existingStepIds = new Set(existingSteps?.map(s => s.step_id) || [])
          const newSteps = stepsToInsert.filter(s => !existingStepIds.has(s.step_id))

          if (newSteps.length > 0) {
            const { error: insertNewError } = await supabaseClient
              .from('sequence_steps')
              .insert(newSteps)

            if (insertNewError) {
              console.error(`Campaign ${campaign_id}: Insert error - ${insertNewError.message}`)
              totalErrors++
              continue
            }

            totalSynced += newSteps.length
            console.log(`Campaign ${campaign_id}: Synced ${newSteps.length} new steps`)
          } else {
            console.log(`Campaign ${campaign_id}: No new steps to sync`)
          }
        } else {
          totalSynced += stepsToInsert.length
          console.log(`Campaign ${campaign_id}: Synced ${stepsToInsert.length} steps`)
        }

      } catch (fetchError) {
        console.error(`Campaign ${campaign_id}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
        totalErrors++
      }
    }

    console.log(`Sync complete: ${totalSynced} steps synced, ${totalErrors} errors`)

  } catch (error) {
    console.error('Sync sequence steps error:', error)
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Return 200 immediately
  const response = new Response(
    JSON.stringify({
      success: true,
      message: 'Sync started in background',
      started_at: new Date().toISOString(),
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  )

  // Run sync in background using EdgeRuntime.waitUntil
  // This keeps the function alive after the response is sent
  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(syncSequenceSteps())
  } else {
    // Fallback: just start it (will run until function times out)
    syncSequenceSteps()
  }

  return response
})
