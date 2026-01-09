import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface SlackUser {
  id: string
  name: string
  real_name: string
  display_name: string
}

interface UseSlackUsersReturn {
  users: SlackUser[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Cache for Slack users (session-level)
let cachedUsers: SlackUser[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useSlackUsers(): UseSlackUsersReturn {
  const [users, setUsers] = useState<SlackUser[]>(cachedUsers || [])
  const [loading, setLoading] = useState(!cachedUsers)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchUsers = useCallback(async (force = false) => {
    // Check cache first
    const now = Date.now()
    if (!force && cachedUsers && (now - cacheTimestamp) < CACHE_TTL) {
      setUsers(cachedUsers)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Call the slack-users edge function
      const { data, error: fnError } = await supabase.functions.invoke('slack-users', {
        method: 'GET',
      })

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch Slack users')
      }

      if (data?.error) {
        // If Slack isn't configured, just return empty array without error
        if (data.error.includes('not configured')) {
          console.warn('Slack integration not configured:', data.error)
          setUsers([])
          cachedUsers = []
          cacheTimestamp = now
          return
        }
        throw new Error(data.error)
      }

      const fetchedUsers = (data?.users || []) as SlackUser[]
      setUsers(fetchedUsers)
      
      // Update cache
      cachedUsers = fetchedUsers
      cacheTimestamp = now
    } catch (err) {
      console.error('Error fetching Slack users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch Slack users')
      // Keep existing users on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchUsers()
    }
  }, [fetchUsers])

  const refetch = useCallback(() => fetchUsers(true), [fetchUsers])

  return { users, loading, error, refetch }
}

// Export a function to manually clear the cache
export function clearSlackUsersCache(): void {
  cachedUsers = null
  cacheTimestamp = 0
}
