import { useState, useEffect, useCallback } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import type { QuickViewMetrics, ChartDataPoint } from '../types/database'

interface UseQuickViewDataParams {
  startDate: Date
  endDate: Date
  client?: string
}

export function useQuickViewData({ startDate, endDate, client }: UseQuickViewDataParams) {
  const [metrics, setMetrics] = useState<QuickViewMetrics | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate) // For timestamp comparisons

      // ========== DEBUG LOGGING START ==========
      console.group('=== QuickView Data Fetch Debug ===')
      console.log('📥 INPUT PARAMETERS:')
      console.log('  - Raw startDate:', startDate?.toISOString(), startDate)
      console.log('  - Raw endDate:', endDate?.toISOString(), endDate)
      console.log('  - Client filter:', client || '(none)')
      console.log('📅 FORMATTED DATES:')
      console.log('  - startStr (for DATE fields):', startStr)
      console.log('  - endStr (for DATE fields):', endStr)
      console.log('  - endStrNextDay (for TIMESTAMP fields):', endStrNextDay)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      // ========== DEBUG LOGGING END ==========

      // Fetch ALL campaign reporting data using pagination to overcome Supabase limits
      // Supabase may have server-side limits even with .limit(), so we paginate
      let allCampaignData: any[] = []
      let hasMore = true
      let pageSize = 1000
      let offset = 0
      let pageNumber = 0
      const maxPages = 100 // Safety limit

      console.log('📊 FETCHING CAMPAIGN_REPORTING DATA:')
      console.log('  - Table: campaign_reporting')
      console.log('  - Date filter: >=', startStr, 'AND <=', endStr)
      console.log('  - Client filter:', client || '(none)')
      console.log('  - Page size:', pageSize)

      while (hasMore && pageNumber < maxPages) {
        pageNumber++
        console.log(`  📄 Page ${pageNumber}: Fetching rows ${offset} to ${offset + pageSize - 1}`)

        let campaignQuery = supabase
          .from('campaign_reporting')
          .select('date,campaign_name,emails_sent,total_leads_contacted,bounced,interested')
          .gte('date', startStr)
          .lte('date', endStr)
          .range(offset, offset + pageSize - 1)

        if (client) campaignQuery = campaignQuery.eq('client', client)

        const { data: pageData, error: campaignError } = await campaignQuery

        if (campaignError) {
          console.error('  ❌ Query error:', campaignError)
          throw campaignError
        }

        console.log(`  ✅ Page ${pageNumber}: Received ${pageData?.length || 0} rows`)

        if (pageData && pageData.length > 0) {
          allCampaignData = allCampaignData.concat(pageData)
          offset += pageSize
          hasMore = pageData.length === pageSize // Continue if we got a full page
          console.log(`  → Total rows so far: ${allCampaignData.length}, hasMore: ${hasMore}`)
        } else {
          hasMore = false
          console.log(`  → No more data, stopping pagination`)
        }
      }

      if (pageNumber >= maxPages) {
        console.warn('  ⚠️ WARNING: Hit max page limit! May have incomplete data!')
      }

      const campaignData = allCampaignData

      type CampaignRow = { 
        date: string
        campaign_name: string | null
        emails_sent: number | null
        total_leads_contacted: number | null
        bounced: number | null
        interested: number | null
      }

      // ========== DEBUG: Analyze campaign data ==========
      console.log('📈 CAMPAIGN DATA ANALYSIS:')
      console.log('  - Total rows fetched:', campaignData.length)
      
      if (campaignData.length > 0) {
        const uniqueDates = [...new Set(campaignData.map((r: any) => r.date))].sort()
        console.log('  - Unique dates in data:', uniqueDates.length, 'dates')
        console.log('  - Date range in data:', uniqueDates[0], 'to', uniqueDates[uniqueDates.length - 1])
        console.log('  - First 3 rows sample:', campaignData.slice(0, 3))
        
        // Check for dates outside expected range
        const rowsOutsideRange = campaignData.filter((r: any) => {
          return r.date < startStr || r.date > endStr
        })
        if (rowsOutsideRange.length > 0) {
          console.warn('  ⚠️ WARNING: Found', rowsOutsideRange.length, 'rows outside date range!')
          console.warn('  - Sample:', rowsOutsideRange.slice(0, 3))
        }

        // Check for duplicate rows (by date + campaign if we had campaign_id)
        const rowKeys = campaignData.map((r: any) => r.date + '|' + JSON.stringify(r))
        const uniqueKeys = new Set(rowKeys)
        if (uniqueKeys.size < campaignData.length) {
          console.warn('  ⚠️ WARNING: Potential duplicate rows detected!')
          console.warn('  - Total rows:', campaignData.length)
          console.warn('  - Unique rows:', uniqueKeys.size)
        }
      }
      // ========== DEBUG END ==========

      // Calculate metrics from all fetched rows
      // Filter out rows with null/empty campaign_name to match useCampaignStats behavior
      const validRows = (campaignData as CampaignRow[] | null)?.filter(row => row.campaign_name) || []
      const totalEmailsSent = validRows.reduce((sum, row) => sum + (row.emails_sent || 0), 0) || 0
      const uniqueProspects = validRows.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0) || 0
      const bounces = validRows.reduce((sum, row) => sum + (row.bounced || 0), 0) || 0
      const positiveReplies = validRows.reduce((sum, row) => sum + (row.interested || 0), 0) || 0

      console.log('💰 CALCULATED METRICS:')
      console.log('  - totalEmailsSent:', totalEmailsSent)
      console.log('  - uniqueProspects:', uniqueProspects)
      console.log('  - bounces:', bounces)
      console.log('  - positiveReplies:', positiveReplies)

      // Fetch ALL replies data using pagination
      // date_received is TIMESTAMPTZ, so use lt() with next day to include entire end date
      let allRepliesData: any[] = []
      let repliesOffset = 0
      let hasMoreReplies = true
      let totalRepliesCount = 0

      while (hasMoreReplies) {
        let allRepliesQuery = supabase
          .from('replies')
          .select('category,date_received', { count: 'exact' })
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .range(repliesOffset, repliesOffset + pageSize - 1)

        if (client) allRepliesQuery = allRepliesQuery.eq('client', client)

        const { data: pageData, count, error: allRepliesError } = await allRepliesQuery

        if (allRepliesError) throw allRepliesError

        // Get total count from first query
        if (repliesOffset === 0 && count !== null) {
          totalRepliesCount = count
        }

        if (pageData && pageData.length > 0) {
          allRepliesData = allRepliesData.concat(pageData)
          repliesOffset += pageSize
          hasMoreReplies = pageData.length === pageSize
        } else {
          hasMoreReplies = false
        }
      }

      // Total replies = actual count
      const totalReplies = totalRepliesCount || 0

      console.log('💬 REPLIES DATA:')
      console.log('  - Total replies count (from Supabase):', totalRepliesCount)
      console.log('  - Replies rows fetched:', allRepliesData.length)

      type ReplyRow = {
        category: string | null
        date_received: string | null
      }

      // Real replies = all replies EXCLUDING "Out Of Office"
      const realReplies = (allRepliesData as ReplyRow[] | null)?.filter((r) => {
        const cat = (r.category || '').toLowerCase()
        return !cat.includes('out of office') && !cat.includes('ooo') && cat !== 'out of office'
      }).length || 0

      // Fetch ALL meetings booked using pagination
      // created_time is TIMESTAMPTZ, so use lt() with next day to include entire end date
      let allMeetingsData: any[] = []
      let meetingsOffset = 0
      let hasMoreMeetings = true

      while (hasMoreMeetings) {
        let meetingsQuery = supabase
          .from('meetings_booked')
          .select('*')
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .range(meetingsOffset, meetingsOffset + pageSize - 1)

        if (client) meetingsQuery = meetingsQuery.eq('client', client)

        const { data: pageData, error: meetingsError } = await meetingsQuery

        if (meetingsError) throw meetingsError

        if (pageData && pageData.length > 0) {
          allMeetingsData = allMeetingsData.concat(pageData)
          meetingsOffset += pageSize
          hasMoreMeetings = pageData.length === pageSize
        } else {
          hasMoreMeetings = false
        }
      }

      const meetingsData = allMeetingsData
      const meetingsBooked = meetingsData?.length || 0

      console.log('📅 MEETINGS DATA:')
      console.log('  - Meetings booked:', meetingsBooked)

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ FINAL METRICS BEING SET:')
      console.log({
        totalEmailsSent,
        uniqueProspects,
        totalReplies,
        realReplies,
        positiveReplies,
        bounces,
        meetingsBooked,
      })
      console.groupEnd()
      // ========== DEBUG LOGGING END ==========

      setMetrics({
        totalEmailsSent,
        uniqueProspects,
        totalReplies,
        realReplies,
        positiveReplies,
        bounces,
        meetingsBooked,
      })

      // Prepare chart data - group by date
      const dateMap = new Map<string, ChartDataPoint>()

      // Helper to format date string to display without timezone issues
      const formatDateDisplay = (dateStr: string) => {
        const [_year, month, day] = dateStr.split('-').map(Number)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[month - 1]} ${day}`
      }

      // Use validRows (same filtering as metrics calculation) for chart data
      validRows.forEach((row) => {
        const date = row.date
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date: formatDateDisplay(date),
            sent: 0,
            prospects: 0,
            replied: 0,
            positiveReplies: 0,
          })
        }
        const point = dateMap.get(date)!
        point.sent += row.emails_sent || 0
        point.prospects += row.total_leads_contacted || 0
        point.positiveReplies += row.interested || 0
      })

      // Add replies data to chart from replies table
      ;(allRepliesData as ReplyRow[] | null)?.forEach((reply) => {
        const dateStr = reply.date_received?.split('T')[0]
        if (dateStr) {
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, {
              date: formatDateDisplay(dateStr),
              sent: 0,
              prospects: 0,
              replied: 0,
              positiveReplies: 0,
            })
          }
          const point = dateMap.get(dateStr)!
          // Count non-OOO replies
          const cat = (reply.category || '').toLowerCase()
          if (!cat.includes('out of office') && !cat.includes('ooo')) {
            point.replied += 1
          }
          // Note: positiveReplies (Interested) is now calculated from campaign_reporting.interested
          // in the campaign data loop above, not from replies table
        }
      })

      // Sort by date and convert to array
      const sortedData = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, point]) => point)

      setChartData(sortedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, client])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { metrics, chartData, loading, error, refetch: fetchData }
}
