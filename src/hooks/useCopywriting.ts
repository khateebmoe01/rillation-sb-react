import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Types
export interface CopyEmail {
  id: string
  subject?: string
  body: string
  variables: string[]
  notes?: string
  // Per-email Clay prompts - each variable in this email can have its own prompt
  clay_prompts?: Record<string, ClayPrompt>
}

export interface CopySequence {
  id: string
  name: string
  phase?: string
  description?: string
  emails: CopyEmail[]
  created_at?: string
}

export interface ClayPrompt {
  prompt: string
  description?: string
  example_output?: string
  columns_used?: string[]
  created_at?: string
  updated_at?: string
}

export interface PromptTemplate {
  id: string
  name: string
  template: string
  variables: string[]
  description?: string
}

export interface ClientCopywriting {
  id: string
  client: string
  copy_structures: CopySequence[]
  clay_prompts: Record<string, ClayPrompt>
  prompt_templates: PromptTemplate[]
  source_call_ids: string[]
  source_knowledge_base_id?: string
  last_generated_at?: string
  last_generated_by?: string
  created_at: string
  updated_at: string
}

// Helper to get table reference
const getTable = (name: string) => (supabase as any).from(name)

export function useCopywriting(selectedClient: string | null) {
  const [copywriting, setCopywriting] = useState<ClientCopywriting | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch copywriting data for selected client
  const fetchCopywriting = useCallback(async () => {
    if (!selectedClient) {
      setCopywriting(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getTable('client_copywriting')
        .select('*')
        .eq('client', selectedClient)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      setCopywriting(data || null)
    } catch (err) {
      console.error('Error fetching copywriting:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch copywriting data')
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  useEffect(() => {
    fetchCopywriting()
  }, [fetchCopywriting])

  // Save/update copywriting data
  const saveCopywriting = useCallback(async (updates: Partial<ClientCopywriting>) => {
    if (!selectedClient) return null

    try {
      const { data, error: saveError } = await getTable('client_copywriting')
        .upsert({
          client: selectedClient,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client' })
        .select()
        .single()

      if (saveError) throw saveError
      setCopywriting(data)
      return data as ClientCopywriting
    } catch (err) {
      console.error('Error saving copywriting:', err)
      return null
    }
  }, [selectedClient])

  // Save copy structures
  const saveCopyStructures = useCallback(async (structures: CopySequence[]) => {
    return saveCopywriting({ copy_structures: structures })
  }, [saveCopywriting])

  // Add a new sequence
  const addSequence = useCallback(async (sequence: CopySequence) => {
    const current = copywriting?.copy_structures || []
    return saveCopyStructures([...current, sequence])
  }, [copywriting, saveCopyStructures])

  // Update a sequence
  const updateSequence = useCallback(async (sequenceId: string, updates: Partial<CopySequence>) => {
    const current = copywriting?.copy_structures || []
    const updated = current.map(seq => 
      seq.id === sequenceId ? { ...seq, ...updates } : seq
    )
    return saveCopyStructures(updated)
  }, [copywriting, saveCopyStructures])

  // Delete a sequence
  const deleteSequence = useCallback(async (sequenceId: string) => {
    const current = copywriting?.copy_structures || []
    const filtered = current.filter(seq => seq.id !== sequenceId)
    return saveCopyStructures(filtered)
  }, [copywriting, saveCopyStructures])

  // Save clay prompts
  const saveClayPrompts = useCallback(async (prompts: Record<string, ClayPrompt>) => {
    return saveCopywriting({ clay_prompts: prompts })
  }, [saveCopywriting])

  // Add or update a single clay prompt
  const saveClayPrompt = useCallback(async (variableName: string, prompt: ClayPrompt) => {
    const current = copywriting?.clay_prompts || {}
    return saveClayPrompts({
      ...current,
      [variableName]: {
        ...prompt,
        updated_at: new Date().toISOString(),
      },
    })
  }, [copywriting, saveClayPrompts])

  // Delete a clay prompt
  const deleteClayPrompt = useCallback(async (variableName: string) => {
    const current = copywriting?.clay_prompts || {}
    const { [variableName]: removed, ...rest } = current
    return saveClayPrompts(rest)
  }, [copywriting, saveClayPrompts])

  // Save prompt templates
  const savePromptTemplates = useCallback(async (templates: PromptTemplate[]) => {
    return saveCopywriting({ prompt_templates: templates })
  }, [saveCopywriting])

  // Extract all unique variables from copy structures
  const extractVariables = useCallback((): string[] => {
    if (!copywriting?.copy_structures) return []
    
    const variables = new Set<string>()
    copywriting.copy_structures.forEach(sequence => {
      sequence.emails.forEach(email => {
        // Extract from stored variables array
        email.variables?.forEach(v => variables.add(v))
        
        // Also extract from body text ({{variable}})
        const matches = email.body.match(/\{\{([^}]+)\}\}/g)
        if (matches) {
          matches.forEach(match => {
            const varName = match.replace(/\{\{|\}\}/g, '').trim()
            variables.add(varName)
          })
        }
      })
    })
    
    return Array.from(variables).sort()
  }, [copywriting])

  // Get variables that don't have clay prompts yet
  const getUnmappedVariables = useCallback((): string[] => {
    const allVariables = extractVariables()
    const mappedVariables = Object.keys(copywriting?.clay_prompts || {})
    return allVariables.filter(v => !mappedVariables.includes(v))
  }, [extractVariables, copywriting])

  return {
    copywriting,
    loading,
    error,
    refetch: fetchCopywriting,
    
    // CRUD operations
    saveCopywriting,
    saveCopyStructures,
    addSequence,
    updateSequence,
    deleteSequence,
    saveClayPrompts,
    saveClayPrompt,
    deleteClayPrompt,
    savePromptTemplates,
    
    // Helpers
    extractVariables,
    getUnmappedVariables,
  }
}
