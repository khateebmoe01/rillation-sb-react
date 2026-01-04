import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { DollarSign, TrendingUp, Target, Briefcase, X, ChevronUp } from 'lucide-react'
import { formatCurrency, formatPercentage } from '../../lib/supabase'
import type { SalesSummary, SalesMetric } from '../../hooks/useSalesMetrics'

interface CompactSalesMetricsProps {
  summary: SalesSummary
  dailyMetrics: SalesMetric[]
}

type MetricType = 'revenue' | 'avgValue' | 'winRate' | 'dealCount' | null

const METRIC_CONFIG = {
  revenue: {
    title: 'Total Revenue',
    icon: DollarSign,
    color: '#22c55e',
    gradient: 'from-green-500/20 to-green-500/5',
    borderColor: 'border-green-500/30',
    dataKey: 'revenue',
    formatter: formatCurrency,
  },
  avgValue: {
    title: 'Avg Deal Value',
    icon: Target,
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-purple-500/5',
    borderColor: 'border-purple-500/30',
    dataKey: 'avgValue',
    formatter: formatCurrency,
  },
  winRate: {
    title: 'Win Rate',
    icon: TrendingUp,
    color: '#06b6d4',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    borderColor: 'border-cyan-500/30',
    dataKey: 'winRate',
    formatter: (val: number) => formatPercentage(val, 1),
  },
  dealCount: {
    title: 'Closed Deals',
    icon: Briefcase,
    color: '#f97316',
    gradient: 'from-orange-500/20 to-orange-500/5',
    borderColor: 'border-orange-500/30',
    dataKey: 'dealCount',
    formatter: (val: number) => val.toLocaleString(),
  },
}

export default function CompactSalesMetrics({ summary, dailyMetrics }: CompactSalesMetricsProps) {
  const [expandedMetric, setExpandedMetric] = useState<MetricType>(null)
  const [hoveredMetric, setHoveredMetric] = useState<MetricType>(null)

  const metrics = [
    { type: 'revenue' as const, value: summary.totalRevenue },
    { type: 'avgValue' as const, value: summary.avgDealValue },
    { type: 'winRate' as const, value: summary.winRate },
    { type: 'dealCount' as const, value: summary.totalDeals, subtitle: `${summary.totalClosedWon} won, ${summary.totalClosedLost} lost` },
  ]

  const handleCardClick = (type: MetricType) => {
    setExpandedMetric(prev => prev === type ? null : type)
  }

  // Sparkline component for mini charts
  const Sparkline = ({ data, dataKey, color }: { data: SalesMetric[], dataKey: string, color: string }) => (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#gradient-${dataKey})`}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  // Expanded chart view
  const ExpandedChart = ({ type }: { type: MetricType }) => {
    if (!type) return null
    const config = METRIC_CONFIG[type]

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-xl">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-bold" style={{ color: config.color }}>
              {config.formatter(payload[0].value)}
            </p>
          </div>
        )
      }
      return null
    }

    return (
      <motion.div
        initial={{ opacity: 0, height: 0, y: -20 }}
        animate={{ opacity: 1, height: 'auto', y: 0 }}
        exit={{ opacity: 0, height: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <div className={`bg-slate-800/60 rounded-xl border ${config.borderColor} p-4 mt-3`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <config.icon size={16} style={{ color: config.color }} />
              {config.title} Trend
            </h4>
            <motion.button
              onClick={() => setExpandedMetric(null)}
              className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={16} />
            </motion.button>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            {type === 'dealCount' ? (
              <BarChart data={dailyMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="dealCount" fill={config.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : type === 'revenue' ? (
              <AreaChart data={dailyMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="expandedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke={config.color} fill="url(#expandedGradient)" strokeWidth={2} />
              </AreaChart>
            ) : (
              <LineChart data={dailyMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(v) => type === 'winRate' ? `${v}%` : `$${(v/1000).toFixed(0)}k`}
                  domain={type === 'winRate' ? [0, 100] : undefined}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey={config.dataKey} stroke={config.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {/* Compact Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric, index) => {
          const config = METRIC_CONFIG[metric.type]
          const isExpanded = expandedMetric === metric.type
          const isHovered = hoveredMetric === metric.type
          const Icon = config.icon

          return (
            <motion.div
              key={metric.type}
              onClick={() => handleCardClick(metric.type)}
              onHoverStart={() => setHoveredMetric(metric.type)}
              onHoverEnd={() => setHoveredMetric(null)}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative overflow-hidden cursor-pointer
                bg-gradient-to-br ${config.gradient} 
                backdrop-blur-sm rounded-xl p-4 
                border ${isExpanded ? config.borderColor : 'border-slate-700/50'}
                ${isExpanded ? 'ring-1 ring-white/20' : ''}
                transition-all duration-300
                hover:border-slate-600
              `}
            >
              {/* Glow effect on hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${config.color}15, transparent 70%)`,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="flex items-center justify-between mb-1 relative z-10">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ color: config.color }}
                  >
                    <Icon size={16} />
                  </motion.div>
                  <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">
                    {config.title}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0, opacity: isHovered || isExpanded ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  className="text-white/50"
                >
                  <ChevronUp size={12} />
                </motion.div>
              </div>

              {/* Value */}
              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <motion.span 
                    className="text-xl font-bold text-white block"
                    animate={{ scale: isHovered ? 1.02 : 1 }}
                  >
                    {config.formatter(metric.value)}
                  </motion.span>
                  {metric.subtitle && (
                    <span className="text-[10px] text-white/50">{metric.subtitle}</span>
                  )}
                </div>
              </div>

              {/* Mini Sparkline */}
              <div className="mt-2 relative z-10 opacity-70">
                <Sparkline 
                  data={dailyMetrics} 
                  dataKey={config.dataKey} 
                  color={config.color} 
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Expanded Chart View */}
      <AnimatePresence mode="wait">
        {expandedMetric && (
          <ExpandedChart type={expandedMetric} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}



