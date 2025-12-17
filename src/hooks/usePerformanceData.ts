import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery } from '../lib/supabase'
import type { ClientBubbleData, ClientTarget } from '../types/database'

interface UsePerformanceDataParams {
  startDate: Date
  endDate: Date
  campaign?: string
}

export function usePerformanceData({ startDate, endDate, campaign }: UsePerformanceDataParams) {
  const [clientData, setClientData] = useState<ClientBubbleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      
      // Calculate number of days for target multiplication
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      // Fetch all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('Clients')
        .select('Business')
        .order('Business')

      if (clientsError) throw clientsError

      // Fetch campaign reporting data
      let campaignQuery = supabase
        .from('campaign_reporting')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)

      if (campaign) campaignQuery = campaignQuery.eq('campaign_name', campaign)

      const { data: campaignData, error: campaignError } = await campaignQuery

      if (campaignError) throw campaignError

      // Fetch replies data (all replies, we'll filter out OOO in code)
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

      // Fetch client targets
      const { data: targetsData, error: targetsError } = await supabase
        .from('client_targets')
        .select('*')

      if (targetsError) throw targetsError

      // Create targets map
      const targetsMap = new Map<string, ClientTarget>()
      targetsData?.forEach((target) => {
        targetsMap.set(target.client, target)
      })

      // Aggregate data by client
      const clientNames = clientsData?.map((c) => c.Business).filter(Boolean) || []
      
      const aggregatedData: ClientBubbleData[] = clientNames.map((clientName) => {
        // Campaign metrics for this client
        const clientCampaigns = campaignData?.filter((c) => c.client === clientName) || []
        const emailsSent = clientCampaigns.reduce((sum, row) => sum + (row.emails_sent || 0), 0)
        const uniqueProspects = clientCampaigns.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0)
        
        // Replies for this client (excluding Out Of Office - case insensitive)
        const clientReplies = repliesData?.filter((r) => {
          if (r.client !== clientName) return false
          const cat = (r.category || '').toLowerCase()
          return !cat.includes('out of office') && !cat.includes('ooo')
        }) || []
        const realReplies = clientReplies.length
        
        // Meetings for this client
        const clientMeetings = meetingsData?.filter((m) => m.client === clientName) || []
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

      setClientData(aggregatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, campaign])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { clientData, loading, error, refetch: fetchData }
}

