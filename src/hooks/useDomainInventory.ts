import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { tables } from '../lib/supabase-helpers'
import type { DomainInventory, DomainStatus, InboxProvider, PurchaseBatch } from '../types/infrastructure'

interface UseDomainInventoryParams {
  client?: string
  status?: DomainStatus
  inbox_provider?: InboxProvider
  needsAction?: boolean // purchased but no inboxes ordered
}

export function useDomainInventory({ client, status, inbox_provider, needsAction }: UseDomainInventoryParams = {}) {
  const [domains, setDomains] = useState<DomainInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = tables.domain_inventory()
        .select('*')
        .order('created_at', { ascending: false })

      if (client) query = query.eq('client', client)
      if (status) query = query.eq('status', status)
      if (inbox_provider) query = query.eq('inbox_provider', inbox_provider)
      if (needsAction) {
        query = query
          .not('purchased_at', 'is', null)
          .eq('inboxes_ordered', 0)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Calculate days since purchase
      const domainsWithDays = (data || []).map((domain: any) => {
        let days_since_purchase = 0
        if (domain.purchased_at) {
          const purchaseDate = new Date(domain.purchased_at)
          const now = new Date()
          days_since_purchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
        }

        return {
          ...domain,
          days_since_purchase,
          needs_action: Boolean(domain.purchased_at && domain.inboxes_ordered === 0 && days_since_purchase > 30),
        } as DomainInventory
      })

      setDomains(domainsWithDays)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch domains')
    } finally {
      setLoading(false)
    }
  }, [client, status, inbox_provider, needsAction])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  // Add domains to inventory
  const addDomains = async (domainNames: string[], clientName: string, batchData?: Partial<PurchaseBatch>) => {
    // Create a purchase batch if batch data is provided
    let batch_id: string | undefined
    if (batchData) {
      const { data: batch, error: batchError } = await tables.purchase_batches()
        .insert({
          ...batchData,
          client: clientName,
          domain_count: domainNames.length,
        })
        .select()
        .single()

      if (batchError) throw batchError
      batch_id = batch?.id
    }

    // Insert domains
    const domainsToInsert = domainNames.map(domain_name => ({
      domain_name,
      client: clientName,
      status: 'available' as DomainStatus,
      purchase_batch_id: batch_id,
    }))

    const { error } = await tables.domain_inventory()
      .insert(domainsToInsert)

    if (error) throw error
    await fetchDomains()
  }

  // Update a single domain
  const updateDomain = async (id: string, updates: Partial<DomainInventory>) => {
    const { error } = await tables.domain_inventory()
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchDomains()
  }

  // Bulk update domains
  const bulkUpdateDomains = async (ids: string[], updates: Partial<DomainInventory>) => {
    const { error } = await tables.domain_inventory()
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) throw error
    await fetchDomains()
  }

  // Mark domains as purchased
  const markAsPurchased = async (ids: string[], purchased_at?: string) => {
    await bulkUpdateDomains(ids, {
      status: 'purchased',
      purchased_at: purchased_at || new Date().toISOString(),
    })
  }

  // Assign domains to a provider
  const assignToProvider = async (ids: string[], provider: InboxProvider) => {
    await bulkUpdateDomains(ids, {
      inbox_provider: provider,
      assigned_to_provider_at: new Date().toISOString(),
      status: 'configured',
    })
  }

  // Delete domains from inventory
  const deleteDomains = async (ids: string[]) => {
    const { error } = await tables.domain_inventory()
      .delete()
      .in('id', ids)

    if (error) throw error
    await fetchDomains()
  }

  // Check for duplicate domain
  const checkDuplicate = async (domainName: string): Promise<{ isDuplicate: boolean; source?: string }> => {
    // Check domain_inventory
    const { data: invData } = await tables.domain_inventory()
      .select('id')
      .eq('domain_name', domainName)
      .limit(1)

    if (invData && invData.length > 0) {
      return { isDuplicate: true, source: 'domain_inventory' }
    }

    // Check inboxes (by domain)
    const { data: inboxData } = await supabase
      .from('inboxes')
      .select('id')
      .eq('domain', domainName)
      .limit(1)

    if (inboxData && inboxData.length > 0) {
      return { isDuplicate: true, source: 'inboxes' }
    }

    // Check domains table
    const { data: domainData } = await supabase
      .from('domains')
      .select('id')
      .eq('domain_name', domainName)
      .limit(1)

    if (domainData && domainData.length > 0) {
      return { isDuplicate: true, source: 'domains' }
    }

    return { isDuplicate: false }
  }

  // Bulk check duplicates
  const checkDuplicates = async (domainNames: string[]): Promise<Map<string, { isDuplicate: boolean; source?: string }>> => {
    const results = new Map<string, { isDuplicate: boolean; source?: string }>()

    // Get all existing domains from domain_inventory
    const { data: invDomains } = await tables.domain_inventory()
      .select('domain_name')
      .in('domain_name', domainNames)

    const invSet = new Set(((invDomains || []) as any[]).map(d => d.domain_name))

    // Get all existing domains from inboxes
    const { data: inboxDomains } = await supabase
      .from('inboxes')
      .select('domain')
      .in('domain', domainNames)

    const inboxSet = new Set(((inboxDomains || []) as any[]).map(d => d.domain))

    // Mark duplicates
    for (const domain of domainNames) {
      if (invSet.has(domain)) {
        results.set(domain, { isDuplicate: true, source: 'domain_inventory' })
      } else if (inboxSet.has(domain)) {
        results.set(domain, { isDuplicate: true, source: 'inboxes' })
      } else {
        results.set(domain, { isDuplicate: false })
      }
    }

    return results
  }

  return {
    domains,
    loading,
    error,
    refetch: fetchDomains,
    addDomains,
    updateDomain,
    bulkUpdateDomains,
    markAsPurchased,
    assignToProvider,
    deleteDomains,
    checkDuplicate,
    checkDuplicates,
  }
}

// Hook for purchase batches
export function usePurchaseBatches(client?: string) {
  const [batches, setBatches] = useState<PurchaseBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true)
      let query = tables.purchase_batches()
        .select('*')
        .order('purchased_at', { ascending: false })

      if (client) query = query.eq('client', client)

      const { data } = await query
      setBatches((data || []) as PurchaseBatch[])
      setLoading(false)
    }

    fetchBatches()
  }, [client])

  return { batches, loading }
}
