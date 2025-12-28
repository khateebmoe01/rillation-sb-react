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

      // Fetch campaign reporting data for funnel - only Rillation Revenue
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaign_reporting')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .eq('client', 'Rillation Revenue')

      if (campaignError) throw campaignError

      // Fetch replies data - only Rillation Revenue
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select('*')
        .gte('date_received', startStr)
        .lte('date_received', endStr)
        .eq('client', 'Rillation Revenue')

      if (repliesError) throw repliesError

      // Fetch meetings booked - only Rillation Revenue
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings_booked')
        .select('*')
        .gte('created_time', startStr)
        .lte('created_time', endStr)
        .eq('client', 'Rillation Revenue')

      if (meetingsError) throw meetingsError

      // Calculate funnel stages from actual data
      const campaignRows = (campaignData || []) as any[]
      const replyRows = (repliesData || []) as any[]
      
      const totalSent = campaignRows.reduce((sum, row) => sum + (row.emails_sent || 0), 0)
      const uniqueContacts = campaignRows.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0)
      
      // Real replies - exclude "Out Of Office" (case insensitive check)
      const realReplies = replyRows.filter((r) => {
        const cat = (r.category || '').toLowerCase()
        return !cat.includes('out of office') && !cat.includes('ooo')
      }).length
      
      // Positive replies (Interested) - sum from campaign_reporting.interested
      const positiveReplies = campaignRows.reduce((sum, row) => sum + (row.interested || 0), 0)
      
      // Sales handoff count (from engaged_leads or manual tracking)
      const salesHandoff = meetingsData?.length || 0
      const meetingsBooked = meetingsData?.length || 0

      // Fetch engaged_leads to get counts from boolean columns
      // Filter by date_created within the selected date range
      const { data: engagedLeadsData, error: engagedLeadsError } = await supabase
        .from('engaged_leads')
        .select('*')
        .gte('date_created', startStr)
        .lte('date_created', endStr)
        .eq('client', 'Rillation Revenue')

      if (engagedLeadsError) {
        console.error('Error fetching engaged_leads:', engagedLeadsError)
        // Don't throw, just continue with zeros
      }

      console.log('Engaged leads data:', engagedLeadsData?.length, 'records')
      if (engagedLeadsData && engagedLeadsData.length > 0) {
        console.log('Sample engaged lead columns:', Object.keys(engagedLeadsData[0]))
        // Log boolean column values from first few records
        const sampleLeads = engagedLeadsData.slice(0, 5).map((l: any) => ({
          showed_up_to_disco: l.showed_up_to_disco,
          qualified: l.qualified,
          demo_booked: l.demo_booked,
          showed_up_to_demo: l.showed_up_to_demo,
          proposal_sent: l.proposal_sent,
          closed: l.closed,
        }))
        console.log('Sample boolean values:', JSON.stringify(sampleLeads))
      }

      // Count leads by stage using boolean columns
      // Check for any truthy value (true, 'true', 1, 'yes', 'Yes', etc.)
      const isTruthy = (val: any): boolean => {
        if (val === true || val === 1 || val === '1') return true
        if (typeof val === 'string') {
          const lower = val.toLowerCase()
          return lower === 'true' || lower === 'yes' || lower === 'y'
        }
        return !!val && val !== null && val !== undefined && val !== ''
      }
      
      let showedUpToDisco = engagedLeadsData?.filter((lead: any) => isTruthy(lead.showed_up_to_disco)).length || 0
      let qualified = engagedLeadsData?.filter((lead: any) => isTruthy(lead.qualified)).length || 0
      let demoBooked = engagedLeadsData?.filter((lead: any) => isTruthy(lead.demo_booked)).length || 0
      let showedUpToDemo = engagedLeadsData?.filter((lead: any) => isTruthy(lead.showed_up_to_demo)).length || 0
      let proposalSent = engagedLeadsData?.filter((lead: any) => 
        isTruthy(lead.proposal_sent) || isTruthy(lead.pilot_accepted)
      ).length || 0
      let closed = engagedLeadsData?.filter((lead: any) => isTruthy(lead.closed)).length || 0
      
      console.log('Engaged leads counts:', { showedUpToDisco, qualified, demoBooked, showedUpToDemo, proposalSent, closed })

      // Fetch funnel forecasts for manual overrides (optional) - only Rillation Revenue
      let forecastQuery = supabase
        .from('funnel_forecasts')
        .select('*')
        .eq('month', month)
        .eq('year', year)
      
      // Filter by client if client column exists
      forecastQuery = forecastQuery.eq('client', 'Rillation Revenue')
      
      const { data: forecastData, error: forecastError } = await forecastQuery

      // Don't throw error if forecast table doesn't exist or is empty
      const forecastRows = (forecastData || []) as FunnelForecast[]
      if (!forecastError && forecastRows.length > 0) {
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

      setFunnelStages(stages)
      
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
      
      setSpreadsheetData(mergedSpreadsheetData)
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
