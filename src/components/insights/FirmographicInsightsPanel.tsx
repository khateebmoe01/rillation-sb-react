import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building, DollarSign, Users, MapPin, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import type { FirmographicInsightsData, FirmographicItem } from '../../hooks/useFirmographicInsights'

interface FirmographicInsightsPanelProps {
  data: FirmographicInsightsData | null
  loading: boolean
  error: string | null
}

type DimensionKey = 'industry' | 'revenue' | 'employees' | 'geography' | 'signals'
type SortKey = 'leadsIn' | 'conversionRate' | 'value'

const DIMENSION_CONFIG: Record<DimensionKey, { label: string; icon: React.ReactNode; minCoverage: number }> = {
  industry: { label: 'Industry', icon: <Building size={18} />, minCoverage: 0.2 },
  revenue: { label: 'Revenue Range', icon: <DollarSign size={18} />, minCoverage: 0.2 },
  employees: { label: 'Employee Count', icon: <Users size={18} />, minCoverage: 0.2 },
  geography: { label: 'Geography', icon: <MapPin size={18} />, minCoverage: 0.2 },
  signals: { label: 'Signals', icon: <Zap size={18} />, minCoverage: 0.2 },
}

export default function FirmographicInsightsPanel({ data, loading, error }: FirmographicInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<DimensionKey>('industry')
  const [sortBy, setSortBy] = useState<SortKey>('leadsIn')
  const [isExpanded, setIsExpanded] = useState(true)

  // Get current dimension data
  const currentDimension = data ? data[activeTab] : null

  // Calculate average conversion rate for color coding
  const avgConversionRate = useMemo(() => {
    if (!currentDimension || currentDimension.items.length === 0) return 0
    const total = currentDimension.items.reduce((sum, item) => sum + item.conversionRate, 0)
    return total / currentDimension.items.length
  }, [currentDimension])

  // Sort items
  const sortedItems = useMemo(() => {
    if (!currentDimension) return []
    
    const items = [...currentDimension.items]
    items.sort((a, b) => {
      switch (sortBy) {
        case 'leadsIn':
          return b.leadsIn - a.leadsIn
        case 'conversionRate':
          return b.conversionRate - a.conversionRate
        case 'value':
          return a.value.localeCompare(b.value)
        default:
          return 0
      }
    })
    return items
  }, [currentDimension, sortBy])

  // Get performance color
  const getPerformanceColor = (conversionRate: number): string => {
    if (avgConversionRate === 0) return 'text-rillation-text'
    const ratio = conversionRate / avgConversionRate
    if (ratio > 1.2) return 'text-rillation-green'
    if (ratio < 0.8) return 'text-rillation-red'
    return 'text-rillation-text'
  }

  // Get performance background color for bars
  const getPerformanceBgColor = (conversionRate: number): string => {
    if (avgConversionRate === 0) return 'bg-rillation-text'
    const ratio = conversionRate / avgConversionRate
    if (ratio > 1.2) return 'bg-rillation-green'
    if (ratio < 0.8) return 'bg-rillation-red'
    return 'bg-rillation-text'
  }

  if (loading) {
    return (
      <motion.div
        className="bg-rillation-card rounded-xl border border-rillation-border p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-rillation-text border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        className="bg-rillation-card rounded-xl border border-red-500/30 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      </motion.div>
    )
  }

  if (!data) {
    return null
  }

  const config = DIMENSION_CONFIG[activeTab]
  const hasLowCoverage = currentDimension && currentDimension.coverage < config.minCoverage

  return (
    <motion.div
      className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-rillation-border/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-rillation-text mb-1">
              Firmographic Analysis
            </h3>
            <p className="text-xs text-rillation-text-muted">
              What went in vs what came out - ratio-based insights
            </p>
          </div>
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-rillation-card-hover transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isExpanded ? (
              <ChevronUp size={20} className="text-rillation-text-muted" />
            ) : (
              <ChevronDown size={20} className="text-rillation-text-muted" />
            )}
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIMENSION_CONFIG) as DimensionKey[]).map((key) => {
            const dimConfig = DIMENSION_CONFIG[key]
            const dimData = data[key]
            const isActive = activeTab === key
            const hasData = dimData && dimData.items.length > 0

            return (
              <motion.button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-rillation-text text-rillation-bg'
                    : 'bg-rillation-card-hover text-rillation-text-muted hover:text-rillation-text'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {dimConfig.icon}
                <span>{dimConfig.label}</span>
                {dimData && (
                  <span className={`text-xs ${isActive ? 'opacity-70' : 'opacity-50'}`}>
                    ({dimData.items.length})
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isExpanded && currentDimension && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="p-5"
          >
            {/* Coverage Indicator */}
            <div className="mb-6 p-4 rounded-lg bg-rillation-bg/50 border border-rillation-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span className="text-sm font-medium text-rillation-text">
                    Data Coverage
                  </span>
                </div>
                <span className={`text-sm font-semibold ${
                  hasLowCoverage ? 'text-rillation-red' : 'text-rillation-text'
                }`}>
                  {formatPercentage(currentDimension.coverage * 100, 1)}
                </span>
              </div>
              <div className="h-2 bg-rillation-bg rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    hasLowCoverage ? 'bg-rillation-red' : 'bg-rillation-text'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentDimension.coverage * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              {hasLowCoverage && (
                <div className="flex items-center gap-2 mt-2 text-xs text-rillation-red">
                  <AlertTriangle size={14} />
                  <span>
                    Low data coverage - results may not be representative
                  </span>
                </div>
              )}
              <div className="mt-2 text-xs text-rillation-text-muted">
                {formatNumber(currentDimension.totalLeadsWithData)} of {formatNumber(currentDimension.totalLeads)} leads have {config.label.toLowerCase()} data
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-rillation-text-muted">Sort by:</span>
              {(['leadsIn', 'conversionRate', 'value'] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`
                    px-3 py-1 rounded text-xs font-medium transition-colors
                    ${sortBy === key
                      ? 'bg-rillation-text text-rillation-bg'
                      : 'bg-rillation-card-hover text-rillation-text-muted hover:text-rillation-text'
                    }
                  `}
                >
                  {key === 'leadsIn' ? 'Leads In' : key === 'conversionRate' ? 'Conversion' : 'Name'}
                </button>
              ))}
            </div>

            {/* Table */}
            {sortedItems.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-3 pb-3 border-b border-rillation-border/50 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                    <div className="col-span-4">{config.label}</div>
                    <div className="col-span-2 text-right">Leads In</div>
                    <div className="col-span-2 text-right">Engaged</div>
                    <div className="col-span-2 text-right">Booked</div>
                    <div className="col-span-2 text-right">Conv. Rate</div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    {sortedItems.map((item, index) => (
                      <motion.div
                        key={item.value}
                        className="grid grid-cols-12 gap-3 py-3 px-1 border-b border-rillation-border/20 hover:bg-rillation-bg/30 transition-colors rounded"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* Dimension Value */}
                        <div className="col-span-4 flex items-center min-w-0">
                          <span className="text-sm font-medium text-rillation-text truncate" title={item.value}>
                            {item.value}
                          </span>
                        </div>

                        {/* Leads In */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div className="text-sm font-semibold text-rillation-text">
                            {formatNumber(item.leadsIn)}
                          </div>
                        </div>

                        {/* Engaged */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div className="text-sm font-semibold text-rillation-text">
                            {formatNumber(item.engaged)}
                          </div>
                          <div className="text-xs text-rillation-text-muted">
                            {formatPercentage(item.engagementRate)}
                          </div>
                        </div>

                        {/* Booked */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div className={`text-sm font-semibold ${getPerformanceColor(item.conversionRate)}`}>
                            {formatNumber(item.booked)}
                          </div>
                        </div>

                        {/* Conversion Rate with Visual Bar */}
                        <div className="col-span-2 flex flex-col items-end justify-center">
                          <div className={`text-xs font-semibold ${getPerformanceColor(item.conversionRate)} mb-1.5`}>
                            {formatPercentage(item.conversionRate)}
                          </div>
                          <div className="w-full max-w-20 h-1.5 bg-rillation-bg rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${getPerformanceBgColor(item.conversionRate)}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(item.conversionRate / 5, 1) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + index * 0.05 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-rillation-text-muted">
                <p className="text-sm">No data available for this dimension</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

