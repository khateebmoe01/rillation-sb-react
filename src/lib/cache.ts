/**
 * Simple in-memory cache with TTL and stale-while-revalidate support
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  isStale: boolean
}

// Default TTL: 5 minutes (data considered fresh)
const DEFAULT_TTL = 5 * 60 * 1000
// Stale TTL: 30 minutes (data can be shown while refreshing)
const STALE_TTL = 30 * 60 * 1000

class DataCache {
  private cache = new Map<string, CacheEntry<any>>()

  /**
   * Get cached data if available and not too old
   * Returns { data, isStale } if found, null otherwise
   */
  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    
    // If data is too old, don't return it
    if (age > STALE_TTL) {
      this.cache.delete(key)
      return null
    }

    // Return data with stale flag
    return {
      data: entry.data,
      isStale: age > DEFAULT_TTL,
    }
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      isStale: false,
    })
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Generate a cache key from parameters
   */
  static createKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => {
        const val = params[key]
        if (val instanceof Date) {
          return `${key}:${val.toISOString().split('T')[0]}`
        }
        return `${key}:${val ?? 'null'}`
      })
      .join('|')
    return `${prefix}:${sortedParams}`
  }
}

// Singleton cache instance
export const dataCache = new DataCache()
export { DataCache }








