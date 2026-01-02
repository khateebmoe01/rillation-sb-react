import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis,
} from 'recharts'
import type { DimensionInsight } from '../../hooks/useFirmographicInsights'

interface DimensionComparisonChartProps {
  xDimension: DimensionInsight
  yDimension: DimensionInsight
  xLabel: string
  yLabel: string
  metric: 'replyRate' | 'positiveRate' | 'bookingRate'
  onMetricChange: (metric: 'replyRate' | 'positiveRate' | 'bookingRate') => void
  onLock?: () => void
  isLocked?: boolean
}

const METRIC_CONFIG = {
  replyRate: { label: 'Reply Rate', key: 'positive' as const }, // Using positive as closest proxy
  positiveRate: { label: 'Positive Rate', key: 'positive' as const },
  bookingRate: { label: 'Booking Rate', key: 'booked' as const },
}

// Generate combined data for scatter chart
function generateCombinedData(
  xDimension: DimensionInsight,
  yDimension: DimensionInsight,
  metric: 'replyRate' | 'positiveRate' | 'bookingRate'
) {
  const dataPoints: {
    xValue: string
    yValue: string
    xRate: number
    yRate: number
    size: number
    color: string
  }[] = []

  const metricKey = METRIC_CONFIG[metric].key

  // Take top 8 from each dimension to avoid overcrowding
  const xItems = xDimension.items.slice(0, 8)
  const yItems = yDimension.items.slice(0, 8)

  // Helper to get metric value safely
  const getMetricValue = (item: { positive: number; booked: number }, key: 'positive' | 'booked'): number => {
    return item[key] || 0
  }

  xItems.forEach(xItem => {
    const xRate = xItem.leadsIn > 0 ? (getMetricValue(xItem, metricKey) / xItem.leadsIn) * 100 : 0
    
    yItems.forEach(yItem => {
      const yRate = yItem.leadsIn > 0 ? (getMetricValue(yItem, metricKey) / yItem.leadsIn) * 100 : 0
      
      // Combined score for color intensity
      const avgRate = (xRate + yRate) / 2
      const color = avgRate > 5 ? '#22c55e' : avgRate > 2 ? '#f59e0b' : '#ef4444'
      
      // Size based on total leads
      const totalLeads = xItem.leadsIn + yItem.leadsIn
      const size = Math.min(Math.max(totalLeads / 10, 5), 30)

      dataPoints.push({
        xValue: xItem.value,
        yValue: yItem.value,
        xRate,
        yRate,
        size,
        color,
      })
    })
  })

  return dataPoints
}

// Custom tooltip for scatter chart
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <div className="text-xs text-slate-400 mb-1">Combination</div>
        <div className="text-sm font-medium text-white mb-2">
          {data.xValue} × {data.yValue}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">X Rate:</span>
            <span className="text-white font-mono">{data.xRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Y Rate:</span>
            <span className="text-white font-mono">{data.yRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function DimensionComparisonChart({
  xDimension,
  yDimension,
  xLabel,
  yLabel,
  metric,
  onMetricChange,
  onLock,
  isLocked,
}: DimensionComparisonChartProps) {
  const data = useMemo(
    () => generateCombinedData(xDimension, yDimension, metric),
    [xDimension, yDimension, metric]
  )

  // Get unique values for axes
  const xValues = useMemo(() => 
    [...new Set(data.map(d => d.xValue))],
    [data]
  )
  const yValues = useMemo(() => 
    [...new Set(data.map(d => d.yValue))],
    [data]
  )

  // Convert categorical to numerical for scatter
  const scatterData = useMemo(() => 
    data.map(d => ({
      ...d,
      x: xValues.indexOf(d.xValue),
      y: yValues.indexOf(d.yValue),
    })),
    [data, xValues, yValues]
  )

  return (
    <motion.div
      className={`bg-slate-900/80 rounded-xl border ${isLocked ? 'border-violet-500/50' : 'border-slate-700/60'} p-5`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">
            {xLabel} vs {yLabel}
          </h3>
          {isLocked && (
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-medium">
              Locked
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Metric selector */}
          <div className="flex gap-1">
            {(['replyRate', 'positiveRate', 'bookingRate'] as const).map((m) => (
              <motion.button
                key={m}
                onClick={() => onMetricChange(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  metric === m
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {METRIC_CONFIG[m].label}
              </motion.button>
            ))}
          </div>
          
          {/* Lock button */}
          {onLock && (
            <motion.button
              onClick={onLock}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isLocked
                  ? 'bg-violet-600/30 text-violet-300'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLocked ? '🔒 Locked' : '🔓 Lock'}
            </motion.button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, xValues.length - 0.5]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(value) => xValues[Math.round(value)]?.slice(0, 12) || ''}
              tickLine={{ stroke: '#334155' }}
              axisLine={{ stroke: '#334155' }}
              angle={-45}
              textAnchor="end"
              height={60}
              label={{ 
                value: xLabel, 
                position: 'bottom', 
                offset: 40,
                style: { fill: '#94a3b8', fontSize: 12 }
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-0.5, yValues.length - 0.5]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(value) => yValues[Math.round(value)]?.slice(0, 15) || ''}
              tickLine={{ stroke: '#334155' }}
              axisLine={{ stroke: '#334155' }}
              width={80}
              label={{ 
                value: yLabel, 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#94a3b8', fontSize: 12 }
              }}
            />
            <ZAxis type="number" dataKey="size" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-400">High ({'>'}5%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-400">Medium (2-5%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400">Low ({'<'}2%)</span>
        </div>
      </div>
    </motion.div>
  )
}

