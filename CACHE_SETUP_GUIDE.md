# Caching Setup Guide for Rillation CRM

## Current Issue
Your cache is in-memory only and gets cleared when:
- Browser is closed
- Page is refreshed
- User navigates away

## Solution Options

### Option 1: Persistent Cache with LocalStorage (Quick Fix)

**File Created**: `src/lib/cache-persistent.ts`

**How to Use**:

1. Replace imports in your existing files:

```typescript
// Before
import { dataCache } from '../lib/cache'

// After
import { persistentCache as dataCache } from '../lib/cache-persistent'
```

**Pros**:
- Drop-in replacement for existing cache
- Persists across browser sessions
- No new dependencies
- Works with existing code patterns

**Cons**:
- Manual cache management
- Limited to ~5-10MB storage
- No automatic background refresh
- No query deduplication

---

### Option 2: React Query (Recommended)

React Query provides automatic caching, background refetching, and optimistic updates.

**Installation**:

```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client
```

**Setup**:

1. Create query client configuration:

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})

// Persist to localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 30 * 60 * 1000, // 30 minutes
})
```

2. Update `main.tsx`:

```typescript
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/query-client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

3. Convert hooks to use React Query:

**Before** (useClients.ts):
```typescript
export function useClients() {
  const [clients, setClients] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  // ... manual cache logic
}
```

**After**:
```typescript
import { useQuery } from '@tanstack/react-query'

async function fetchClients() {
  const { data, error } = await supabase
    .from('Clients')
    .select('Business, Website')
    .order('Business')

  if (error) throw error
  return data
}

export function useClients() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  const clients = data?.map(c => c.Business).filter(Boolean) || []

  return { clients, loading: isLoading, error }
}
```

**Pros**:
- Automatic cache management
- Background refetching
- Query deduplication
- Persists to localStorage automatically
- DevTools for debugging
- Optimistic updates support
- Works offline with stale data

**Cons**:
- Requires refactoring existing hooks
- New dependency (~45KB)
- Learning curve

---

### Option 3: IndexedDB for Large Datasets

For storing large amounts of data (>5MB):

```bash
npm install idb
```

```typescript
// src/lib/cache-idb.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface CacheDB extends DBSchema {
  cache: {
    key: string
    value: {
      data: any
      timestamp: number
    }
  }
}

class IndexedDBCache {
  private db: IDBPDatabase<CacheDB> | null = null

  async init() {
    this.db = await openDB<CacheDB>('crm-cache', 1, {
      upgrade(db) {
        db.createObjectStore('cache')
      },
    })
  }

  async get<T>(key: string): Promise<{ data: T; isStale: boolean } | null> {
    if (!this.db) await this.init()

    const entry = await this.db?.get('cache', key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    const STALE_TTL = 30 * 60 * 1000

    if (age > STALE_TTL) {
      await this.invalidate(key)
      return null
    }

    return {
      data: entry.data,
      isStale: age > 5 * 60 * 1000,
    }
  }

  async set<T>(key: string, data: T): Promise<void> {
    if (!this.db) await this.init()

    await this.db?.put('cache', {
      data,
      timestamp: Date.now(),
    }, key)
  }

  async invalidate(key: string): Promise<void> {
    if (!this.db) await this.init()
    await this.db?.delete('cache', key)
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()
    await this.db?.clear('cache')
  }
}

export const idbCache = new IndexedDBCache()
```

---

## Comparison Table

| Feature | Current | Persistent Cache | React Query | IndexedDB |
|---------|---------|------------------|-------------|-----------|
| Persists on refresh | ❌ | ✅ | ✅ | ✅ |
| Persists on browser close | ❌ | ✅ | ✅ | ✅ |
| Storage limit | RAM | ~5-10MB | ~5-10MB | ~50MB+ |
| Auto background refresh | ❌ | ❌ | ✅ | ❌ |
| Query deduplication | ❌ | ❌ | ✅ | ❌ |
| DevTools | ❌ | ❌ | ✅ | ❌ |
| Implementation effort | - | Low | Medium | Medium |
| Code changes required | - | Minimal | Moderate | Moderate |

---

## Recommended Approach

**For immediate fix**: Use **Option 1** (Persistent Cache)
- Just replace the import statement
- Works with all existing code
- Zero refactoring needed

**For long-term**: Migrate to **Option 2** (React Query)
- Better developer experience
- Industry standard
- Automatic cache invalidation
- Built-in loading/error states

**For large datasets**: Add **Option 3** (IndexedDB)
- Store contact lists, deal data
- Offline-first capability
- Better mobile performance

---

## Quick Start: Persistent Cache

1. Update your existing hooks by changing one line:

```typescript
// src/hooks/useClients.ts
// Line 3: Change this
import { dataCache } from '../lib/cache'
// To this
import { persistentCache as dataCache } from '../lib/cache-persistent'
```

2. Do this for all files using the cache:
   - `src/hooks/useClients.ts`
   - `src/hooks/useSalesMetrics.ts`
   - `src/hooks/useOpportunities.ts`
   - `src/hooks/usePerformanceData.ts`
   - `src/components/infrastructure/InfrastructureOverview.tsx`

That's it! Your cache will now persist across browser sessions.

---

## Testing Cache Persistence

1. Open your app
2. Load some data (contacts, deals, etc.)
3. Close the browser completely
4. Reopen the browser and navigate to your app
5. Data should appear immediately from cache
6. Fresh data will load in the background

---

## Cache Invalidation Strategies

### Manual Invalidation
```typescript
// Invalidate specific key
dataCache.invalidate('clients:all')

// Invalidate all client-related data
dataCache.invalidatePrefix('clients:')

// Clear everything
dataCache.clear()
```

### Automatic Invalidation (React Query)
```typescript
// Invalidate after mutation
const mutation = useMutation({
  mutationFn: updateContact,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
  },
})
```

---

## Troubleshooting

### Cache not persisting?
- Check browser's localStorage quota (5-10MB)
- Check if private/incognito mode (localStorage disabled)
- Check browser console for errors

### Cache too large?
- Reduce STALE_TTL value
- Use IndexedDB for large datasets
- Implement cache size limits

### Stale data showing?
- Reduce DEFAULT_TTL for fresher data
- Add manual refresh button
- Use React Query for automatic background refresh

---

## Next Steps

1. Choose your solution (start with Option 1)
2. Update imports in existing files
3. Test data persistence
4. Consider migrating to React Query for production
5. Add cache warming on app startup for critical data
