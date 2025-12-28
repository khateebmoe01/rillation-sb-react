import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'

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
      const endStrNextDay = formatDateForQueryEndOfDay(endDate) // For timestamp comparisons

      // Fetch ALL campaign reporting data using pagination
      let allCampaignRows: any[] = []
      let campaignOffset = 0
      let hasMoreCampaigns = true
      const batchSize = 1000

      while (hasMoreCampaigns) {
        let campaignQuery = supabase
          .from('campaign_reporting')
          .select('campaign_id, campaign_name, client, emails_sent, total_leads_contacted, bounced, interested')
          .gte('date', startStr)
          .lte('date', endStr)
          .order('campaign_name')
          .range(campaignOffset, campaignOffset + batchSize - 1)

        if (client) campaignQuery = campaignQuery.eq('client', client)

        const { data: pageData, error: campaignError } = await campaignQuery
        if (campaignError) throw campaignError

        if (pageData && pageData.length > 0) {
          allCampaignRows = allCampaignRows.concat(pageData)
          campaignOffset += batchSize
          hasMoreCampaigns = pageData.length === batchSize
        } else {
          hasMoreCampaigns = false
        }
      }

      const campaignRows = allCampaignRows

      type CampaignRow = {
        campaign_id: string | null
        campaign_name: string | null
        client: string | null
        emails_sent: number | null
        total_leads_contacted: number | null
        bounced: number | null
        interested: number | null
      }

      // Get unique campaigns - keyed by campaign_id||client to handle duplicate campaign names
      const uniqueCampaigns = new Map<string, { campaign_id: string; campaign_name: string; client: string }>()
      ;(campaignRows as CampaignRow[] | null)?.forEach((row) => {
        if (row.campaign_id && row.campaign_name && row.client) {
          const key = `${String(row.campaign_id)}||${row.client}`
          if (!uniqueCampaigns.has(key)) {
            uniqueCampaigns.set(key, {
              campaign_id: row.campaign_id,
              campaign_name: row.campaign_name,
              client: row.client,
            })
          }
        }
      })

      // Calculate totals per campaign - keyed by campaign_id||client to handle duplicate campaign names
      const campaignStatsMap = new Map<string, CampaignStat>()

      // Aggregate from campaign_reporting
      ;(campaignRows as CampaignRow[] | null)?.forEach((row) => {
        if (!row.campaign_id || !row.campaign_name || !row.client) return
        
        const key = `${String(row.campaign_id)}||${row.client}`
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
        stat.positiveReplies += row.interested || 0
      })

      // Fetch ALL replies data using pagination
      // date_received is TIMESTAMPTZ, so use lt() with next day to include entire end date
      let allRepliesData: any[] = []
      let repliesOffset = 0
      let hasMoreReplies = true

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9428b436-58ef-4c72-b9f2-dfdc5784cfa8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCampaignStats.ts:130',message:'Replies query params',data:{startStr,endStrNextDay,client:client||'none',batchSize},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      while (hasMoreReplies) {
        // Try to select campaign_name, but handle if it doesn't exist in the table
        // If campaign_name column doesn't exist, we'll use campaign_id for matching
        let repliesQuery = supabase
          .from('replies')
          .select('campaign_id, client, category, date_received')
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .range(repliesOffset, repliesOffset + batchSize - 1)

        if (client) repliesQuery = repliesQuery.eq('client', client)

        const { data: pageData, error: repliesError } = await repliesQuery
        if (repliesError) throw repliesError

        if (pageData && pageData.length > 0) {
          allRepliesData = allRepliesData.concat(pageData)
          repliesOffset += batchSize
          hasMoreReplies = pageData.length === batchSize
        } else {
          hasMoreReplies = false
        }
      }

      const repliesData = allRepliesData

      type ReplyRow = {
        campaign_id: string | null
        client: string | null
        category: string | null
        date_received: string | null
      }

      // Fetch ALL meetings booked using pagination
      // created_time is TIMESTAMPTZ, so use lt() with next day to include entire end date
      let allMeetingsData: any[] = []
      let meetingsOffset = 0
      let hasMoreMeetings = true

      while (hasMoreMeetings) {
        let meetingsQuery = supabase
          .from('meetings_booked')
          .select('campaign_id, campaign_name, client')
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .range(meetingsOffset, meetingsOffset + batchSize - 1)

        if (client) meetingsQuery = meetingsQuery.eq('client', client)

        const { data: pageData, error: meetingsError } = await meetingsQuery
        if (meetingsError) throw meetingsError

        if (pageData && pageData.length > 0) {
          allMeetingsData = allMeetingsData.concat(pageData)
          meetingsOffset += batchSize
          hasMoreMeetings = pageData.length === batchSize
        } else {
          hasMoreMeetings = false
        }
      }

      const meetingsData = allMeetingsData

      type MeetingRow = {
        campaign_id: string | null
        campaign_name: string | null
        client: string | null
      }

      // Count meetings per campaign - match by campaign_id AND client using the new key structure
      ;(meetingsData as MeetingRow[] | null)?.forEach((meeting) => {
        const meetingCampaignId = meeting.campaign_id || ''
        const meetingClient = meeting.client || ''
        
        // Match by campaign_id||client (the key used in campaignStatsMap)
        if (meetingCampaignId && meetingClient) {
          const key = `${String(meetingCampaignId)}||${meetingClient}`
          if (campaignStatsMap.has(key)) {
            campaignStatsMap.get(key)!.meetingsBooked += 1
          }
        }
      })

      // Map campaign_id + client to campaign_name for matching replies
      // Build this map from campaign_reporting first (authoritative source)
      // IMPORTANT: Must use campaign_id + client combination because campaign_id alone is not unique
      const campaignIdClientToName = new Map<string, string>()
      const targetCampaignName = 'sbp_Storeleads United States - Copy Version 2'
      ;(campaignRows as CampaignRow[] | null)?.forEach((row) => {
        if (row.campaign_id && row.campaign_name && row.client) {
          // Use campaign_id + client as unique key
          const key = `${String(row.campaign_id)}||${row.client}`
          
          // #region agent log
          if (row.campaign_name === targetCampaignName) {
            fetch('http://127.0.0.1:7242/ingest/9428b436-58ef-4c72-b9f2-dfdc5784cfa8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCampaignStats.ts:245',message:'Target campaign in campaign_reporting',data:{campaign_id:row.campaign_id,client:row.client,campaign_name:row.campaign_name,emails_sent:row.emails_sent},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
          }
          // #endregion
          
          campaignIdClientToName.set(key, row.campaign_name)
        }
      })

      // Count replies by campaign and create campaign entries for replies-only campaigns
      // Use campaign_id||client as the key directly to match campaignStatsMap structure
      const targetCampaignClient = client || 'Sb P' // Use filtered client or default
      let targetCampaignReplies: any[] = []
      
      ;(repliesData as ReplyRow[] | null)?.forEach((reply) => {
        if (!reply.campaign_id || !reply.client) return
        
        // Use campaign_id||client as the key (matches campaignStatsMap structure)
        const key = `${String(reply.campaign_id)}||${reply.client}`
        
        // Get campaign_name from the mapping for logging/debugging purposes
        const campaignName = campaignIdClientToName.get(key) || reply.campaign_id
        
        // #region agent log
        if (campaignName === targetCampaignName && reply.client === targetCampaignClient) {
          fetch('http://127.0.0.1:7242/ingest/9428b436-58ef-4c72-b9f2-dfdc5784cfa8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCampaignStats.ts:277',message:'Matching reply to target campaign',data:{campaign_id:reply.campaign_id,campaign_name_matched:campaignName,client:reply.client,date_received:reply.date_received,category:reply.category},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
          targetCampaignReplies.push(reply)
        }
        // #endregion
        
        // Ensure campaign exists in campaignStatsMap (create if it doesn't exist)
        if (!campaignStatsMap.has(key)) {
          // Get campaign_name from the mapping, or use campaign_id as fallback
          const mappedCampaignName = campaignIdClientToName.get(key) || reply.campaign_id
          campaignStatsMap.set(key, {
            campaign_name: mappedCampaignName,
            campaign_id: reply.campaign_id,
            client: reply.client,
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
        // Count ALL replies (including OOO) for totalReplies
        // No need to check client match since key already includes client
        stat.totalReplies += 1

        const cat = (reply.category || '').toLowerCase()
        const isOOO = cat.includes('out of office') || cat.includes('ooo')
        // Exclude OOO for realReplies
        if (!isOOO) {
          stat.realReplies += 1
        }
      })
      
      // #region agent log
      // Find target campaign by name since campaignStatsMap is now keyed by campaign_id||client
      const targetCampaign = Array.from(campaignStatsMap.values()).find(
        c => c.campaign_name === targetCampaignName && c.client === targetCampaignClient
      )
      if (targetCampaign) {
        fetch('http://127.0.0.1:7242/ingest/9428b436-58ef-4c72-b9f2-dfdc5784cfa8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCampaignStats.ts:290',message:'Final campaign stats',data:{campaign_name:targetCampaignName,campaign_id:targetCampaign.campaign_id,totalReplies:targetCampaign.totalReplies,realReplies:targetCampaign.realReplies,client:targetCampaign.client,target_replies_count:targetCampaignReplies.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion

      // Convert to array and sort
      // Don't filter out campaigns with 0 sent - include all to match scorecard totals
      const allCampaigns = Array.from(campaignStatsMap.values())
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










