import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'

// Types for aggregated data
export interface CategoryBreakdown {
  interested: number
  notInterested: number
  outOfOffice: number
  other: number
}

export interface DailyCount {
  date: string
  dateKey: string
  count: number
}

export interface CampaignPerformance {
  campaign: string
  totalReplies: number
  interested: number
  positiveRate: number
}

export interface IndustryBreakdown {
  industry: string
  count: number
  percentage: number
}

export interface GeographicBreakdown {
  state: string
  count: number
  percentage: number
}

export interface RevenueBreakdown {
  band: string
  count: number
  percentage: number
  order: number
}

export interface CompanyAgeBreakdown {
  category: string
  count: number
  percentage: number
  order: number
}

export interface ClientBreakdown {
  client: string
  count: number
  percentage: number
}

export interface DeepInsightsData {
  // Summary metrics
  totalReplies: number
  interestedCount: number
  notInterestedCount: number
  outOfOfficeCount: number
  engagedLeadsCount: number
  meetingsBookedCount: number
  
  // Reply insights
  repliesByCategory: CategoryBreakdown
  repliesByDay: DailyCount[]
  campaignPerformance: CampaignPerformance[]
  avgRepliesPerDay: number
  bestDay: { date: string; count: number } | null
  
  // Engaged leads insights
  engagedLeadsByClient: ClientBreakdown[]
  
  // Meetings insights
  meetingsByIndustry: IndustryBreakdown[]
  meetingsByState: GeographicBreakdown[]
  meetingsByRevenue: RevenueBreakdown[]
  meetingsByCompanyAge: CompanyAgeBreakdown[]
  meetingsByDay: DailyCount[]
  
  // Raw data for tables (paginated separately)
}

interface UseDeepInsightsParams {
  startDate: Date
  endDate: Date
  client?: string
}

export function useDeepInsights({ startDate, endDate, client }: UseDeepInsightsParams) {
  const [data, setData] = useState<DeepInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const startStr = formatDateForQuery(startDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate)

      // Fetch all replies with pagination
      const PAGE_SIZE = 1000
      let allReplies: any[] = []
      let repliesOffset = 0
      let hasMoreReplies = true

      while (hasMoreReplies) {
        let query = supabase
          .from('replies')
          .select('category, date_received, campaign_id, client, lead_id, from_email')
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .range(repliesOffset, repliesOffset + PAGE_SIZE - 1)

        if (client) query = query.eq('client', client)

        const { data: pageData, error: queryError } = await query
        if (queryError) throw queryError

        if (pageData && pageData.length > 0) {
          allReplies = allReplies.concat(pageData)
          repliesOffset += PAGE_SIZE
          hasMoreReplies = pageData.length === PAGE_SIZE
        } else {
          hasMoreReplies = false
        }
      }

      // Fetch engaged leads
      let allEngagedLeads: any[] = []
      let leadsOffset = 0
      let hasMoreLeads = true

      while (hasMoreLeads) {
        let query = supabase
          .from('engaged_leads')
          .select('client, email, created_at')
          .range(leadsOffset, leadsOffset + PAGE_SIZE - 1)

        if (client) query = query.eq('client', client)

        const { data: pageData, error: queryError } = await query
        if (queryError) throw queryError

        if (pageData && pageData.length > 0) {
          allEngagedLeads = allEngagedLeads.concat(pageData)
          leadsOffset += PAGE_SIZE
          hasMoreLeads = pageData.length === PAGE_SIZE
        } else {
          hasMoreLeads = false
        }
      }

      // Fetch all meetings with firmographic data
      let allMeetings: any[] = []
      let meetingsOffset = 0
      let hasMoreMeetings = true

      while (hasMoreMeetings) {
        let query = supabase
          .from('meetings_booked')
          .select('created_time, industry, company_hq_state, annual_revenue, year_founded, client, campaign_name')
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .range(meetingsOffset, meetingsOffset + PAGE_SIZE - 1)

        if (client) query = query.eq('client', client)

        const { data: pageData, error: queryError } = await query
        if (queryError) throw queryError

        if (pageData && pageData.length > 0) {
          allMeetings = allMeetings.concat(pageData)
          meetingsOffset += PAGE_SIZE
          hasMoreMeetings = pageData.length === PAGE_SIZE
        } else {
          hasMoreMeetings = false
        }
      }

      // Process replies data - count UNIQUE leads for each category
      const categoryBreakdown: CategoryBreakdown = {
        interested: 0,
        notInterested: 0,
        outOfOffice: 0,
        other: 0,
      }

      // Track unique leads globally and by category
      const uniqueLeadsAll = new Set<string>()
      const uniqueLeadsInterested = new Set<string>()
      const uniqueLeadsNotInterested = new Set<string>()
      const uniqueLeadsOOO = new Set<string>()
      const uniqueLeadsOther = new Set<string>()
      
      // Track unique leads by day
      const uniqueLeadsByDay = new Map<string, Set<string>>()
      
      // Track unique leads by campaign
      const campaignRepliesMap = new Map<string, { totalSet: Set<string>; interestedSet: Set<string> }>()

      allReplies.forEach((reply: any) => {
        const uniqueKey = reply.lead_id || reply.from_email || ''
        if (!uniqueKey) return
        
        const cat = (reply.category || '').toLowerCase()
        
        // Track unique lead for overall count
        uniqueLeadsAll.add(uniqueKey)
        
        // Category breakdown - track unique leads per category
        if (cat === 'interested') {
          uniqueLeadsInterested.add(uniqueKey)
        } else if (cat === 'not interested') {
          uniqueLeadsNotInterested.add(uniqueKey)
        } else if (cat.includes('out of office') || cat.includes('ooo')) {
          uniqueLeadsOOO.add(uniqueKey)
        } else {
          uniqueLeadsOther.add(uniqueKey)
        }

        // Daily breakdown - track unique leads per day
        const dateKey = reply.date_received?.split('T')[0]
        if (dateKey) {
          if (!uniqueLeadsByDay.has(dateKey)) {
            uniqueLeadsByDay.set(dateKey, new Set())
          }
          uniqueLeadsByDay.get(dateKey)!.add(uniqueKey)
        }

        // Campaign performance - track unique leads per campaign
        const campaignId = reply.campaign_id || 'Unknown'
        if (!campaignRepliesMap.has(campaignId)) {
          campaignRepliesMap.set(campaignId, { totalSet: new Set(), interestedSet: new Set() })
        }
        const existing = campaignRepliesMap.get(campaignId)!
        existing.totalSet.add(uniqueKey)
        if (cat === 'interested') {
          existing.interestedSet.add(uniqueKey)
        }
      })
      
      // Convert Sets to counts
      categoryBreakdown.interested = uniqueLeadsInterested.size
      categoryBreakdown.notInterested = uniqueLeadsNotInterested.size
      categoryBreakdown.outOfOffice = uniqueLeadsOOO.size
      categoryBreakdown.other = uniqueLeadsOther.size
      
      // Convert daily unique leads to counts
      const repliesByDayMap = new Map<string, number>()
      uniqueLeadsByDay.forEach((leads, dateKey) => {
        repliesByDayMap.set(dateKey, leads.size)
      })

      // Format daily replies
      const formatDateDisplay = (dateStr: string) => {
        const [, month, day] = dateStr.split('-').map(Number)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[month - 1]} ${day}`
      }

      const repliesByDay: DailyCount[] = Array.from(repliesByDayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateKey, count]) => ({
          date: formatDateDisplay(dateKey),
          dateKey,
          count,
        }))

      // Calculate avg replies per day and best day (using unique leads)
      const totalDays = repliesByDay.length || 1
      const totalUniqueLeads = uniqueLeadsAll.size
      const avgRepliesPerDay = totalUniqueLeads / totalDays
      const bestDay = repliesByDay.reduce<{ date: string; count: number } | null>(
        (best, day) => (!best || day.count > best.count ? { date: day.date, count: day.count } : best),
        null
      )

      // Campaign performance (top 10 by positive rate, min 5 unique leads)
      const campaignPerformance: CampaignPerformance[] = Array.from(campaignRepliesMap.entries())
        .map(([campaign, stats]) => ({
          campaign,
          totalReplies: stats.totalSet.size,
          interested: stats.interestedSet.size,
          positiveRate: stats.totalSet.size > 0 ? (stats.interestedSet.size / stats.totalSet.size) * 100 : 0,
        }))
        .filter(c => c.totalReplies >= 5)
        .sort((a, b) => b.positiveRate - a.positiveRate)
        .slice(0, 10)

      // Process engaged leads
      const leadsByClientMap = new Map<string, number>()
      allEngagedLeads.forEach((lead: any) => {
        const clientName = lead.client || 'Unknown'
        leadsByClientMap.set(clientName, (leadsByClientMap.get(clientName) || 0) + 1)
      })

      const engagedLeadsByClient: ClientBreakdown[] = Array.from(leadsByClientMap.entries())
        .map(([client, count]) => ({
          client,
          count,
          percentage: allEngagedLeads.length > 0 ? (count / allEngagedLeads.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

      // Process meetings data
      const industryMap = new Map<string, number>()
      const stateMap = new Map<string, number>()
      const revenueMap = new Map<string, number>()
      const ageMap = new Map<string, number>()
      const meetingsByDayMap = new Map<string, number>()

      const currentYear = new Date().getFullYear()

      allMeetings.forEach((meeting: any) => {
        // Industry
        const industry = meeting.industry || 'Unknown'
        industryMap.set(industry, (industryMap.get(industry) || 0) + 1)

        // State
        const state = meeting.company_hq_state || 'Unknown'
        stateMap.set(state, (stateMap.get(state) || 0) + 1)

        // Revenue bands
        const revenue = meeting.annual_revenue || ''
        let revenueBand = 'Unknown'
        const revenueNum = parseFloat(revenue.replace(/[^0-9.]/g, ''))
        if (!isNaN(revenueNum)) {
          if (revenueNum < 1000000) revenueBand = 'Small (<$1M)'
          else if (revenueNum < 10000000) revenueBand = 'Medium ($1M-$10M)'
          else if (revenueNum < 100000000) revenueBand = 'Large ($10M-$100M)'
          else revenueBand = 'Enterprise ($100M+)'
        } else if (revenue.toLowerCase().includes('million') || revenue.toLowerCase().includes('m')) {
          revenueBand = 'Medium ($1M-$10M)'
        } else if (revenue.toLowerCase().includes('billion') || revenue.toLowerCase().includes('b')) {
          revenueBand = 'Enterprise ($100M+)'
        }
        revenueMap.set(revenueBand, (revenueMap.get(revenueBand) || 0) + 1)

        // Company age
        const yearFounded = parseInt(meeting.year_founded)
        let ageCategory = 'Unknown'
        if (!isNaN(yearFounded)) {
          const age = currentYear - yearFounded
          if (age <= 5) ageCategory = 'Startup (0-5 yrs)'
          else if (age <= 15) ageCategory = 'Growth (6-15 yrs)'
          else if (age <= 30) ageCategory = 'Mature (16-30 yrs)'
          else ageCategory = 'Established (30+ yrs)'
        }
        ageMap.set(ageCategory, (ageMap.get(ageCategory) || 0) + 1)

        // Daily meetings
        const dateKey = meeting.created_time?.split('T')[0]
        if (dateKey) {
          meetingsByDayMap.set(dateKey, (meetingsByDayMap.get(dateKey) || 0) + 1)
        }
      })

      const totalMeetings = allMeetings.length

      // Format breakdowns
      const meetingsByIndustry: IndustryBreakdown[] = Array.from(industryMap.entries())
        .map(([industry, count]) => ({
          industry,
          count,
          percentage: totalMeetings > 0 ? (count / totalMeetings) * 100 : 0,
        }))
        .filter(i => i.industry !== 'Unknown')
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const meetingsByState: GeographicBreakdown[] = Array.from(stateMap.entries())
        .map(([state, count]) => ({
          state,
          count,
          percentage: totalMeetings > 0 ? (count / totalMeetings) * 100 : 0,
        }))
        .filter(s => s.state !== 'Unknown')
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const revenueOrder: Record<string, number> = {
        'Small (<$1M)': 1,
        'Medium ($1M-$10M)': 2,
        'Large ($10M-$100M)': 3,
        'Enterprise ($100M+)': 4,
        'Unknown': 5,
      }

      const meetingsByRevenue: RevenueBreakdown[] = Array.from(revenueMap.entries())
        .map(([band, count]) => ({
          band,
          count,
          percentage: totalMeetings > 0 ? (count / totalMeetings) * 100 : 0,
          order: revenueOrder[band] || 5,
        }))
        .sort((a, b) => a.order - b.order)

      const ageOrder: Record<string, number> = {
        'Startup (0-5 yrs)': 1,
        'Growth (6-15 yrs)': 2,
        'Mature (16-30 yrs)': 3,
        'Established (30+ yrs)': 4,
        'Unknown': 5,
      }

      const meetingsByCompanyAge: CompanyAgeBreakdown[] = Array.from(ageMap.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalMeetings > 0 ? (count / totalMeetings) * 100 : 0,
          order: ageOrder[category] || 5,
        }))
        .sort((a, b) => a.order - b.order)

      const meetingsByDay: DailyCount[] = Array.from(meetingsByDayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateKey, count]) => ({
          date: formatDateDisplay(dateKey),
          dateKey,
          count,
        }))

      setData({
        // Summary metrics (using unique leads counts)
        totalReplies: uniqueLeadsAll.size,
        interestedCount: categoryBreakdown.interested,
        notInterestedCount: categoryBreakdown.notInterested,
        outOfOfficeCount: categoryBreakdown.outOfOffice,
        engagedLeadsCount: allEngagedLeads.length,
        meetingsBookedCount: totalMeetings,

        // Reply insights
        repliesByCategory: categoryBreakdown,
        repliesByDay,
        campaignPerformance,
        avgRepliesPerDay,
        bestDay,

        // Engaged leads insights
        engagedLeadsByClient,

        // Meetings insights
        meetingsByIndustry,
        meetingsByState,
        meetingsByRevenue,
        meetingsByCompanyAge,
        meetingsByDay,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}








