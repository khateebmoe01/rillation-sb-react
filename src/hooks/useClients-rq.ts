/**
 * React Query version of useClients hook
 *
 * Benefits:
 * - Automatic caching with persistence to localStorage
 * - Background refetching
 * - No manual cache management needed
 * - Deduplicates multiple requests
 * - Built-in loading and error states
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ClientData {
  Business: string
  Website?: string
}

type ClientRow = { Business: string | null; Website?: string | null }

// Query function - fetches data from Supabase
async function fetchClients(): Promise<{ clients: string[]; clientsData: ClientData[] }> {
  const { data, error } = await supabase
    .from('Clients')
    .select('Business, Website')
    .order('Business')

  if (error) throw error

  const clientRows = (data as ClientRow[] | null) || []

  const clients = clientRows
    .map((c) => c.Business)
    .filter((name): name is string => Boolean(name))

  const clientsData: ClientData[] = clientRows
    .filter((c): c is { Business: string; Website?: string | null } => Boolean(c.Business))
    .map(c => ({ Business: c.Business, Website: c.Website || undefined }))

  return { clients, clientsData }
}

export function useClients() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
  })

  // Helper to get website for a client
  const getClientWebsite = (clientName: string): string => {
    const client = data?.clientsData.find(c => c.Business === clientName)
    return client?.Website || ''
  }

  return {
    clients: data?.clients || [],
    clientsData: data?.clientsData || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    getClientWebsite,
    refetch, // Manual refetch function
  }
}

// Usage in components:
// const { clients, loading, error, refetch } = useClients()
