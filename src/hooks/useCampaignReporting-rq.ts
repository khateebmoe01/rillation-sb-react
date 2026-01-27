/**
 * Shared React Query hook for campaign_reporting data.
 *
 * This hook centralizes campaign_reporting queries to prevent duplicate
 * network requests. Multiple components/hooks that need campaign data
 * should use this hook instead of making separate queries.
 *
 * Benefits:
 * - Automatic deduplication: React Query merges identical queries
 * - Shared cache: All consumers share the same cached data
 * - Stale-while-revalidate: Shows cached data while fetching fresh data
 * - Reduced network requests: From 8 duplicate queries to 1
 */
import { useQuery } from '@tanstack/react-query'
import { supabase, formatDateForQuery } from '../lib/supabase'

export interface CampaignReportingRow {
  id?: string
  campaign_id: string
  campaign_name: string
  client: string
  date: string
  emails_sent: number
  total_leads_contacted: number
  bounced: number
  interested: number
  // Add other columns as needed
}

interface UseCampaignReportingParams {
  startDate: Date
  endDate: Date
  client?: string
  // Select only needed columns to reduce payload
  columns?: string
}

const DEFAULT_COLUMNS = 'campaign_id, campaign_name, client, date, emails_sent, total_leads_contacted, bounced, interested'

async function fetchCampaignReporting({
  startDate,
  endDate,
  client,
  columns = DEFAULT_COLUMNS,
}: UseCampaignReportingParams): Promise<CampaignReportingRow[]> {
  const startStr = formatDateForQuery(startDate)
  const endStr = formatDateForQuery(endDate)

  let query = supabase
    .from('campaign_reporting')
    .select(columns)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: false })

  if (client) {
    query = query.eq('client', client)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching campaign_reporting:', error)
    throw error
  }

  return (data || []) as CampaignReportingRow[]
}

/**
 * Shared hook for fetching campaign_reporting data.
 *
 * Usage:
 * ```typescript
 * const { data, isLoading } = useCampaignReporting({
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 *   client: 'My Client', // optional
 *   columns: 'campaign_id, emails_sent', // optional, defaults to common columns
 * })
 * ```
 */
export function useCampaignReporting(params: UseCampaignReportingParams) {
  const { startDate, endDate, client, columns } = params

  return useQuery({
    // Query key includes all params that affect the result
    queryKey: [
      'campaignReporting',
      {
        start: formatDateForQuery(startDate),
        end: formatDateForQuery(endDate),
        client: client || 'all',
        columns: columns || DEFAULT_COLUMNS,
      },
    ],
    queryFn: () => fetchCampaignReporting(params),
    // 5 minute stale time - data doesn't change frequently
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook to get aggregated campaign stats.
 * Uses useCampaignReporting internally for cache sharing.
 */
export function useCampaignStats(params: UseCampaignReportingParams) {
  const { data, isLoading, error } = useCampaignReporting(params)

  const stats = data
    ? {
        totalSent: data.reduce((sum, row) => sum + (row.emails_sent || 0), 0),
        totalContacted: data.reduce((sum, row) => sum + (row.total_leads_contacted || 0), 0),
        totalBounced: data.reduce((sum, row) => sum + (row.bounced || 0), 0),
        totalInterested: data.reduce((sum, row) => sum + (row.interested || 0), 0),
        campaignCount: new Set(data.map((row) => row.campaign_id)).size,
      }
    : null

  return { stats, isLoading, error, rawData: data }
}
