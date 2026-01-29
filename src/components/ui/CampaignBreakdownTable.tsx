import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, ArrowUpDown, CheckCircle2, Activity, HelpCircle, ChevronRight, Pause } from 'lucide-react'
import { useCampaignStats, CampaignStat, CampaignStatusType } from '../../hooks/useCampaignStats'
import { useSequenceStats, SequenceStat } from '../../hooks/useSequenceStats'
import { useFilters } from '../../contexts/FilterContext'
import { formatNumber } from '../../lib/supabase'

interface CampaignBreakdownTableProps {
  client: string
  onCampaignsSelected?: (campaignIds: string[]) => void
}

const PAGE_SIZE = 5

type SortField = 'recent' | 'performance' | 'sent' | 'meetings'
type StatusFilter = 'all' | 'completed' | 'active' | 'paused'

// Status badge component
function StatusBadge({ status }: { status: CampaignStatusType }) {
  const config = {
    active: { 
      icon: Activity, 
      label: 'Active', 
      className: 'bg-green-500/20 text-green-400 border-green-500/30' 
    },
    paused: { 
      icon: Pause, 
      label: 'Paused', 
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
    },
    completed: { 
      icon: CheckCircle2, 
      label: 'Completed', 
      className: 'bg-slate-500/20 text-rillation-text/70 border-slate-500/30' 
    },
    unknown: { 
      icon: HelpCircle, 
      label: 'Unknown', 
      className: 'bg-slate-500/20 text-rillation-text/70 border-slate-500/30' 
    },
  }
  
  const { icon: Icon, label, className } = config[status]
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

// Sequence row component
function SequenceRow({ sequence, index }: { sequence: SequenceStat; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ 
        opacity: 1, 
        x: 0,
        transition: { delay: (index || 0) * 0.05, duration: 0.2 }
      }}
      className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-2 bg-slate-800/30 border-l-2 border-violet-500/50 ml-4 text-sm"
    >
      <div className="w-4" /> {/* Spacer for checkbox column */}
      <div className="flex items-center gap-2 pl-6">
        <span className="text-violet-400 font-medium">Step {sequence.step_number}:</span>
        <span className="text-white">{sequence.step_name}</span>
      </div>
      <div className="text-center text-rillation-text/60">—</div> {/* Status - N/A for steps */}
      <div className="text-center text-rillation-text/60">—</div> {/* Created - N/A for steps */}
      <div className="text-center text-white">{formatNumber(sequence.sent)}</div>
      <div className="text-center text-rillation-text">{formatNumber(sequence.prospects)}</div>
      <div className="text-center text-rillation-text">{formatNumber(sequence.total_replies)}</div>
      <div className="text-center text-rillation-text">{formatNumber(sequence.real_replies)}</div>
      <div className="text-center text-emerald-400">{formatNumber(sequence.positive_replies)}</div>
      <div className="text-center text-rillation-text">{formatNumber(sequence.bounces)}</div>
      <div className="text-center text-rillation-text/60">—</div> {/* Meetings - Campaign level only */}
    </motion.div>
  )
}

// Campaign row with expandable sequence
function CampaignRow({ 
  campaign, 
  isExpanded, 
  onToggle,
  dateRange,
  isSelected,
  onSelect
}: { 
  campaign: CampaignStat
  isExpanded: boolean
  onToggle: () => void
  dateRange: { start: Date; end: Date }
  isSelected: boolean
  onSelect: (selected: boolean) => void
}) {
  const { data: sequenceData, loading: seqLoading, fetchSequenceStats } = useSequenceStats()
  
  const handleToggle = () => {
    if (!isExpanded) {
      // Fetch sequence data when expanding
      fetchSequenceStats({
        campaignId: campaign.campaign_id,
        client: campaign.client,
        startDate: dateRange.start,
        endDate: dateRange.end,
      })
    }
    onToggle()
  }

  return (
    <div className="border-b border-slate-700/50">
      {/* Main campaign row */}
      <motion.div
        className={`grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors ${
          isExpanded ? 'bg-slate-800/30' : ''
        } ${isSelected ? 'bg-violet-900/20 border-l-2 border-violet-500' : ''}`}
        onClick={handleToggle}
        whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}
      >
        {/* Selection checkbox */}
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onSelect(e.target.checked)
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2 min-w-0 pl-1">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronRight size={16} className="text-rillation-text/70" />
          </motion.div>
          <span className="text-white font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={campaign.campaign_name}>
            {campaign.campaign_name}
          </span>
        </div>
        <div className="text-center flex items-center justify-center">
          <StatusBadge status={campaign.status} />
        </div>
        <div className="text-center text-rillation-text/70 text-xs flex items-center justify-center">
          {campaign.createdAt 
            ? new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </div>
        <div className="text-center text-white flex items-center justify-center">{formatNumber(campaign.totalSent)}</div>
        <div className="text-center text-rillation-text flex items-center justify-center">{formatNumber(campaign.uniqueProspects)}</div>
        <div className="text-center text-rillation-text flex items-center justify-center">{formatNumber(campaign.totalReplies)}</div>
        <div className="text-center text-rillation-text flex items-center justify-center">{formatNumber(campaign.realReplies)}</div>
        <div className="text-center text-emerald-400 flex items-center justify-center">{formatNumber(campaign.positiveReplies)}</div>
        <div className="text-center text-rillation-text flex items-center justify-center">{formatNumber(campaign.bounces)}</div>
        <div className="text-center text-fuchsia-400 font-semibold flex items-center justify-center">{formatNumber(campaign.meetingsBooked)}</div>
      </motion.div>

      {/* Expandable sequence section */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: 1, 
              height: 'auto',
              transition: {
                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{ 
              opacity: 0, 
              height: 0,
              transition: {
                height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.1 }
              }
            }}
            className="bg-slate-900/50 overflow-hidden"
          >
            {seqLoading ? (
              <div className="px-8 py-4 text-center">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : sequenceData.length > 0 ? (
              <motion.div 
                className="py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {/* Sequence rows - header is inherited from parent table */}
                {sequenceData.map((seq, idx) => (
                  <SequenceRow key={seq.step_number} sequence={seq} index={idx} />
                ))}
              </motion.div>
            ) : (
              <div className="px-8 py-4 text-center text-white text-sm">
                No sequence data available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CampaignBreakdownTable({ client, onCampaignsSelected }: CampaignBreakdownTableProps) {
  const { dateRange } = useFilters()
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('sent')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set())
  
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

  // Toggle campaign expansion
  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      if (next.has(campaignId)) {
        next.delete(campaignId)
      } else {
        next.add(campaignId)
      }
      return next
    })
  }

  // Handle campaign selection
  const handleCampaignSelect = (campaignId: string, selected: boolean) => {
    setSelectedCampaigns(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(campaignId)
      } else {
        next.delete(campaignId)
      }
      // Notify parent of selection change
      onCampaignsSelected?.(Array.from(next))
      return next
    })
  }

  // Select all visible campaigns
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const newSelection = new Set(paginatedCampaigns.map(c => c.campaign_id))
      setSelectedCampaigns(newSelection)
      onCampaignsSelected?.(Array.from(newSelection))
    } else {
      setSelectedCampaigns(new Set())
      onCampaignsSelected?.([])
    }
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedCampaigns(new Set())
    onCampaignsSelected?.([])
  }

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let campaigns = [...allCampaigns]
    
    // Apply status filter
    if (statusFilter !== 'all') {
      campaigns = campaigns.filter(c => c.status === statusFilter)
    }
    
    // Apply sorting
    campaigns.sort((a, b) => {
      switch (sortField) {
        case 'performance':
          return b.performanceScore - a.performanceScore
        case 'meetings':
          return b.meetingsBooked - a.meetingsBooked
        case 'sent':
        default:
          return b.totalSent - a.totalSent
      }
    })
    
    return campaigns
  }, [allCampaigns, sortField, statusFilter])

  // Reset page when filters change
  useMemo(() => {
    setPage(1)
  }, [sortField, statusFilter])

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
  const totalCount = filteredAndSortedCampaigns.length
  const offset = (page - 1) * PAGE_SIZE
  const paginatedCampaigns = filteredAndSortedCampaigns.slice(offset, offset + PAGE_SIZE)

  // Count campaigns by status
  const statusCounts = {
    all: allCampaigns.length,
    active: allCampaigns.filter(c => c.status === 'active').length,
    paused: allCampaigns.filter(c => c.status === 'paused').length,
    completed: allCampaigns.filter(c => c.status === 'completed').length,
  }

  // Pagination controls
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-3">
      {/* Title - Outside the box */}
      <h2 className="text-xl font-bold text-white">Campaign Performance</h2>

      {/* Custom Campaign Table with Expandable Rows */}
      <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
        {/* Filter and Sort Controls - Inside the box */}
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between gap-4 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">Status:</span>
            <div className="flex gap-1">
              {(['all', 'active', 'paused', 'completed'] as StatusFilter[]).map((status) => (
                <motion.button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/50 text-rillation-text/70 hover:bg-slate-700/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-1.5 text-rillation-text/60">({statusCounts[status]})</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sort Controls - Positioned on the right */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-white">Sort by:</span>
            <div className="flex gap-1">
              {[
                { field: 'sent' as SortField, label: 'Emails Sent' },
                { field: 'meetings' as SortField, label: 'Meetings' },
                { field: 'performance' as SortField, label: 'Performance' },
              ].map(({ field, label }) => (
                <motion.button
                  key={field}
                  onClick={() => setSortField(field)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortField === field
                      ? 'bg-slate-600/50 text-rillation-text border border-slate-500/30'
                      : 'bg-slate-800/50 text-rillation-text/70 hover:bg-slate-700/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowUpDown size={12} />
                  {label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-2 bg-slate-800/50 text-xs text-white font-medium border-b border-slate-700/30">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every(c => selectedCampaigns.has(c.campaign_id))}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
            />
          </div>
          <div className="pl-1">Campaign Name</div>
          <div className="text-center">Status</div>
          <div className="text-center">Created</div>
          <div className="text-center">Emails Sent</div>
          <div className="text-center">Prospects</div>
          <div className="text-center">Total Replies</div>
          <div className="text-center">Real Replies</div>
          <div className="text-center">Positive</div>
          <div className="text-center">Bounces</div>
          <div className="text-center">Meetings</div>
        </div>

        {/* Selection info bar */}
        {selectedCampaigns.size > 0 && (
          <div className="px-4 py-2 bg-violet-900/30 border-b border-violet-500/30 flex items-center justify-between">
            <span className="text-sm text-violet-300">
              {selectedCampaigns.size} campaign{selectedCampaigns.size > 1 ? 's' : ''} selected
            </span>
            <motion.button
              onClick={clearSelection}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Clear selection
            </motion.button>
          </div>
        )}

        {/* Campaign Rows */}
        <div className="divide-y divide-slate-800/30">
          {paginatedCampaigns.map((campaign) => (
            <CampaignRow
              key={campaign.campaign_id}
              campaign={campaign}
              isExpanded={expandedCampaigns.has(campaign.campaign_id)}
              onToggle={() => toggleCampaign(campaign.campaign_id)}
              dateRange={dateRange}
              isSelected={selectedCampaigns.has(campaign.campaign_id)}
              onSelect={(selected) => handleCampaignSelect(campaign.campaign_id, selected)}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-white">
              Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount} campaigns
            </span>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  page === 1
                    ? 'bg-slate-800/30 text-rillation-text/50 cursor-not-allowed'
                    : 'bg-slate-700/50 text-white hover:bg-slate-700'
                }`}
                whileHover={page !== 1 ? { scale: 1.02 } : {}}
                whileTap={page !== 1 ? { scale: 0.98 } : {}}
              >
                <ChevronUp size={14} className="rotate-[-90deg]" />
              </motion.button>
              <span className="text-xs text-white">
                Page {page} of {totalPages}
              </span>
              <motion.button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  page === totalPages
                    ? 'bg-slate-800/30 text-rillation-text/50 cursor-not-allowed'
                    : 'bg-slate-700/50 text-white hover:bg-slate-700'
                }`}
                whileHover={page !== totalPages ? { scale: 1.02 } : {}}
                whileTap={page !== totalPages ? { scale: 0.98 } : {}}
              >
                <ChevronDown size={14} className="rotate-[-90deg]" />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
