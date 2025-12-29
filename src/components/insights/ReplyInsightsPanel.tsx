import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, TrendingUp, Award, ChevronDown, ChevronUp } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import type { CategoryBreakdown, DailyCount, CampaignPerformance } from '../../hooks/useDeepInsights'

interface ReplyInsightsPanelProps {
  categoryBreakdown: CategoryBreakdown
  repliesByDay: DailyCount[]
  campaignPerformance: CampaignPerformance[]
  avgRepliesPerDay: number
  bestDay: { date: string; count: number } | null
  onExpandClick?: () => void
  isExpanded?: boolean
}

const CATEGORY_COLORS = {
  interested: '#22c55e',
  notInterested: '#ef4444',
  outOfOffice: '#f97316',
  other: '#6b7280',
}

export default function ReplyInsightsPanel({
  categoryBreakdown,
  repliesByDay,
  campaignPerformance,
  avgRepliesPerDay,
  bestDay,
  onExpandClick,
  isExpanded = false,
}: ReplyInsightsPanelProps) {
  const [activeSection, setActiveSection] = useState<'category' | 'trend' | 'campaigns'>('category')

  const pieData = [
    { name: 'Interested', value: categoryBreakdown.interested, color: CATEGORY_COLORS.interested },
    { name: 'Not Interested', value: categoryBreakdown.notInterested, color: CATEGORY_COLORS.notInterested },
    { name: 'Out of Office', value: categoryBreakdown.outOfOffice, color: CATEGORY_COLORS.outOfOffice },
    { name: 'Other', value: categoryBreakdown.other, color: CATEGORY_COLORS.other },
  ].filter(d => d.value > 0)

  const total = categoryBreakdown.interested + categoryBreakdown.notInterested + categoryBreakdown.outOfOffice + categoryBreakdown.other

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
      return (
        <div className="bg-rillation-card border border-rillation-border rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-rillation-text">{data.name}</p>
          <p className="text-sm text-rillation-text-muted mt-1">
            <span className="text-rillation-cyan font-bold">{data.value.toLocaleString()}</span> replies ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const sectionButtons = [
    { id: 'category' as const, label: 'Categories', icon: MessageSquare },
    { id: 'trend' as const, label: 'Trend', icon: TrendingUp },
    { id: 'campaigns' as const, label: 'Top Campaigns', icon: Award },
  ]

  // Calculate interest rate
  const interestRate = total > 0 ? ((categoryBreakdown.interested / total) * 100).toFixed(1) : '0'
  const oooExcluded = total - categoryBreakdown.outOfOffice
  const adjustedInterestRate = oooExcluded > 0 
    ? ((categoryBreakdown.interested / oooExcluded) * 100).toFixed(1) 
    : '0'

  return (
    <motion.div
      className="bg-rillation-card rounded-2xl border border-rillation-border overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-rillation-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-rillation-cyan/20 to-rillation-green/20 border border-rillation-cyan/30">
            <MessageSquare size={24} className="text-rillation-cyan" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-rillation-text">Reply Insights</h3>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              <span className="text-rillation-cyan font-semibold">{total.toLocaleString()}</span> total replies analyzed
            </p>
          </div>
        </div>
        {onExpandClick && (
          <motion.button
            onClick={onExpandClick}
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
        )}
      </div>

      {/* Section Toggle */}
      <div className="p-4 border-b border-rillation-border/30 bg-rillation-bg/30">
        <div className="flex gap-2">
          {sectionButtons.map((section) => {
            const Icon = section.icon
            return (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeSection === section.id
                    ? 'bg-rillation-cyan/20 text-rillation-cyan border border-rillation-cyan/30'
                    : 'text-rillation-text-muted hover:bg-rillation-card-hover hover:text-rillation-text'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={16} />
                {section.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {/* Category Breakdown */}
          {activeSection === 'category' && (
            <motion.div
              key="category"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <motion.div
                  className="p-4 rounded-xl bg-rillation-bg/50 border border-rillation-border/30"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-xs text-rillation-text-muted uppercase tracking-wide mb-1">Interest Rate</p>
                  <p className="text-2xl font-bold text-rillation-green">{interestRate}%</p>
                  <p className="text-xs text-rillation-text-muted mt-1">of all replies</p>
                </motion.div>
                <motion.div
                  className="p-4 rounded-xl bg-rillation-bg/50 border border-rillation-border/30"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <p className="text-xs text-rillation-text-muted uppercase tracking-wide mb-1">Adj. Interest Rate</p>
                  <p className="text-2xl font-bold text-rillation-cyan">{adjustedInterestRate}%</p>
                  <p className="text-xs text-rillation-text-muted mt-1">excl. OOO</p>
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Donut Chart */}
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend with values */}
                <div className="flex flex-col justify-center gap-3">
                  {pieData.map((item, index) => {
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
                    return (
                      <motion.div
                        key={item.name}
                        className="flex items-center justify-between p-3 rounded-xl bg-rillation-bg/50 hover:bg-rillation-bg/80 transition-colors"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium text-rillation-text">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-rillation-text">
                            {item.value.toLocaleString()}
                          </span>
                          <span className="text-xs text-rillation-text-muted">
                            ({percentage}%)
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Daily Trend */}
          {activeSection === 'trend' && (
            <motion.div
              key="trend"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-4 rounded-xl bg-rillation-bg/50 border border-rillation-border/30">
                  <p className="text-xs text-rillation-text-muted uppercase tracking-wide mb-1">Avg/Day</p>
                  <p className="text-2xl font-bold text-rillation-cyan">
                    {avgRepliesPerDay.toFixed(1)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-rillation-bg/50 border border-rillation-border/30">
                  <p className="text-xs text-rillation-text-muted uppercase tracking-wide mb-1">Best Day</p>
                  <p className="text-2xl font-bold text-rillation-green">
                    {bestDay ? `${bestDay.count}` : '-'}
                  </p>
                  {bestDay && (
                    <p className="text-xs text-rillation-text-muted mt-1">{bestDay.date}</p>
                  )}
                </div>
              </div>

              {/* Area chart */}
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={repliesByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="replyGradientNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#12121a',
                        border: '1px solid #2a2a3a',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fill="url(#replyGradientNew)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Campaign Performance */}
          {activeSection === 'campaigns' && (
            <motion.div
              key="campaigns"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {campaignPerformance.length > 0 ? (
                <>
                  <p className="text-sm text-rillation-text-muted mb-4">
                    Top campaigns by interest rate (min. 5 replies)
                  </p>
                  <div className="space-y-3">
                    {campaignPerformance.slice(0, 5).map((campaign, index) => (
                      <motion.div
                        key={campaign.campaign}
                        className="p-3 rounded-xl bg-rillation-bg/50 hover:bg-rillation-bg/80 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-rillation-text truncate max-w-[250px]">
                            {campaign.campaign}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-rillation-text-muted">
                              {campaign.totalReplies} replies
                            </span>
                            <span className="text-sm font-bold text-rillation-purple">
                              {campaign.positiveRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-rillation-bg rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-rillation-purple to-rillation-magenta"
                            initial={{ width: 0 }}
                            animate={{ width: `${campaign.positiveRate}%` }}
                            transition={{ duration: 0.8, delay: 0.2 + index * 0.05 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-56 flex items-center justify-center text-rillation-text-muted">
                  No campaign data with sufficient replies
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
