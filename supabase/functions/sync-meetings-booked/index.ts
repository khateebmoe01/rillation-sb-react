import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BISON_API_BASE = "https://send.rillationrevenue.com/api"

// Helper to extract error message from various error types
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error === 'string') return obj.error
    if (typeof obj.code === 'string') return obj.code
    try {
      return JSON.stringify(error)
    } catch {
      return 'Unknown error object'
    }
  }
  if (typeof error === 'string') {
    return error
  }
  return String(error)
}

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

// Mapping of custom variable names (normalized) to database column names
// Handles various naming conventions (snake_case, camelCase, Title Case, etc.)
const CUSTOM_VAR_TO_COLUMN_MAP: Record<string, string> = {
  // Existing mappings
  'company_linkedin': 'company_linkedin',
  'companylinkedin': 'company_linkedin',
  'company linkedin': 'company_linkedin',
  'linkedin': 'company_linkedin',
  
  'company_domain': 'company_domain',
  'companydomain': 'company_domain',
  'company domain': 'company_domain',
  'domain': 'company_domain',
  
  'campaign_name': 'campaign_name',
  'campaignname': 'campaign_name',
  'campaign name': 'campaign_name',
  'campaign': 'campaign_name',
  
  'profile_url': 'profile_url',
  'profileurl': 'profile_url',
  'profile url': 'profile_url',
  'linkedin_url': 'profile_url',
  'linkedinurl': 'profile_url',
  
  'campaign_id': 'campaign_id',
  'campaignid': 'campaign_id',
  'campaign id': 'campaign_id',
  
  // Firmographic fields
  'company_size': 'company_size',
  'companysize': 'company_size',
  'company size': 'company_size',
  'employee_count': 'company_size',
  'employeecount': 'company_size',
  'employees': 'company_size',
  
  'annual_revenue': 'annual_revenue',
  'annualrevenue': 'annual_revenue',
  'annual revenue': 'annual_revenue',
  'revenue': 'annual_revenue',
  
  'industry': 'industry',
  
  'company_hq_city': 'company_hq_city',
  'companyhqcity': 'company_hq_city',
  'company hq city': 'company_hq_city',
  'hq_city': 'company_hq_city',
  'hqcity': 'company_hq_city',
  'city': 'company_hq_city',
  
  'company_hq_state': 'company_hq_state',
  'companyhqstate': 'company_hq_state',
  'company hq state': 'company_hq_state',
  'hq_state': 'company_hq_state',
  'hqstate': 'company_hq_state',
  'state': 'company_hq_state',
  
  'company_hq_country': 'company_hq_country',
  'companyhqcountry': 'company_hq_country',
  'company hq country': 'company_hq_country',
  'hq_country': 'company_hq_country',
  'hqcountry': 'company_hq_country',
  'country': 'company_hq_country',
  
  'year_founded': 'year_founded',
  'yearfounded': 'year_founded',
  'year founded': 'year_founded',
  'founded': 'year_founded',
  'founded_year': 'year_founded',
  
  'business_model': 'business_model',
  'businessmodel': 'business_model',
  'business model': 'business_model',
  
  'funding_stage': 'funding_stage',
  'fundingstage': 'funding_stage',
  'funding stage': 'funding_stage',
  'funding': 'funding_stage',
  
  'tech_stack': 'tech_stack',
  'techstack': 'tech_stack',
  'tech stack': 'tech_stack',
  'technologies': 'tech_stack',
  
  'is_hiring': 'is_hiring',
  'ishiring': 'is_hiring',
  'is hiring': 'is_hiring',
  'hiring': 'is_hiring',
  
  'growth_score': 'growth_score',
  'growthscore': 'growth_score',
  'growth score': 'growth_score',
}

// Columns that require special type handling
const INTEGER_COLUMNS = new Set(['campaign_id'])
const BOOLEAN_COLUMNS = new Set(['is_hiring'])
const ARRAY_COLUMNS = new Set(['tech_stack'])

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

// Normalize custom variable name for matching
function normalizeVarName(name: string): string {
  return name.toLowerCase().replace(/[-_\s]+/g, '').trim()
}

// Parse value based on column type
function parseValueForColumn(columnName: string, value: string | null): any {
  if (value === null || value === '') return null
  
  // Integer columns
  if (INTEGER_COLUMNS.has(columnName)) {
    const parsed = parseInt(String(value))
    return isNaN(parsed) ? null : parsed
  }
  
  // Boolean columns
  if (BOOLEAN_COLUMNS.has(columnName)) {
    const lowerVal = String(value).toLowerCase().trim()
    if (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1') return true
    if (lowerVal === 'false' || lowerVal === 'no' || lowerVal === '0') return false
    return null
  }
  
  // Array columns
  if (ARRAY_COLUMNS.has(columnName)) {
    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Not JSON, try comma-separated
    }
    // Split by comma and trim
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
  
  // Default: return as string
  return value
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

  // Extract ALL custom variables and map them to database columns
  const customVars = leadData.custom_variables || []
  const processedColumns = new Set<string>()
  
  if (Array.isArray(customVars)) {
    for (const varItem of customVars) {
      if (typeof varItem === 'object' && varItem.name) {
        const varName = varItem.name
        const varValue = varItem.value || null
        
        // Try to find matching column using normalized name
        const normalizedName = normalizeVarName(varName)
        
        // Check exact match first, then normalized match
        let columnName = CUSTOM_VAR_TO_COLUMN_MAP[varName.toLowerCase()]
        if (!columnName) {
          columnName = CUSTOM_VAR_TO_COLUMN_MAP[normalizedName]
        }
        
        // If we found a matching column and haven't processed it yet
        if (columnName && !processedColumns.has(columnName)) {
          leadRecord[columnName] = parseValueForColumn(columnName, varValue)
          processedColumns.add(columnName)
        }
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

// Creates a unique key for email+client combination
function createEmailClientKey(email: string, client: string): string {
  return `${email.toLowerCase()}:${client.toLowerCase()}`
}

async function getExistingEmailClientPairs(supabase: any): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('meetings_booked')
      .select('email, client')
    
    if (error) {
      console.error('Error fetching existing email+client pairs:', error)
      return new Set()
    }

    const pairs = new Set<string>()
    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.email && row.client) {
          pairs.add(createEmailClientKey(row.email, row.client))
        }
      }
    }

    return pairs
  } catch (error) {
    console.error('Error getting existing email+client pairs:', error)
    return new Set()
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

    // Get existing email+client pairs to avoid duplicates
    const existingPairs = await getExistingEmailClientPairs(supabase)

    let totalProcessed = 0
    let totalNew = 0
    const results: Record<string, { processed: number; new: number; errors: string[] }> = {}

    // Process each workspace
    for (const workspace of workspaces) {
      const workspaceResults = {
        processed: 0,
        new: 0,
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

          // Check if email+client combination already exists
          const pairKey = createEmailClientKey(lead.email, workspace.name)
          if (existingPairs.has(pairKey)) {
            continue // Skip duplicates
          }

          try {
            // Prepare lead record with all custom variables enriched
            const leadRecord = prepareLeadRecord(lead, workspace.name)

            // Insert new lead
            const { error: insertError } = await supabase
              .from('meetings_booked')
              .insert(leadRecord)

            if (insertError) {
              // Check if it's a duplicate error (race condition)
              const errorMsg = (insertError.message || '').toLowerCase()
              if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('23505')) {
                // Add to existing set to avoid future duplicates in this run
                existingPairs.add(pairKey)
                continue
              }
              // Format Supabase error properly
              const formattedError = insertError.message || insertError.code || JSON.stringify(insertError)
              workspaceResults.errors.push(`Error inserting ${lead.email}: ${formattedError}`)
              console.error(`Insert error for ${lead.email}:`, insertError)
              continue
            }

            // Add to existing set and increment counters
            existingPairs.add(pairKey)
            workspaceResults.new++
            totalNew++

            console.log(`Added new lead: ${lead.email} from ${workspace.name}`)
          } catch (leadError: unknown) {
            const errorMsg = getErrorMessage(leadError)
            workspaceResults.errors.push(`Error processing ${lead.email}: ${errorMsg}`)
            console.error(`Error processing lead ${lead.email}:`, leadError)
          }
        }

        results[workspace.name] = workspaceResults
      } catch (workspaceError: unknown) {
        const errorMsg = getErrorMessage(workspaceError)
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
        },
        results: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
