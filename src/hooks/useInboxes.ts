import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface UseInboxesParams {
  client?: string
  provider?: string
  status?: string
}

export function useInboxes({ client, provider, status }: UseInboxesParams = {}) {
  const [inboxes, setInboxes] = useState<any[]>([])
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
      if (provider) query = query.eq('type', provider) // Assuming 'type' column for provider
      if (status) query = query.eq('status', status)

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setInboxes(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inboxes')
    } finally {
      setLoading(false)
    }
  }, [client, provider, status])

  useEffect(() => {
    fetchInboxes()
  }, [fetchInboxes])

  return { inboxes, loading, error, refetch: fetchInboxes }
}













