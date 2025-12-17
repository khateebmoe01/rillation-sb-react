import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery } from '../lib/supabase'
import type { QuickViewMetrics, ChartDataPoint } from '../types/database'

interface UseQuickViewDataParams {
  startDate: Date
  endDate: Date
  client?: string
  campaign?: string
}

export function useQuickViewData({ startDate, endDate, client, campaign }: UseQuickViewDataParams) {
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

      // Fetch campaign reporting data
      let campaignQuery = supabase
        .from('campaign_reporting')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)

      if (client) campaignQuery = campaignQuery.eq('client', client)
      if (campaign) campaignQuery = campaignQuery.eq('campaign_name', campaign)

      const { data: campaignData, error: campaignError } = await campaignQuery

      if (campaignError) throw campaignError

      // Fetch ALL replies data from replies table
      let allRepliesQuery = supabase
        .from('replies')
        .select('*')
        .gte('date_received', startStr)
        .lte('date_received', endStr)

      if (client) allRepliesQuery = allRepliesQuery.eq('client', client)

      const { data: allRepliesData, error: allRepliesError } = await allRepliesQuery

      if (allRepliesError) throw allRepliesError

      // Fetch meetings booked
      let meetingsQuery = supabase
        .from('meetings_booked')
        .select('*')
        .gte('created_time', startStr)
        .lte('created_time', endStr)

      if (client) meetingsQuery = meetingsQuery.eq('client', client)

      const { data: meetingsData, error: meetingsError } = await meetingsQuery

      if (meetingsError) throw meetingsError

      // Calculate metrics
      const totalEmailsSent = campaignData?.reduce((sum, row) => sum + (row.emails_sent || 0), 0) || 0
      const uniqueProspects = campaignData?.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0) || 0
      const bounces = campaignData?.reduce((sum, row) => sum + (row.bounced || 0), 0) || 0

      // Total replies = count from replies table
      const totalReplies = allRepliesData?.length || 0

      // Real replies = all replies EXCLUDING "Out Of Office" (capital O, Of, O)
      // Check for various possible formats
      const realReplies = allRepliesData?.filter((r) => {
        const cat = (r.category || '').toLowerCase()
        return !cat.includes('out of office') && !cat.includes('ooo') && cat !== 'out of office'
      }).length || 0
      
      // Positive replies = replies with 'Interested' category
      const positiveReplies = allRepliesData?.filter((r) => 
        (r.category || '').toLowerCase() === 'interested'
      ).length || 0

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

      campaignData?.forEach((row) => {
        const date = row.date
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sent: 0,
            prospects: 0,
            replied: 0,
            positiveReplies: 0,
          })
        }
        const point = dateMap.get(date)!
        point.sent += row.emails_sent || 0
        point.prospects += row.total_leads_contacted || 0
      })

      // Add replies data to chart from replies table
      allRepliesData?.forEach((reply) => {
        const dateStr = reply.date_received?.split('T')[0]
        if (dateStr) {
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, {
              date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              sent: 0,
              prospects: 0,
              replied: 0,
              positiveReplies: 0,
            })
          }
          const point = dateMap.get(dateStr)!
          // Count non-OOO replies
          const cat = (reply.category || '').toLowerCase()
          if (!cat.includes('out of office') && !cat.includes('ooo')) {
            point.replied += 1
          }
          if (cat === 'interested') {
            point.positiveReplies += 1
          }
        }
      })

      // Sort by date and convert to array
      const sortedData = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, point]) => point)

      setChartData(sortedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client, campaign])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { metrics, chartData, loading, error, refetch: fetchData }
}
