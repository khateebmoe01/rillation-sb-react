import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import { dataCache, DataCache } from '../lib/cache'

export interface SalesMetric {
  date: string
  revenue: number
  dealCount: number
  avgValue: number
  winRate: number
  closedWonCount: number
  closedLostCount: number
}

export interface SalesSummary {
  totalRevenue: number
  avgDealValue: number
  winRate: number
  totalClosedWon: number
  totalClosedLost: number
  totalDeals: number
}

export interface UseSalesMetricsParams {
  startDate: Date
  endDate: Date
  client?: string
}

interface CachedSalesData {
  dailyMetrics: SalesMetric[]
  summary: SalesSummary
}

const DEFAULT_SUMMARY: SalesSummary = {
  totalRevenue: 0,
  avgDealValue: 0,
  winRate: 0,
  totalClosedWon: 0,
  totalClosedLost: 0,
  totalDeals: 0,
}

export function useSalesMetrics({ startDate, endDate, client }: UseSalesMetricsParams) {
  const [dailyMetrics, setDailyMetrics] = useState<SalesMetric[]>([])
  const [summary, setSummary] = useState<SalesSummary>(DEFAULT_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const hasInitialData = useRef(false)

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    const cacheKey = DataCache.createKey('sales', {
      startDate,
      endDate,
      client: client || '',
    })

    // Try to get cached data first
    if (!isBackgroundRefresh) {
      const cached = dataCache.get<CachedSalesData>(cacheKey)
      if (cached) {
        setDailyMetrics(cached.data.dailyMetrics)
        setSummary(cached.data.summary)
        hasInitialData.current = true
        
        if (!cached.isStale) {
          setLoading(false)
          return
        }
        setLoading(false)
      }
    }

    try {
      if (!hasInitialData.current && !isBackgroundRefresh) {
        setLoading(true)
      }
      setError(null)

      const startStr = formatDateForQuery(startDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate)

      // Query client_opportunities - filter for "Closed" stage
      // Fetch only needed fields and filter by date in JS (since we need COALESCE logic)
      // Closed opportunities should be a small subset, so this is acceptable
      let query = supabase
        .from('client_opportunities')
        .select('value,updated_at,created_at')
        .eq('stage', 'Closed')

      if (client) {
        query = query.eq('client', client)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Filter by date range - use updated_at (when closed) or created_at as fallback
      const opportunities = (data || []).filter((opp: any) => {
        const closeDate = opp.updated_at || opp.created_at
        if (!closeDate) return false
        const closeDateStr = closeDate.split('T')[0]
        return closeDateStr >= startStr && closeDateStr < endStrNextDay
      })

      // For closed deals: value > 0 = won, value = 0 or null = lost
      // In practice, closed deals with value set are typically won deals
      const closedWon = opportunities.filter((opp: any) => Number(opp.value || 0) > 0)
      const closedLost = opportunities.filter((opp: any) => Number(opp.value || 0) === 0)

      // Calculate summary metrics
      const totalRevenue = closedWon.reduce((sum: number, opp: any) => sum + Number(opp.value || 0), 0)
      const totalClosedWon = closedWon.length
      const totalClosedLost = closedLost.length
      const totalDeals = totalClosedWon + totalClosedLost
      const avgDealValue = totalClosedWon > 0 ? totalRevenue / totalClosedWon : 0
      const winRate = totalDeals > 0 ? (totalClosedWon / totalDeals) * 100 : 0

      const newSummary: SalesSummary = {
        totalRevenue,
        avgDealValue,
        winRate,
        totalClosedWon,
        totalClosedLost,
        totalDeals,
      }

      // Group by day for daily trends
      const dailyMap = new Map<string, {
        revenue: number
        closedWonCount: number
        closedLostCount: number
      }>()

      // Initialize all dates in range with zeros
      const dateRange: string[] = []
      const currentDate = new Date(startDate)
      currentDate.setHours(0, 0, 0, 0)
      const endDateCopy = new Date(endDate)
      endDateCopy.setHours(23, 59, 59, 999)
      while (currentDate <= endDateCopy) {
        const dateStr = formatDateForQuery(currentDate)
        dateRange.push(dateStr)
        dailyMap.set(dateStr, { revenue: 0, closedWonCount: 0, closedLostCount: 0 })
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Aggregate closed won deals by date (use updated_at when closed, or created_at as fallback)
      closedWon.forEach((opp: any) => {
        const closeDate = opp.updated_at || opp.created_at
        if (closeDate) {
          const dateStr = closeDate.split('T')[0]
          const existing = dailyMap.get(dateStr) || { revenue: 0, closedWonCount: 0, closedLostCount: 0 }
          dailyMap.set(dateStr, {
            revenue: existing.revenue + Number(opp.value || 0),
            closedWonCount: existing.closedWonCount + 1,
            closedLostCount: existing.closedLostCount,
          })
        }
      })

      // Aggregate closed lost deals by date (use updated_at when closed, or created_at as fallback)
      closedLost.forEach((opp: any) => {
        const closeDate = opp.updated_at || opp.created_at
        if (closeDate) {
          const dateStr = closeDate.split('T')[0]
          const existing = dailyMap.get(dateStr) || { revenue: 0, closedWonCount: 0, closedLostCount: 0 }
          dailyMap.set(dateStr, {
            revenue: existing.revenue,
            closedWonCount: existing.closedWonCount,
            closedLostCount: existing.closedLostCount + 1,
          })
        }
      })

      // Convert to array format for charts
      // The date range comes from the filter, and we show daily granularity within that range
      const dailyMetricsData: SalesMetric[] = dateRange.map((dateStr) => {
        const dayData = dailyMap.get(dateStr) || { revenue: 0, closedWonCount: 0, closedLostCount: 0 }
        const dealCount = dayData.closedWonCount + dayData.closedLostCount
        const avgValue = dayData.closedWonCount > 0 ? dayData.revenue / dayData.closedWonCount : 0
        // Win rate: only calculate if there are deals, otherwise leave as 0 (no deals = 0% win rate is meaningful)
        const winRate = dealCount > 0 ? (dayData.closedWonCount / dealCount) * 100 : 0

        // Format date for display (e.g., "Jan 15")
        const [, month, day] = dateStr.split('-').map(Number)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const displayDate = `${monthNames[month - 1]} ${day}`

        return {
          date: displayDate,
          revenue: dayData.revenue,
          dealCount,
          avgValue,
          winRate,
          closedWonCount: dayData.closedWonCount,
          closedLostCount: dayData.closedLostCount,
        }
      })

      setSummary(newSummary)
      setDailyMetrics(dailyMetricsData)
      hasInitialData.current = true

      // Cache the results
      dataCache.set(cacheKey, {
        dailyMetrics: dailyMetricsData,
        summary: newSummary,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales metrics')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    const cacheKey = DataCache.createKey('sales', {
      startDate,
      endDate,
      client: client || '',
    })
    dataCache.invalidate(cacheKey)
    return fetchData(false)
  }, [fetchData, startDate, endDate, client])

  return { dailyMetrics, summary, loading, error, refetch }
}
