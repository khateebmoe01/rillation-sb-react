import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery } from '../lib/supabase'

export interface CampaignStat {
  campaign_name: string
  campaign_id: string
  client: string
  totalSent: number
  uniqueProspects: number
  totalReplies: number
  realReplies: number
  positiveReplies: number
  bounces: number
  meetingsBooked: number
}

interface UseCampaignStatsParams {
  startDate: Date
  endDate: Date
  client?: string
  page: number
  pageSize: number
}

export function useCampaignStats({ startDate, endDate, client, page, pageSize }: UseCampaignStatsParams) {
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)

      // Fetch campaign reporting data grouped by campaign
      let campaignQuery = supabase
        .from('campaign_reporting')
        .select('campaign_id, campaign_name, client, emails_sent, total_leads_contacted, bounced')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('campaign_name')

      if (client) campaignQuery = campaignQuery.eq('client', client)

      const { data: campaignRows, error: campaignError } = await campaignQuery
      if (campaignError) throw campaignError

      type CampaignRow = {
        campaign_id: string | null
        campaign_name: string | null
        client: string | null
        emails_sent: number | null
        total_leads_contacted: number | null
        bounced: number | null
      }

      // Get unique campaigns
      const uniqueCampaigns = new Map<string, { campaign_id: string; campaign_name: string; client: string }>()
      ;(campaignRows as CampaignRow[] | null)?.forEach((row) => {
        if (row.campaign_name && !uniqueCampaigns.has(row.campaign_name)) {
          uniqueCampaigns.set(row.campaign_name, {
            campaign_id: row.campaign_id || '',
            campaign_name: row.campaign_name,
            client: row.client || '',
          })
        }
      })

      // Calculate totals per campaign
      const campaignStatsMap = new Map<string, CampaignStat>()

      // Aggregate from campaign_reporting
      ;(campaignRows as CampaignRow[] | null)?.forEach((row) => {
        if (!row.campaign_name) return
        
        const key = row.campaign_name
        if (!campaignStatsMap.has(key)) {
          const campaignInfo = uniqueCampaigns.get(key)!
          campaignStatsMap.set(key, {
            campaign_name: campaignInfo.campaign_name,
            campaign_id: campaignInfo.campaign_id,
            client: campaignInfo.client,
            totalSent: 0,
            uniqueProspects: 0,
            totalReplies: 0,
            realReplies: 0,
            positiveReplies: 0,
            bounces: 0,
            meetingsBooked: 0,
          })
        }

        const stat = campaignStatsMap.get(key)!
        stat.totalSent += row.emails_sent || 0
        stat.uniqueProspects += row.total_leads_contacted || 0
        stat.bounces += row.bounced || 0
      })

      // Fetch replies data
      let repliesQuery = supabase
        .from('replies')
        .select('campaign_id, category')
        .gte('date_received', startStr)
        .lte('date_received', endStr)

      if (client) repliesQuery = repliesQuery.eq('client', client)

      const { data: repliesData, error: repliesError } = await repliesQuery
      if (repliesError) throw repliesError

      type ReplyRow = {
        campaign_id: string | null
        category: string | null
      }

      // Fetch meetings booked
      let meetingsQuery = supabase
        .from('meetings_booked')
        .select('campaign_id, campaign_name')
        .gte('created_time', startStr)
        .lte('created_time', endStr)

      if (client) meetingsQuery = meetingsQuery.eq('client', client)

      const { data: meetingsData, error: meetingsError } = await meetingsQuery
      if (meetingsError) throw meetingsError

      type MeetingRow = {
        campaign_name: string | null
      }

      // Count meetings per campaign
      ;(meetingsData as MeetingRow[] | null)?.forEach((meeting) => {
        const campaignName = meeting.campaign_name || ''
        if (campaignName && campaignStatsMap.has(campaignName)) {
          campaignStatsMap.get(campaignName)!.meetingsBooked += 1
        }
      })

      // Map campaign_id to campaign_name for matching replies
      const campaignIdToName = new Map<string, string>()
      ;(campaignRows as CampaignRow[] | null)?.forEach((row) => {
        if (row.campaign_id && row.campaign_name) {
          campaignIdToName.set(row.campaign_id, row.campaign_name)
        }
      })

      // Count replies by campaign (matching by campaign_id)
      ;(repliesData as ReplyRow[] | null)?.forEach((reply) => {
        const campaignName = campaignIdToName.get(reply.campaign_id || '')
        if (!campaignName || !campaignStatsMap.has(campaignName)) return

        const stat = campaignStatsMap.get(campaignName)!
        stat.totalReplies += 1

        const cat = (reply.category || '').toLowerCase()
        const isOOO = cat.includes('out of office') || cat.includes('ooo')
        if (!isOOO) {
          stat.realReplies += 1
        }
        if (cat === 'interested') {
          stat.positiveReplies += 1
        }
      })

      // Convert to array, filter out campaigns with 0 sent, and sort
      const allCampaigns = Array.from(campaignStatsMap.values())
        .filter(c => c.totalSent > 0) // Only show campaigns with actual sends
        .sort((a, b) => b.totalSent - a.totalSent)

      setTotalCount(allCampaigns.length)

      // Paginate
      const offset = (page - 1) * pageSize
      const paginatedCampaigns = allCampaigns.slice(offset, offset + pageSize)
      setCampaigns(paginatedCampaigns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign stats')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client, page, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { campaigns, totalCount, loading, error, refetch: fetchData }
}


