/**
 * Persistent cache with localStorage support and TTL
 * Falls back to in-memory if localStorage is unavailable
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

class PersistentCache {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private useLocalStorage: boolean

  constructor() {
    this.useLocalStorage = this.isLocalStorageAvailable()

    // Clean up old entries on initialization
    if (this.useLocalStorage) {
      this.cleanup()
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get cached data if available and not too old
   * Returns { data, isStale } if found, null otherwise
   */
  get<T>(key: string): { data: T; isStale: boolean } | null {
    // Try memory cache first
    let entry = this.memoryCache.get(key)

    // If not in memory, try localStorage
    if (!entry && this.useLocalStorage) {
      try {
        const stored = localStorage.getItem(`cache:${key}`)
        if (stored) {
          entry = JSON.parse(stored)
          // Restore to memory cache
          if (entry) {
            this.memoryCache.set(key, entry)
          }
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e)
      }
    }

    if (!entry) return null

    const age = Date.now() - entry.timestamp

    // If data is too old, remove it
    if (age > STALE_TTL) {
      this.invalidate(key)
      return null
    }

    // Return data with stale flag
    return {
      data: entry.data,
      isStale: age > DEFAULT_TTL,
    }
  }

  /**
   * Store data in cache (both memory and localStorage)
   */
  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      isStale: false,
    }

    // Store in memory
    this.memoryCache.set(key, entry)

    // Store in localStorage
    if (this.useLocalStorage) {
      try {
        localStorage.setItem(`cache:${key}`, JSON.stringify(entry))
      } catch (e) {
        console.warn('Failed to write to localStorage:', e)
        // If quota exceeded, clean up old entries
        this.cleanup()
        try {
          localStorage.setItem(`cache:${key}`, JSON.stringify(entry))
        } catch {
          // Still failed, continue without localStorage
        }
      }
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key)

    if (this.useLocalStorage) {
      try {
        localStorage.removeItem(`cache:${key}`)
      } catch (e) {
        console.warn('Failed to remove from localStorage:', e)
      }
    }
  }

  /**
   * Invalidate all entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key)
      }
    }

    // Clear from localStorage
    if (this.useLocalStorage) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i)
          if (storageKey?.startsWith(`cache:${prefix}`)) {
            keysToRemove.push(storageKey)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (e) {
        console.warn('Failed to clear prefix from localStorage:', e)
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.memoryCache.clear()

    if (this.useLocalStorage) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('cache:')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (e) {
        console.warn('Failed to clear localStorage:', e)
      }
    }
  }

  /**
   * Clean up expired entries from localStorage
   */
  private cleanup(): void {
    if (!this.useLocalStorage) return

    try {
      const now = Date.now()
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache:')) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const entry = JSON.parse(stored) as CacheEntry<any>
              const age = now - entry.timestamp
              if (age > STALE_TTL) {
                keysToRemove.push(key)
              }
            }
          } catch {
            // Invalid entry, remove it
            keysToRemove.push(key)
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (e) {
      console.warn('Failed to cleanup localStorage:', e)
    }
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
export const persistentCache = new PersistentCache()
export { PersistentCache }
