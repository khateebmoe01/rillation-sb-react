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

export interface FirmographicInsightsData {
  industry: DimensionInsight
  revenue: DimensionInsight
  employees: DimensionInsight
  geography: DimensionInsight
  signals: DimensionInsight
}

interface UseFirmographicInsightsParams {
  startDate: Date
  endDate: Date
  client?: string
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
  
  const sizeStr = size.toLowerCase()
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

export function useFirmographicInsights({ startDate, endDate, client }: UseFirmographicInsightsParams) {
  const [data, setData] = useState<FirmographicInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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

      // Get unique campaign IDs
      const campaignIds = [...new Set((activeCampaigns || []).map(c => c.campaign_id).filter(Boolean))]

      // Fetch all leads for the client that belong to active campaigns
      // If no active campaigns, we'll still fetch all leads for the client
      let leadsQuery = supabase
        .from('all_leads')
        .select('email, industry, annual_revenue, company_size, company_hq_state, company_hq_country, specialty_signal_a, specialty_signal_b, specialty_signal_c, campaign_id, client, created_time')

      if (client) {
        leadsQuery = leadsQuery.eq('client', client)
      }

      // If we have active campaigns, filter by them
      if (campaignIds.length > 0) {
        leadsQuery = leadsQuery.in('campaign_id', campaignIds)
      }

      const { data: allLeads, error: leadsError } = await leadsQuery

      if (leadsError) throw leadsError

      const leads = allLeads || []
      const totalLeads = leads.length

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

      const { data: replies, error: repliesError } = await repliesQuery
      if (repliesError) throw repliesError

      // Fetch meetings
      let meetingsQuery = supabase
        .from('meetings_booked')
        .select('email, industry, annual_revenue, company_hq_state, client, campaign_id, created_time')
        .gte('created_time', startStr)
        .lt('created_time', endStrNextDay)

      if (client) {
        meetingsQuery = meetingsQuery.eq('client', client)
      }

      const { data: meetings, error: meetingsError } = await meetingsQuery
      if (meetingsError) throw meetingsError

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

      setData({
        industry: industryInsight,
        revenue: revenueInsight,
        employees: employeesInsight,
        geography: geographyInsight,
        signals: signalsInsight,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch firmographic insights')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

