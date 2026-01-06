import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { dataCache, DataCache } from '../lib/cache'

export interface IterationLogEntry {
  id: number
  client: string
  action_type: string
  description: string
  created_by: string
  created_at: string
}

export interface CreateIterationLogEntry {
  client: string
  action_type: string
  description: string
  created_by: string
}

export interface UseIterationLogParams {
  client?: string
}

// Common action types for iteration logs
export const ACTION_TYPES = [
  'Strategy Change',
  'Copy Update',
  'Targeting Adjustment',
  'Sequence Modification',
  'Campaign Pause',
  'Campaign Launch',
  'A/B Test Started',
  'Performance Review',
  'Client Feedback',
  'Other',
] as const

export function useIterationLog({ client }: UseIterationLogParams = {}) {
  const [logs, setLogs] = useState<IterationLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const hasInitialData = useRef(false)

  const fetchLogs = useCallback(async (isBackgroundRefresh = false) => {
    if (!client) {
      setLogs([])
      setLoading(false)
      return
    }

    const cacheKey = DataCache.createKey('iteration-logs', { client })

    // Try to get cached data first
    if (!isBackgroundRefresh) {
      const cached = dataCache.get<IterationLogEntry[]>(cacheKey)
      if (cached) {
        setLogs(cached.data)
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

      const { data, error: queryError } = await supabase
        .from('client_iteration_logs')
        .select('*')
        .eq('client', client)
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      const logsData = (data || []) as IterationLogEntry[]
      setLogs(logsData)
      hasInitialData.current = true

      // Cache the results
      dataCache.set(cacheKey, logsData)
    } catch (err) {
      // If table doesn't exist, just return empty array
      if (err instanceof Error && err.message.includes('relation')) {
        setLogs([])
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch iteration logs')
      }
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const addLog = useCallback(async (entry: CreateIterationLogEntry): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      const insertData = {
        client: entry.client,
        action_type: entry.action_type,
        description: entry.description,
        created_by: entry.created_by,
      }
      const { error: insertError } = await supabase
        .from('client_iteration_logs')
        .insert(insertData as any)

      if (insertError) throw insertError

      // Invalidate cache and refetch
      if (client) {
        const cacheKey = DataCache.createKey('iteration-logs', { client })
        dataCache.invalidate(cacheKey)
      }
      await fetchLogs(false)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add iteration log')
      return false
    } finally {
      setSaving(false)
    }
  }, [client, fetchLogs])

  const deleteLog = useCallback(async (logId: number): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('client_iteration_logs')
        .delete()
        .eq('id', logId)

      if (deleteError) throw deleteError

      // Invalidate cache and refetch
      if (client) {
        const cacheKey = DataCache.createKey('iteration-logs', { client })
        dataCache.invalidate(cacheKey)
      }
      await fetchLogs(false)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete iteration log')
      return false
    } finally {
      setSaving(false)
    }
  }, [client, fetchLogs])

  const refetch = useCallback(() => {
    if (client) {
      const cacheKey = DataCache.createKey('iteration-logs', { client })
      dataCache.invalidate(cacheKey)
    }
    return fetchLogs(false)
  }, [fetchLogs, client])

  return { 
    logs, 
    loading, 
    error, 
    saving,
    addLog, 
    deleteLog,
    refetch 
  }
}

