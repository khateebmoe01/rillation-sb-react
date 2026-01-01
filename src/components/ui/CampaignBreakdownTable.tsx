import { useState } from 'react'
import { useCampaignStats } from '../../hooks/useCampaignStats'
import { useFilters } from '../../contexts/FilterContext'
import { formatNumber } from '../../lib/supabase'
import ExpandableDataPanel from './ExpandableDataPanel'

interface CampaignBreakdownTableProps {
  client: string
}

const PAGE_SIZE = 10

export default function CampaignBreakdownTable({ client }: CampaignBreakdownTableProps) {
  const { dateRange } = useFilters()
  const [page, setPage] = useState(1)
  
  const {
    campaigns: allCampaigns,
    loading,
    error,
  } = useCampaignStats({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: client,
    page: 1,
    pageSize: 1000, // Get all campaigns, then paginate locally
  })

  if (loading) {
    return (
      <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
        Error loading campaign data: {error}
      </div>
    )
  }

  if (allCampaigns.length === 0) {
    return (
      <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 text-center text-rillation-text-muted">
        No campaign data available for this client.
      </div>
    )
  }

  // Paginate campaigns locally
  const totalCount = allCampaigns.length
  const offset = (page - 1) * PAGE_SIZE
  const paginatedCampaigns = allCampaigns.slice(offset, offset + PAGE_SIZE)

  // Transform campaigns to table data format
  const tableData = paginatedCampaigns.map((campaign) => ({
    campaign_name: campaign.campaign_name,
    totalSent: formatNumber(campaign.totalSent),
    uniqueProspects: formatNumber(campaign.uniqueProspects),
    totalReplies: formatNumber(campaign.totalReplies),
    realReplies: formatNumber(campaign.realReplies),
    positiveReplies: formatNumber(campaign.positiveReplies),
    bounces: formatNumber(campaign.bounces),
    meetingsBooked: formatNumber(campaign.meetingsBooked),
  }))

  const columns = [
    { key: 'campaign_name', label: 'Campaign Name' },
    { key: 'totalSent', label: 'Emails Sent' },
    { key: 'uniqueProspects', label: 'Unique Prospects' },
    { key: 'totalReplies', label: 'Total Replies' },
    { key: 'realReplies', label: 'Real Replies' },
    { key: 'positiveReplies', label: 'Positive Replies' },
    { key: 'bounces', label: 'Bounces' },
    { key: 'meetingsBooked', label: 'Meetings Booked' },
  ]

  return (
    <ExpandableDataPanel
      title="Campaign Performance"
      data={tableData}
      columns={columns}
      totalCount={totalCount}
      currentPage={page}
      pageSize={PAGE_SIZE}
      onPageChange={setPage}
      isOpen={true}
      showCloseButton={false}
    />
  )
}

