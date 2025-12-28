import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BISON_API_BASE = "https://send.rillationrevenue.com/api"
const CLAY_WEBHOOK_URL = "https://api.clay.com/v3/sources/webhook/pull-in-data-from-a-webhook-ae5a0d54-d8f8-4bca-94e8-3e3a2e8cea49"

interface LeadData {
  id?: number
  email?: string
  first_name?: string
  last_name?: string
  title?: string
  company?: string
  tags?: Array<{ id: number; name: string }> | Array<number>
  custom_variables?: Array<{ name: string; value: string }>
  lead_campaign_data?: Array<{
    campaign_id?: number
    campaign_name?: string
    name?: string
    id?: number
  }>
  created_at?: string
  created_time?: string
  updated_at?: string
  updated_time?: string
  overall_stats?: {
    emails_sent?: number
    opens?: number
    replies?: number
  }
}

interface Workspace {
  name: string
  token: string
}

interface Tag {
  id: number
  name: string
}

async function callBisonAPI(
  endpoint: string,
  token: string,
  params?: Record<string, any>
): Promise<any> {
  const url = `${BISON_API_BASE}${endpoint}`
  const headers = {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
    "Content-Type": "application/json",
  }

  try {
    // Build query string for array parameters
    let fullUrl = url
    if (params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          // Handle array params like filters[tag_ids][]
          value.forEach((v) => {
            searchParams.append(key, String(v))
          })
        } else {
          searchParams.append(key, String(value))
        }
      }
      fullUrl = `${url}?${searchParams.toString()}`
    }

    const response = await fetch(fullUrl, { headers, method: "GET" })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Bison API error: ${response.status} - ${errorText.substring(0, 200)}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

function extractTags(data: any): Tag[] {
  if (!data) return []
  
  if (Array.isArray(data)) {
    return data.filter((t) => typeof t === 'object' && t.id && t.name)
  }
  
  if (typeof data === 'object') {
    if (data.data && Array.isArray(data.data)) {
      return data.data.filter((t: any) => typeof t === 'object' && t.id && t.name)
    }
    if (data.tags && Array.isArray(data.tags)) {
      return data.tags.filter((t: any) => typeof t === 'object' && t.id && t.name)
    }
    if (data.id && data.name) {
      return [data]
    }
  }
  
  return []
}

function extractLeads(data: any): LeadData[] {
  if (!data) return []
  
  if (Array.isArray(data)) {
    return data.filter((l) => typeof l === 'object' && l.email)
  }
  
  if (typeof data === 'object') {
    if (data.data && Array.isArray(data.data)) {
      return data.data.filter((l: any) => typeof l === 'object' && l.email)
    }
    if (data.email) {
      return [data]
    }
  }
  
  return []
}

async function getTagsForWorkspace(token: string): Promise<Tag[]> {
  const data = await callBisonAPI("/tags", token)
  return extractTags(data)
}

function findMeetingBookedTag(tags: Tag[]): number | null {
  for (const tag of tags) {
    if (tag.name && tag.name.toLowerCase().trim() === "meeting booked") {
      return tag.id
    }
  }
  return null
}

async function getLeadsWithTag(
  token: string,
  tagId: number,
  sinceDate?: string
): Promise<LeadData[]> {
  const allLeads: LeadData[] = []
  let page = 1
  const perPage = 200

  while (true) {
    // Build query string manually for array parameters
    const queryParams = new URLSearchParams()
    queryParams.append(`filters[tag_ids][]`, String(tagId))
    queryParams.append('page', String(page))
    queryParams.append('per_page', String(perPage))
    
    // Try to filter by updated_at if sinceDate is provided
    if (sinceDate) {
      queryParams.append('filters[updated_at][gte]', sinceDate)
    }

    try {
      const url = `${BISON_API_BASE}/leads?${queryParams.toString()}`
      const headers = {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
        "Content-Type": "application/json",
      }

      const response = await fetch(url, { headers, method: "GET" })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error fetching leads page ${page}: ${response.status} - ${errorText.substring(0, 200)}`)
        break
      }

      const data = await response.json()
      const leads = extractLeads(data)

      if (leads.length === 0) {
        break
      }

      allLeads.push(...leads)

      // Check pagination
      if (typeof data === 'object' && data.meta) {
        const currentPage = data.meta.current_page || page
        const lastPage = data.meta.last_page
        if (lastPage && currentPage >= lastPage) {
          break
        }
      }

      // Check links for pagination
      if (typeof data === 'object' && data.links && !data.links.next) {
        break
      }

      if (leads.length < perPage) {
        break
      }

      page++
    } catch (error) {
      console.error(`Error fetching leads page ${page}:`, error)
      break
    }
  }

  return allLeads
}

function parseDatetime(dtStr: string | undefined | null): string | null {
  if (!dtStr) return null
  try {
    const date = new Date(dtStr)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

function prepareLeadRecord(leadData: LeadData, workspaceName: string): Record<string, any> {
  // Initialize with direct fields (allow null values)
  const leadRecord: Record<string, any> = {
    email: leadData.email || null,
    first_name: leadData.first_name || null,
    last_name: leadData.last_name || null,
    title: leadData.title || null,
    company: leadData.company || null,
    client: workspaceName,
  }

  // Compute full_name from first_name and last_name
  if (leadRecord.first_name || leadRecord.last_name) {
    leadRecord.full_name = [leadRecord.first_name, leadRecord.last_name]
      .filter(Boolean)
      .join(' ')
  } else {
    leadRecord.full_name = null
  }

  // Parse datetime fields
  const createdTime = parseDatetime(leadData.created_at || leadData.created_time)
  leadRecord.created_time = createdTime || null

  // Extract custom variables with exact name matching
  const customVars = leadData.custom_variables || []
  const customVarMap = new Map<string, string | null>()
  
  if (Array.isArray(customVars)) {
    for (const varItem of customVars) {
      if (typeof varItem === 'object' && varItem.name) {
        // Store exact name -> value mapping (allow null/empty values)
        const varName = varItem.name.toLowerCase()
        const varValue = varItem.value || null
        customVarMap.set(varName, varValue)
      }
    }
  }

  // Map exact custom variable names to record fields
  const fieldMappings: Record<string, string> = {
    'company_linkedin': 'company_linkedin',
    'company_domain': 'company_domain',
    'campaign_name': 'campaign_name',
    'profile_url': 'profile_url',
    'campaign_id': 'campaign_id',
  }

  // Initialize all custom variable fields as null first
  for (const recordField of Object.values(fieldMappings)) {
    leadRecord[recordField] = null
  }

  // Extract values from custom variables using exact matching
  for (const [customVarName, recordField] of Object.entries(fieldMappings)) {
    const value = customVarMap.get(customVarName.toLowerCase())
    if (value !== undefined) {
      // Handle campaign_id as integer
      if (recordField === 'campaign_id' && value !== null && value !== '') {
        try {
          const parsedId = parseInt(String(value))
          leadRecord[recordField] = isNaN(parsedId) ? null : parsedId
        } catch {
          leadRecord[recordField] = null
        }
      } else {
        // For other fields, use the value (can be null or empty string)
        leadRecord[recordField] = value === '' ? null : value
      }
    }
  }

  // Extract campaign information from lead_campaign_data (fallback if not in custom variables)
  const leadCampaignData = leadData.lead_campaign_data || []
  if (Array.isArray(leadCampaignData) && leadCampaignData.length > 0) {
    const campaignNames: string[] = []
    const campaignIds: number[] = []

    for (const campaign of leadCampaignData) {
      if (typeof campaign === 'object') {
        const name = campaign.campaign_name || campaign.name
        if (name) {
          campaignNames.push(name)
        }

        const cId = campaign.campaign_id || campaign.id
        if (cId) {
          try {
            const id = typeof cId === 'number' ? cId : parseInt(String(cId))
            if (!isNaN(id)) {
              campaignIds.push(id)
            }
          } catch {
            // Ignore invalid campaign ID
          }
        }
      }
    }

    // Use campaign_name from lead_campaign_data if not already set from custom variables
    if (campaignNames.length > 0 && !leadRecord.campaign_name) {
      leadRecord.campaign_name = campaignNames[0]
    }

    // Use campaign_id from lead_campaign_data if not already set from custom variables
    if (campaignIds.length > 0 && !leadRecord.campaign_id) {
      leadRecord.campaign_id = campaignIds[0]
    }
  }

  // Return record with all fields (including nulls) - no filtering
  return leadRecord
}

async function getExistingEmails(supabase: any): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('meetings_booked')
      .select('email')
    
    if (error) {
      console.error('Error fetching existing emails:', error)
      return new Set()
    }

    const emails = new Set<string>()
    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.email) {
          emails.add(row.email.toLowerCase())
        }
      }
    }

    return emails
  } catch (error) {
    console.error('Error getting existing emails:', error)
    return new Set()
  }
}

async function pushToClayWebhook(leadRecord: Record<string, any>): Promise<boolean> {
  try {
    console.log(`Pushing to Clay webhook for email: ${leadRecord.email}`)
    console.log(`Webhook URL: ${CLAY_WEBHOOK_URL}`)
    
    const payload = JSON.stringify(leadRecord)
    console.log(`Payload size: ${payload.length} bytes`)
    
    const response = await fetch(CLAY_WEBHOOK_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: payload,
    })
    
    const responseText = await response.text()
    const statusCode = response.status
    
    // Accept any 2xx status code as success
    const isSuccess = statusCode >= 200 && statusCode < 300
    
    if (!isSuccess) {
      console.error(`Clay webhook failed with status ${statusCode}`)
      console.error(`Response: ${responseText.substring(0, 1000)}`)
      return false
    }
    
    console.log(`Clay webhook success for ${leadRecord.email}, status: ${statusCode}`)
    if (responseText) {
      console.log(`Response: ${responseText.substring(0, 500)}`)
    }
    return true
  } catch (error) {
    console.error("Clay webhook error:", error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all workspaces from Clients table
    const { data: clients, error: clientsError } = await supabase
      .from('Clients')
      .select('Business, "Api Key - Bison"')

    if (clientsError || !clients || clients.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No workspaces found in Clients table',
          details: clientsError?.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter workspaces with valid tokens
    const workspaces: Workspace[] = []
    for (const client of clients) {
      const name = client.Business
      const token = client['Api Key - Bison']
      if (name && token) {
        workspaces.push({ name, token })
      }
    }

    if (workspaces.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No workspaces with valid API keys found',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate date 24 hours ago (if we want to filter)
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sinceDate = yesterday.toISOString()

    // Get existing emails to avoid duplicates
    const existingEmails = await getExistingEmails(supabase)

    let totalProcessed = 0
    let totalNew = 0
    let totalWebhookSuccess = 0
    let totalWebhookFailures = 0
    const results: Record<string, { processed: number; new: number; webhook_success: number; webhook_failures: number; errors: string[] }> = {}

    // Process each workspace
    for (const workspace of workspaces) {
      const workspaceResults = {
        processed: 0,
        new: 0,
        webhook_success: 0,
        webhook_failures: 0,
        errors: [] as string[],
      }

      try {
        console.log(`Processing workspace: ${workspace.name}`)

        // Get all tags for this workspace
        const tags = await getTagsForWorkspace(workspace.token)
        const meetingBookedTagId = findMeetingBookedTag(tags)

        if (!meetingBookedTagId) {
          workspaceResults.errors.push('Meeting Booked tag not found')
          results[workspace.name] = workspaceResults
          continue
        }

        // Try to get leads from past 24 hours first
        let leads = await getLeadsWithTag(workspace.token, meetingBookedTagId, sinceDate)

        // If no leads in past 24 hours, get all leads (fallback)
        if (leads.length === 0) {
          console.log(`No leads in past 24 hours for ${workspace.name}, fetching all leads`)
          leads = await getLeadsWithTag(workspace.token, meetingBookedTagId)
        }

        console.log(`Found ${leads.length} leads for ${workspace.name}`)

        // Process each lead
        for (const lead of leads) {
          if (!lead.email) {
            continue
          }

          workspaceResults.processed++
          totalProcessed++

          // Check if email already exists
          const emailLower = lead.email.toLowerCase()
          if (existingEmails.has(emailLower)) {
            continue // Skip duplicates
          }

          try {
            // Prepare lead record
            const leadRecord = prepareLeadRecord(lead, workspace.name)

            // Insert new lead
            const { error: insertError } = await supabase
              .from('meetings_booked')
              .insert(leadRecord)

            if (insertError) {
              // Check if it's a duplicate error (race condition)
              const errorMsg = insertError.message.toLowerCase()
              if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('23505')) {
                // Add to existing set to avoid future duplicates in this run
                existingEmails.add(emailLower)
                continue
              }
              throw insertError
            }

            // Add to existing set and increment counters
            existingEmails.add(emailLower)
            workspaceResults.new++
            totalNew++

            console.log(`Added new lead: ${lead.email} from ${workspace.name}`)

            // Push to Clay webhook with API key included
            const webhookPayload = {
              ...leadRecord,
              api_key_bison: workspace.token,
            }
            console.log(`Webhook payload keys: ${Object.keys(webhookPayload).join(', ')}`)
            const webhookSuccess = await pushToClayWebhook(webhookPayload)
            if (webhookSuccess) {
              workspaceResults.webhook_success++
              totalWebhookSuccess++
              console.log(`Successfully pushed ${lead.email} to Clay webhook`)
            } else {
              workspaceResults.webhook_failures++
              totalWebhookFailures++
              console.error(`Failed to push ${lead.email} to Clay webhook`)
            }
          } catch (leadError) {
            const errorMsg = leadError instanceof Error ? leadError.message : String(leadError)
            workspaceResults.errors.push(`Error processing ${lead.email}: ${errorMsg}`)
            console.error(`Error processing lead ${lead.email}:`, leadError)
          }
        }

        results[workspace.name] = workspaceResults
      } catch (workspaceError) {
        const errorMsg = workspaceError instanceof Error ? workspaceError.message : String(workspaceError)
        workspaceResults.errors.push(`Workspace error: ${errorMsg}`)
        results[workspace.name] = workspaceResults
        console.error(`Error processing workspace ${workspace.name}:`, workspaceError)
      }
    }

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        summary: {
          workspaces_processed: workspaces.length,
          total_leads_processed: totalProcessed,
          total_new_leads_added: totalNew,
          total_webhook_success: totalWebhookSuccess,
          total_webhook_failures: totalWebhookFailures,
        },
        results: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

