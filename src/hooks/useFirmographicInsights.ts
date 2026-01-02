import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'

// Types for firmographic insights
export interface FirmographicItem {
  value: string
  leadsIn: number
  engaged: number
  positive: number
  booked: number
  engagementRate: number
  conversionRate: number
}

export interface DimensionInsight {
  dimension: string
  coverage: number // 0.85 = 85% of leads have this data
  totalLeads: number
  totalLeadsWithData: number
  items: FirmographicItem[]
}

// Alias for backwards compatibility
export type FirmographicDimensionData = DimensionInsight

export interface FirmographicInsightsData {
  industry: DimensionInsight
  revenue: DimensionInsight
  employees: DimensionInsight
  geography: DimensionInsight
  signals: DimensionInsight
  jobTitle: DimensionInsight
  technologies: DimensionInsight
  companyMaturity: DimensionInsight
  fundingStatus: DimensionInsight
}

interface UseFirmographicInsightsParams {
  startDate: Date
  endDate: Date
  client?: string
  campaigns?: string[]
}

// Helper to normalize revenue to bands
function normalizeRevenue(revenue: string | null): string | null {
  if (!revenue || revenue.trim() === '') return null
  
  const revenueStr = revenue.toLowerCase()
  const revenueNum = parseFloat(revenue.replace(/[^0-9.]/g, ''))
  
  if (!isNaN(revenueNum)) {
    if (revenueNum < 1000000) return 'Small (<$1M)'
    if (revenueNum < 10000000) return 'Medium ($1M-$10M)'
    if (revenueNum < 100000000) return 'Large ($10M-$100M)'
    return 'Enterprise ($100M+)'
  }
  
  if (revenueStr.includes('million') || revenueStr.includes('m')) {
    return 'Medium ($1M-$10M)'
  }
  if (revenueStr.includes('billion') || revenueStr.includes('b')) {
    return 'Enterprise ($100M+)'
  }
  
  return null
}

// Helper to normalize company size to bands
function normalizeCompanySize(size: string | null): string | null {
  if (!size || size.trim() === '') return null
  
  const sizeNum = parseFloat(size.replace(/[^0-9.]/g, ''))
  
  if (!isNaN(sizeNum)) {
    if (sizeNum < 10) return 'Micro (1-9)'
    if (sizeNum < 50) return 'Small (10-49)'
    if (sizeNum < 200) return 'Medium (50-199)'
    if (sizeNum < 1000) return 'Large (200-999)'
    return 'Enterprise (1000+)'
  }
  
  return null
}

// Helper to check if value is valid (not null, empty, or "unknown")
function isValidValue(value: string | null): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return trimmed !== '' && trimmed.toLowerCase() !== 'unknown'
}

// Helper to categorize company maturity based on year founded
function categorizeCompanyMaturity(yearFounded: string | number | null): string | null {
  if (yearFounded === null || yearFounded === undefined) return null
  
  // Convert to string if it's a number
  const yearStr = String(yearFounded)
  
  // Try to parse as a year (e.g., "2020") or a full date
  const yearMatch = yearStr.match(/\d{4}/)
  if (!yearMatch) return null
  
  const foundedYear = parseInt(yearMatch[0], 10)
  if (isNaN(foundedYear) || foundedYear < 1800 || foundedYear > new Date().getFullYear()) return null
  
  const currentYear = new Date().getFullYear()
  const yearsDiff = currentYear - foundedYear
  
  if (yearsDiff < 2) return 'Startup (0-2 years)'
  if (yearsDiff < 5) return 'Early Stage (2-5 years)'
  if (yearsDiff < 10) return 'Growth Stage (5-10 years)'
  if (yearsDiff < 20) return 'Established (10-20 years)'
  return 'Mature (20+ years)'
}

// Helper to normalize seniority levels/job titles into categories
function normalizeJobTitle(seniorityLevel: string | null): string | null {
  if (!seniorityLevel || !isValidValue(seniorityLevel)) return null
  
  const lowerTitle = seniorityLevel.toLowerCase()
  
  // C-Level
  if (lowerTitle.includes('ceo') || lowerTitle.includes('chief executive')) return 'CEO'
  if (lowerTitle.includes('cto') || lowerTitle.includes('chief technology')) return 'CTO'
  if (lowerTitle.includes('cfo') || lowerTitle.includes('chief financial')) return 'CFO'
  if (lowerTitle.includes('coo') || lowerTitle.includes('chief operating')) return 'COO'
  if (lowerTitle.includes('cmo') || lowerTitle.includes('chief marketing')) return 'CMO'
  if (lowerTitle.includes('cio') || lowerTitle.includes('chief information')) return 'CIO'
  if (lowerTitle.includes('chief') || lowerTitle.startsWith('c-')) return 'Other C-Suite'
  
  // VP Level
  if (lowerTitle.includes('vp ') || lowerTitle.includes('vice president')) {
    if (lowerTitle.includes('sales')) return 'VP Sales'
    if (lowerTitle.includes('marketing')) return 'VP Marketing'
    if (lowerTitle.includes('engineering') || lowerTitle.includes('technology')) return 'VP Engineering'
    if (lowerTitle.includes('operation')) return 'VP Operations'
    if (lowerTitle.includes('product')) return 'VP Product'
    return 'VP (Other)'
  }
  
  // Director Level
  if (lowerTitle.includes('director')) {
    if (lowerTitle.includes('sales')) return 'Director of Sales'
    if (lowerTitle.includes('marketing')) return 'Director of Marketing'
    if (lowerTitle.includes('engineering') || lowerTitle.includes('technology')) return 'Director of Engineering'
    if (lowerTitle.includes('operation')) return 'Director of Operations'
    if (lowerTitle.includes('product')) return 'Director of Product'
    if (lowerTitle.includes('hr') || lowerTitle.includes('human')) return 'Director of HR'
    return 'Director (Other)'
  }
  
  // Manager Level
  if (lowerTitle.includes('manager')) {
    if (lowerTitle.includes('sales')) return 'Sales Manager'
    if (lowerTitle.includes('marketing')) return 'Marketing Manager'
    if (lowerTitle.includes('product')) return 'Product Manager'
    if (lowerTitle.includes('project')) return 'Project Manager'
    if (lowerTitle.includes('account')) return 'Account Manager'
    return 'Manager (Other)'
  }
  
  // Owner/Founder
  if (lowerTitle.includes('owner') || lowerTitle.includes('founder') || lowerTitle.includes('partner')) {
    return 'Owner/Founder'
  }
  
  // President
  if (lowerTitle.includes('president') && !lowerTitle.includes('vice')) {
    return 'President'
  }
  
  return seniorityLevel.trim() // Return original if no match
}

export function useFirmographicInsights({ startDate, endDate, client, campaigns }: UseFirmographicInsightsParams) {
  const [data, setData] = useState<FirmographicInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Fetching firmographic insights with params:', { 
        client, 
        campaigns: campaigns?.length || 0,
        startDate, 
        endDate 
      })

      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate)

      // First, get campaign IDs that were active in this date range
      let campaignsQuery = supabase
        .from('campaign_reporting')
        .select('campaign_id')
        .gte('date', startStr)
        .lte('date', endStr)

      if (client) {
        campaignsQuery = campaignsQuery.eq('client', client)
      }

      const { data: activeCampaigns, error: campaignsError } = await campaignsQuery
      if (campaignsError) throw campaignsError

      // Get unique campaign IDs - filter to selected campaigns if provided
      let campaignIds = [...new Set((activeCampaigns as { campaign_id: string }[] || []).map(c => c.campaign_id).filter(Boolean))]
      
      // If specific campaigns are selected, filter to those campaigns
      if (campaigns && campaigns.length > 0) {
        campaignIds = campaignIds.filter(id => campaigns.includes(id))
      }

      // Fetch all leads for the client that belong to active campaigns
      // If no active campaigns, we'll still fetch all leads for the client
      let leadsQuery = supabase
        .from('all_leads')
        .select('email, industry, annual_revenue, company_size, company_hq_state, company_hq_country, specialty_signal_a, specialty_signal_b, specialty_signal_c, campaign_id, client, created_time, seniority_level, tech_stack, year_founded')

      if (client) {
        leadsQuery = leadsQuery.eq('client', client)
      }

      // If we have campaigns to filter by
      if (campaignIds.length > 0) {
        leadsQuery = leadsQuery.in('campaign_id', campaignIds)
      } else if (campaigns && campaigns.length > 0) {
        // If specific campaigns were requested but not found in active, filter to those campaigns anyway
        leadsQuery = leadsQuery.in('campaign_id', campaigns)
      }

      const { data: allLeads, error: leadsError } = await leadsQuery

      if (leadsError) {
        console.error('Supabase query error:', leadsError)
        throw new Error(`Database error: ${leadsError.message || JSON.stringify(leadsError)}`)
      }

      if (!allLeads) {
        console.warn('No leads data returned from query')
      }

      // Type the leads data
      type LeadData = {
        email: string | null
        industry: string | null
        annual_revenue: string | null
        company_size: string | null
        company_hq_state: string | null
        company_hq_country: string | null
        specialty_signal_a: string | null
        specialty_signal_b: string | null
        specialty_signal_c: string | null
        campaign_id: string | null
        client: string | null
        created_time: string | null
        seniority_level: string | null
        tech_stack: string | null
        year_founded: string | null
      }

      const leads = (allLeads as LeadData[] || []) as LeadData[]
      const totalLeads = leads.length
      
      console.log(`Successfully fetched ${totalLeads} leads for firmographic analysis`)

      // Fetch replies (exclude OOO)
      let repliesQuery = supabase
        .from('replies')
        .select('lead_id, from_email, primary_to_email, category, date_received, client')
        .gte('date_received', startStr)
        .lt('date_received', endStrNextDay)
        .not('category', 'ilike', '%out of office%')
        .not('category', 'ilike', '%ooo%')

      if (client) {
        repliesQuery = repliesQuery.eq('client', client)
      }

      const { data: repliesData, error: repliesError } = await repliesQuery
      if (repliesError) throw repliesError

      // Type the replies data
      type ReplyData = {
        lead_id: string | null
        from_email: string | null
        primary_to_email: string | null
        category: string | null
        date_received: string | null
        client: string | null
      }

      const replies = (repliesData as ReplyData[] || []) as ReplyData[]

      // Fetch meetings
      let meetingsQuery = supabase
        .from('meetings_booked')
        .select('email, industry, annual_revenue, company_hq_state, client, campaign_id, created_time')
        .gte('created_time', startStr)
        .lt('created_time', endStrNextDay)

      if (client) {
        meetingsQuery = meetingsQuery.eq('client', client)
      }

      const { data: meetingsData, error: meetingsError } = await meetingsQuery
      if (meetingsError) throw meetingsError

      // Type the meetings data
      type MeetingData = {
        email: string | null
        industry: string | null
        annual_revenue: string | null
        company_hq_state: string | null
        client: string | null
        campaign_id: string | null
        created_time: string | null
      }

      const meetings = (meetingsData as MeetingData[] || []) as MeetingData[]

      // Create email -> lead map for quick lookup
      const leadMap = new Map<string, any>()
      leads.forEach(lead => {
        if (lead.email) {
          leadMap.set(lead.email.toLowerCase(), lead)
        }
      })

      // Create email -> replies map
      // Match by primary_to_email (the lead's email) or lead_id if it's an email
      const repliesMap = new Map<string, any[]>()
      ;(replies || []).forEach(reply => {
        // Use primary_to_email first (the lead's email), fallback to lead_id if it looks like an email
        const email = reply.primary_to_email || (reply.lead_id && reply.lead_id.includes('@') ? reply.lead_id : null)
        if (email) {
          const key = email.toLowerCase()
          if (!repliesMap.has(key)) {
            repliesMap.set(key, [])
          }
          repliesMap.get(key)!.push(reply)
        }
      })

      // Create email -> meetings map
      const meetingsMap = new Map<string, any[]>()
      ;(meetings || []).forEach(meeting => {
        if (meeting.email) {
          const key = meeting.email.toLowerCase()
          if (!meetingsMap.has(key)) {
            meetingsMap.set(key, [])
          }
          meetingsMap.get(key)!.push(meeting)
        }
      })

      // Helper to process a dimension
      const processDimension = (
        dimensionName: string,
        getValue: (lead: any) => string | null,
        getMeetingValue: (meeting: any) => string | null = getValue
      ): DimensionInsight => {
        // Filter leads with valid data for this dimension
        const leadsWithData = leads.filter(lead => {
          const value = getValue(lead)
          return isValidValue(value)
        })

        const totalLeadsWithData = leadsWithData.length
        const coverage = totalLeads > 0 ? totalLeadsWithData / totalLeads : 0

        // Group by dimension value
        const valueMap = new Map<string, { leads: any[], meetings: any[], replies: any[] }>()

        leadsWithData.forEach(lead => {
          const value = getValue(lead)
          if (value && isValidValue(value)) {
            const normalizedValue = value.trim()
            if (!valueMap.has(normalizedValue)) {
              valueMap.set(normalizedValue, { leads: [], meetings: [], replies: [] })
            }
            valueMap.get(normalizedValue)!.leads.push(lead)

            // Find matching replies
            const email = lead.email?.toLowerCase()
            if (email && repliesMap.has(email)) {
              valueMap.get(normalizedValue)!.replies.push(...repliesMap.get(email)!)
            }

            // Find matching meetings
            if (email && meetingsMap.has(email)) {
              const matchingMeetings = meetingsMap.get(email)!.filter(m => {
                const meetingValue = getMeetingValue(m)
                return meetingValue && isValidValue(meetingValue) && meetingValue.trim() === normalizedValue
              })
              valueMap.get(normalizedValue)!.meetings.push(...matchingMeetings)
            }
          }
        })

        // Convert to items array
        const items: FirmographicItem[] = Array.from(valueMap.entries()).map(([value, data]) => {
          const leadsIn = data.leads.length
          const engaged = data.replies.length
          const positive = data.replies.filter((r: any) => 
            r.category && r.category.toLowerCase() === 'interested'
          ).length
          const booked = data.meetings.length

          return {
            value,
            leadsIn,
            engaged,
            positive,
            booked,
            engagementRate: leadsIn > 0 ? (engaged / leadsIn) * 100 : 0,
            conversionRate: leadsIn > 0 ? (booked / leadsIn) * 100 : 0,
          }
        })

        // Sort by leadsIn descending
        items.sort((a, b) => b.leadsIn - a.leadsIn)

        return {
          dimension: dimensionName,
          coverage,
          totalLeads,
          totalLeadsWithData,
          items,
        }
      }

      // Process each dimension
      const industryInsight = processDimension(
        'Industry',
        (lead) => lead.industry,
        (meeting) => meeting.industry
      )

      const revenueInsight = processDimension(
        'Revenue Range',
        (lead) => normalizeRevenue(lead.annual_revenue),
        (meeting) => normalizeRevenue(meeting.annual_revenue)
      )

      const employeesInsight = processDimension(
        'Employee Count',
        (lead) => normalizeCompanySize(lead.company_size)
      )

      const geographyInsight = processDimension(
        'Geography',
        (lead) => {
          const state = lead.company_hq_state
          const country = lead.company_hq_country
          if (isValidValue(state)) return state
          if (isValidValue(country)) return country
          return null
        },
        (meeting) => {
          const state = meeting.company_hq_state
          if (isValidValue(state)) return state
          return null
        }
      )

      // Process signals (combine all signal fields)
      const signalValueMap = new Map<string, { leads: any[], meetings: any[], replies: any[] }>()
      const leadsWithSignals = leads.filter(lead => {
        return isValidValue(lead.specialty_signal_a) || 
               isValidValue(lead.specialty_signal_b) || 
               isValidValue(lead.specialty_signal_c)
      })

      leadsWithSignals.forEach(lead => {
        const signals = [
          lead.specialty_signal_a,
          lead.specialty_signal_b,
          lead.specialty_signal_c,
        ].filter(isValidValue)

        signals.forEach(signal => {
          const normalizedSignal = signal!.trim()
          if (!signalValueMap.has(normalizedSignal)) {
            signalValueMap.set(normalizedSignal, { leads: [], meetings: [], replies: [] })
          }
          signalValueMap.get(normalizedSignal)!.leads.push(lead)

          const email = lead.email?.toLowerCase()
          if (email && repliesMap.has(email)) {
            signalValueMap.get(normalizedSignal)!.replies.push(...repliesMap.get(email)!)
          }
          if (email && meetingsMap.has(email)) {
            signalValueMap.get(normalizedSignal)!.meetings.push(...meetingsMap.get(email)!)
          }
        })
      })

      const signalItems: FirmographicItem[] = Array.from(signalValueMap.entries()).map(([value, data]) => {
        const leadsIn = data.leads.length
        const engaged = data.replies.length
        const positive = data.replies.filter((r: any) => 
          r.category && r.category.toLowerCase() === 'interested'
        ).length
        const booked = data.meetings.length

        return {
          value,
          leadsIn,
          engaged,
          positive,
          booked,
          engagementRate: leadsIn > 0 ? (engaged / leadsIn) * 100 : 0,
          conversionRate: leadsIn > 0 ? (booked / leadsIn) * 100 : 0,
        }
      })

      signalItems.sort((a, b) => b.leadsIn - a.leadsIn)

      const signalsInsight: DimensionInsight = {
        dimension: 'Signals',
        coverage: totalLeads > 0 ? leadsWithSignals.length / totalLeads : 0,
        totalLeads,
        totalLeadsWithData: leadsWithSignals.length,
        items: signalItems,
      }

      // Process Job Title dimension (using seniority_level)
      const jobTitleInsight = processDimension(
        'Job Title',
        (lead) => normalizeJobTitle(lead.seniority_level)
      )

      // Process Technologies dimension (using tech_stack)
      const technologiesInsight = processDimension(
        'Technologies',
        (lead) => {
          // Technologies might be comma-separated, take the first one or the whole thing
          const tech = lead.tech_stack
          if (!tech || !isValidValue(tech)) return null
          const firstTech = tech.split(',')[0]?.trim()
          return isValidValue(firstTech) ? firstTech : null
        }
      )

      // Process Company Maturity dimension (using year_founded)
      const companyMaturityInsight = processDimension(
        'Company Maturity',
        (lead) => categorizeCompanyMaturity(lead.year_founded)
      )

      // Funding Status dimension - not used for now, return empty insight
      const fundingStatusInsight: DimensionInsight = {
        dimension: 'Funding Status',
        coverage: 0,
        totalLeads,
        totalLeadsWithData: 0,
        items: [],
      }

      setData({
        industry: industryInsight,
        revenue: revenueInsight,
        employees: employeesInsight,
        geography: geographyInsight,
        signals: signalsInsight,
        jobTitle: jobTitleInsight,
        technologies: technologiesInsight,
        companyMaturity: companyMaturityInsight,
        fundingStatus: fundingStatusInsight,
      })
    } catch (err) {
      console.error('Firmographic insights error:', err)
      // Log the full error details
      if (err && typeof err === 'object') {
        console.error('Error details:', JSON.stringify(err, null, 2))
      }
      const errorMessage = err instanceof Error ? `Error: ${err.message}` : 'Failed to fetch firmographic insights'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client, campaigns])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

