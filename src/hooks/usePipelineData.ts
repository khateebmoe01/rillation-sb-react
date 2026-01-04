import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import { dataCache, DataCache } from '../lib/cache'
import { getDeepestStage } from '../lib/pipeline-utils'
import type { FunnelStage, FunnelForecast } from '../types/database'

interface UsePipelineDataParams {
  startDate: Date
  endDate: Date
  month: number
  year: number
}

interface CachedPipelineData {
  funnelStages: FunnelStage[]
  spreadsheetData: FunnelForecast[]
}

export function usePipelineData({ startDate, endDate, month, year }: UsePipelineDataParams) {
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([])
  const [spreadsheetData, setSpreadsheetData] = useState<FunnelForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const hasInitialData = useRef(false)

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    const cacheKey = DataCache.createKey('pipeline', {
      startDate,
      endDate,
      month,
      year,
    })

    // Try to get cached data first
    if (!isBackgroundRefresh) {
      const cached = dataCache.get<CachedPipelineData>(cacheKey)
      if (cached) {
        setFunnelStages(cached.data.funnelStages)
        setSpreadsheetData(cached.data.spreadsheetData)
        hasInitialData.current = true
        
        if (!cached.isStale) {
          setLoading(false)
          return
        }
        setLoading(false)
      }
    }

    try {
      if (!hasInitialData.current && !isBackgroundRefresh) {
        setLoading(true)
      }
      setError(null)
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate)

      // Parallelize all data fetches
      const [campaignResult, repliesResult, meetingsResult, engagedLeadsResult, forecastResult] = await Promise.all([
        supabase
          .from('campaign_reporting')
          .select('*')
          .gte('date', startStr)
          .lte('date', endStr)
          .eq('client', 'Rillation Revenue'),
        supabase
          .from('replies')
          .select('*')
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .eq('client', 'Rillation Revenue'),
        supabase
          .from('meetings_booked')
          .select('*')
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .eq('client', 'Rillation Revenue'),
        supabase
          .from('engaged_leads')
          .select('*')
          .gte('date_created', startStr)
          .lte('date_created', endStr)
          .eq('client', 'Rillation Revenue'),
        supabase
          .from('funnel_forecasts')
          .select('*')
          .eq('month', month)
          .eq('year', year)
          .eq('client', 'Rillation Revenue'),
      ])

      if (campaignResult.error) throw campaignResult.error
      if (repliesResult.error) throw repliesResult.error
      if (meetingsResult.error) throw meetingsResult.error

      const campaignData = campaignResult.data || []
      const repliesData = repliesResult.data || []
      const meetingsData = meetingsResult.data || []
      const engagedLeadsData = engagedLeadsResult.data || []
      const forecastData = forecastResult.data || []

      // Calculate funnel stages from actual data
      const campaignRows = (campaignData || []) as any[]
      const replyRows = (repliesData || []) as any[]
      
      const totalSent = campaignRows.reduce((sum, row) => sum + (row.emails_sent || 0), 0)
      const uniqueContacts = campaignRows.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0)
      
      // Real replies - count UNIQUE lead+campaign+client combinations (excluding OOO)
      const realRepliesSet = new Set<string>()
      replyRows.forEach((r) => {
        const cat = (r.category || '').toLowerCase()
        if (!cat.includes('out of office') && !cat.includes('ooo')) {
          // Use lead_id if available, otherwise use from_email as unique identifier
          const leadKey = r.lead_id || r.from_email || ''
          if (leadKey) {
            // Create unique key combining lead + campaign + client
            const uniqueKey = `${leadKey}||${r.campaign_id || ''}||${r.client || ''}`
            realRepliesSet.add(uniqueKey)
          }
        }
      })
      const realReplies = realRepliesSet.size
      
      // Positive replies (Interested) - sum from campaign_reporting.interested
      const positiveReplies = campaignRows.reduce((sum, row) => sum + (row.interested || 0), 0)
      
      // Sales handoff count (from engaged_leads or manual tracking)
      const salesHandoff = meetingsData.length || 0
      const meetingsBooked = meetingsData.length || 0

      // Count leads by their DEEPEST stage only (a lead only counts in their most advanced stage)
      // This prevents a closed lead from also counting in Demo Booked, etc.
      let showedUpToDisco = 0
      let qualified = 0
      let demoBooked = 0
      let showedUpToDemo = 0
      let proposalSent = 0
      let closed = 0

      ;(engagedLeadsData || []).forEach((lead: any) => {
        const deepestStage = getDeepestStage(lead)
        switch (deepestStage) {
          case 'Showed Up to Disco':
            showedUpToDisco++
            break
          case 'Qualified':
            qualified++
            break
          case 'Demo Booked':
            demoBooked++
            break
          case 'Showed Up to Demo':
            showedUpToDemo++
            break
          case 'Proposal Sent':
            proposalSent++
            break
          case 'Closed':
            closed++
            break
        }
      })
      
      console.log('Engaged leads counts:', { showedUpToDisco, qualified, demoBooked, showedUpToDemo, proposalSent, closed })

      // Don't throw error if forecast table doesn't exist or is empty
      const forecastRows = (forecastData || []) as FunnelForecast[]
      if (forecastRows.length > 0) {
        // Create forecast map
        const forecastMap = new Map<string, FunnelForecast>()
        forecastRows.forEach((f) => {
          forecastMap.set(f.metric_key, f)
        })

        // Use forecast data if available and > 0, otherwise use engaged_leads counts
        const forecastShowedUpToDisco = forecastMap.get('total_show_up_to_disco')?.actual || 0
        const forecastQualified = forecastMap.get('total_qualified')?.actual || 0
        const forecastDemoBooked = forecastMap.get('total_booked')?.actual || 0
        const forecastShowedUpToDemo = forecastMap.get('total_show_up_to_demo')?.actual || 0
        const forecastProposalSent = forecastMap.get('total_PILOT_accepted')?.actual || 0
        const forecastClosed = forecastMap.get('total_deals_closed')?.actual || 0

        // Use forecast if it has data, otherwise use engaged_leads
        if (forecastShowedUpToDisco > 0) showedUpToDisco = forecastShowedUpToDisco
        if (forecastQualified > 0) qualified = forecastQualified
        if (forecastDemoBooked > 0) demoBooked = forecastDemoBooked
        if (forecastShowedUpToDemo > 0) showedUpToDemo = forecastShowedUpToDemo
        if (forecastProposalSent > 0) proposalSent = forecastProposalSent
        if (forecastClosed > 0) closed = forecastClosed
      }

      // Build funnel stages
      const stages: FunnelStage[] = [
        { name: 'Total Sent', value: totalSent },
        { name: 'Unique Contacts', value: uniqueContacts, percentage: totalSent > 0 ? (uniqueContacts / totalSent) * 100 : 0 },
        { name: 'Real Replies', value: realReplies, percentage: uniqueContacts > 0 ? (realReplies / uniqueContacts) * 100 : 0 },
        { name: 'Interested', value: positiveReplies, percentage: realReplies > 0 ? (positiveReplies / realReplies) * 100 : 0 },
        { name: 'Meetings Booked', value: salesHandoff, percentage: positiveReplies > 0 ? (salesHandoff / positiveReplies) * 100 : 0 },
        { name: 'Showed Up to Disco', value: showedUpToDisco, percentage: salesHandoff > 0 ? (showedUpToDisco / salesHandoff) * 100 : 0 },
        { name: 'Qualified', value: qualified, percentage: showedUpToDisco > 0 ? (qualified / showedUpToDisco) * 100 : 0 },
        { name: 'Demo Booked', value: demoBooked, percentage: qualified > 0 ? (demoBooked / qualified) * 100 : 0 },
        { name: 'Showed Up to Demo', value: showedUpToDemo, percentage: demoBooked > 0 ? (showedUpToDemo / demoBooked) * 100 : 0 },
        { name: 'Proposal Sent', value: proposalSent, percentage: showedUpToDemo > 0 ? (proposalSent / showedUpToDemo) * 100 : 0 },
        { name: 'Closed', value: closed, percentage: proposalSent > 0 ? (closed / proposalSent) * 100 : 0 },
      ]

      // Calculate actual values from tracked data
      const actualValues: Record<string, number> = {
        'total_messages_sent': totalSent,
        'total_leads_contacted': uniqueContacts,
        'response_rate': uniqueContacts > 0 ? (realReplies / uniqueContacts) * 100 : 0,
        'total_responses': realReplies,
        'positive_response_rate': realReplies > 0 ? (positiveReplies / realReplies) * 100 : 0,
        'total_pos_response': positiveReplies,
        'booked_rate': positiveReplies > 0 ? (meetingsBooked / positiveReplies) * 100 : 0,
        'total_booked': meetingsBooked,
        'meetings_passed': meetingsBooked,
        'show_up_to_disco_rate': meetingsBooked > 0 ? (showedUpToDisco / meetingsBooked) * 100 : 0,
        'total_show_up_to_disco': showedUpToDisco,
        'qualified_rate': showedUpToDisco > 0 ? (qualified / showedUpToDisco) * 100 : 0,
        'total_qualified': qualified,
        'close_rate': qualified > 0 ? (closed / qualified) * 100 : 0,
        'total_PILOT_accepted': proposalSent,
        'LM_converted_to_close': proposalSent > 0 ? (closed / proposalSent) * 100 : 0,
        'total_deals_closed': closed,
      }
      
      // Merge actual values with forecast data
      const mergedSpreadsheetData: FunnelForecast[] = forecastRows.length > 0
        ? forecastRows.map((row: FunnelForecast) => ({
            ...row,
            actual: actualValues[row.metric_key] !== undefined ? actualValues[row.metric_key] : row.actual,
          }))
        : Object.keys(actualValues).map((key) => ({
            metric_key: key,
            month,
            year,
            estimate_low: 0,
            estimate_avg: 0,
            estimate_high: 0,
            estimate_1: 0,
            estimate_2: 0,
            actual: actualValues[key],
            projected: 0,
          }))
      
      setFunnelStages(stages)
      setSpreadsheetData(mergedSpreadsheetData)
      hasInitialData.current = true

      // Cache the results
      dataCache.set(cacheKey, {
        funnelStages: stages,
        spreadsheetData: mergedSpreadsheetData,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, month, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    const cacheKey = DataCache.createKey('pipeline', {
      startDate,
      endDate,
      month,
      year,
    })
    dataCache.invalidate(cacheKey)
    return fetchData(false)
  }, [fetchData, startDate, endDate, month, year])

  return { funnelStages, spreadsheetData, loading, error, refetch }
}
