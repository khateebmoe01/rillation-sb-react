import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '../../types/database'

interface TrendChartProps {
  data: ChartDataPoint[]
  selectedMetric?: 'sent' | 'prospects' | 'replied' | 'positiveReplies' | 'meetings' | null
  targets?: {
    emailsTarget: number
    prospectsTarget: number
    repliesTarget: number
    meetingsTarget: number
  }
  metrics?: {
    totalEmailsSent: number
    uniqueProspects: number
    realReplies: number
    positiveReplies: number
    meetingsBooked: number
  }
}

const METRIC_CONFIG = {
  sent: { label: 'Emails Sent', dataKey: 'sent', yAxisId: 'left', targetKey: 'emailsTarget', metricKey: 'totalEmailsSent' },
  prospects: { label: 'Unique Prospects', dataKey: 'prospects', yAxisId: 'left', targetKey: 'prospectsTarget', metricKey: 'uniqueProspects' },
  replied: { label: 'Replied', dataKey: 'replied', yAxisId: 'right', targetKey: 'repliesTarget', metricKey: 'realReplies' },
  positiveReplies: { label: 'Interested', dataKey: 'positiveReplies', yAxisId: 'right', targetKey: 'repliesTarget', metricKey: 'positiveReplies' },
  meetings: { label: 'Meetings', dataKey: 'meetings', yAxisId: 'right', targetKey: 'meetingsTarget', metricKey: 'meetingsBooked' },
}

// Helper function to get color hex based on target performance
function getTargetColorHex(actual: number, target: number): string {
  if (target === 0) return '#ffffff'
  const percentage = (actual / target) * 100
  if (percentage >= 100) return '#22c55e' // green
  if (percentage >= 50) return '#eab308' // yellow
  return '#ef4444' // red
}

export default function TrendChart({ data, selectedMetric, targets, metrics }: TrendChartProps) {
  // Calculate daily targets for target lines
  const chartDataWithTargets = useMemo(() => {
    if (!targets || data.length === 0) return data
    
    const numDays = data.length
    const dailyEmailsTarget = targets.emailsTarget / numDays
    const dailyProspectsTarget = targets.prospectsTarget / numDays
    const dailyRepliesTarget = targets.repliesTarget / numDays
    const dailyMeetingsTarget = targets.meetingsTarget / numDays
    
    return data.map(point => ({
      ...point,
      sentTarget: dailyEmailsTarget,
      prospectsTarget: dailyProspectsTarget,
      repliedTarget: dailyRepliesTarget,
      positiveRepliesTarget: dailyRepliesTarget,
      meetingsTarget: dailyMeetingsTarget,
    }))
  }, [data, targets])

  // Get line color based on selected metric and targets
  const getLineColor = (metric: keyof typeof METRIC_CONFIG): string => {
    if (!metrics || !targets) return '#ffffff'
    
    const config = METRIC_CONFIG[metric]
    const actual = metrics[config.metricKey as keyof typeof metrics] as number
    const target = targets[config.targetKey as keyof typeof targets] as number
    
    return getTargetColorHex(actual, target)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-slate-300 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <motion.div 
      className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMetric || 'all'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartDataWithTargets} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#64748b" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(value) => value.toLocaleString()}
                width={50}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                stroke="#64748b" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={{ stroke: '#334155' }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Single metric mode */}
              {selectedMetric && METRIC_CONFIG[selectedMetric] && (
                <>
                  <Line
                    yAxisId={METRIC_CONFIG[selectedMetric].yAxisId}
                    type="monotone"
                    dataKey={METRIC_CONFIG[selectedMetric].dataKey}
                    name={METRIC_CONFIG[selectedMetric].label}
                    stroke={getLineColor(selectedMetric)}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: getLineColor(selectedMetric) }}
                    animationDuration={500}
                  />
                  {/* Target line */}
                  {targets && (
                    <Line
                      yAxisId={METRIC_CONFIG[selectedMetric].yAxisId}
                      type="monotone"
                      dataKey={`${METRIC_CONFIG[selectedMetric].dataKey}Target`}
                      name="Target"
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      animationDuration={500}
                    />
                  )}
                </>
              )}

              {/* Default: show all metrics with distinct colors - no white, red, yellow, green */}
              {!selectedMetric && (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sent"
                    name="Sent"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: '#8b5cf6' }}
                    animationDuration={800}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="prospects"
                    name="Prospects"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#3b82f6' }}
                    animationDuration={800}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="replied"
                    name="Replied"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#06b6d4' }}
                    animationDuration={800}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="positiveReplies"
                    name="Interested"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#f59e0b' }}
                    animationDuration={800}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="meetings"
                    name="Meetings"
                    stroke="#d946ef"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#d946ef' }}
                    animationDuration={800}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-xs">
        {!selectedMetric ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
              <span className="text-white">Sent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-white">Prospects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#06b6d4' }} />
              <span className="text-white">Replied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              <span className="text-white">Interested</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#d946ef' }} />
              <span className="text-white">Meetings</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: getLineColor(selectedMetric) }} 
              />
              <span className="text-white font-medium">
                {METRIC_CONFIG[selectedMetric].label}
              </span>
            </div>
            {targets && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0 border-t-2 border-dashed border-slate-500" />
                <span className="text-white">Target</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
