import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  Target, 
  Trophy, 
  TrendingDown,
  Building2,
  DollarSign,
  Users,
  MapPin,
  Zap,
  X
} from 'lucide-react'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import type { FirmographicInsightsData, FirmographicDimensionData, FirmographicItem } from '../../hooks/useFirmographicInsights'

interface FirmographicInsightsPanelProps {
  data: FirmographicInsightsData | null
  loading: boolean
  error: string | null
}

type DimensionKey = 'industry' | 'revenue' | 'employees' | 'geography' | 'signals'

const DIMENSION_CONFIG: Record<DimensionKey, { 
  label: string
  shortLabel: string
  icon: typeof Building2
  color: string
  barColor: string
}> = {
  industry: { 
    label: 'INDUSTRY', 
    shortLabel: 'Industry',
    icon: Building2,
    color: 'text-violet-400',
    barColor: 'bg-violet-500'
  },
  revenue: { 
    label: 'REVENUE RANGE', 
    shortLabel: 'Revenue',
    icon: DollarSign,
    color: 'text-emerald-400',
    barColor: 'bg-emerald-500'
  },
  employees: { 
    label: 'EMPLOYEE COUNT', 
    shortLabel: 'Employees',
    icon: Users,
    color: 'text-blue-400',
    barColor: 'bg-blue-500'
  },
  geography: { 
    label: 'GEOGRAPHY', 
    shortLabel: 'Geography',
    icon: MapPin,
    color: 'text-amber-400',
    barColor: 'bg-amber-500'
  },
  signals: { 
    label: 'SIGNALS', 
    shortLabel: 'Signals',
    icon: Zap,
    color: 'text-rose-400',
    barColor: 'bg-rose-500'
  },
}

// Get ranking color based on position in list
function getRankingStyle(index: number, total: number): { 
  barClass: string
  textClass: string
  bgClass: string
  label: string
} {
  const position = index / Math.max(total - 1, 1)
  
  if (position <= 0.25) {
    return { 
      barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30',
      label: 'winner'
    }
  } else if (position >= 0.75) {
    return { 
      barClass: 'bg-gradient-to-r from-red-500 to-red-400',
      textClass: 'text-red-400',
      bgClass: 'bg-red-500/10 border-red-500/30',
      label: 'loser'
    }
  } else {
    return { 
      barClass: 'bg-gradient-to-r from-amber-500/60 to-amber-400/40',
      textClass: 'text-white/70',
      bgClass: 'bg-white/5 border-slate-700/30',
      label: 'average'
    }
  }
}

// Get winner data for a dimension - ALWAYS by booking conversion rate (meetings booked / leads)
function getWinnerData(dimension: FirmographicDimensionData | undefined): { 
  winner: FirmographicItem | null
  conversionRate: number
  leadsCount: number
  bookedCount: number
} {
  if (!dimension || dimension.items.length === 0) {
    return { winner: null, conversionRate: 0, leadsCount: 0, bookedCount: 0 }
  }

  // Always sort by booking conversion rate (booked / leadsIn)
  const sorted = [...dimension.items]
    .filter(item => item.leadsIn > 0)
    .sort((a, b) => (b.booked / b.leadsIn) - (a.booked / a.leadsIn))
  
  const winner = sorted[0] || null
  
  return { 
    winner, 
    conversionRate: winner ? (winner.booked / winner.leadsIn) : 0,
    leadsCount: winner?.leadsIn || 0,
    bookedCount: winner?.booked || 0
  }
}

// Large Dimension Tab Component with hover glow
function DimensionTab({
  dimensionKey,
  dimension,
  isSelected,
  onClick,
  index
}: {
  dimensionKey: DimensionKey
  dimension: FirmographicDimensionData | undefined
  isSelected: boolean
  onClick: () => void
  index: number
}) {
  const config = DIMENSION_CONFIG[dimensionKey]
  const Icon = config.icon
  const { winner, conversionRate, leadsCount, bookedCount } = getWinnerData(dimension)
  const hasNoData = !dimension || dimension.items.length === 0

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative flex-1 min-w-[220px] flex items-center gap-5 px-7 py-6 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${isSelected 
          ? 'bg-slate-800 border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
          : 'bg-slate-800/40 border-slate-700/50 hover:border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
        }
      `}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 250, damping: 22 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon */}
      <div className={`p-3 rounded-xl bg-slate-700/60 ${config.color}`}>
        <Icon size={26} />
      </div>

      {/* Content */}
      <div className="flex flex-col items-start min-w-0 flex-1">
        <span className="text-sm font-bold text-white uppercase tracking-wide mb-1">
          {config.shortLabel}
        </span>
        {hasNoData ? (
          <span className="text-base font-medium text-white/30">No data</span>
        ) : (
          <>
            <span className={`text-lg font-bold ${config.color}`} title={winner?.value}>
              {winner?.value || '-'}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-base font-bold font-mono ${conversionRate > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                {formatPercentage(conversionRate * 100, 1)}
              </span>
              <span className="text-xs text-white/40">
                ({bookedCount}/{leadsCount} booked)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Selection indicator - small dot */}
      {isSelected && (
        <motion.div
          className="w-3 h-3 rounded-full bg-white shrink-0"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        />
      )}
    </motion.button>
  )
}

// Detailed Metrics Panel with all 4 rates
function DetailedMetricsPanel({
  dimensionKey,
  dimension,
  onClose,
  isCompact
}: {
  dimensionKey: DimensionKey
  dimension: FirmographicDimensionData | undefined
  onClose: () => void
  isCompact: boolean
}) {
  const config = DIMENSION_CONFIG[dimensionKey]
  const Icon = config.icon

  const hasBookings = dimension?.items.some(item => item.booked > 0) || false

  const rankedItems = useMemo(() => {
    if (!dimension) return []
    
    if (hasBookings) {
      return [...dimension.items]
        .filter(item => item.leadsIn > 0)
        .sort((a, b) => (b.booked / b.leadsIn) - (a.booked / a.leadsIn))
    }
    return [...dimension.items].sort((a, b) => b.leadsIn - a.leadsIn)
  }, [dimension, hasBookings])

  const totalItems = rankedItems.length
  const displayItems = isCompact ? rankedItems.slice(0, 6) : rankedItems

  // Calculate max booking rate for bar scaling
  const maxBookingRate = useMemo(() => {
    if (rankedItems.length === 0) return 1
    return Math.max(...rankedItems.map(item => item.leadsIn > 0 ? item.booked / item.leadsIn : 0), 0.01)
  }, [rankedItems])

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-900/95 to-slate-800/90 flex-1 min-w-0"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      layout
    >
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg bg-slate-700/50 ${config.color}`}>
            <Icon size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{config.label}</h3>
            <p className="text-xs text-white/50">
              {totalItems} categories ranked by booking rate
            </p>
          </div>
        </div>

        <motion.button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={18} className="text-white/60" />
        </motion.button>
      </div>

      {/* Table Header */}
      <div className="relative px-5 py-3 border-b border-slate-700/30 bg-slate-800/40">
        <div className="flex items-center gap-4">
          <div className="w-12 shrink-0" /> {/* Rank space */}
          <div className="flex-1 min-w-[200px] text-left">
            <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Category</span>
          </div>
          <div className="w-20 text-center shrink-0">
            <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Leads</span>
          </div>
          <div className="w-20 text-center shrink-0">
            <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Replied</span>
          </div>
          <div className="w-20 text-center shrink-0">
            <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Engaged</span>
          </div>
          <div className="w-20 text-center shrink-0">
            <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Booked</span>
          </div>
          <div className="w-32 shrink-0">
            <span className="text-sm font-bold text-white/50 uppercase tracking-wider">Rate</span>
          </div>
        </div>
      </div>

      {/* Data Rows */}
      <div className="relative px-5 py-4 max-h-[450px] overflow-y-auto">
        <motion.div 
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
          }}
        >
          {displayItems.map((item, idx) => {
            const repliedRate = item.leadsIn > 0 ? item.engaged / item.leadsIn : 0
            const engagedRate = item.leadsIn > 0 ? item.positive / item.leadsIn : 0
            const bookedRate = item.leadsIn > 0 ? item.booked / item.leadsIn : 0
            const barWidth = maxBookingRate > 0 ? (bookedRate / maxBookingRate) * 100 : 0
            
            const rankStyle = getRankingStyle(idx, totalItems)
            const isWinner = idx === 0
            const isLoser = idx === totalItems - 1 && totalItems > 2

            return (
              <motion.div
                key={item.value}
                className={`relative flex items-center gap-4 px-4 py-4 rounded-xl border transition-all ${rankStyle.bgClass}`}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 }
                }}
                whileHover={{ scale: 1.005, x: 4 }}
              >
                {/* Rank Badge */}
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-bold text-base shrink-0 ${
                  isWinner 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : isLoser 
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-white/5 text-white/40'
                }`}>
                  {isWinner ? <Trophy size={22} /> : isLoser ? <TrendingDown size={22} /> : `#${idx + 1}`}
                </div>

                {/* Category Name - Now flexible width */}
                <div className="flex-1 min-w-[200px]">
                  <span className={`text-lg font-semibold ${rankStyle.textClass}`} title={item.value}>
                    {item.value}
                  </span>
                </div>

                {/* Leads */}
                <div className="w-20 text-center shrink-0">
                  <span className="text-lg font-bold font-mono text-white">
                    {formatNumber(item.leadsIn)}
                  </span>
                </div>

                {/* Replied / Leads */}
                <div className="w-20 text-center shrink-0">
                  <div className="text-lg font-bold font-mono text-blue-400">
                    {formatPercentage(repliedRate * 100, 0)}
                  </div>
                  <div className="text-xs text-white/40">
                    {item.engaged}/{item.leadsIn}
                  </div>
                </div>

                {/* Engaged / Leads */}
                <div className="w-20 text-center shrink-0">
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {formatPercentage(engagedRate * 100, 0)}
                  </div>
                  <div className="text-xs text-white/40">
                    {item.positive}/{item.leadsIn}
                  </div>
                </div>

                {/* Booked / Leads */}
                <div className="w-20 text-center shrink-0">
                  <div className={`text-lg font-bold font-mono ${rankStyle.textClass}`}>
                    {formatPercentage(bookedRate * 100, 0)}
                  </div>
                  <div className="text-xs text-white/40">
                    {item.booked}/{item.leadsIn}
                  </div>
                </div>

                {/* Visual Bar */}
                <div className="w-32 h-10 bg-slate-700/30 rounded-lg overflow-hidden relative shrink-0">
                  <motion.div
                    className={`h-full rounded-lg ${rankStyle.barClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(barWidth, 3)}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                  {isWinner && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 3 }}
                    />
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Show more indicator */}
        {isCompact && rankedItems.length > 6 && (
          <div className="text-center mt-4 text-base text-white/40">
            +{rankedItems.length - 6} more categories
          </div>
        )}
      </div>

      {/* Coverage Warning */}
      {dimension && dimension.coverage < 0.2 && (
        <div className="px-4 py-3 border-t border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={14} />
            <span className="text-sm">Low coverage ({formatPercentage(dimension.coverage * 100, 0)}) — results may not be representative</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function FirmographicInsightsPanel({ data, loading, error }: FirmographicInsightsPanelProps) {
  const [selectedDimensions, setSelectedDimensions] = useState<Set<DimensionKey>>(new Set())

  if (loading) {
    return (
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-10">
        <div className="flex items-center justify-center gap-4">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-mono text-white/40">LOADING FIRMOGRAPHIC DATA...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-900/80 rounded-2xl border border-red-500/30 p-10">
        <div className="flex items-center gap-4 text-red-400">
          <AlertTriangle size={24} />
          <span className="text-lg font-mono text-white">{error}</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const dimensions: DimensionKey[] = ['industry', 'revenue', 'employees', 'geography', 'signals']

  const handleTabClick = (key: DimensionKey) => {
    setSelectedDimensions(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectedArray = Array.from(selectedDimensions)
  const isCompact = selectedArray.length > 1

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Target size={26} className="text-emerald-500" />
          <h2 className="text-2xl font-bold text-white tracking-wide">FIRMOGRAPHIC ANALYSIS</h2>
        </div>
        <span className="text-sm font-mono text-white/30 tracking-wider">
          {selectedArray.length > 0 
            ? `${selectedArray.length} SELECTED — CLICK TO COMPARE` 
            : 'SELECT DIMENSIONS TO ANALYZE'
          }
        </span>
      </div>

      {/* Large Dimension Tabs */}
      <motion.div 
        className="flex gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
        }}
      >
        {dimensions.map((key, index) => (
          <DimensionTab
            key={key}
            dimensionKey={key}
            dimension={data[key]}
            isSelected={selectedDimensions.has(key)}
            onClick={() => handleTabClick(key)}
            index={index}
          />
        ))}
      </motion.div>

      {/* Expanded Panels - Side by Side */}
      <AnimatePresence mode="sync">
        {selectedArray.length > 0 && (
          <motion.div 
            className={`flex gap-4 ${isCompact ? 'flex-wrap' : ''}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {selectedArray.map((key) => (
              <DetailedMetricsPanel
                key={key}
                dimensionKey={key}
                dimension={data[key]}
                onClose={() => handleTabClick(key)}
                isCompact={isCompact}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend - only show when panels are open */}
      <AnimatePresence>
        {selectedArray.length > 0 && (
          <motion.div 
            className="flex items-center justify-center gap-10 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <span className="text-sm text-white/50">Top 25% (Winners)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-amber-500/60 to-amber-400/40" />
              <span className="text-sm text-white/50">Middle 50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-red-500 to-red-400" />
              <span className="text-sm text-white/50">Bottom 25% (Losers)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
