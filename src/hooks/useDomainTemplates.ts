import { useState, useEffect, useCallback } from 'react'
import { tables } from '../lib/supabase-helpers'
import type { DomainGenerationTemplate } from '../types/infrastructure'

export function useDomainTemplates(client?: string) {
  const [templates, setTemplates] = useState<DomainGenerationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = tables.domain_generation_templates()
        .select('*')
        .order('last_used_at', { ascending: false, nullsFirst: false })

      if (client) {
        query = query.or(`client.eq.${client},client.is.null`)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setTemplates((data || []) as DomainGenerationTemplate[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Create a new template
  const createTemplate = async (templateData: Partial<DomainGenerationTemplate>) => {
    const { data, error } = await tables.domain_generation_templates()
      .insert(templateData)
      .select()
      .single()

    if (error) throw error
    await fetchTemplates()
    return data as DomainGenerationTemplate
  }

  // Update a template
  const updateTemplate = async (id: string, updates: Partial<DomainGenerationTemplate>) => {
    const { error } = await tables.domain_generation_templates()
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchTemplates()
  }

  // Mark template as used
  const markTemplateUsed = async (id: string) => {
    const template = templates.find(t => t.id === id)
    if (!template) return

    await tables.domain_generation_templates()
      .update({
        last_used_at: new Date().toISOString(),
        use_count: (template.use_count || 0) + 1,
      })
      .eq('id', id)

    await fetchTemplates()
  }

  // Delete a template
  const deleteTemplate = async (id: string) => {
    const { error } = await tables.domain_generation_templates()
      .delete()
      .eq('id', id)

    if (error) throw error
    await fetchTemplates()
  }

  // Get default prefixes and suffixes
  const getDefaults = () => ({
    prefixes: ['try', 'use', 'join', 'grow', 'choose', 'find', 'go', 'do', 'get', 'max', 'pick', 'start', 'run', 'new', 'my', 'pro', 'top', 'true', 'next', 'best', 'one'],
    suffixes: ['go', 'max', 'pro', 'top'],
    tlds: ['.co', '.info'],
  })

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    markTemplateUsed,
    deleteTemplate,
    getDefaults,
  }
}
