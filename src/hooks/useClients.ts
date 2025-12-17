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

        const clientNames = data?.map((c) => c.Business).filter(Boolean) || []
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

