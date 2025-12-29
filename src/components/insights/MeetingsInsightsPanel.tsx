import { motion } from 'framer-motion'
import { Calendar, Building, MapPin, DollarSign, Clock, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts'
import type {
  IndustryBreakdown,
  GeographicBreakdown,
  RevenueBreakdown,
  CompanyAgeBreakdown,
  DailyCount,
} from '../../hooks/useDeepInsights'

interface MeetingsInsightsPanelProps {
  totalMeetings: number
  meetingsByIndustry: IndustryBreakdown[]
  meetingsByState: GeographicBreakdown[]
  meetingsByRevenue: RevenueBreakdown[]
  meetingsByCompanyAge: CompanyAgeBreakdown[]
  meetingsByDay: DailyCount[]
  onExpandClick?: () => void
  isExpanded?: boolean
}

const COLORS = {
  industry: ['#a855f7', '#22d3ee', '#22c55e', '#f97316', '#d946ef', '#3b82f6', '#eab308', '#ec4899', '#14b8a6', '#8b5cf6'],
  revenue: ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#d946ef'],
  age: ['#d946ef', '#22d3ee', '#f97316', '#22c55e', '#a855f7'],
  geography: ['#a855f7', '#22d3ee', '#22c55e', '#f97316', '#d946ef', '#3b82f6', '#eab308', '#ec4899'],
}

export default function MeetingsInsightsPanel({
  totalMeetings,
  meetingsByIndustry,
  meetingsByState,
  meetingsByRevenue,
  meetingsByCompanyAge,
  meetingsByDay,
  onExpandClick,
  isExpanded = false,
}: MeetingsInsightsPanelProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-rillation-card border border-rillation-border rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-rillation-text">
            {data.industry || data.state || data.band || data.category || label}
          </p>
          <p className="text-sm text-rillation-text-muted mt-1">
            <span className="text-rillation-magenta font-bold">{(data.count || payload[0].value || 0).toLocaleString()}</span> meetings
            {data.percentage !== undefined && (
              <span className="ml-2 text-rillation-cyan">({data.percentage.toFixed(1)}%)</span>
            )}
          </p>
        </div>
      )
    }
    return null
  }

  // Calculate stats
  const topIndustry = meetingsByIndustry[0]
  const topState = meetingsByState[0]
  const avgPerDay = meetingsByDay.length > 0 
    ? (totalMeetings / meetingsByDay.length).toFixed(1)
    : '0'
  const topRevenue = meetingsByRevenue.filter(r => r.band !== 'Unknown')[0]

  // Get max values for progress bars
  const maxIndustryCount = Math.max(...meetingsByIndustry.map(i => i.count), 1)
  const maxStateCount = Math.max(...meetingsByState.map(s => s.count), 1)

  return (
    <motion.div
      className="bg-rillation-card rounded-2xl border border-rillation-border overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-rillation-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-rillation-magenta/20 to-rillation-purple/20 border border-rillation-magenta/30">
            <Calendar size={24} className="text-rillation-magenta" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-rillation-text">Meetings Booked</h3>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              <span className="text-rillation-magenta font-semibold">{totalMeetings.toLocaleString()}</span> meetings across all campaigns
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

      {/* Quick Stats Row */}
      <div className="p-5 border-b border-rillation-border/30 bg-rillation-bg/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            className="p-4 rounded-xl bg-rillation-card border border-rillation-border/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Building size={16} className="text-rillation-magenta" />
              <p className="text-xs text-rillation-text-muted uppercase tracking-wide">Top Industry</p>
            </div>
            <p className="text-lg font-bold text-rillation-text truncate">
              {topIndustry?.industry || '-'}
            </p>
            {topIndustry && (
              <p className="text-sm text-rillation-magenta mt-1">
                {topIndustry.count} meetings ({topIndustry.percentage.toFixed(0)}%)
              </p>
            )}
          </motion.div>
          <motion.div
            className="p-4 rounded-xl bg-rillation-card border border-rillation-border/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-rillation-cyan" />
              <p className="text-xs text-rillation-text-muted uppercase tracking-wide">Top State</p>
            </div>
            <p className="text-lg font-bold text-rillation-text truncate">
              {topState?.state || '-'}
            </p>
            {topState && (
              <p className="text-sm text-rillation-cyan mt-1">
                {topState.count} meetings ({topState.percentage.toFixed(0)}%)
              </p>
            )}
          </motion.div>
          <motion.div
            className="p-4 rounded-xl bg-rillation-card border border-rillation-border/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-rillation-green" />
              <p className="text-xs text-rillation-text-muted uppercase tracking-wide">Top Revenue</p>
            </div>
            <p className="text-lg font-bold text-rillation-text truncate">
              {topRevenue?.band || '-'}
            </p>
            {topRevenue && (
              <p className="text-sm text-rillation-green mt-1">
                {topRevenue.count} meetings ({topRevenue.percentage.toFixed(0)}%)
              </p>
            )}
          </motion.div>
          <motion.div
            className="p-4 rounded-xl bg-rillation-card border border-rillation-border/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-rillation-purple" />
              <p className="text-xs text-rillation-text-muted uppercase tracking-wide">Daily Average</p>
            </div>
            <p className="text-2xl font-bold text-rillation-purple">
              {avgPerDay}
            </p>
            <p className="text-sm text-rillation-text-muted mt-1">
              meetings per day
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Industry Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Building size={18} className="text-rillation-magenta" />
              <h4 className="text-base font-semibold text-rillation-text">Industry Breakdown</h4>
            </div>
            {meetingsByIndustry.length > 0 ? (
              <div className="space-y-3">
                {meetingsByIndustry.slice(0, 6).map((item, index) => (
                  <motion.div
                    key={item.industry}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-rillation-text truncate max-w-[200px]">
                        {item.industry}
                      </span>
                      <span className="text-sm text-rillation-text-muted ml-2 whitespace-nowrap">
                        <span className="font-semibold text-rillation-text">{item.count}</span>
                        <span className="ml-1">({item.percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-3 bg-rillation-bg rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: COLORS.industry[index % COLORS.industry.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.count / maxIndustryCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.8 + index * 0.05 }}
                      />
                    </div>
                  </motion.div>
                ))}
                {meetingsByIndustry.length > 6 && (
                  <p className="text-xs text-rillation-text-muted text-center pt-2">
                    +{meetingsByIndustry.length - 6} more industries
                  </p>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-rillation-text-muted">
                No industry data available
              </div>
            )}
          </motion.div>

          {/* Geographic Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-rillation-cyan" />
              <h4 className="text-base font-semibold text-rillation-text">Geographic Distribution</h4>
            </div>
            {meetingsByState.length > 0 ? (
              <div className="space-y-3">
                {meetingsByState.slice(0, 6).map((item, index) => (
                  <motion.div
                    key={item.state}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 + index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-rillation-text">
                        {item.state}
                      </span>
                      <span className="text-sm text-rillation-text-muted ml-2 whitespace-nowrap">
                        <span className="font-semibold text-rillation-text">{item.count}</span>
                        <span className="ml-1">({item.percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-3 bg-rillation-bg rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: COLORS.geography[index % COLORS.geography.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.count / maxStateCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.85 + index * 0.05 }}
                      />
                    </div>
                  </motion.div>
                ))}
                {meetingsByState.length > 6 && (
                  <p className="text-xs text-rillation-text-muted text-center pt-2">
                    +{meetingsByState.length - 6} more states
                  </p>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-rillation-text-muted">
                No geographic data available
              </div>
            )}
          </motion.div>
        </div>

        {/* Second Row: Revenue & Company Age + Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Revenue Bands */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={18} className="text-rillation-green" />
              <h4 className="text-base font-semibold text-rillation-text">Revenue Bands</h4>
            </div>
            {meetingsByRevenue.length > 0 ? (
              <div className="space-y-2.5">
                {meetingsByRevenue.filter(r => r.band !== 'Unknown').map((band, index) => (
                  <motion.div
                    key={band.band}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-rillation-bg/50 hover:bg-rillation-bg/80 transition-colors"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.05 }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS.revenue[index % COLORS.revenue.length] }}
                    />
                    <span className="text-sm text-rillation-text flex-1">{band.band}</span>
                    <span className="text-sm font-semibold text-rillation-text">{band.count}</span>
                    <span className="text-xs text-rillation-text-muted w-12 text-right">
                      {band.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-rillation-text-muted">
                No revenue data
              </div>
            )}
          </motion.div>

          {/* Company Age */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-rillation-purple" />
              <h4 className="text-base font-semibold text-rillation-text">Company Maturity</h4>
            </div>
            {meetingsByCompanyAge.length > 0 ? (
              <div className="space-y-2.5">
                {meetingsByCompanyAge.filter(a => a.category !== 'Unknown').map((age, index) => (
                  <motion.div
                    key={age.category}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-rillation-bg/50 hover:bg-rillation-bg/80 transition-colors"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.95 + index * 0.05 }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS.age[index % COLORS.age.length] }}
                    />
                    <span className="text-sm text-rillation-text flex-1">{age.category}</span>
                    <span className="text-sm font-semibold text-rillation-text">{age.count}</span>
                    <span className="text-xs text-rillation-text-muted w-12 text-right">
                      {age.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-rillation-text-muted">
                No company age data
              </div>
            )}
          </motion.div>

          {/* Daily Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-rillation-magenta" />
              <h4 className="text-base font-semibold text-rillation-text">Booking Trend</h4>
            </div>
            {meetingsByDay.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={meetingsByDay} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="meetingGradientFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0.05} />
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
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#d946ef"
                      strokeWidth={2}
                      fill="url(#meetingGradientFull)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-rillation-text-muted">
                No trend data available
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
