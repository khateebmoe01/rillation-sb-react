import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
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
  X,
  Sparkles,
  Expand,
  CheckCircle,
  MessageSquare
} from 'lucide-react'
import { formatPercentage } from '../../lib/supabase'
import type { FirmographicInsightsData, FirmographicDimensionData } from '../../hooks/useFirmographicInsights'
import DimensionComparisonChart from './DimensionComparisonChart'
import { useAI } from '../../contexts/AIContext'

interface FirmographicInsightsPanelProps {
  data: FirmographicInsightsData | null
  loading: boolean
  error: string | null
}

type DimensionKey = 'industry' | 'revenue' | 'employees' | 'geography' | 'signals' | 'jobTitle' | 'technologies' | 'companyMaturity' | 'fundingStatus'

const DIMENSION_CONFIG: Record<DimensionKey, { 
  label: string
  shortLabel: string
  icon: typeof Building2
  color: string
  barColor: string
  glowColor: string
}> = {
  industry: { 
    label: 'INDUSTRY', 
    shortLabel: 'Industry',
    icon: Building2,
    color: 'text-violet-400',
    barColor: 'bg-violet-500',
    glowColor: 'rgba(139, 92, 246, 0.4)'
  },
  revenue: { 
    label: 'REVENUE RANGE', 
    shortLabel: 'Revenue',
    icon: DollarSign,
    color: 'text-emerald-400',
    barColor: 'bg-emerald-500',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  },
  employees: { 
    label: 'EMPLOYEE COUNT', 
    shortLabel: 'Employees',
    icon: Users,
    color: 'text-blue-400',
    barColor: 'bg-blue-500',
    glowColor: 'rgba(59, 130, 246, 0.4)'
  },
  geography: { 
    label: 'GEOGRAPHY', 
    shortLabel: 'Geography',
    icon: MapPin,
    color: 'text-amber-400',
    barColor: 'bg-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  },
  signals: { 
    label: 'SIGNALS', 
    shortLabel: 'Signals',
    icon: Zap,
    color: 'text-rose-400',
    barColor: 'bg-rose-500',
    glowColor: 'rgba(244, 63, 94, 0.4)'
  },
  jobTitle: { 
    label: 'JOB TITLE', 
    shortLabel: 'Job Title',
    icon: Users,
    color: 'text-cyan-400',
    barColor: 'bg-cyan-500',
    glowColor: 'rgba(34, 211, 238, 0.4)'
  },
  technologies: { 
    label: 'TECHNOLOGIES', 
    shortLabel: 'Tech',
    icon: Zap,
    color: 'text-orange-400',
    barColor: 'bg-orange-500',
    glowColor: 'rgba(251, 146, 60, 0.4)'
  },
  companyMaturity: { 
    label: 'COMPANY MATURITY', 
    shortLabel: 'Maturity',
    icon: Building2,
    color: 'text-pink-400',
    barColor: 'bg-pink-500',
    glowColor: 'rgba(236, 72, 153, 0.4)'
  },
  fundingStatus: { 
    label: 'FUNDING STATUS', 
    shortLabel: 'Funding',
    icon: DollarSign,
    color: 'text-teal-400',
    barColor: 'bg-teal-500',
    glowColor: 'rgba(20, 184, 166, 0.4)'
  },
}

// Animated number counter component
function AnimatedCounter({ value, suffix = '', duration = 0.8 }: { value: number; suffix?: string; duration?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: 'easeOut' })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, count, rounded, duration])

  return <>{displayValue}{suffix}</>
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

// Dimension Card Component with top-3 preview
function DimensionTab({
  dimensionKey,
  dimension,
  selectionIndex,
  isLocked,
  onSelect,
  onExpand,
  onAskAI,
  index
}: {
  dimensionKey: DimensionKey
  dimension: FirmographicDimensionData | undefined
  selectionIndex: number | null // null = not selected, 1 or 2 = selection order
  isLocked: boolean
  onSelect: () => void
  onExpand: () => void
  onAskAI: () => void
  index: number
}) {
  const config = DIMENSION_CONFIG[dimensionKey]
  const Icon = config.icon
  const hasNoData = !dimension || dimension.items.length === 0
  const isSelected = selectionIndex !== null
  
  // Get top 3 items by booking conversion rate
  const top3Items = useMemo(() => {
    if (!dimension || dimension.items.length === 0) return []
    return [...dimension.items]
      .filter(item => item.leadsIn > 0)
      .sort((a, b) => (b.booked / b.leadsIn) - (a.booked / a.leadsIn))
      .slice(0, 3)
  }, [dimension])

  // Handle card click for comparison selection
  const handleCardClick = () => {
    // Always allow selection - if 2 are selected, clicking a 3rd will swap
    onSelect()
  }

  return (
    <motion.div
      onClick={handleCardClick}
      className={`
        relative w-full flex flex-col p-5 rounded-xl border-2 text-left overflow-hidden cursor-pointer
        ${isSelected 
          ? 'bg-slate-800 border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
          : 'bg-slate-800/40 border-slate-700/50 hover:border-white/50'
        }
      `}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ 
        delay: index * 0.05, 
        type: 'spring', 
        stiffness: 300, 
        damping: 25 
      }}
    >
      {/* Animated background gradient on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${config.glowColor} 0%, transparent 60%)`
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div 
            className={`p-2 rounded-lg bg-slate-700/60 ${config.color}`}
          >
            <Icon size={18} />
          </motion.div>
          <span className="text-sm font-bold text-white uppercase tracking-wide">
            {config.shortLabel}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Selection number badge */}
          <AnimatePresence>
            {selectionIndex !== null && (
              <motion.div
                className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {selectionIndex}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Status indicator - clicking the card handles selection */}
          <motion.div
            className={`px-2 py-1 rounded-lg text-xs font-medium pointer-events-none ${
              isSelected
                ? 'bg-slate-400/30 text-slate-200 border border-slate-400/50'
                : 'bg-slate-700/50 text-white/60'
            }`}
          >
            {isSelected ? 'Selected' : isLocked ? 'Click to swap' : 'Click to compare'}
          </motion.div>
          
          {/* Ask AI button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onAskAI()
            }}
            className="p-1.5 rounded bg-black/60 border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Ask AI about this dimension"
          >
            <MessageSquare size={12} />
          </motion.button>
          
          {/* Expand button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
            className="p-1.5 rounded-lg bg-slate-700/50 text-white hover:bg-slate-600/50 transition-all"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="View all categories"
          >
            <Expand size={14} />
          </motion.button>
        </div>
      </div>

      {/* Top 3 Preview */}
      {hasNoData ? (
        <motion.div 
          className="text-sm text-white/30 py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.2 }}
        >
          No data available
        </motion.div>
      ) : (
        <div className="relative space-y-2">
          {top3Items.map((item, idx) => {
            const bookingRate = item.leadsIn > 0 ? (item.booked / item.leadsIn) : 0
            const rankStyle = getRankingStyle(idx, dimension?.items.length || 3)
            
            return (
              <motion.div 
                key={item.value} 
                className="flex items-center justify-between gap-2 group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + idx * 0.08 + 0.15 }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <motion.span 
                    className={`text-xs font-bold w-5 text-center ${rankStyle.textClass}`}
                  >
                    #{idx + 1}
                  </motion.span>
                  <span className="text-sm text-white truncate group-hover:text-white/90 transition-colors" title={item.value}>
                    {item.value}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-mono font-bold ${rankStyle.textClass}`}>
                    {formatPercentage(bookingRate * 100, 0)}
                  </span>
                  <span className="text-xs text-white/40">
                    ({item.booked}/{item.leadsIn})
                  </span>
                </div>
              </motion.div>
            )
          })}
          
          {dimension && dimension.items.length > 3 && (
            <motion.div 
              className="text-xs text-white/40 text-center pt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.4 }}
            >
              +{dimension.items.length - 3} more
            </motion.div>
          )}
        </div>
      )}

      {/* Shimmer effect when selected */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Detailed Metrics Modal - centered popup
function DimensionModal({
  dimensionKey,
  dimension,
  onClose,
}: {
  dimensionKey: DimensionKey
  dimension: FirmographicDimensionData | undefined
  onClose: () => void
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

  // Calculate max booking rate for bar scaling
  const maxBookingRate = useMemo(() => {
    if (rankedItems.length === 0) return 1
    return Math.max(...rankedItems.map(item => item.leadsIn > 0 ? item.booked / item.leadsIn : 0), 0.01)
  }, [rankedItems])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <motion.div
        className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Glow effect at top */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${config.glowColor} 0%, transparent 70%)`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.2 }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-slate-700/40">
          <div className="flex items-center gap-4">
            <motion.div 
              className={`p-3 rounded-xl bg-slate-700/50 ${config.color}`}
              animate={{ 
                boxShadow: [
                  `0 0 0px ${config.glowColor}`,
                  `0 0 20px ${config.glowColor}`,
                  `0 0 0px ${config.glowColor}`
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icon size={24} />
            </motion.div>
            <div>
              <motion.h3 
                className="text-xl font-bold text-white"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {config.label}
              </motion.h3>
              <motion.p 
                className="text-sm text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {totalItems} categories ranked by booking rate
              </motion.p>
            </div>
          </div>

          <motion.button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <X size={20} className="text-white" />
          </motion.button>
        </div>

        {/* Table Header */}
        <motion.div 
          className="relative px-6 py-3 border-b border-slate-700/30 bg-slate-800/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-6">
            <div className="w-12 shrink-0" />
            <div className="flex-1 min-w-[180px] text-left">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Category</span>
            </div>
            <div className="w-20 text-center shrink-0">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Leads</span>
            </div>
            <div className="w-20 text-center shrink-0">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Replied</span>
            </div>
            <div className="w-20 text-center shrink-0">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Engaged</span>
            </div>
            <div className="w-20 text-center shrink-0">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Booked</span>
            </div>
            <div className="w-28 shrink-0">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Rate</span>
            </div>
          </div>
        </motion.div>

        {/* Data Rows */}
        <div className="relative px-6 py-4 max-h-[60vh] overflow-y-auto">
          <motion.div 
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1, 
                transition: { 
                  staggerChildren: 0.03, 
                  delayChildren: 0.1 
                } 
              }
            }}
          >
            {rankedItems.map((item, idx) => {
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
                  className={`relative flex items-center gap-6 px-4 py-3 rounded-xl border transition-all ${rankStyle.bgClass}`}
                  variants={{
                    hidden: { opacity: 0, x: -20, scale: 0.98 },
                    visible: { opacity: 1, x: 0, scale: 1 }
                  }}
                  whileHover={{ 
                    scale: 1.01, 
                    x: 4,
                    boxShadow: isWinner ? '0 0 30px rgba(16, 185, 129, 0.3)' : undefined,
                    transition: { duration: 0.2 }
                  }}
                >
                  {/* Winner sparkle effect */}
                  {isWinner && (
                    <motion.div
                      className="absolute -top-1 -right-1"
                      animate={{ 
                        rotate: [0, 15, -15, 0],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles size={14} className="text-emerald-400" />
                    </motion.div>
                  )}

                  {/* Rank Badge */}
                  <motion.div 
                    className={`w-12 h-10 flex items-center justify-center rounded-lg font-bold text-sm shrink-0 ${
                      isWinner 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : isLoser 
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {isWinner ? (
                      <Trophy size={18} />
                    ) : isLoser ? (
                      <TrendingDown size={18} />
                    ) : (
                      `#${idx + 1}`
                    )}
                  </motion.div>

                  {/* Category Name */}
                  <div className="flex-1 min-w-[180px]">
                    <span className={`text-base font-semibold ${rankStyle.textClass}`} title={item.value}>
                      {item.value}
                    </span>
                  </div>

                  {/* Leads */}
                  <div className="w-20 text-center shrink-0">
                    <span className="text-base font-bold font-mono text-white">
                      <AnimatedCounter value={item.leadsIn} duration={0.6} />
                    </span>
                  </div>

                  {/* Replied / Leads */}
                  <div className="w-20 text-center shrink-0">
                    <div className="text-base font-bold font-mono text-blue-400">
                      {formatPercentage(repliedRate * 100, 0)}
                    </div>
                    <div className="text-xs text-white/40">
                      {item.engaged}/{item.leadsIn}
                    </div>
                  </div>

                  {/* Engaged / Leads */}
                  <div className="w-20 text-center shrink-0">
                    <div className="text-base font-bold font-mono text-amber-400">
                      {formatPercentage(engagedRate * 100, 0)}
                    </div>
                    <div className="text-xs text-white/40">
                      {item.positive}/{item.leadsIn}
                    </div>
                  </div>

                  {/* Booked / Leads */}
                  <div className="w-20 text-center shrink-0">
                    <div className={`text-base font-bold font-mono ${rankStyle.textClass}`}>
                      {formatPercentage(bookedRate * 100, 0)}
                    </div>
                    <div className="text-xs text-white/40">
                      {item.booked}/{item.leadsIn}
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-28 h-8 bg-slate-700/30 rounded-lg overflow-hidden relative shrink-0">
                    <motion.div
                      className={`h-full rounded-lg ${rankStyle.barClass}`}
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: `${Math.max(barWidth, 3)}%`, opacity: 1 }}
                      transition={{ 
                        duration: 0.8, 
                        delay: idx * 0.03, 
                        ease: [0.25, 0.46, 0.45, 0.94] 
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Coverage Warning */}
        {dimension && dimension.coverage < 0.2 && (
          <motion.div 
            className="px-6 py-3 border-t border-red-500/20 bg-red-500/5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 text-red-400">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <AlertTriangle size={14} />
              </motion.div>
              <span className="text-sm">Low coverage ({formatPercentage(dimension.coverage * 100, 0)}) — results may not be representative</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function FirmographicInsightsPanel({ data, loading, error }: FirmographicInsightsPanelProps) {
  const { askAboutChart } = useAI()
  
  // Selection state: ordered array of max 2 dimension keys
  const [selectedDimensions, setSelectedDimensions] = useState<DimensionKey[]>([])
  const [comparisonMetric, setComparisonMetric] = useState<'replyRate' | 'positiveRate' | 'bookingRate'>('bookingRate')
  const [lockedCharts, setLockedCharts] = useState<Array<{ x: DimensionKey; y: DimensionKey; metric: 'replyRate' | 'positiveRate' | 'bookingRate' }>>([])
  
  // Modal state for expanded dimension view
  const [expandedDimension, setExpandedDimension] = useState<DimensionKey | null>(null)

  // Handle asking AI about a dimension
  const handleAskAI = useCallback((key: DimensionKey) => {
    const dimension = data?.[key]
    if (!dimension) return
    
    const config = DIMENSION_CONFIG[key]
    askAboutChart({
      chartTitle: `${config.label} Performance`,
      chartType: 'firmographic-dimension',
      data: dimension.items,
    }, `Analyze the ${config.shortLabel} performance data. Which ${config.shortLabel.toLowerCase()} segments are performing best and worst? What recommendations do you have?`)
  }, [data, askAboutChart])

  // Handle dimension selection for comparison (max 2)
  const handleDimensionSelect = useCallback((key: DimensionKey) => {
    setSelectedDimensions(prev => {
      const existingIndex = prev.indexOf(key)
      if (existingIndex !== -1) {
        // Already selected, remove it
        return prev.filter(k => k !== key)
      } else if (prev.length < 2) {
        // Add if we have room
        return [...prev, key]
      }
      // If already have 2, replace the second one
      return [prev[0], key]
    })
  }, [])

  // Get selection index for a dimension (1, 2, or null)
  const getSelectionIndex = useCallback((key: DimensionKey): number | null => {
    const idx = selectedDimensions.indexOf(key)
    return idx === -1 ? null : idx + 1
  }, [selectedDimensions])

  // Check if selection is locked (2 items selected)
  const isLocked = selectedDimensions.length >= 2

  if (loading) {
    return (
      <motion.div 
        className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <motion.div 
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-12 h-12 border-3 border-emerald-500/20 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full" />
          </motion.div>
          <motion.span 
            className="text-lg font-mono text-white"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            LOADING FIRMOGRAPHIC DATA...
          </motion.span>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div 
        className="bg-slate-900/80 rounded-2xl border border-red-500/30 p-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center gap-4 text-red-400">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <AlertTriangle size={24} />
          </motion.div>
          <span className="text-lg font-mono text-white">{error}</span>
        </div>
      </motion.div>
    )
  }

  if (!data) {
    return null
  }

  const dimensions: DimensionKey[] = ['industry', 'revenue', 'employees', 'geography', 'jobTitle', 'technologies', 'companyMaturity', 'fundingStatus', 'signals']

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Section Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Target size={26} className="text-emerald-500" />
          </motion.div>
          <motion.h2 
            className="text-2xl font-bold text-white tracking-wide"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            DEEP INSIGHTS
          </motion.h2>
        </div>
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Selection status */}
          <AnimatePresence mode="wait">
            <motion.span
              key={selectedDimensions.length}
              className="text-sm font-mono text-white tracking-wider"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {selectedDimensions.length} SELECTED — COMPARE UP TO 2
            </motion.span>
          </AnimatePresence>
          
          {/* Selection info */}
          {selectedDimensions.length === 2 && (
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle size={12} />
              Comparing
            </motion.div>
          )}
          
          {/* Clear selection */}
          {selectedDimensions.length > 0 && (
            <motion.button
              onClick={() => setSelectedDimensions([])}
              className="text-xs text-white hover:text-white transition-colors underline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Clear
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* Dimension Cards - 3 per row with top-3 preview */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1, 
            transition: { 
              staggerChildren: 0.06,
              delayChildren: 0.2
            } 
          }
        }}
      >
        {dimensions.map((key, index) => (
          <DimensionTab
            key={key}
            dimensionKey={key}
            dimension={data[key]}
            selectionIndex={getSelectionIndex(key)}
            isLocked={isLocked}
            onSelect={() => handleDimensionSelect(key)}
            onExpand={() => setExpandedDimension(key)}
            onAskAI={() => handleAskAI(key)}
            index={index}
          />
        ))}
      </motion.div>

      {/* 2D Comparison Chart - appears when exactly 2 dimensions are selected */}
      <AnimatePresence>
        {selectedDimensions.length === 2 && data && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
          >
            <DimensionComparisonChart
              xDimension={data[selectedDimensions[0]]}
              yDimension={data[selectedDimensions[1]]}
              xLabel={DIMENSION_CONFIG[selectedDimensions[0]].shortLabel}
              yLabel={DIMENSION_CONFIG[selectedDimensions[1]].shortLabel}
              metric={comparisonMetric}
              onMetricChange={setComparisonMetric}
              onLock={() => {
                const newLocked = {
                  x: selectedDimensions[0],
                  y: selectedDimensions[1],
                  metric: comparisonMetric,
                }
                setLockedCharts(prev => [...prev, newLocked])
                // Clear selection so user can select next two dimensions
                setSelectedDimensions([])
              }}
              isLocked={lockedCharts.some(
                lc => lc.x === selectedDimensions[0] && lc.y === selectedDimensions[1]
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked comparison charts */}
      <AnimatePresence>
        {lockedCharts.length > 0 && data && (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center justify-between">
              <motion.h3 
                className="text-sm font-semibold text-white"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                Locked Comparisons
              </motion.h3>
              <motion.button
                onClick={() => setLockedCharts([])}
                className="text-xs text-white hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear all
              </motion.button>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {lockedCharts.map((chart, idx) => (
                <motion.div
                  key={`${chart.x}-${chart.y}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <DimensionComparisonChart
                    xDimension={data[chart.x]}
                    yDimension={data[chart.y]}
                    xLabel={DIMENSION_CONFIG[chart.x].shortLabel}
                    yLabel={DIMENSION_CONFIG[chart.y].shortLabel}
                    metric={chart.metric}
                    onMetricChange={(m) => {
                      setLockedCharts(prev => 
                        prev.map((c, i) => i === idx ? { ...c, metric: m } : c)
                      )
                    }}
                    isLocked={true}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend - only show when comparison chart is visible */}
      <AnimatePresence>
        {selectedDimensions.length === 2 && (
          <motion.div 
            className="flex items-center justify-center gap-10 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
          >
            {[
              { color: 'from-emerald-500 to-emerald-400', label: 'Top 25% (Winners)' },
              { color: 'from-amber-500/60 to-amber-400/40', label: 'Middle 50%' },
              { color: 'from-red-500 to-red-400', label: 'Bottom 25% (Losers)' }
            ].map((item, idx) => (
              <motion.div 
                key={item.label}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <div className={`w-5 h-5 rounded bg-gradient-to-r ${item.color}`} />
                <span className="text-sm text-white">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dimension Detail Modal */}
      <AnimatePresence>
        {expandedDimension && data[expandedDimension] && (
          <DimensionModal
            dimensionKey={expandedDimension}
            dimension={data[expandedDimension]}
            onClose={() => setExpandedDimension(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
