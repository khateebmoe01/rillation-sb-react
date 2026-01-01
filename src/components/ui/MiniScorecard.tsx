import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import type { QuickViewMetrics, ChartDataPoint } from '../../types/database'

interface MiniScorecardProps {
  clientName: string
  metrics: QuickViewMetrics
  chartData: ChartDataPoint[]
  targets?: {
    emailsTarget: number
    prospectsTarget: number
    repliesTarget: number
    interestedTarget?: number
    meetingsTarget: number
  }
  dateRange?: { start: Date; end: Date }
  onClick?: () => void
}

type MetricType = 'sent' | 'prospects' | 'real' | 'interested' | 'meetings' | null

// Helper function to determine color based on target
function getTargetColor(actual: number, target: number): string {
  if (target === 0) return 'text-rillation-text'
  const percentage = (actual / target) * 100
  if (percentage >= 100) return 'text-rillation-green'
  if (percentage >= 50) return 'text-rillation-yellow'
  return 'text-rillation-red'
}

// Helper function to get color hex for charts
function getTargetColorHex(actual: number, target: number): string {
  if (target === 0) return '#ffffff'
  const percentage = (actual / target) * 100
  if (percentage >= 100) return '#22c55e' // green
  if (percentage >= 50) return '#eab308' // yellow
  return '#ef4444' // red
}

export default function MiniScorecard({ clientName, metrics, chartData, targets, dateRange, onClick }: MiniScorecardProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null)

  // Calculate number of days for daily target calculation
  const numDays = useMemo(() => {
    if (!dateRange) return 1
    return Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [dateRange])

  // Calculate daily target averages
  const dailyTargets = useMemo(() => {
    if (!targets) return null
    return {
      emails: targets.emailsTarget / numDays,
      prospects: targets.prospectsTarget / numDays,
      replies: targets.repliesTarget / numDays,
      interested: targets.interestedTarget ? targets.interestedTarget / numDays : null,
      meetings: targets.meetingsTarget / numDays,
    }
  }, [targets, numDays])

  // Transform chart data to include target lines
  const chartDataWithTargets = useMemo(() => {
    if (!dailyTargets) return chartData
    return chartData.map(point => ({
      ...point,
      sentTarget: dailyTargets.emails,
      prospectsTarget: dailyTargets.prospects,
      repliesTarget: dailyTargets.replies,
      interestedTarget: dailyTargets.interested,
      meetingsTarget: dailyTargets.meetings,
    }))
  }, [chartData, dailyTargets])

  // Handle metric click - stop propagation to prevent card click
  const handleMetricClick = (metric: MetricType, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedMetric(selectedMetric === metric ? null : metric)
  }

  // Calculate percentages - reply rates based on contacted prospects (uniqueProspects)
  // This gives accurate conversion rates for the selected month
  const realReplyRate = metrics.uniqueProspects > 0 
    ? (metrics.realReplies / metrics.uniqueProspects) * 100 
    : 0
    
  const positiveRate = metrics.realReplies > 0 
    ? (metrics.positiveReplies / metrics.realReplies) * 100 
    : 0
    
  const bounceRate = metrics.totalEmailsSent > 0 
    ? (metrics.bounces / metrics.totalEmailsSent) * 100 
    : 0
    
  const meetingRate = metrics.positiveReplies > 0 
    ? (metrics.meetingsBooked / metrics.positiveReplies) * 100 
    : 0

  // Mini chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1f2e] border border-[#2a3142] rounded-lg p-2 shadow-xl">
          <p className="text-xs text-slate-300 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl p-6 border border-slate-700/60 bg-gradient-to-b from-slate-900/90 to-slate-900/70 hover:border-rillation-text hover:shadow-xl transition-all group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Deep View Button - appears on hover in top-right */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        className="absolute top-4 right-4 p-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        whileHover={{ scale: 1.1, backgroundColor: '#3a4152', color: '#ffffff' }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.2 }}
        title="View Details"
      >
        <ChevronRight size={16} />
      </motion.button>

      {/* Client Name */}
      <h3 className="text-lg font-semibold text-rillation-text mb-6 pr-10">{clientName}</h3>
      
      {/* Metrics Grid - Horizontal layout, 6 metrics */}
      <div className="grid grid-cols-6 gap-6 mb-6 px-2">
        <div 
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => handleMetricClick('sent', e)}
        >
          <div className={`flex flex-col gap-1.5 ${selectedMetric === 'sent' ? 'ring-2 ring-white ring-opacity-50 rounded p-1' : ''}`}>
            <span className="text-sm font-medium text-white">Sent</span>
            <span className={`text-lg font-bold ${targets ? getTargetColor(metrics.totalEmailsSent, targets.emailsTarget) : 'text-rillation-text'}`}>
              {formatNumber(metrics.totalEmailsSent)}
            </span>
          </div>
        </div>
        <div 
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => handleMetricClick('prospects', e)}
        >
          <div className={`flex flex-col gap-1.5 ${selectedMetric === 'prospects' ? 'ring-2 ring-white ring-opacity-50 rounded p-1' : ''}`}>
            <span className="text-sm font-medium text-white">Prospects</span>
            <span className={`text-lg font-bold ${targets ? getTargetColor(metrics.uniqueProspects, targets.prospectsTarget) : 'text-rillation-text'}`}>
              {formatNumber(metrics.uniqueProspects)}
            </span>
          </div>
        </div>
        <div 
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => handleMetricClick('real', e)}
        >
          <div className={`flex flex-col gap-1.5 ${selectedMetric === 'real' ? 'ring-2 ring-white ring-opacity-50 rounded p-1' : ''}`}>
            <span className="text-sm font-medium text-white">Real Replies</span>
            <span className={`text-lg font-bold ${targets ? getTargetColor(metrics.realReplies, targets.repliesTarget) : 'text-rillation-text'}`}>
              {formatNumber(metrics.realReplies)}
            </span>
            <span className="text-xs text-slate-300">{formatPercentage(realReplyRate)}</span>
          </div>
        </div>
        <div 
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => handleMetricClick('interested', e)}
        >
          <div className={`flex flex-col gap-1.5 ${selectedMetric === 'interested' ? 'ring-2 ring-white ring-opacity-50 rounded p-1' : ''}`}>
            <span className="text-sm font-medium text-white">Interested</span>
            <span className="text-lg font-bold text-rillation-text">
              {formatNumber(metrics.positiveReplies)}
            </span>
            <span className="text-xs text-slate-300">{formatPercentage(positiveRate)}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-white">Bounces</span>
            <span className="text-lg font-bold text-rillation-text">
              {formatNumber(metrics.bounces)}
            </span>
            <span className="text-xs text-slate-300">{formatPercentage(bounceRate)}</span>
          </div>
        </div>
        <div 
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => handleMetricClick('meetings', e)}
        >
          <div className={`flex flex-col gap-1.5 ${selectedMetric === 'meetings' ? 'ring-2 ring-white ring-opacity-50 rounded p-1' : ''}`}>
            <span className="text-sm font-medium text-white">Meetings</span>
            <span className={`text-lg font-bold ${targets ? getTargetColor(metrics.meetingsBooked, targets.meetingsTarget) : 'text-rillation-text'}`}>
              {formatNumber(metrics.meetingsBooked)}
            </span>
            <span className="text-xs text-slate-300">{formatPercentage(meetingRate)}</span>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <AnimatePresence mode="wait">
        <motion.div 
          className="mt-6"
          key={selectedMetric || 'all'}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartDataWithTargets} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
            <XAxis 
              dataKey="date" 
              stroke="#888888" 
              tick={{ fontSize: 9 }}
              tickLine={{ stroke: '#222222' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#888888" 
              tick={{ fontSize: 9 }}
              tickLine={{ stroke: '#222222' }}
              tickFormatter={(value) => value > 0 ? value.toLocaleString() : ''}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="#888888" 
              tick={{ fontSize: 9 }}
              tickLine={{ stroke: '#222222' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {selectedMetric === 'sent' && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sent"
                  name="Sent"
                  stroke={targets ? getTargetColorHex(metrics.totalEmailsSent, targets.emailsTarget) : '#ffffff'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationBegin={0}
                  animationDuration={800}
                  isAnimationActive={true}
                />
                {dailyTargets && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sentTarget"
                    name="Sent Target"
                    stroke="#888888"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 3 }}
                    animationBegin={200}
                    animationDuration={800}
                    isAnimationActive={true}
                  />
                )}
              </>
            )}
            {selectedMetric === 'prospects' && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="prospects"
                  name="Prospects"
                  stroke={targets ? getTargetColorHex(metrics.uniqueProspects, targets.prospectsTarget) : '#888888'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationBegin={0}
                  animationDuration={800}
                  isAnimationActive={true}
                />
                {dailyTargets && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="prospectsTarget"
                    name="Prospects Target"
                    stroke="#888888"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 3 }}
                    animationBegin={200}
                    animationDuration={800}
                    isAnimationActive={true}
                  />
                )}
              </>
            )}
            {selectedMetric === 'real' && (
              <>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="replied"
                  name="Real Replies"
                  stroke={targets ? getTargetColorHex(metrics.realReplies, targets.repliesTarget) : '#888888'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationBegin={0}
                  animationDuration={800}
                  isAnimationActive={true}
                />
                {dailyTargets && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="repliesTarget"
                    name="Real Replies Target"
                    stroke="#888888"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 3 }}
                    animationBegin={200}
                    animationDuration={800}
                    isAnimationActive={true}
                  />
                )}
              </>
            )}
            {selectedMetric === 'interested' && (
              <>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="positiveReplies"
                  name="Interested"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationBegin={0}
                  animationDuration={800}
                  isAnimationActive={true}
                />
                {dailyTargets && dailyTargets.interested !== null && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="interestedTarget"
                    name="Interested Target"
                    stroke="#888888"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 3 }}
                    animationBegin={200}
                    animationDuration={800}
                    isAnimationActive={true}
                  />
                )}
              </>
            )}
            {selectedMetric === 'meetings' && (
              <>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="positiveReplies"
                  name="Meetings"
                  stroke={targets ? getTargetColorHex(metrics.meetingsBooked, targets.meetingsTarget) : '#888888'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationBegin={0}
                  animationDuration={800}
                  isAnimationActive={true}
                />
                {dailyTargets && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="meetingsTarget"
                    name="Meetings Target"
                    stroke="#888888"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 3 }}
                    animationBegin={200}
                    animationDuration={800}
                    isAnimationActive={true}
                  />
                )}
              </>
            )}
            {!selectedMetric && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sent"
                  name="Sent"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  animationBegin={0}
                  animationDuration={1000}
                  isAnimationActive={true}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="prospects"
                  name="Prospects"
                  stroke="#888888"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  animationBegin={200}
                  animationDuration={1000}
                  isAnimationActive={true}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="replied"
                  name="Replied"
                  stroke="#888888"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  animationBegin={400}
                  animationDuration={1000}
                  isAnimationActive={true}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="positiveReplies"
                  name="Interested"
                  stroke="#888888"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  animationBegin={600}
                  animationDuration={1000}
                  isAnimationActive={true}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

