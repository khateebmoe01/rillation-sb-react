# ✅ React Query Cache Setup - Complete!

## What's Been Set Up

1. ✅ **React Query installed** - Modern data fetching & caching library
2. ✅ **localStorage persistence** - Cache survives browser close/refresh
3. ✅ **DevTools added** - Visual cache inspector (bottom-right when running)
4. ✅ **Provider configured** - All components can now use queries
5. ✅ **Example hook created** - `src/hooks/useClients-rq.ts`
6. ✅ **Helper utilities** - `src/lib/react-query-helpers.ts`

## 🎯 Your Cache Now:

| Feature | Before | After |
|---------|--------|-------|
| Persists on refresh | ❌ | ✅ |
| Persists on browser close | ❌ | ✅ |
| Auto background refresh | ❌ | ✅ |
| Request deduplication | ❌ | ✅ |
| DevTools for debugging | ❌ | ✅ |
| Optimistic updates | ❌ | ✅ |

## 🚀 Quick Start (3 Steps)

### Step 1: Test Current Setup

```bash
npm run dev
```

Open http://localhost:5174

Look for the **React Query DevTools** icon in the bottom-right corner (flower icon). Click it to see the cache inspector.

### Step 2: Convert Your First Hook

Option A: **Use the example** (recommended for testing)

```typescript
// In any component, replace:
import { useClients } from '../hooks/useClients'

// With:
import { useClients } from '../hooks/useClients-rq'

// Everything else stays the same!
```

Option B: **Convert existing hook**

See `REACT_QUERY_MIGRATION.md` for detailed examples.

### Step 3: Verify Cache Persistence

1. Load data in your app
2. **Close the browser completely**
3. Reopen browser and navigate back to your app
4. **Data should appear instantly from cache**
5. Fresh data loads in background (watch DevTools)

## 📊 How It Works

```
User loads page
    ↓
React Query checks localStorage
    ↓
Found cache? → Show instantly (even if stale)
    |              ↓
    |         Fetch fresh data in background
    |              ↓
    |         Update UI when ready
    ↓
No cache? → Show loading state
              ↓
         Fetch from server
              ↓
         Show data + save to cache
```

## 🎨 Using DevTools

Once your app is running, click the **flower icon** in the bottom-right.

You'll see:
- 🟢 **Fresh queries** - Data is up-to-date
- 🟡 **Stale queries** - Being refetched in background
- ⚪ **Inactive** - Not currently in use
- 🔴 **Errors** - Failed queries

Click any query to see:
- Data stored in cache
- Last fetch time
- Number of observers (components using it)
- Actions: refetch, remove, reset

## 🔧 Common Use Cases

### Show a refresh button

```typescript
function ContactsPage() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['contacts'],
    queryFn: fetchContacts,
  })

  return (
    <>
      <button onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? 'Refreshing...' : 'Refresh'}
      </button>
      {/* render contacts */}
    </>
  )
}
```

### Update data after mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

function UpdateContactButton() {
  const queryClient = useQueryClient()

  const updateContact = useMutation({
    mutationFn: (contact) => supabase.from('contacts').update(contact),
    onSuccess: () => {
      // This will refetch contacts automatically
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  return <button onClick={() => updateContact.mutate(data)}>Save</button>
}
```

### Filter queries by parameter

```typescript
function useContacts(client: string) {
  return useQuery({
    queryKey: ['contacts', { client }], // Different key per client
    queryFn: () => fetchContactsByClient(client),
  })
}

// Each client's data is cached separately:
// ['contacts', { client: 'acme' }]
// ['contacts', { client: 'globex' }]
```

### Invalidate all related queries

```typescript
// Invalidate ALL contact queries (all clients)
queryClient.invalidateQueries({ queryKey: ['contacts'] })

// Invalidate only specific client
queryClient.invalidateQueries({ queryKey: ['contacts', { client: 'acme' }] })

// Invalidate with prefix matching
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'contacts',
})
```

## 📁 Files Created

```
src/
├── lib/
│   ├── query-client.ts           # React Query configuration
│   ├── react-query-helpers.ts     # Utility hooks
│   └── cache-persistent.ts        # Alternative: persistent in-memory cache
├── hooks/
│   └── useClients-rq.ts           # Example converted hook
└── main.tsx                       # Updated with QueryClientProvider

Root/
├── CACHE_QUICKSTART.md            # This file
├── REACT_QUERY_MIGRATION.md       # Detailed migration guide
└── CACHE_SETUP_GUIDE.md           # All solution options
```

## 🎓 Learning Path

1. **Today**: Test the setup, play with DevTools
2. **This week**: Convert `useClients` hook (example provided)
3. **Next week**: Convert other hooks gradually
4. **Month 1**: Add mutations for create/update/delete
5. **Month 2**: Add optimistic updates for instant UI

## 🆘 Troubleshooting

### DevTools not showing?

- Check bottom-right corner for flower icon
- Try resizing browser window
- Check browser console for errors

### Cache not persisting?

```javascript
// Test in browser console:
localStorage.getItem('RILLATION_QUERY_CACHE')
```

If null:
- Check if private/incognito mode (disables localStorage)
- Check browser console for quota errors
- Try clearing all localStorage first

### Queries not running?

- Check `enabled` option (may be set to false)
- Check React Query DevTools to see query state
- Check browser console for errors

### Data too stale?

Reduce `staleTime` in specific queries:

```typescript
useQuery({
  queryKey: ['contacts'],
  queryFn: fetchContacts,
  staleTime: 1 * 60 * 1000, // 1 minute instead of default 5
})
```

## 📚 Resources

- **Migration Guide**: `REACT_QUERY_MIGRATION.md` - Detailed examples
- **All Options**: `CACHE_SETUP_GUIDE.md` - All caching solutions
- **React Query Docs**: https://tanstack.com/query/latest
- **Example Hook**: `src/hooks/useClients-rq.ts`
- **Helper Utils**: `src/lib/react-query-helpers.ts`

## ✨ Benefits You'll See

1. **Faster page loads** - Data appears instantly from cache
2. **Better UX** - Show data while fetching fresh data in background
3. **Fewer bugs** - No manual cache management
4. **Easier debugging** - Visual DevTools
5. **Less code** - ~50% reduction in hook code
6. **Better mobile** - Works offline with stale data
7. **Automatic deduplication** - Multiple components, single request

## 🎉 You're All Set!

Run `npm run dev` and start using your new caching system!

Questions? Check the migration guide or React Query docs.
