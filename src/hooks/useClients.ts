import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { dataCache } from '../lib/cache'

const CACHE_KEY = 'clients:all'
const CACHE_KEY_DATA = 'clients:data'

export interface ClientData {
  Business: string
  Website?: string
}

export function useClients() {
  const [clients, setClients] = useState<string[]>([])
  const [clientsData, setClientsData] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const hasInitialData = useRef(false)

  const fetchClients = useCallback(async () => {
    // Try to get cached data first
    const cached = dataCache.get<string[]>(CACHE_KEY)
    const cachedData = dataCache.get<ClientData[]>(CACHE_KEY_DATA)
    if (cached && cachedData) {
      setClients(cached.data)
      setClientsData(cachedData.data)
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
        .select('Business, Website')
        .order('Business')

      if (error) throw error

      type ClientRow = { Business: string | null; Website?: string | null }

      const clientRows = (data as ClientRow[] | null) || []
      const clientNames = clientRows.map((c) => c.Business).filter((name): name is string => Boolean(name))
      const clientDataList: ClientData[] = clientRows
        .filter((c): c is { Business: string; Website?: string | null } => Boolean(c.Business))
        .map(c => ({ Business: c.Business, Website: c.Website || undefined }))
      
      setClients(clientNames)
      setClientsData(clientDataList)
      hasInitialData.current = true
      
      // Cache the results
      dataCache.set(CACHE_KEY, clientNames)
      dataCache.set(CACHE_KEY_DATA, clientDataList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Helper to get website for a client
  const getClientWebsite = useCallback((clientName: string): string => {
    const client = clientsData.find(c => c.Business === clientName)
    return client?.Website || ''
  }, [clientsData])

  return { clients, clientsData, loading, error, getClientWebsite }
}
