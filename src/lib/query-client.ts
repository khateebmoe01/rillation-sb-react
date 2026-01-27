import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache garbage collection after 30 minutes
      gcTime: 30 * 60 * 1000,
      // Don't refetch on window focus (can be annoying in dev)
      refetchOnWindowFocus: false,
      // Refetch when reconnecting to network
      refetchOnReconnect: true,
      // Retry failed requests once
      retry: 1,
      // Don't retry on 4xx errors (client errors)
      retryOnMount: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
})

// Create persister for localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'RILLATION_QUERY_CACHE',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
})

// Persist query client to localStorage
persistQueryClient({
  queryClient,
  persister,
  maxAge: 30 * 60 * 1000, // 30 minutes
  dehydrateOptions: {
    // Don't persist queries with errors
    shouldDehydrateQuery: (query) => {
      return query.state.status === 'success'
    },
  },
})
