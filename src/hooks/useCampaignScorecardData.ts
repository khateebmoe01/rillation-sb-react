import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import type { QuickViewMetrics, ChartDataPoint } from '../types/database'

interface UseCampaignScorecardDataParams {
  startDate: Date
  endDate: Date
  client: string
}

export interface CampaignScorecardData {
  campaignName: string
  campaignId: string
  metrics: QuickViewMetrics
  chartData: ChartDataPoint[]
}

export function useCampaignScorecardData({ startDate, endDate, client }: UseCampaignScorecardDataParams) {
  const [campaigns, setCampaigns] = useState<CampaignScorecardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!client) {
      setCampaigns([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate)

      // Fetch campaign reporting data
      let allCampaignRows: any[] = []
      let campaignOffset = 0
      let hasMoreCampaigns = true
      const batchSize = 1000

      while (hasMoreCampaigns) {
        const { data: pageData, error: campaignError } = await supabase
          .from('campaign_reporting')
          .select('date, campaign_id, campaign_name, emails_sent, total_leads_contacted, bounced, interested')
          .eq('client', client)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date')
          .range(campaignOffset, campaignOffset + batchSize - 1)

        if (campaignError) throw campaignError

        if (pageData && pageData.length > 0) {
          allCampaignRows = allCampaignRows.concat(pageData)
          campaignOffset += batchSize
          hasMoreCampaigns = pageData.length === batchSize
        } else {
          hasMoreCampaigns = false
        }
      }

      // Fetch replies data
      let allRepliesData: any[] = []
      let repliesOffset = 0
      let hasMoreReplies = true

      while (hasMoreReplies) {
        const { data: pageData, error: repliesError } = await supabase
          .from('replies')
          .select('campaign_id, category, date_received')
          .eq('client', client)
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .range(repliesOffset, repliesOffset + batchSize - 1)

        if (repliesError) throw repliesError

        if (pageData && pageData.length > 0) {
          allRepliesData = allRepliesData.concat(pageData)
          repliesOffset += batchSize
          hasMoreReplies = pageData.length === batchSize
        } else {
          hasMoreReplies = false
        }
      }

      // Fetch meetings booked
      let allMeetingsData: any[] = []
      let meetingsOffset = 0
      let hasMoreMeetings = true

      while (hasMoreMeetings) {
        const { data: pageData, error: meetingsError } = await supabase
          .from('meetings_booked')
          .select('campaign_id, created_time')
          .eq('client', client)
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .range(meetingsOffset, meetingsOffset + batchSize - 1)

        if (meetingsError) throw meetingsError

        if (pageData && pageData.length > 0) {
          allMeetingsData = allMeetingsData.concat(pageData)
          meetingsOffset += batchSize
          hasMoreMeetings = pageData.length === batchSize
        } else {
          hasMoreMeetings = false
        }
      }

      // Group data by campaign
      const campaignMap = new Map<string, {
        campaignName: string
        campaignId: string
        dailyData: Map<string, ChartDataPoint>
        totals: {
          totalEmailsSent: number
          uniqueProspects: number
          totalReplies: number
          realReplies: number
          positiveReplies: number
          bounces: number
          meetingsBooked: number
        }
      }>()

      // Helper to format date string to display
      const formatDateDisplay = (dateStr: string) => {
        const [_year, month, day] = dateStr.split('-').map(Number)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[month - 1]} ${day}`
      }

      // Process campaign reporting data
      allCampaignRows.forEach((row: any) => {
        if (!row.campaign_id || !row.campaign_name) return

        const key = row.campaign_id
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            campaignName: row.campaign_name,
            campaignId: row.campaign_id,
            dailyData: new Map(),
            totals: {
              totalEmailsSent: 0,
              uniqueProspects: 0,
              totalReplies: 0,
              realReplies: 0,
              positiveReplies: 0,
              bounces: 0,
              meetingsBooked: 0,
            }
          })
        }

        const campaign = campaignMap.get(key)!
        campaign.totals.totalEmailsSent += row.emails_sent || 0
        campaign.totals.uniqueProspects += row.total_leads_contacted || 0
        campaign.totals.bounces += row.bounced || 0
        campaign.totals.positiveReplies += row.interested || 0

        // Daily data
        const dateStr = row.date
        if (!campaign.dailyData.has(dateStr)) {
          campaign.dailyData.set(dateStr, {
            date: formatDateDisplay(dateStr),
            sent: 0,
            prospects: 0,
            replied: 0,
            positiveReplies: 0,
            meetings: 0,
          })
        }
        const point = campaign.dailyData.get(dateStr)!
        point.sent += row.emails_sent || 0
        point.prospects += row.total_leads_contacted || 0
        point.positiveReplies += row.interested || 0
      })

      // Process replies
      allRepliesData.forEach((reply: any) => {
        if (!reply.campaign_id) return

        const key = reply.campaign_id
        const campaign = campaignMap.get(key)
        if (!campaign) return

        campaign.totals.totalReplies += 1
        const cat = (reply.category || '').toLowerCase()
        const isOOO = cat.includes('out of office') || cat.includes('ooo')
        if (!isOOO) {
          campaign.totals.realReplies += 1
        }

        // Daily data
        const dateStr = reply.date_received?.split('T')[0]
        if (dateStr && campaign.dailyData.has(dateStr)) {
          if (!isOOO) {
            campaign.dailyData.get(dateStr)!.replied += 1
          }
        }
      })

      // Process meetings
      allMeetingsData.forEach((meeting: any) => {
        if (!meeting.campaign_id) return

        const key = meeting.campaign_id
        const campaign = campaignMap.get(key)
        if (!campaign) return

        campaign.totals.meetingsBooked += 1

        // Daily data
        const dateStr = meeting.created_time?.split('T')[0]
        if (dateStr && campaign.dailyData.has(dateStr)) {
          campaign.dailyData.get(dateStr)!.meetings += 1
        }
      })

      // Convert to array and build scorecards
      const scorecards: CampaignScorecardData[] = []

      campaignMap.forEach((campaign) => {
        // Sort daily data by date and convert to array
        const sortedDailyData = Array.from(campaign.dailyData.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([_, point]) => point)

        scorecards.push({
          campaignName: campaign.campaignName,
          campaignId: campaign.campaignId,
          metrics: campaign.totals,
          chartData: sortedDailyData,
        })
      })

      // Sort by emails sent descending
      scorecards.sort((a, b) => b.metrics.totalEmailsSent - a.metrics.totalEmailsSent)

      setCampaigns(scorecards)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { campaigns, loading, error, refetch: fetchData }
}

