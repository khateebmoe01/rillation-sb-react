# React Query Migration Guide

## ✅ Setup Complete

The following has been configured:
- ✅ React Query installed
- ✅ Query client configured with localStorage persistence
- ✅ DevTools added (bottom-right corner when app is running)
- ✅ Provider added to `main.tsx`

## 🎯 What You Get

1. **Automatic Caching**: Data persists across page refreshes and browser sessions
2. **Background Refetching**: Stale data updates automatically
3. **Request Deduplication**: Multiple components using same data = single request
4. **Optimistic Updates**: Instant UI feedback before server responds
5. **DevTools**: Visual cache inspector (press ⌘+K or open bottom-right panel)
6. **TypeScript Support**: Full type safety

## 📊 Cache Behavior

| Time | Status | Behavior |
|------|--------|----------|
| 0-5 min | Fresh | Serves from cache, no refetch |
| 5-30 min | Stale | Serves from cache, refetches in background |
| 30+ min | Expired | Cleared from cache, fresh fetch required |

## 🔄 Migration Examples

### Example 1: useClients Hook

**Before** (manual cache):
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { dataCache } from '../lib/cache'

export function useClients() {
  const [clients, setClients] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Check cache
      const cached = dataCache.get('clients')
      if (cached && !cached.isStale) {
        setClients(cached.data)
        setLoading(false)
        return
      }

      // Fetch from DB
      const { data, error } = await supabase.from('Clients').select('*')
      if (!error) {
        setClients(data)
        dataCache.set('clients', data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  return { clients, loading }
}
```

**After** (React Query):
```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function fetchClients() {
  const { data, error } = await supabase.from('Clients').select('*')
  if (error) throw error
  return data || []
}

export function useClients() {
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  return {
    clients: data || [],
    loading: isLoading,
  }
}
```

**Lines of code**: 35 → 16 (54% reduction!)

---

### Example 2: Filtered Data Hook

**Before**:
```typescript
export function useContacts(client?: string) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cacheKey = `contacts:${client || 'all'}`
    const cached = dataCache.get(cacheKey)

    if (cached && !cached.isStale) {
      setContacts(cached.data)
      setLoading(false)
      return
    }

    const fetch = async () => {
      let query = supabase.from('contacts').select('*')
      if (client) query = query.eq('client', client)

      const { data } = await query
      setContacts(data || [])
      dataCache.set(cacheKey, data || [])
      setLoading(false)
    }
    fetch()
  }, [client])

  return { contacts, loading }
}
```

**After**:
```typescript
import { useSupabaseQuery } from '../lib/react-query-helpers'

export function useContacts(client?: string) {
  const { data, isLoading } = useSupabaseQuery(
    ['contacts', { client }],
    () => {
      let query = supabase.from('contacts').select('*')
      if (client) query = query.eq('client', client)
      return query
    }
  )

  return {
    contacts: data || [],
    loading: isLoading,
  }
}
```

---

### Example 3: Mutations (Create/Update/Delete)

**Before**:
```typescript
const handleUpdateContact = async (contact) => {
  setLoading(true)
  const { error } = await supabase
    .from('contacts')
    .update(contact)
    .eq('id', contact.id)

  if (!error) {
    // Manually invalidate cache
    dataCache.invalidate('contacts')
    // Manually refetch
    await fetchContacts()
  }
  setLoading(false)
}
```

**After**:
```typescript
import { useSupabaseMutation } from '../lib/react-query-helpers'

const updateContact = useSupabaseMutation(
  (contact) => supabase.from('contacts').update(contact).eq('id', contact.id),
  {
    invalidateKeys: [['contacts']],
    onSuccess: () => {
      toast.success('Contact updated!')
    },
  }
)

// Usage:
updateContact.mutate(contactData)
// Loading state: updateContact.isPending
```

---

### Example 4: Optimistic Updates (Instant UI)

```typescript
import { useOptimisticMutation } from '../lib/react-query-helpers'

const updateContact = useOptimisticMutation(
  ['contacts'],
  (contact) => supabase.from('contacts').update(contact).eq('id', contact.id),
  (oldContacts, newContact) =>
    oldContacts?.map(c => c.id === newContact.id ? { ...c, ...newContact } : c)
)

// UI updates INSTANTLY, then syncs with server
updateContact.mutate({ id: 1, name: 'New Name' })
```

---

### Example 5: Dependent Queries

```typescript
// Fetch contact first, then fetch their deals
const { data: contact } = useQuery({
  queryKey: ['contact', contactId],
  queryFn: () => fetchContact(contactId),
})

const { data: deals } = useQuery({
  queryKey: ['deals', contactId],
  queryFn: () => fetchDeals(contactId),
  enabled: !!contact, // Only run if contact is loaded
})
```

---

### Example 6: Infinite Scroll / Pagination

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

function useInfiniteContacts() {
  return useInfiniteQuery({
    queryKey: ['contacts', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .range(pageParam, pageParam + 49)

      return data || []
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === 50 ? pages.length * 50 : undefined
    },
    initialPageParam: 0,
  })
}

// Usage in component:
const { data, fetchNextPage, hasNextPage } = useInfiniteContacts()

// data.pages = [[page1 items], [page2 items], ...]
const allContacts = data?.pages.flat() || []
```

---

## 🛠️ Migration Checklist

### Step 1: Update Hooks (One at a Time)

1. ✅ `useClients` - **Example created**: `src/hooks/useClients-rq.ts`
2. ⬜ `useSalesMetrics`
3. ⬜ `useOpportunities`
4. ⬜ `usePerformanceData`

For each hook:
- [ ] Copy existing hook to `[name]-rq.ts`
- [ ] Convert to React Query using examples above
- [ ] Test in dev
- [ ] Replace old import with new one
- [ ] Delete old hook file

### Step 2: Update Components

1. Replace manual refetch buttons:

**Before**:
```typescript
const [refreshing, setRefreshing] = useState(false)

const handleRefresh = async () => {
  setRefreshing(true)
  await fetchData()
  setRefreshing(false)
}

<button onClick={handleRefresh} disabled={refreshing}>
  Refresh
</button>
```

**After**:
```typescript
const { refetch, isFetching } = useContacts()

<button onClick={() => refetch()} disabled={isFetching}>
  Refresh
</button>
```

2. Remove manual cache invalidation:

**Before**:
```typescript
import { dataCache } from '../lib/cache'

const handleSave = async () => {
  await save()
  dataCache.invalidatePrefix('contacts:')
}
```

**After**:
```typescript
import { useInvalidateCache } from '../lib/react-query-helpers'

const invalidate = useInvalidateCache()

const handleSave = async () => {
  await save()
  invalidate(['contacts']) // Invalidates all contact queries
}
```

---

## 🎨 Using DevTools

Once your app is running (`npm run dev`), look for the React Query icon in the bottom-right corner.

Click it to see:
- 🟢 Fresh queries
- 🟡 Stale queries being refetched
- ⚪ Inactive queries
- 🔴 Queries with errors

You can:
- Inspect query data
- Force refetch
- Clear cache
- See request timing

---

## 🐛 Troubleshooting

### Cache not persisting?

Check browser localStorage:
```javascript
// In browser console:
localStorage.getItem('RILLATION_QUERY_CACHE')
```

If null, check:
- Private/incognito mode (disables localStorage)
- Browser storage quota exceeded
- Console errors

### Data is stale?

Adjust `staleTime` in individual queries:
```typescript
useQuery({
  queryKey: ['contacts'],
  queryFn: fetchContacts,
  staleTime: 1 * 60 * 1000, // 1 minute instead of 5
})
```

### Too many refetches?

Disable automatic refetching:
```typescript
useQuery({
  queryKey: ['contacts'],
  queryFn: fetchContacts,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
})
```

### Query not running?

Check the `enabled` option:
```typescript
useQuery({
  queryKey: ['deals', contactId],
  queryFn: fetchDeals,
  enabled: !!contactId, // Only runs when contactId exists
})
```

---

## 📚 Common Patterns

### Global Loading Indicator

```typescript
import { useIsFetching } from '@tanstack/react-query'

function GlobalLoadingIndicator() {
  const isFetching = useIsFetching()

  return isFetching > 0 ? <LoadingSpinner /> : null
}
```

### Retry Logic

```typescript
useQuery({
  queryKey: ['contacts'],
  queryFn: fetchContacts,
  retry: 3, // Retry 3 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
})
```

### Error Handling

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['contacts'],
  queryFn: fetchContacts,
})

if (isError) {
  return <ErrorMessage error={error} />
}
```

### Manual Cache Updates

```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// Add new contact to cache without refetching
queryClient.setQueryData(['contacts'], (old) => [...old, newContact])

// Invalidate to trigger refetch
queryClient.invalidateQueries({ queryKey: ['contacts'] })

// Remove from cache
queryClient.removeQueries({ queryKey: ['contacts'] })
```

---

## 🚀 Next Steps

1. **Start with one hook**: Convert `useClients` using the example file
2. **Test thoroughly**: Verify caching works (close/reopen browser)
3. **Migrate gradually**: Convert other hooks one by one
4. **Remove old cache**: Once all hooks are migrated, delete `src/lib/cache.ts`
5. **Add mutations**: Convert create/update/delete operations
6. **Optimize**: Add prefetching for better UX

---

## 📖 Resources

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Example: useClients-rq.ts](./src/hooks/useClients-rq.ts)
- [Helpers: react-query-helpers.ts](./src/lib/react-query-helpers.ts)
- [DevTools Guide](https://tanstack.com/query/latest/docs/react/devtools)

---

## ⚡ Quick Reference

```typescript
// Query (fetch data)
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['key'],
  queryFn: fetchData,
})

// Mutation (modify data)
const { mutate, isPending } = useMutation({
  mutationFn: updateData,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] }),
})

// Invalidate (force refetch)
queryClient.invalidateQueries({ queryKey: ['key'] })

// Prefetch (load before needed)
queryClient.prefetchQuery({ queryKey: ['key'], queryFn: fetchData })
```
