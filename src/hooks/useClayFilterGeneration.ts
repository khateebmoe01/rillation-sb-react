import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { GeneratedFilter, ClayCompanySearchFilters } from '../types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

interface GenerateFiltersResponse {
  success: boolean
  generated_filter_id: string | null
  filters: ClayCompanySearchFilters
  reasoning: string
  suggested_limit: number
  confidence: number
  error?: string
}

interface SubmitFiltersResponse {
  success: boolean
  table_id: string
  task_id: string
  records_imported: number
  companies_found: number
  table_name: string
  error?: string
}

interface UseClayFilterGenerationState {
  isGenerating: boolean
  isSubmitting: boolean
  generatedFilter: GeneratedFilter | null
  error: string | null
}

export function useClayFilterGeneration() {
  const [state, setState] = useState<UseClayFilterGenerationState>({
    isGenerating: false,
    isSubmitting: false,
    generatedFilter: null,
    error: null,
  })

  // Generate filters from a Fathom call or direct transcript
  const generateFilters = useCallback(async (
    options: { fathom_call_id?: string; transcript?: string; client?: string }
  ): Promise<GenerateFiltersResponse | null> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }))

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/clay-generate-filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate filters')
      }

      const result = await response.json() as GenerateFiltersResponse

      // If we have an ID, fetch the full record
      if (result.generated_filter_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: filterRecord } = await (supabase as any)
          .from('generated_filters')
          .select('*')
          .eq('id', result.generated_filter_id)
          .single()

        if (filterRecord) {
          setState(prev => ({
            ...prev,
            isGenerating: false,
            generatedFilter: filterRecord as GeneratedFilter,
          }))
        }
      } else {
        // Create a local filter object for testing without DB
        setState(prev => ({
          ...prev,
          isGenerating: false,
          generatedFilter: {
            id: 'local',
            fathom_call_id: options.fathom_call_id || null,
            client: options.client || 'Unknown',
            filters: result.filters,
            reasoning: result.reasoning,
            suggested_limit: result.suggested_limit,
            confidence: result.confidence,
            status: 'pending_review',
            user_edits: null,
            clay_task_id: null,
            clay_table_id: null,
            clay_response: null,
            submitted_to_clay_at: null,
            error_message: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }))
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))
      return null
    }
  }, [])

  // Update filters locally (for user edits)
  const updateFilters = useCallback((updates: Partial<ClayCompanySearchFilters>) => {
    setState(prev => {
      if (!prev.generatedFilter) return prev

      const newFilters = { ...prev.generatedFilter.filters, ...updates }
      const userEdits = { ...prev.generatedFilter.user_edits, ...updates }

      return {
        ...prev,
        generatedFilter: {
          ...prev.generatedFilter,
          filters: newFilters,
          user_edits: userEdits,
        },
      }
    })
  }, [])

  // Save user edits to database
  const saveEdits = useCallback(async (): Promise<boolean> => {
    if (!state.generatedFilter || state.generatedFilter.id === 'local') {
      return false
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('generated_filters')
        .update({
          filters: state.generatedFilter.filters,
          user_edits: state.generatedFilter.user_edits,
          status: 'approved',
        })
        .eq('id', state.generatedFilter.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        generatedFilter: prev.generatedFilter
          ? { ...prev.generatedFilter, status: 'approved' as const }
          : null,
      }))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save edits'
      setState(prev => ({ ...prev, error: errorMessage }))
      return false
    }
  }, [state.generatedFilter])

  // Submit approved filters to Clay
  const submitToClay = useCallback(async (
    tableName?: string
  ): Promise<SubmitFiltersResponse | null> => {
    if (!state.generatedFilter) {
      setState(prev => ({ ...prev, error: 'No filter to submit' }))
      return null
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }))

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/clay-submit-filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          generated_filter_id: state.generatedFilter.id,
          table_name: tableName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit to Clay')
      }

      const result = await response.json() as SubmitFiltersResponse

      // Update local state with submission info
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        generatedFilter: prev.generatedFilter
          ? {
              ...prev.generatedFilter,
              status: 'submitted',
              clay_table_id: result.table_id,
              clay_task_id: result.task_id,
              submitted_to_clay_at: new Date().toISOString(),
            }
          : null,
      }))

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({ ...prev, isSubmitting: false, error: errorMessage }))
      return null
    }
  }, [state.generatedFilter])

  // Load an existing filter by ID
  const loadFilter = useCallback(async (filterId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('generated_filters')
        .select('*')
        .eq('id', filterId)
        .single()

      if (error) throw error

      setState(prev => ({
        ...prev,
        generatedFilter: data as GeneratedFilter,
        error: null,
      }))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load filter'
      setState(prev => ({ ...prev, error: errorMessage }))
      return false
    }
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      isSubmitting: false,
      generatedFilter: null,
      error: null,
    })
  }, [])

  return {
    ...state,
    generateFilters,
    updateFilters,
    saveEdits,
    submitToClay,
    loadFilter,
    reset,
  }
}
