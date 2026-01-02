import { useState, useMemo } from 'react'
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
import ClickableMetricCard from './ClickableMetricCard'
import { formatNumber, formatPercentage } from '../../lib/supabase'

interface PipelineMetricsSectionProps {
  metrics: {
    meetingsBooked: number
    showedUp: number
    qualified: number
    demo: number
    proposalSent: number
    closed: number
  }
  chartData: Array<{
    date: string
    meetingsBooked: number
    showedUp: number
    qualified: number
    demo: number
    proposalSent: number
    closed: number
  }>
  loading?: boolean
}

type PipelineMetric = 'meetingsBooked' | 'showedUp' | 'qualified' | 'demo' | 'proposalSent' | 'closed' | null

const METRIC_CONFIG = {
  meetingsBooked: { label: 'Meetings Booked', color: '#a855f7' },
  showedUp: { label: 'Showed Up', color: '#6366f1' },
  qualified: { label: 'Qualified', color: '#3b82f6' },
  demo: { label: 'Demo Completed', color: '#06b6d4' },
  proposalSent: { label: 'Proposal Sent', color: '#10b981' },
  closed: { label: 'Closed Won', color: '#22c55e' },
}

export default function PipelineMetricsSection({
  metrics,
  chartData,
  loading = false,
}: PipelineMetricsSectionProps) {
  const [selectedMetric, setSelectedMetric] = useState<PipelineMetric>(null)

  // Calculate conversion rates
  const rates = useMemo(() => ({
    showUpRate: metrics.meetingsBooked > 0 
      ? (metrics.showedUp / metrics.meetingsBooked) * 100 : 0,
    qualifiedRate: metrics.showedUp > 0 
      ? (metrics.qualified / metrics.showedUp) * 100 : 0,
    demoRate: metrics.qualified > 0 
      ? (metrics.demo / metrics.qualified) * 100 : 0,
    proposalRate: metrics.demo > 0 
      ? (metrics.proposalSent / metrics.demo) * 100 : 0,
    closeRate: metrics.proposalSent > 0 
      ? (metrics.closed / metrics.proposalSent) * 100 : 0,
    overallConversion: metrics.meetingsBooked > 0 
      ? (metrics.closed / metrics.meetingsBooked) * 100 : 0,
  }), [metrics])

  // Handle metric click
  const handleMetricClick = (metric: PipelineMetric) => {
    setSelectedMetric(prev => prev === metric ? null : metric)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 animate-pulse h-24" />
          ))}
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 animate-pulse h-72" />
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Metrics Grid - Clickable to control chart */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <ClickableMetricCard
          title="Meetings Booked"
          value={metrics.meetingsBooked}
          colorClass="text-purple-400"
          isActive={selectedMetric === 'meetingsBooked'}
          onClick={() => handleMetricClick('meetingsBooked')}
        />
        <ClickableMetricCard
          title="Showed Up"
          value={metrics.showedUp}
          percentage={rates.showUpRate}
          colorClass="text-indigo-400"
          isActive={selectedMetric === 'showedUp'}
          onClick={() => handleMetricClick('showedUp')}
        />
        <ClickableMetricCard
          title="Qualified"
          value={metrics.qualified}
          percentage={rates.qualifiedRate}
          colorClass="text-blue-400"
          isActive={selectedMetric === 'qualified'}
          onClick={() => handleMetricClick('qualified')}
        />
        <ClickableMetricCard
          title="Demo Completed"
          value={metrics.demo}
          percentage={rates.demoRate}
          colorClass="text-cyan-400"
          isActive={selectedMetric === 'demo'}
          onClick={() => handleMetricClick('demo')}
        />
        <ClickableMetricCard
          title="Proposal Sent"
          value={metrics.proposalSent}
          percentage={rates.proposalRate}
          colorClass="text-emerald-400"
          isActive={selectedMetric === 'proposalSent'}
          onClick={() => handleMetricClick('proposalSent')}
        />
        <ClickableMetricCard
          title="Closed Won"
          value={metrics.closed}
          percentage={rates.closeRate}
          colorClass="text-green-400"
          isActive={selectedMetric === 'closed'}
          onClick={() => handleMetricClick('closed')}
        />
      </div>

      {/* Trend Chart */}
      <motion.div 
        className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedMetric || 'all'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={{ stroke: '#334155' }}
                  tickFormatter={(value) => value.toLocaleString()}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />

                {selectedMetric ? (
                  <Line
                    type="monotone"
                    dataKey={selectedMetric}
                    name={METRIC_CONFIG[selectedMetric].label}
                    stroke={METRIC_CONFIG[selectedMetric].color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: METRIC_CONFIG[selectedMetric].color }}
                    animationDuration={500}
                  />
                ) : (
                  <>
                    <Line type="monotone" dataKey="meetingsBooked" name="Meetings" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 3 }} animationDuration={800} />
                    <Line type="monotone" dataKey="showedUp" name="Showed Up" stroke="#6366f1" strokeWidth={1.5} dot={false} animationDuration={800} />
                    <Line type="monotone" dataKey="qualified" name="Qualified" stroke="#3b82f6" strokeWidth={1.5} dot={false} animationDuration={800} />
                    <Line type="monotone" dataKey="demo" name="Demo" stroke="#06b6d4" strokeWidth={1.5} dot={false} animationDuration={800} />
                    <Line type="monotone" dataKey="proposalSent" name="Proposal" stroke="#10b981" strokeWidth={1.5} dot={false} animationDuration={800} />
                    <Line type="monotone" dataKey="closed" name="Closed" stroke="#22c55e" strokeWidth={2} dot={false} animationDuration={800} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-3 text-xs flex-wrap">
          {selectedMetric ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METRIC_CONFIG[selectedMetric].color }} />
              <span className="text-white font-medium">{METRIC_CONFIG[selectedMetric].label}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#a855f7' }} />
                <span className="text-white">Meetings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6366f1' }} />
                <span className="text-white">Showed Up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                <span className="text-white">Qualified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#06b6d4' }} />
                <span className="text-white">Demo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                <span className="text-white">Proposal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-white">Closed</span>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

