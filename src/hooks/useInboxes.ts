import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Inbox, InboxType, LifecycleStatus } from '../types/infrastructure'

interface UseInboxesParams {
  client?: string
  provider?: string  // Legacy: maps to type
  type?: InboxType
  status?: string
  lifecycle_status?: LifecycleStatus
  inbox_set_id?: string
  warmup_enabled?: boolean
  needsAttention?: boolean // disconnected or low health
}

export function useInboxes({ 
  client, 
  provider, 
  type,
  status, 
  lifecycle_status,
  inbox_set_id,
  warmup_enabled,
  needsAttention,
}: UseInboxesParams = {}) {
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInboxes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('inboxes')
        .select('*')
        .order('created_at', { ascending: false })

      if (client) query = query.eq('client', client)
      if (provider) query = query.eq('type', provider)
      if (type) query = query.eq('type', type)
      if (status) query = query.eq('status', status)
      if (lifecycle_status) query = query.eq('lifecycle_status', lifecycle_status)
      if (inbox_set_id) query = query.eq('inbox_set_id', inbox_set_id)
      if (warmup_enabled !== undefined) query = query.eq('warmup_enabled', warmup_enabled)
      if (needsAttention) {
        query = query.or('lifecycle_status.eq.disconnected,deliverability_score.lt.70')
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setInboxes(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inboxes')
    } finally {
      setLoading(false)
    }
  }, [client, provider, type, status, lifecycle_status, inbox_set_id, warmup_enabled, needsAttention])

  useEffect(() => {
    fetchInboxes()
  }, [fetchInboxes])

  // Bulk update inboxes
  const bulkUpdate = async (ids: number[], updates: Partial<Inbox>) => {
    // Use type assertion to bypass strict typing for new columns
    const { error } = await (supabase
      .from('inboxes') as any)
      .update(updates)
      .in('id', ids)

    if (error) throw error
    await fetchInboxes()
  }

  // Assign inboxes to a set
  const assignToSet = async (inboxIds: number[], setId: string) => {
    await bulkUpdate(inboxIds, { inbox_set_id: setId } as any)
  }

  // Bulk update lifecycle status
  const bulkUpdateLifecycle = async (ids: number[], newStatus: LifecycleStatus) => {
    await bulkUpdate(ids, { lifecycle_status: newStatus } as any)
  }

  // Get aggregated stats
  const getStats = useCallback(() => {
    const stats = {
      total: inboxes.length,
      connected: inboxes.filter(i => i.status === 'Connected').length,
      disconnected: inboxes.filter(i => i.status === 'Not connected' || i.lifecycle_status === 'disconnected').length,
      warming: inboxes.filter(i => i.lifecycle_status === 'warming' || i.warmup_enabled).length,
      ready: inboxes.filter(i => i.lifecycle_status === 'ready').length,
      active: inboxes.filter(i => i.lifecycle_status === 'active').length,
      paused: inboxes.filter(i => i.lifecycle_status === 'paused').length,
      byType: {
        google: inboxes.filter(i => i.type === 'google_workspace_oauth').length,
        microsoft: inboxes.filter(i => i.type === 'microsoft_oauth').length,
        smtp: inboxes.filter(i => i.type === 'custom').length,
      },
      avgDeliverability: inboxes.length > 0 
        ? inboxes.reduce((sum, i) => sum + (i.deliverability_score || 0), 0) / inboxes.length 
        : 0,
      avgWarmupReputation: inboxes.filter(i => i.warmup_reputation).length > 0
        ? inboxes.filter(i => i.warmup_reputation).reduce((sum, i) => sum + (i.warmup_reputation || 0), 0) / inboxes.filter(i => i.warmup_reputation).length
        : 0,
    }
    return stats
  }, [inboxes])

  // Group inboxes by a field
  const groupBy = useCallback((field: 'client' | 'inbox_set_id' | 'type' | 'lifecycle_status' | 'domain') => {
    const groups: Record<string, Inbox[]> = {}
    for (const inbox of inboxes) {
      const key = String(inbox[field] || 'Unassigned')
      if (!groups[key]) groups[key] = []
      groups[key].push(inbox)
    }
    return groups
  }, [inboxes])

  return { 
    inboxes, 
    loading, 
    error, 
    refetch: fetchInboxes,
    bulkUpdate,
    assignToSet,
    bulkUpdateLifecycle,
    getStats,
    groupBy,
  }
}






















