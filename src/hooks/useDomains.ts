import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Domain } from '../types/infrastructure'

interface UseDomainsParams {
  client?: string
  provider?: string
}

export function useDomains({ client, provider }: UseDomainsParams = {}) {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('domains')
        .select('*')
        .order('domain', { ascending: true })

      if (client) query = query.eq('client', client)
      if (provider) query = query.eq('provider', provider)

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setDomains(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch domains')
    } finally {
      setLoading(false)
    }
  }, [client, provider])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  return { domains, loading, error, refetch: fetchDomains }
}






















