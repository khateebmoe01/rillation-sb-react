import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import type { QuickViewMetrics, ChartDataPoint } from '../types/database'

interface UseQuickViewDataParams {
  startDate: Date
  endDate: Date
  client?: string
  campaigns?: string[]
}

export function useQuickViewData({ startDate, endDate, client, campaigns }: UseQuickViewDataParams) {
  const [metrics, setMetrics] = useState<QuickViewMetrics | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate) // For timestamp comparisons

      // Fetch campaign reporting data using pagination to overcome Supabase limits
      let allCampaignData: any[] = []
      let hasMore = true
      let pageSize = 1000
      let offset = 0
      const maxPages = 100 // Safety limit

      while (hasMore && offset / pageSize < maxPages) {
        let campaignQuery = supabase
          .from('campaign_reporting')
          .select('date,campaign_name,emails_sent,total_leads_contacted,bounced,interested')
          .gte('date', startStr)
          .lte('date', endStr)
          .range(offset, offset + pageSize - 1)

        if (client) campaignQuery = campaignQuery.eq('client', client)
        if (campaigns && campaigns.length > 0) campaignQuery = campaignQuery.in('campaign_name', campaigns)

        const { data: pageData, error: campaignError } = await campaignQuery

        if (campaignError) throw campaignError

        if (pageData && pageData.length > 0) {
          allCampaignData = allCampaignData.concat(pageData)
          offset += pageSize
          hasMore = pageData.length === pageSize // Continue if we got a full page
        } else {
          hasMore = false
        }
      }

      const campaignData = allCampaignData

      type CampaignRow = { 
        date: string
        campaign_name: string | null
        emails_sent: number | null
        total_leads_contacted: number | null
        bounced: number | null
        interested: number | null
      }

      // Calculate metrics from all fetched rows
      // Filter out rows with null/empty campaign_name to match useCampaignStats behavior
      const validRows = (campaignData as CampaignRow[] | null)?.filter(row => row.campaign_name) || []
      const totalEmailsSent = validRows.reduce((sum, row) => sum + (row.emails_sent || 0), 0) || 0
      const uniqueProspects = validRows.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0) || 0
      const bounces = validRows.reduce((sum, row) => sum + (row.bounced || 0), 0) || 0
      const positiveReplies = validRows.reduce((sum, row) => sum + (row.interested || 0), 0) || 0

      // Fetch replies data using pagination
      // date_received is TIMESTAMPTZ, so use lt() with next day to include entire end date
      let allRepliesData: any[] = []
      let repliesOffset = 0
      let hasMoreReplies = true

      while (hasMoreReplies) {
        let allRepliesQuery = supabase
          .from('replies')
          .select('category,date_received,lead_id,from_email,campaign_id,client')
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .range(repliesOffset, repliesOffset + pageSize - 1)

        if (client) allRepliesQuery = allRepliesQuery.eq('client', client)

        const { data: pageData, error: allRepliesError } = await allRepliesQuery

        if (allRepliesError) throw allRepliesError

        if (pageData && pageData.length > 0) {
          allRepliesData = allRepliesData.concat(pageData)
          repliesOffset += pageSize
          hasMoreReplies = pageData.length === pageSize
        } else {
          hasMoreReplies = false
        }
      }

      type ReplyRow = {
        category: string | null
        date_received: string | null
        lead_id: string | null
        from_email: string | null
        campaign_id: string | null
        client: string | null
      }

      // Count UNIQUE lead+campaign+client combinations (a lead replying in 2 campaigns counts as 2)
      const allRepliesSet = new Set<string>()
      const realRepliesSet = new Set<string>()
      
      ;(allRepliesData as ReplyRow[] | null)?.forEach((r) => {
        // Use lead_id if available, otherwise use from_email as unique identifier
        const leadKey = r.lead_id || r.from_email || ''
        if (!leadKey) return
        
        // Create unique key combining lead + campaign + client
        const uniqueKey = `${leadKey}||${r.campaign_id || ''}||${r.client || ''}`
        
        // Count for total replies
        allRepliesSet.add(uniqueKey)
        
        // Count for real replies (excluding OOO)
        const cat = (r.category || '').toLowerCase()
        if (!cat.includes('out of office') && !cat.includes('ooo') && cat !== 'out of office') {
          realRepliesSet.add(uniqueKey)
        }
      })

      // Total replies = unique lead+campaign+client combinations
      const totalReplies = allRepliesSet.size
      // Real replies = unique lead+campaign+client combinations (excluding OOO)
      const realReplies = realRepliesSet.size

      // Fetch meetings booked using pagination
      // created_time is TIMESTAMPTZ, so use lt() with next day to include entire end date
      let allMeetingsData: any[] = []
      let meetingsOffset = 0
      let hasMoreMeetings = true

      while (hasMoreMeetings) {
        let meetingsQuery = supabase
          .from('meetings_booked')
          .select('*')
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .range(meetingsOffset, meetingsOffset + pageSize - 1)

        if (client) meetingsQuery = meetingsQuery.eq('client', client)

        const { data: pageData, error: meetingsError } = await meetingsQuery

        if (meetingsError) throw meetingsError

        if (pageData && pageData.length > 0) {
          allMeetingsData = allMeetingsData.concat(pageData)
          meetingsOffset += pageSize
          hasMoreMeetings = pageData.length === pageSize
        } else {
          hasMoreMeetings = false
        }
      }

      const meetingsData = allMeetingsData
      const meetingsBooked = meetingsData?.length || 0

      setMetrics({
        totalEmailsSent,
        uniqueProspects,
        totalReplies,
        realReplies,
        positiveReplies,
        bounces,
        meetingsBooked,
      })

      // Prepare chart data - group by date
      const dateMap = new Map<string, ChartDataPoint>()

      // Helper to format date string to display without timezone issues
      const formatDateDisplay = (dateStr: string) => {
        const [_year, month, day] = dateStr.split('-').map(Number)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[month - 1]} ${day}`
      }

      // Use validRows (same filtering as metrics calculation) for chart data
      validRows.forEach((row) => {
        const date = row.date
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date: formatDateDisplay(date),
            sent: 0,
            prospects: 0,
            replied: 0,
            positiveReplies: 0,
            meetings: 0,
          })
        }
        const point = dateMap.get(date)!
        point.sent += row.emails_sent || 0
        point.prospects += row.total_leads_contacted || 0
        point.positiveReplies += row.interested || 0
      })

      // Add replies data to chart from replies table (counting unique lead+campaign+client per day)
      // Track unique combinations per date for chart data
      const uniqueLeadsByDate = new Map<string, Set<string>>()
      
      ;(allRepliesData as ReplyRow[] | null)?.forEach((reply) => {
        const dateStr = reply.date_received?.split('T')[0]
        if (dateStr) {
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, {
              date: formatDateDisplay(dateStr),
              sent: 0,
              prospects: 0,
              replied: 0,
              positiveReplies: 0,
              meetings: 0,
            })
          }
          if (!uniqueLeadsByDate.has(dateStr)) {
            uniqueLeadsByDate.set(dateStr, new Set())
          }
          
          // Count non-OOO replies - only count unique lead+campaign+client per day
          const cat = (reply.category || '').toLowerCase()
          if (!cat.includes('out of office') && !cat.includes('ooo')) {
            const leadKey = reply.lead_id || reply.from_email || ''
            const uniqueKey = `${leadKey}||${reply.campaign_id || ''}||${reply.client || ''}`
            if (leadKey && !uniqueLeadsByDate.get(dateStr)!.has(uniqueKey)) {
              uniqueLeadsByDate.get(dateStr)!.add(uniqueKey)
              const point = dateMap.get(dateStr)!
              point.replied += 1
            }
          }
          // Note: positiveReplies (Interested) is now calculated from campaign_reporting.interested
          // in the campaign data loop above, not from replies table
        }
      })

      // Add meetings data to chart
      ;(meetingsData as any[] | null)?.forEach((meeting) => {
        const dateStr = meeting.created_time?.split('T')[0]
        if (dateStr) {
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, {
              date: formatDateDisplay(dateStr),
              sent: 0,
              prospects: 0,
              replied: 0,
              positiveReplies: 0,
              meetings: 0,
            })
          }
          const point = dateMap.get(dateStr)!
          point.meetings += 1
        }
      })

      // Sort by date
      const sortedEntries = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))

      // Apply weekend smoothing: redistribute Sat/Sun data to Fri/Mon
      // and remove weekend days from the chart
      const smoothedData: ChartDataPoint[] = []
      
      for (let i = 0; i < sortedEntries.length; i++) {
        const [dateStr, point] = sortedEntries[i]
        const date = new Date(dateStr + 'T00:00:00')
        const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
        
        if (dayOfWeek === 6) {
          // Saturday - add data to the previous Friday (if exists)
          const prevEntry = smoothedData[smoothedData.length - 1]
          if (prevEntry) {
            prevEntry.sent += point.sent
            prevEntry.prospects += point.prospects
            prevEntry.replied += point.replied
            prevEntry.positiveReplies += point.positiveReplies
            prevEntry.meetings += point.meetings
          }
        } else if (dayOfWeek === 0) {
          // Sunday - find the next Monday and add data there
          // We'll store Sunday data temporarily and add it when we hit Monday
          // For simplicity, we'll add it to the next weekday entry we process
          const nextMonday = sortedEntries.find(([d], idx) => {
            if (idx <= i) return false
            const nextDate = new Date(d + 'T00:00:00')
            return nextDate.getDay() >= 1 && nextDate.getDay() <= 5
          })
          if (nextMonday) {
            const nextPoint = dateMap.get(nextMonday[0])!
            nextPoint.sent += point.sent
            nextPoint.prospects += point.prospects
            nextPoint.replied += point.replied
            nextPoint.positiveReplies += point.positiveReplies
            nextPoint.meetings += point.meetings
          }
        } else {
          // Weekday - add to smoothed data
          smoothedData.push(point)
        }
      }

      setChartData(smoothedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client, campaigns])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { metrics, chartData, loading, error, refetch: fetchData }
}
