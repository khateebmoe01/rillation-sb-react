import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { 
  ProviderOrder, 
  ProviderOrderStatus, 
  OrderProvider, 
  OrderType,
  MailboxConfig 
} from '../types/infrastructure'

interface UseProviderOrdersParams {
  client?: string
  provider?: OrderProvider
  status?: ProviderOrderStatus
}

export function useProviderOrders({ client, provider, status }: UseProviderOrdersParams = {}) {
  const [orders, setOrders] = useState<ProviderOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('provider_orders')
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

  // Create a new order
  const createOrder = async (orderData: {
    provider: OrderProvider
    order_type: OrderType
    client: string
    domains: string[]
    mailbox_config?: MailboxConfig
    notes?: string
  }) => {
    const quantity = orderData.order_type === 'mailboxes' && orderData.mailbox_config
      ? orderData.domains.length * (orderData.mailbox_config.inboxes_per_domain || 1)
      : orderData.domains.length

    const { data, error } = await supabase
      .from('provider_orders')
      .insert({
        ...orderData,
        quantity,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    await fetchOrders()
    return data
  }

  // Update order status
  const updateOrderStatus = async (id: string, newStatus: ProviderOrderStatus) => {
    const updates: Partial<ProviderOrder> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Set timestamp based on status
    if (newStatus === 'exported') {
      updates.exported_at = new Date().toISOString()
    } else if (newStatus === 'submitted') {
      updates.submitted_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('provider_orders')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    await fetchOrders()
  }

  // Save CSV data to order
  const saveCSVData = async (id: string, csvData: string) => {
    const { error } = await supabase
      .from('provider_orders')
      .update({
        csv_data: csvData,
        status: 'exported',
        exported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    await fetchOrders()
  }

  // Mark order as submitted (after uploading to provider)
  const markAsSubmitted = async (id: string) => {
    await updateOrderStatus(id, 'submitted')
    
    // Also update domain inventory to mark domains as in_use
    const order = orders.find(o => o.id === id)
    if (order && order.domains.length > 0) {
      await supabase
        .from('domain_inventory')
        .update({
          status: 'in_use',
          inboxes_ordered: order.quantity,
          updated_at: new Date().toISOString(),
        })
        .in('domain_name', order.domains)
    }
  }

  // Mark order as completed
  const markAsCompleted = async (id: string) => {
    await updateOrderStatus(id, 'completed')
  }

  // Delete a draft order
  const deleteOrder = async (id: string) => {
    const { error } = await supabase
      .from('provider_orders')
      .delete()
      .eq('id', id)
      .eq('status', 'draft') // Only allow deleting drafts

    if (error) throw error
    await fetchOrders()
  }

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    createOrder,
    updateOrderStatus,
    saveCSVData,
    markAsSubmitted,
    markAsCompleted,
    deleteOrder,
  }
}
