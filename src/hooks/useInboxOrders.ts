import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { InboxOrder } from '../types/infrastructure'

interface UseInboxOrdersParams {
  client?: string
  provider?: string
  status?: InboxOrder['status']
}

export function useInboxOrders({ client, provider, status }: UseInboxOrdersParams = {}) {
  const [orders, setOrders] = useState<InboxOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('inbox_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (client) query = query.eq('client', client)
      if (provider) query = query.eq('provider', provider)
      if (status) query = query.eq('status', status)

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setOrders(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [client, provider, status])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return { orders, loading, error, refetch: fetchOrders }
}

