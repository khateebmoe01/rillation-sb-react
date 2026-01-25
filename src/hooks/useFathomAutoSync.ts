import { useEffect, useRef } from 'react'

interface UseFathomAutoSyncOptions {
  enabled: boolean
  onRefetch: () => Promise<void> | void
  intervalMs?: number // Default: 30000 (30 seconds)
}

/**
 * Hook to automatically poll for new Fathom call data at regular intervals.
 *
 * Note: This hook only polls the database for updates. The actual sync from Fathom API
 * is handled by a server-side cron job that runs every 2 minutes.
 *
 * @param enabled - Whether polling is active
 * @param onRefetch - Callback to refetch data from database
 * @param intervalMs - Polling interval in milliseconds (default: 30 seconds)
 */
export function useFathomAutoSync({
  enabled,
  onRefetch,
  intervalMs = 30000,
}: UseFathomAutoSyncOptions) {
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!enabled) return

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      onRefetch()
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, onRefetch, intervalMs])
}
