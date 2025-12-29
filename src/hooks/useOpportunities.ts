import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface OpportunityStage {
  stage: string
  value: number
  count: number
}

export interface UseOpportunitiesParams {
  client?: string
}

export function useOpportunities({ client }: UseOpportunitiesParams = {}) {
  const [stages, setStages] = useState<OpportunityStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('client_opportunities')
          .select('stage, value')

        if (client) {
          query = query.eq('client', client)
        }

        const { data, error: queryError } = await query

        if (queryError) throw queryError

        // Group by stage and sum values
        const stageMap = new Map<string, { value: number; count: number }>()
        
        ;(data || []).forEach((opp: { stage: string; value: number }) => {
          const current = stageMap.get(opp.stage) || { value: 0, count: 0 }
          stageMap.set(opp.stage, {
            value: current.value + Number(opp.value || 0),
            count: current.count + 1,
          })
        })

        // Define pipeline stage order - ALL 6 stages must be shown
        const stageOrder = [
          'Showed Up to Disco',
          'Qualified',
          'Demo Booked',
          'Showed Up to Demo',
          'Proposal Sent',
          'Closed',
        ]

        // Always return all stages, even if no data
        const stagesData: OpportunityStage[] = stageOrder.map((stage) => {
          const stageData = stageMap.get(stage) || { value: 0, count: 0 }
          return {
            stage,
            value: stageData.value,
            count: stageData.count,
          }
        })

        setStages(stagesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch opportunities')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [client])

  return { stages, loading, error }
}

