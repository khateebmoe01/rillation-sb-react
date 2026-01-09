import { useState, useCallback } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'

export interface SequenceStat {
  step_number: number
  step_name: string
  sent: number
  prospects: number
  total_replies: number
  real_replies: number
  positive_replies: number
  bounces: number
  meetings_booked: number
}

interface UseSequenceStatsParams {
  campaignId: string
  client: string
  startDate: Date
  endDate: Date
}

// Helper to generate step name from order
function getStepName(order: number): string {
  if (order === 1) return 'Initial Outreach'
  return `Follow-up ${order - 1}`
}

export function useSequenceStats() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SequenceStat[]>([])

  const fetchSequenceStats = useCallback(async ({ campaignId, client, startDate, endDate }: UseSequenceStatsParams) => {
    try {
      setLoading(true)
      setError(null)

      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate)

      // Fetch campaign_reporting rows with sequence_step_stats JSONB for this campaign
      const { data: reportingData, error: reportingError } = await supabase
        .from('campaign_reporting')
        .select('sequence_step_stats')
        .eq('campaign_id', campaignId)
        .eq('client', client)
        .gte('date', startStr)
        .lte('date', endStr)

      if (reportingError) {
        console.error('Error fetching sequence stats from campaign_reporting:', reportingError)
        setData([])
        return []
      }

      // Aggregate sequence step stats from JSONB across all date rows
      const stepMap = new Map<number, SequenceStat>()

      interface SequenceStepJson {
        order?: number
        sequence_step_id?: number
        sent?: number
        leads_contacted?: number
        bounced?: number
        interested?: number
        unique_replies?: number
        email_subject?: string
      }

      ;(reportingData || []).forEach((row: any) => {
        const steps = row.sequence_step_stats as SequenceStepJson[] | null
        if (!Array.isArray(steps)) return

        steps.forEach((step) => {
          const stepOrder = step.order || 1
          if (!stepMap.has(stepOrder)) {
            stepMap.set(stepOrder, {
              step_number: stepOrder,
              step_name: getStepName(stepOrder),
              sent: 0,
              prospects: 0,
              total_replies: 0,
              real_replies: 0,
              positive_replies: 0,
              bounces: 0,
              meetings_booked: 0,
            })
          }

          const stat = stepMap.get(stepOrder)!
          stat.sent += step.sent || 0
          stat.prospects += step.leads_contacted || 0
          stat.bounces += step.bounced || 0
          stat.positive_replies += step.interested || 0
          // Note: unique_replies in the JSONB is per-contact unique replies, not total
        })
      })

      // Fetch replies aggregated by sequence_step_order for total/real replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select('sequence_step_order, category, lead_id, from_email')
        .eq('campaign_id', campaignId)
        .eq('client', client)
        .gte('date_received', startStr)
        .lt('date_received', endStrNextDay)

      if (!repliesError && repliesData) {
        // Count unique leads per step for total and real replies
        const stepReplies = new Map<number, { total: Set<string>; real: Set<string> }>()

        ;(repliesData as any[]).forEach((reply) => {
          const stepOrder = reply.sequence_step_order || 1
          const leadKey = reply.lead_id || reply.from_email || ''
          if (!leadKey) return

          if (!stepReplies.has(stepOrder)) {
            stepReplies.set(stepOrder, { total: new Set(), real: new Set() })
          }

          const tracking = stepReplies.get(stepOrder)!
          const cat = (reply.category || '').toLowerCase()
          const isOOO = cat.includes('out of office') || cat.includes('ooo')

          tracking.total.add(leadKey)
          if (!isOOO) {
            tracking.real.add(leadKey)
          }
        })

        // Apply reply counts to step stats
        stepReplies.forEach((tracking, stepOrder) => {
          if (!stepMap.has(stepOrder)) {
            stepMap.set(stepOrder, {
              step_number: stepOrder,
              step_name: getStepName(stepOrder),
              sent: 0,
              prospects: 0,
              total_replies: 0,
              real_replies: 0,
              positive_replies: 0,
              bounces: 0,
              meetings_booked: 0,
            })
          }
          const stat = stepMap.get(stepOrder)!
          stat.total_replies = tracking.total.size
          stat.real_replies = tracking.real.size
        })
      }

      // Sort by step number and return
      const result = Array.from(stepMap.values()).sort((a, b) => a.step_number - b.step_number)
      
      // If no data found, return empty array (not synthetic data)
      if (result.length === 0) {
        setData([])
        return []
      }

      setData(result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch sequence stats'
      setError(errorMsg)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchSequenceStats }
}






