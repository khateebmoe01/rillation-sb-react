import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Types matching the edge function
interface QualificationColumn {
  id: string
  name: string
  prompt: string
  condition: string
  conditionColumn: string
  outputFields: {
    qualified: boolean
    score: boolean
    reasoning: boolean
  }
  model: string
}

interface CompanySearchFilters {
  industries?: string[]
  sizes?: string[]
  annual_revenues?: string[]
  country_names?: string[]
  locations?: string[]
  description_keywords?: string[]
  semantic_description?: string
  limit?: number
}

interface OrchestrationRequest {
  client: string
  workbookName: string
  leadSource: 'find-companies' | 'csv-import' | 'other'
  sourceConfig: {
    maxRows: number
    filters?: CompanySearchFilters
  }
  qualificationColumns: QualificationColumn[]
  workspaceId?: string
}

interface ExecutionStep {
  order: number
  type: 'create_workbook' | 'add_source' | 'add_column' | 'run_enrichment'
  description: string
  apiEndpoint: string
  apiMethod: string
  payload: Record<string, unknown>
  estimatedCredits?: number
  dependsOn?: number[]
}

interface ExecutionPlan {
  workbookName: string
  summary: string
  estimatedTotalCredits: number
  estimatedRows: number
  steps: ExecutionStep[]
  warnings?: string[]
  recommendations?: string[]
}

interface OrchestrationResult {
  success: boolean
  plan?: ExecutionPlan
  executionLog?: string
  error?: string
}

type OrchestrationStatus = 'idle' | 'generating' | 'executing' | 'complete' | 'error'

interface UseClayOrchestrationReturn {
  // State
  status: OrchestrationStatus
  plan: ExecutionPlan | null
  result: OrchestrationResult | null
  error: string | null

  // Actions
  beginWorkbook: (request: Omit<OrchestrationRequest, 'client'>, client: string) => Promise<void>
  reset: () => void
}

export function useClayOrchestration(): UseClayOrchestrationReturn {
  const [status, setStatus] = useState<OrchestrationStatus>('idle')
  const [plan, setPlan] = useState<ExecutionPlan | null>(null)
  const [result, setResult] = useState<OrchestrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const beginWorkbook = useCallback(
    async (request: Omit<OrchestrationRequest, 'client'>, client: string) => {
      setStatus('generating')
      setError(null)
      setPlan(null)
      setResult(null)

      try {
        // Get Supabase URL from the client
        const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL

        const response = await fetch(`${supabaseUrl}/functions/v1/clay-orchestrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            ...request,
            client,
          }),
        })

        const data: OrchestrationResult = await response.json()

        if (data.success) {
          setPlan(data.plan || null)
          setResult(data)
          setStatus('complete')
        } else {
          setError(data.error || 'Unknown error occurred')
          setStatus('error')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to orchestration service'
        setError(errorMessage)
        setStatus('error')
      }
    },
    []
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setPlan(null)
    setResult(null)
    setError(null)
  }, [])

  return {
    status,
    plan,
    result,
    error,
    beginWorkbook,
    reset,
  }
}

// Export types for use in components
export type {
  OrchestrationRequest,
  OrchestrationResult,
  ExecutionPlan,
  ExecutionStep,
  QualificationColumn,
  CompanySearchFilters,
  OrchestrationStatus,
}
