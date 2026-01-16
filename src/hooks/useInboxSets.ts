import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { InboxSet, InboxSetStatus, InboxSetProvider } from '../types/infrastructure'

interface UseInboxSetsParams {
  client?: string
  status?: InboxSetStatus
  provider?: InboxSetProvider
}

export function useInboxSets({ client, status, provider }: UseInboxSetsParams = {}) {
  const [sets, setSets] = useState<InboxSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('inbox_sets')
        .select('*')
        .order('ordered_at', { ascending: false })

      if (client) query = query.eq('client', client)
      if (status) query = query.eq('status', status)
      if (provider) query = query.eq('provider', provider)

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Calculate warmup progress for each set
      const setsWithProgress = (data || []).map((set: InboxSet) => {
        let warmup_progress = 0
        let days_warming = 0
        
        if (set.warmup_started_at) {
          const startDate = new Date(set.warmup_started_at)
          const now = new Date()
          days_warming = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          warmup_progress = Math.min(100, Math.round((days_warming / (set.warmup_target_days || 21)) * 100))
        }

        return {
          ...set,
          warmup_progress,
          days_warming,
        }
      })

      setSets(setsWithProgress)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox sets')
    } finally {
      setLoading(false)
    }
  }, [client, status, provider])

  useEffect(() => {
    fetchSets()
  }, [fetchSets])

  // Create a new inbox set
  const createSet = async (setData: Partial<InboxSet>) => {
    const { data, error } = await supabase
      .from('inbox_sets')
      .insert(setData)
      .select()
      .single()

    if (error) throw error
    await fetchSets()
    return data
  }

  // Update an inbox set
  const updateSet = async (id: string, updates: Partial<InboxSet>) => {
    const { error } = await supabase
      .from('inbox_sets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchSets()
  }

  // Bulk update multiple sets
  const bulkUpdateSets = async (ids: string[], updates: Partial<InboxSet>) => {
    const { error } = await supabase
      .from('inbox_sets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) throw error
    await fetchSets()
  }

  // Delete a set (archive it)
  const archiveSet = async (id: string) => {
    await updateSet(id, { status: 'archived' })
  }

  // Bulk archive sets
  const bulkArchiveSets = async (ids: string[]) => {
    await bulkUpdateSets(ids, { status: 'archived' })
  }

  return {
    sets,
    loading,
    error,
    refetch: fetchSets,
    createSet,
    updateSet,
    bulkUpdateSets,
    archiveSet,
    bulkArchiveSets,
  }
}

// Hook for fetching inboxes within a set
export function useInboxesInSet(setId: string | undefined) {
  const [inboxes, setInboxes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!setId) {
      setInboxes([])
      return
    }

    const fetchInboxes = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('inboxes')
        .select('*')
        .eq('inbox_set_id', setId)
        .order('email')

      if (!error && data) {
        setInboxes(data)
      }
      setLoading(false)
    }

    fetchInboxes()
  }, [setId])

  return { inboxes, loading }
}
