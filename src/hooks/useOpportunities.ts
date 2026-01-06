import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, formatDateForQuery } from '../lib/supabase'
import { dataCache, DataCache } from '../lib/cache'
import { isLeadAtDeepestStage } from '../lib/pipeline-utils'

export interface OpportunityStage {
  stage: string
  value: number
  count: number
}

export interface UseOpportunitiesParams {
  client?: string
  startDate?: Date
  endDate?: Date
}

export function useOpportunities({ client, startDate, endDate }: UseOpportunitiesParams = {}) {
  const [stages, setStages] = useState<OpportunityStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const hasInitialData = useRef(false)

  const fetchOpportunities = useCallback(async (isBackgroundRefresh = false) => {
    const cacheKey = DataCache.createKey('opportunities', {
      client: client || '',
      startDate: startDate?.toISOString() || '',
      endDate: endDate?.toISOString() || '',
    })

    // Try to get cached data first
    if (!isBackgroundRefresh) {
      const cached = dataCache.get<OpportunityStage[]>(cacheKey)
      if (cached) {
        setStages(cached.data)
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

      // Define pipeline stage order
      const stageOrder = [
        'Meeting Booked',
        'Showed Up to Disco',
        'Qualified',
        'Demo Booked',
        'Showed Up to Demo',
        'Proposal Sent',
        'Closed',
      ]

      // Initialize stage counts
      const stageMap = new Map<string, { value: number; count: number }>()
      stageOrder.forEach(stage => stageMap.set(stage, { value: 0, count: 0 }))

      // Fetch opportunities with contact_email for matching
      let oppQuery = supabase
        .from('client_opportunities')
        .select('contact_email, stage, value')

      if (client) {
        oppQuery = oppQuery.eq('client', client)
      }

      const { data: opportunitiesData, error: oppError } = await oppQuery
      if (oppError) throw oppError

      // Create opportunity map by email
      const opportunityMap = new Map<string, { stage: string; value: number }>()
      ;(opportunitiesData || []).forEach((opp: any) => {
        if (opp.contact_email) {
          opportunityMap.set(opp.contact_email.toLowerCase(), {
            stage: opp.stage,
            value: Number(opp.value || 0),
          })
        }
      })

      // If we have date filters, only count opportunities for leads in the date range
      if (startDate && endDate && client) {
        const startStr = formatDateForQuery(startDate)
        const endStr = formatDateForQuery(endDate)
        const endStrNextDay = `${endStr}T23:59:59`

        // Fetch meetings_booked for "Meeting Booked" stage
        const { data: meetingsData } = await supabase
          .from('meetings_booked')
          .select('email')
          .eq('client', client)
          .gte('created_time', startStr)
          .lte('created_time', endStrNextDay)

        // Fetch engaged_leads for other stages
        const { data: engagedData } = await supabase
          .from('engaged_leads')
          .select('*')
          .eq('client', client)
          .gte('date_created', startStr)
          .lte('date_created', endStr)

        // Get emails of engaged leads to check if meeting lead has progressed
        const engagedEmails = new Set<string>()
        ;(engagedData || []).forEach((lead: any) => {
          if (lead.email) {
            engagedEmails.add(lead.email.toLowerCase())
          }
        })

        // Process engaged_leads first - count in their deepest stage
        const processedEmails = new Set<string>()
        ;(engagedData || []).forEach((lead: any) => {
          const email = (lead.email || '').toLowerCase()
          if (!email || processedEmails.has(email)) return
          processedEmails.add(email)

          // Find deepest stage for this lead
          for (const stage of [...stageOrder].reverse()) {
            if (stage === 'Meeting Booked') continue
            if (isLeadAtDeepestStage(lead, stage)) {
              const opp = opportunityMap.get(email)
              const current = stageMap.get(stage)!
              stageMap.set(stage, {
                value: current.value + (opp?.value || 0),
                count: current.count + 1,
              })
              break
            }
          }
        })

        // Process Meeting Booked - only count if lead hasn't progressed to engaged_leads
        ;(meetingsData || []).forEach((m: any) => {
          if (m.email) {
            const email = m.email.toLowerCase()
            if (processedEmails.has(email)) return // Already counted in engaged_leads
            processedEmails.add(email)
            
            // Only count in Meeting Booked if not in engaged_leads
            const opp = opportunityMap.get(email)
            const current = stageMap.get('Meeting Booked')!
            stageMap.set('Meeting Booked', {
              value: current.value + (opp?.value || 0),
              count: current.count + 1,
            })
          }
        })
      } else {
        // No date filter - just group by stored stage
        ;(opportunitiesData || []).forEach((opp: any) => {
          const stage = opp.stage
          if (stageMap.has(stage)) {
            const current = stageMap.get(stage)!
            stageMap.set(stage, {
              value: current.value + Number(opp.value || 0),
              count: current.count + 1,
            })
          }
        })
      }

      // Build stages array
      const stagesData: OpportunityStage[] = stageOrder.map((stage) => {
        const stageData = stageMap.get(stage) || { value: 0, count: 0 }
        return {
          stage,
          value: stageData.value,
          count: stageData.count,
        }
      })

      setStages(stagesData)
      hasInitialData.current = true

      // Cache the results
      dataCache.set(cacheKey, stagesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunities')
    } finally {
      setLoading(false)
    }
  }, [client, startDate, endDate])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const refetch = useCallback(() => {
    const cacheKey = DataCache.createKey('opportunities', {
      client: client || '',
      startDate: startDate?.toISOString() || '',
      endDate: endDate?.toISOString() || '',
    })
    dataCache.invalidate(cacheKey)
    return fetchOpportunities(false)
  }, [fetchOpportunities, client, startDate, endDate])

  return { stages, loading, error, refetch }
}
