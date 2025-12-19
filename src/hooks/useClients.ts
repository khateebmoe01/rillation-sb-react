import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClients() {
  const [clients, setClients] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClients() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('Clients')
          .select('Business')
          .order('Business')

        if (error) throw error

        type ClientRow = { Business: string | null }

        const clientNames = (data as ClientRow[] | null)?.map((c) => c.Business).filter((name): name is string => Boolean(name)) || []
        setClients(clientNames)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  return { clients, loading, error }
}

