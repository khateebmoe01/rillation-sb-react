import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery } from '../lib/supabase'
import type { FunnelStage, FunnelForecast } from '../types/database'

interface UsePipelineDataParams {
  startDate: Date
  endDate: Date
  month: number
  year: number
}

export function usePipelineData({ startDate, endDate, month, year }: UsePipelineDataParams) {
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([])
  const [spreadsheetData, setSpreadsheetData] = useState<FunnelForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)

      // Fetch campaign reporting data for funnel
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaign_reporting')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)

      if (campaignError) throw campaignError

      // Fetch replies data
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select('*')
        .gte('date_received', startStr)
        .lte('date_received', endStr)

      if (repliesError) throw repliesError

      // Fetch meetings booked
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings_booked')
        .select('*')
        .gte('created_time', startStr)
        .lte('created_time', endStr)

      if (meetingsError) throw meetingsError

      // Calculate funnel stages from actual data
      const totalSent = campaignData?.reduce((sum, row) => sum + (row.emails_sent || 0), 0) || 0
      const uniqueContacts = campaignData?.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0) || 0
      
      // Real replies - exclude "Out Of Office" (case insensitive check)
      const realReplies = repliesData?.filter((r) => {
        const cat = (r.category || '').toLowerCase()
        return !cat.includes('out of office') && !cat.includes('ooo')
      }).length || 0
      
      // Positive replies - "Interested" category
      const positiveReplies = repliesData?.filter((r) => 
        (r.category || '').toLowerCase() === 'interested'
      ).length || 0
      
      // Sales handoff count (from engaged_leads or manual tracking)
      const salesHandoff = meetingsData?.length || 0
      const meetingsBooked = meetingsData?.length || 0

      // Fetch engaged_leads to get counts from boolean columns
      const { data: engagedLeadsData, error: engagedLeadsError } = await supabase
        .from('engaged_leads')
        .select('*')

      if (engagedLeadsError) throw engagedLeadsError

      // Count leads by stage using boolean columns
      let showedUpToDisco = engagedLeadsData?.filter((lead: any) => lead.showed_up_to_disco === true).length || 0
      let qualified = engagedLeadsData?.filter((lead: any) => lead.qualified === true).length || 0
      let demoBooked = engagedLeadsData?.filter((lead: any) => lead.demo_booked === true).length || 0
      let showedUpToDemo = engagedLeadsData?.filter((lead: any) => lead.showed_up_to_demo === true).length || 0
      let proposalSent = engagedLeadsData?.filter((lead: any) => lead.proposal_sent === true || lead.pilot_accepted === true).length || 0
      let closed = engagedLeadsData?.filter((lead: any) => lead.closed === true).length || 0

      // Fetch funnel forecasts for manual overrides (optional)
      const { data: forecastData, error: forecastError } = await supabase
        .from('funnel_forecasts')
        .select('*')
        .eq('month', month)
        .eq('year', year)

      // Don't throw error if forecast table doesn't exist or is empty
      if (!forecastError && forecastData) {
        // Create forecast map
        const forecastMap = new Map<string, FunnelForecast>()
        forecastData.forEach((f) => {
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
        { name: 'Positive Replies', value: positiveReplies, percentage: realReplies > 0 ? (positiveReplies / realReplies) * 100 : 0 },
        { name: 'Meetings Booked', value: salesHandoff, percentage: positiveReplies > 0 ? (salesHandoff / positiveReplies) * 100 : 0 },
        { name: 'Showed Up to Disco', value: showedUpToDisco, percentage: salesHandoff > 0 ? (showedUpToDisco / salesHandoff) * 100 : 0 },
        { name: 'Qualified', value: qualified, percentage: showedUpToDisco > 0 ? (qualified / showedUpToDisco) * 100 : 0 },
        { name: 'Demo Booked', value: demoBooked, percentage: qualified > 0 ? (demoBooked / qualified) * 100 : 0 },
        { name: 'Showed Up to Demo', value: showedUpToDemo, percentage: demoBooked > 0 ? (showedUpToDemo / demoBooked) * 100 : 0 },
        { name: 'Proposal Sent', value: proposalSent, percentage: showedUpToDemo > 0 ? (proposalSent / showedUpToDemo) * 100 : 0 },
        { name: 'Closed', value: closed, percentage: proposalSent > 0 ? (closed / proposalSent) * 100 : 0 },
      ]

      setFunnelStages(stages)
      // Set spreadsheet data - use forecastData if available, otherwise empty array
      setSpreadsheetData(forecastData && !forecastError ? forecastData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, month, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { funnelStages, spreadsheetData, loading, error, refetch: fetchData }
}
