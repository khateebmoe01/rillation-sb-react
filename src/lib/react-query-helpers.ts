/**
 * React Query helper utilities for common patterns
 */

import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Hook for Supabase queries with automatic caching
 *
 * @example
 * const { data, loading } = useSupabaseQuery(
 *   ['contacts', { client: 'acme' }],
 *   () => supabase.from('contacts').select('*').eq('client', 'acme')
 * )
 */
export function useSupabaseQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: {
    staleTime?: number
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn()
      if (error) throw error
      return data
    },
    staleTime: options?.staleTime || 5 * 60 * 1000,
    enabled: options?.enabled !== false,
  })
}

/**
 * Hook for Supabase mutations with automatic cache invalidation
 *
 * @example
 * const updateContact = useSupabaseMutation(
 *   async (contact) => supabase.from('contacts').update(contact).eq('id', contact.id),
 *   { invalidateKeys: [['contacts']] }
 * )
 */
export function useSupabaseMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: any }>,
  options?: {
    invalidateKeys?: QueryKey[]
    onSuccess?: (data: TData | null) => void
    onError?: (error: any) => void
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const { data, error } = await mutationFn(variables)
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate related queries to refetch fresh data
      options?.invalidateKeys?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      options?.onSuccess?.(data)
    },
    onError: options?.onError,
  })
}

/**
 * Prefetch data for better UX (load before user navigates)
 *
 * @example
 * const prefetchContacts = usePrefetch()
 * // On hover or route change:
 * prefetchContacts(['contacts'], fetchContacts)
 */
export function usePrefetch() {
  const queryClient = useQueryClient()

  return async (queryKey: QueryKey, queryFn: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000,
    })
  }
}

/**
 * Optimistic update helper for immediate UI feedback
 *
 * @example
 * const updateContact = useOptimisticMutation(
 *   ['contacts'],
 *   async (contact) => supabase.from('contacts').update(contact),
 *   (oldData, newContact) => oldData.map(c => c.id === newContact.id ? newContact : c)
 * )
 */
export function useOptimisticMutation<TData, TVariables>(
  queryKey: QueryKey,
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: any }>,
  optimisticUpdate: (oldData: TData | undefined, variables: TVariables) => TData
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const { data, error } = await mutationFn(variables)
      if (error) throw error
      return data
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey)

      // Optimistically update to the new value
      if (previousData) {
        queryClient.setQueryData(queryKey, optimisticUpdate(previousData, variables))
      }

      // Return context with snapshot
      return { previousData }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

/**
 * Helper to manually invalidate cache
 *
 * @example
 * const invalidate = useInvalidateCache()
 * invalidate(['contacts']) // Invalidate all contact queries
 * invalidate(['contacts', { client: 'acme' }]) // Invalidate specific query
 */
export function useInvalidateCache() {
  const queryClient = useQueryClient()

  return (queryKey: QueryKey) => {
    queryClient.invalidateQueries({ queryKey })
  }
}

/**
 * Manually update cache data
 *
 * @example
 * const updateCache = useUpdateCache()
 * updateCache(['contacts'], (oldContacts) => [...oldContacts, newContact])
 */
export function useUpdateCache() {
  const queryClient = useQueryClient()

  return <T>(queryKey: QueryKey, updater: (old: T | undefined) => T) => {
    queryClient.setQueryData(queryKey, updater)
  }
}
