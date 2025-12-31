import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import { dataCache, DataCache } from '../lib/cache'
import type { ClientBubbleData, ClientTarget, QuickViewMetrics, ChartDataPoint } from '../types/database'

interface UsePerformanceDataParams {
  startDate: Date
  endDate: Date
  campaigns?: string[]
}

export interface ClientScorecardData {
  metrics: QuickViewMetrics
  chartData: ChartDataPoint[]
}

interface CachedPerformanceData {
  clientData: ClientBubbleData[]
  scorecardData: Map<string, ClientScorecardData>
}

export function usePerformanceData({ startDate, endDate, campaigns }: UsePerformanceDataParams) {
  const [clientData, setClientData] = useState<ClientBubbleData[]>([])
  const [scorecardData, setScorecardData] = useState<Map<string, ClientScorecardData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Track if this is initial load vs background refresh
  const hasInitialData = useRef(false)

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    const cacheKey = DataCache.createKey('performance', {
      startDate,
      endDate,
      campaigns: campaigns?.join(',') || '',
    })

    // Try to get cached data first
    if (!isBackgroundRefresh) {
      const cached = dataCache.get<CachedPerformanceData>(cacheKey)
      if (cached) {
        setClientData(cached.data.clientData)
        setScorecardData(cached.data.scorecardData)
        hasInitialData.current = true
        
        // If data is fresh, don't refetch
        if (!cached.isStale) {
          setLoading(false)
          return
        }
        // Data is stale, show it immediately but fetch fresh in background
        setLoading(false)
      }
    }

    let timeoutId: NodeJS.Timeout | null = null
    try {
      // Only show loading spinner if no cached data
      if (!hasInitialData.current && !isBackgroundRefresh) {
        setLoading(true)
      }
      setError(null)
      
      // Add timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        setError('Request timed out. Please check your Supabase connection and try again.')
        setLoading(false)
      }, 30000) // 30 second timeout
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      
      // Calculate number of days for target multiplication
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const endStrNextDay = formatDateForQueryEndOfDay(endDate)

      // Parallelize ALL data fetches including targets
      const [clientsResult, campaignResult, repliesResult, meetingsResult, targetsResult] = await Promise.all([
        supabase
          .from('Clients')
          .select('Business')
          .order('Business'),
        (async () => {
          let campaignQuery = supabase
            .from('campaign_reporting')
            .select('date,campaign_name,client,emails_sent,total_leads_contacted,bounced,interested')
            .gte('date', startStr)
            .lte('date', endStr)
          
          if (campaigns && campaigns.length > 0) campaignQuery = campaignQuery.in('campaign_name', campaigns)
          
          const { data, error } = await campaignQuery
          if (error) throw error
          return data
        })(),
        (async () => {
          const { data, error } = await supabase
            .from('replies')
            .select('category,date_received,client')
            .gte('date_received', startStr)
            .lt('date_received', endStrNextDay)
          
          if (error) throw error
          return data
        })(),
        (async () => {
          const { data, error } = await supabase
            .from('meetings_booked')
            .select('client,created_time')
            .gte('created_time', startStr)
            .lt('created_time', endStrNextDay)
          
          if (error) throw error
          return data
        })(),
        supabase
          .from('client_targets')
          .select('*'),
      ])

      if (clientsResult.error) {
        console.error('Error fetching clients:', clientsResult.error)
        throw clientsResult.error
      }
      
      if (targetsResult.error) throw targetsResult.error

      const clientsData = clientsResult.data
      const campaignData = campaignResult
      const repliesData = repliesResult
      const meetingsData = meetingsResult
      const targetsData = targetsResult.data

      type ClientRow = { Business: string | null }
      type CampaignRow = {
        client: string | null
        date: string | null
        emails_sent: number | null
        total_leads_contacted: number | null
        bounced: number | null
        interested: number | null
      }
      type ReplyRow = {
        client: string | null
        category: string | null
        date_received: string | null
      }
      type MeetingRow = {
        client: string | null
      }

      // Create targets map
      const targetsMap = new Map<string, ClientTarget>()
      ;(targetsData as ClientTarget[] | null)?.forEach((target) => {
        targetsMap.set(target.client, target)
      })

      // Aggregate data by client
      const clientNames = (clientsData as ClientRow[] | null)?.map((c) => c.Business).filter((name): name is string => Boolean(name)) || []
      
      const aggregatedData = clientNames.map((clientName) => {
        // Campaign metrics for this client
        const clientCampaigns = (campaignData as CampaignRow[] | null)?.filter((c) => c.client === clientName) || []
        const emailsSent = clientCampaigns.reduce((sum, row) => sum + (row.emails_sent || 0), 0)
        const uniqueProspects = clientCampaigns.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0)
        
        // Replies for this client (excluding Out Of Office - case insensitive)
        const clientReplies = (repliesData as (ReplyRow & { client: string | null })[] | null)?.filter((r) => {
          if (r.client !== clientName) return false
          const cat = (r.category || '').toLowerCase()
          return !cat.includes('out of office') && !cat.includes('ooo')
        }) || []
        const realReplies = clientReplies.length
        
        // Meetings for this client
        const clientMeetings = (meetingsData as MeetingRow[] | null)?.filter((m) => m.client === clientName) || []
        const meetings = clientMeetings.length
        
        // Get targets (multiply daily targets by number of days)
        const targets = targetsMap.get(clientName)
        const emailsTarget = (targets?.emails_per_day || 0) * daysDiff
        const prospectsTarget = (targets?.prospects_per_day || 0) * daysDiff
        const repliesTarget = (targets?.replies_per_day || 0) * daysDiff
        const meetingsTarget = (targets?.meetings_per_day || 0) * daysDiff

        return {
          client: clientName,
          emailsSent,
          emailsTarget,
          uniqueProspects,
          prospectsTarget,
          realReplies,
          repliesTarget,
          meetings,
          meetingsTarget,
        }
      })

      // Calculate scorecard data (metrics + chart) for each client
      const scorecardMap = new Map<string, ClientScorecardData>()
      
      // Helper to format date for display
      const formatDateDisplay = (dateStr: string) => {
        const [_year, month, day] = dateStr.split('-').map(Number)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[month - 1]} ${day}`
      }

      clientNames.forEach((clientName) => {
        // Filter data for this client
        const clientCampaigns = (campaignData as CampaignRow[] | null)?.filter((c) => c.client === clientName) || []
        const clientReplies = (repliesData as (ReplyRow & { client: string | null })[] | null)?.filter((r) => r.client === clientName) || []
        const clientMeetings = (meetingsData as MeetingRow[] | null)?.filter((m) => m.client === clientName) || []

        // Calculate metrics
        const totalEmailsSent = clientCampaigns.reduce((sum, row) => sum + (row.emails_sent || 0), 0)
        const uniqueProspects = clientCampaigns.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0)
        const bounces = clientCampaigns.reduce((sum, row) => sum + (row.bounced || 0), 0)
        const positiveReplies = clientCampaigns.reduce((sum, row) => sum + (row.interested || 0), 0)
        
        // Real replies (excluding OOO)
        const realReplies = clientReplies.filter((r) => {
          const cat = (r.category || '').toLowerCase()
          return !cat.includes('out of office') && !cat.includes('ooo')
        }).length
        
        const totalReplies = clientReplies.length
        const meetingsBooked = clientMeetings.length

        // Build chart data by date
        const dateMap = new Map<string, ChartDataPoint>()

        // Add campaign data to chart
        clientCampaigns.forEach((row) => {
          const date = row.date
          if (!date) return
          
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

        // Add replies data to chart
        clientReplies.forEach((reply) => {
          const dateStr = reply.date_received?.split('T')[0]
          if (!dateStr) return
          
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
          const cat = (reply.category || '').toLowerCase()
          if (!cat.includes('out of office') && !cat.includes('ooo')) {
            point.replied += 1
          }
        })

        // Sort chart data by date
        const chartData = Array.from(dateMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([, point]) => point)

        scorecardMap.set(clientName, {
          metrics: {
            totalEmailsSent,
            uniqueProspects,
            totalReplies,
            realReplies,
            positiveReplies,
            bounces,
            meetingsBooked,
          },
          chartData,
        })
      })

      // Update state
      setClientData(aggregatedData as ClientBubbleData[])
      setScorecardData(scorecardMap)
      hasInitialData.current = true

      // Cache the results
      dataCache.set(cacheKey, {
        clientData: aggregatedData as ClientBubbleData[],
        scorecardData: scorecardMap,
      })

      if (timeoutId) clearTimeout(timeoutId)
    } catch (err) {
      console.error('Error in usePerformanceData:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)
      // Only clear data if no cached data exists
      if (!hasInitialData.current) {
        setClientData([])
      }
      if (timeoutId) clearTimeout(timeoutId)
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [startDate, endDate, campaigns])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    // Force a fresh fetch, invalidating cache
    const cacheKey = DataCache.createKey('performance', {
      startDate,
      endDate,
      campaigns: campaigns?.join(',') || '',
    })
    dataCache.invalidate(cacheKey)
    return fetchData(false)
  }, [fetchData, startDate, endDate, campaigns])

  return { clientData, scorecardData, loading, error, refetch }
}
