import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronDown, Target } from 'lucide-react'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import type { FirmographicInsightsData, FirmographicDimensionData, FirmographicItem } from '../../hooks/useFirmographicInsights'

interface FirmographicInsightsPanelProps {
  data: FirmographicInsightsData | null
  loading: boolean
  error: string | null
}

type DimensionKey = 'industry' | 'revenue' | 'employees' | 'geography' | 'signals'

const DIMENSION_CONFIG: Record<DimensionKey, { label: string; code: string }> = {
  industry: { label: 'INDUSTRY', code: 'IND' },
  revenue: { label: 'REVENUE RANGE', code: 'REV' },
  employees: { label: 'EMPLOYEE COUNT', code: 'EMP' },
  geography: { label: 'GEOGRAPHY', code: 'GEO' },
  signals: { label: 'SIGNALS', code: 'SIG' },
}

// Get color class based on rate comparison to average
function getRateColor(rate: number, avgRate: number): string {
  if (avgRate === 0) return 'text-white'
  const ratio = rate / avgRate
  if (ratio >= 1.3) return 'text-emerald-400'
  if (ratio <= 0.7) return 'text-red-400'
  return 'text-white'
}

// Single dimension card component with CIA aesthetic
function DimensionCard({ 
  dimensionKey,
  dimension,
  index 
}: { 
  dimensionKey: DimensionKey
  dimension: FirmographicDimensionData | undefined
  index: number
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)
  
  const config = DIMENSION_CONFIG[dimensionKey]
  
  const sortedItems = useMemo(() => {
    if (!dimension) return []
    return [...dimension.items].sort((a, b) => b.leadsIn - a.leadsIn)
  }, [dimension])

  const displayItems = showAll ? sortedItems : sortedItems.slice(0, 8)
  const hasMore = sortedItems.length > 8

  // Calculate averages for color coding
  const avgRepliedRate = useMemo(() => {
    if (!sortedItems.length) return 0
    const total = sortedItems.reduce((sum: number, item: FirmographicItem) => 
      sum + (item.leadsIn > 0 ? item.engaged / item.leadsIn : 0), 0)
    return total / sortedItems.length
  }, [sortedItems])

  const avgEngagedRate = useMemo(() => {
    if (!sortedItems.length) return 0
    const total = sortedItems.reduce((sum: number, item: FirmographicItem) => 
      sum + (item.leadsIn > 0 ? item.positive / item.leadsIn : 0), 0)
    return total / sortedItems.length
  }, [sortedItems])

  const avgBookedRate = useMemo(() => {
    if (!sortedItems.length) return 0
    const total = sortedItems.reduce((sum: number, item: FirmographicItem) => 
      sum + (item.leadsIn > 0 ? item.booked / item.leadsIn : 0), 0)
    return total / sortedItems.length
  }, [sortedItems])

  const hasLowCoverage = dimension && dimension.coverage < 0.2
  const hasNoData = !dimension || dimension.items.length === 0

  return (
    <motion.div
      className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-gradient-to-b from-slate-900/90 to-slate-900/70"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Header - Clickable to collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors border-b border-slate-700/40"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-500/80 tracking-wider">[{config.code}]</span>
            <h3 className="text-sm font-bold text-white tracking-wide">{config.label}</h3>
          </div>
          {hasLowCoverage && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded">
              <AlertTriangle size={10} className="text-red-400" />
              <span className="text-[10px] font-mono text-red-400">LOW DATA</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-white/40">
            {dimension ? `${formatPercentage(dimension.coverage * 100, 0)} COV` : '0%'}
          </span>
          <span className="text-xs font-mono text-white/30">
            {sortedItems.length} ENTRIES
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-white/40" />
          </motion.div>
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            {hasNoData ? (
              <div className="px-5 py-8">
                <div className="text-center text-white/30 font-mono text-sm">
                  NO DATA AVAILABLE
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-3 px-3 py-2 mb-1">
                  <div className="col-span-4" />
                  <div className="col-span-2 text-right">
                    <span className="text-[11px] font-bold text-white tracking-wider">LEADS</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[11px] font-bold text-white tracking-wider">REPLIED</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[11px] font-bold text-white tracking-wider">ENGAGED</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-[11px] font-bold text-white tracking-wider">BOOKED</span>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="space-y-0.5">
                  {displayItems.map((item, idx) => {
                    const repliedRate = item.leadsIn > 0 ? item.engaged / item.leadsIn : 0
                    const engagedRate = item.leadsIn > 0 ? item.positive / item.leadsIn : 0
                    const bookedRate = item.leadsIn > 0 ? item.booked / item.leadsIn : 0

                    return (
                      <motion.div
                        key={item.value}
                        className="grid grid-cols-12 gap-3 px-3 py-2.5 rounded hover:bg-white/[0.03] transition-colors group"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.025 }}
                      >
                        {/* Value Name */}
                        <div className="col-span-4 flex items-center">
                          <span className="text-sm text-white font-medium truncate group-hover:text-emerald-300 transition-colors" title={item.value}>
                            {item.value}
                          </span>
                        </div>

                        {/* Leads */}
                        <div className="col-span-2 text-right flex items-center justify-end">
                          <span className="text-sm font-mono font-bold text-white">
                            {formatNumber(item.leadsIn)}
                          </span>
                        </div>

                        {/* Replied */}
                        <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                          <span className={`text-sm font-mono font-bold ${getRateColor(repliedRate, avgRepliedRate)}`}>
                            {item.engaged}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">
                            {formatPercentage(repliedRate * 100, 0)}
                          </span>
                        </div>

                        {/* Engaged */}
                        <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                          <span className={`text-sm font-mono font-bold ${getRateColor(engagedRate, avgEngagedRate)}`}>
                            {item.positive}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">
                            {formatPercentage(engagedRate * 100, 0)}
                          </span>
                        </div>

                        {/* Booked */}
                        <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                          <span className={`text-sm font-mono font-bold ${getRateColor(bookedRate, avgBookedRate)}`}>
                            {item.booked}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">
                            {formatPercentage(bookedRate * 100, 0)}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Show More Button */}
                {hasMore && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAll(!showAll)
                    }}
                    className="mt-3 w-full py-2 text-xs font-mono text-white/40 hover:text-emerald-400 hover:bg-white/[0.02] rounded transition-colors border border-transparent hover:border-emerald-500/20"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    {showAll ? '[ COLLAPSE ]' : `[ SHOW ${sortedItems.length - 8} MORE ]`}
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FirmographicInsightsPanel({ data, loading, error }: FirmographicInsightsPanelProps) {
  if (loading) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono text-white/40">LOADING FIRMOGRAPHIC DATA...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-red-500/30 p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle size={18} />
          <span className="text-sm font-mono text-white">{error}</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const dimensions: DimensionKey[] = ['industry', 'revenue', 'employees', 'geography', 'signals']

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={18} className="text-emerald-500" />
          <h2 className="text-lg font-bold text-white tracking-wide">FIRMOGRAPHIC ANALYSIS</h2>
        </div>
        <span className="text-[10px] font-mono text-white/30 tracking-wider">RATIO-BASED INSIGHTS</span>
      </div>

      {/* Stacked Dimension Cards */}
      <div className="space-y-3">
        {dimensions.map((key, index) => (
          <DimensionCard
            key={key}
            dimensionKey={key}
            dimension={data[key]}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
