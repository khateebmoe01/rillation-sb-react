import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { dataCache } from '../lib/cache'

const CACHE_KEY = 'clients:all'

export function useClients() {
  const [clients, setClients] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const hasInitialData = useRef(false)

  const fetchClients = useCallback(async () => {
    // Try to get cached data first
    const cached = dataCache.get<string[]>(CACHE_KEY)
    if (cached) {
      setClients(cached.data)
      hasInitialData.current = true
      
      if (!cached.isStale) {
        setLoading(false)
        return
      }
      setLoading(false)
    }

    try {
      if (!hasInitialData.current) {
        setLoading(true)
      }
      
      const { data, error } = await supabase
        .from('Clients')
        .select('Business')
        .order('Business')

      if (error) throw error

      type ClientRow = { Business: string | null }

      const clientNames = (data as ClientRow[] | null)?.map((c) => c.Business).filter((name): name is string => Boolean(name)) || []
      setClients(clientNames)
      hasInitialData.current = true
      
      // Cache the results
      dataCache.set(CACHE_KEY, clientNames)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return { clients, loading, error }
}
