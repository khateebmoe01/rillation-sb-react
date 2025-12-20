import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatNumber } from '../../lib/supabase'
import type { CampaignStat } from '../../hooks/useCampaignStats'

type SortField = 'campaign_name' | 'totalSent' | 'uniqueProspects' | 'totalReplies' | 'realReplies' | 'positiveReplies' | 'bounces' | 'meetingsBooked'
type SortDirection = 'asc' | 'desc' | null

interface CampaignsTableProps {
  campaigns: CampaignStat[]
  totalCount: number
  currentPage: number
  pageSize: number
  loading: boolean
  selectedCampaign: string | null
  onPageChange: (page: number) => void
  onRowClick: (campaign: CampaignStat) => void
}

export default function CampaignsTable({
  campaigns,
  totalCount,
  currentPage,
  pageSize,
  loading,
  selectedCampaign,
  onPageChange,
  onRowClick,
}: CampaignsTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalSent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction: desc -> asc -> null -> desc
      if (sortDirection === 'desc') {
        setSortDirection('asc')
      } else if (sortDirection === 'asc') {
        setSortDirection(null)
        setSortField('totalSent') // Reset to default
      }
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Sort campaigns based on current sort settings
  const sortedCampaigns = useMemo(() => {
    if (!sortDirection) return campaigns

    return [...campaigns].sort((a, b) => {
      let aVal: number | string = a[sortField]
      let bVal: number | string = b[sortField]

      // Handle string comparison for campaign names
      if (sortField === 'campaign_name') {
        const comparison = String(aVal).localeCompare(String(bVal))
        return sortDirection === 'asc' ? comparison : -comparison
      }

      // Handle numeric comparison
      const numA = Number(aVal) || 0
      const numB = Number(bVal) || 0
      return sortDirection === 'asc' ? numA - numB : numB - numA
    })
  }, [campaigns, sortField, sortDirection])

  // Render sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="ml-1 text-rillation-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp size={14} className="ml-1 text-rillation-purple" />
    }
    return <ArrowDown size={14} className="ml-1 text-rillation-purple" />
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  if (loading && campaigns.length === 0) {
    return (
      <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!loading && campaigns.length === 0) {
    return (
      <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 text-center text-rillation-text-muted">
        No campaigns found
      </div>
    )
  }

  return (
    <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-rillation-card-hover border-b border-rillation-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  className="rounded border-rillation-border text-rillation-purple focus:ring-rillation-purple"
                  onChange={() => {}}
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('campaign_name')}
              >
                <div className="flex items-center">
                  Campaign Name
                  <SortIcon field="campaign_name" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('totalSent')}
              >
                <div className="flex items-center justify-end">
                  Total Sent
                  <SortIcon field="totalSent" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('uniqueProspects')}
              >
                <div className="flex items-center justify-end">
                  Unique Prospects
                  <SortIcon field="uniqueProspects" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('totalReplies')}
              >
                <div className="flex items-center justify-end">
                  Total Replies
                  <SortIcon field="totalReplies" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('realReplies')}
              >
                <div className="flex items-center justify-end">
                  Real Replies
                  <SortIcon field="realReplies" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('positiveReplies')}
              >
                <div className="flex items-center justify-end">
                  Positive Replies
                  <SortIcon field="positiveReplies" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('bounces')}
              >
                <div className="flex items-center justify-end">
                  Bounces
                  <SortIcon field="bounces" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider cursor-pointer hover:text-rillation-text group"
                onClick={() => handleSort('meetingsBooked')}
              >
                <div className="flex items-center justify-end">
                  Meetings Booked
                  <SortIcon field="meetingsBooked" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rillation-border/30">
            {sortedCampaigns.map((campaign, index) => {
              const isSelected = selectedCampaign === campaign.campaign_name
              return (
                <tr
                  key={`${campaign.campaign_name}-${index}`}
                  onClick={() => onRowClick(campaign)}
                  className={`border-b border-rillation-border/30 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-rillation-purple/10 hover:bg-rillation-purple/15'
                      : 'hover:bg-rillation-card-hover'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-rillation-border text-rillation-purple focus:ring-rillation-purple cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-rillation-text">
                    {campaign.campaign_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-rillation-text">
                    {formatNumber(campaign.totalSent)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-rillation-text">
                    {formatNumber(campaign.uniqueProspects)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-rillation-text">
                    {formatNumber(campaign.totalReplies)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-rillation-text">
                    {formatNumber(campaign.realReplies)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-rillation-text">
                    {formatNumber(campaign.positiveReplies)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-rillation-text">
                    {formatNumber(campaign.bounces)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-rillation-text">
                    {formatNumber(campaign.meetingsBooked)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-rillation-border bg-rillation-card-hover">
          <div className="text-sm text-rillation-text-muted">
            Showing {startItem} - {endItem} of {formatNumber(totalCount)} campaigns
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-rillation-text-muted hover:text-rillation-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    disabled={loading}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      currentPage === pageNum
                        ? 'bg-rillation-purple text-white'
                        : 'text-rillation-text-muted hover:bg-rillation-card-hover'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-rillation-text-muted hover:text-rillation-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}



