import { motion } from 'framer-motion'
import { Users, ChevronDown, ChevronUp, Building2 } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { ClientBreakdown } from '../../hooks/useDeepInsights'

interface EngagedLeadsPanelProps {
  totalLeads: number
  leadsByClient: ClientBreakdown[]
  onExpandClick?: () => void
  isExpanded?: boolean
}

const CLIENT_COLORS = [
  '#a855f7', // purple
  '#22d3ee', // cyan
  '#22c55e', // green
  '#f97316', // orange
  '#d946ef', // magenta
  '#3b82f6', // blue
  '#eab308', // yellow
  '#ec4899', // pink
]

export default function EngagedLeadsPanel({
  totalLeads,
  leadsByClient,
  onExpandClick,
  isExpanded = false,
}: EngagedLeadsPanelProps) {
  // Prepare pie data with colors
  const pieData = leadsByClient.slice(0, 8).map((item, index) => ({
    ...item,
    name: item.client,
    value: item.count,
    color: CLIENT_COLORS[index % CLIENT_COLORS.length],
  }))

  // Add "Others" if there are more than 8 clients
  if (leadsByClient.length > 8) {
    const othersCount = leadsByClient.slice(8).reduce((sum, item) => sum + item.count, 0)
    pieData.push({
      client: 'Others',
      name: 'Others',
      value: othersCount,
      count: othersCount,
      percentage: totalLeads > 0 ? (othersCount / totalLeads) * 100 : 0,
      color: '#6b7280',
    })
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-rillation-card border border-rillation-border rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-rillation-text">{data.name}</p>
          <p className="text-sm text-rillation-text-muted mt-1">
            <span className="text-rillation-purple font-bold">{data.count.toLocaleString()}</span> leads ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Calculate stats
  const topClient = leadsByClient[0]
  const avgPerClient = leadsByClient.length > 0 ? Math.round(totalLeads / leadsByClient.length) : 0
  const maxClientCount = Math.max(...leadsByClient.map(c => c.count), 1)

  return (
    <motion.div
      className="bg-rillation-card rounded-2xl border border-rillation-border overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-rillation-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-rillation-purple/20 to-rillation-magenta/20 border border-rillation-purple/30">
            <Users size={24} className="text-rillation-purple" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-rillation-text">Engaged Leads</h3>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              <span className="text-rillation-purple font-semibold">{totalLeads.toLocaleString()}</span> leads from {leadsByClient.length} clients
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

      {/* Content */}
      <div className="p-5">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <motion.div
            className="p-4 rounded-xl bg-rillation-bg/50 border border-rillation-border/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xs text-rillation-text-muted uppercase tracking-wide mb-1">Top Client</p>
            <p className="text-lg font-bold text-rillation-purple truncate">
              {topClient?.client || '-'}
            </p>
            {topClient && (
              <p className="text-sm text-rillation-text-muted mt-1">
                {topClient.count.toLocaleString()} leads ({topClient.percentage.toFixed(0)}%)
              </p>
            )}
          </motion.div>
          <motion.div
            className="p-4 rounded-xl bg-rillation-bg/50 border border-rillation-border/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-rillation-text-muted uppercase tracking-wide mb-1">Avg per Client</p>
            <p className="text-2xl font-bold text-rillation-cyan">
              {avgPerClient.toLocaleString()}
            </p>
            <p className="text-sm text-rillation-text-muted mt-1">
              leads per client
            </p>
          </motion.div>
        </div>

        {leadsByClient.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
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

            {/* Client list with progress bars */}
            <div className="flex flex-col justify-center space-y-2.5">
              {leadsByClient.slice(0, 5).map((client, index) => (
                <motion.div
                  key={client.client}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CLIENT_COLORS[index % CLIENT_COLORS.length] }}
                      />
                      <span className="text-sm text-rillation-text truncate max-w-[120px]">
                        {client.client}
                      </span>
                    </div>
                    <span className="text-sm text-rillation-text-muted">
                      <span className="font-semibold text-rillation-text">{client.count}</span>
                      <span className="ml-1">({client.percentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-rillation-bg rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: CLIENT_COLORS[index % CLIENT_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(client.count / maxClientCount) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + index * 0.05 }}
                    />
                  </div>
                </motion.div>
              ))}
              {leadsByClient.length > 5 && (
                <p className="text-xs text-rillation-text-muted text-center pt-1">
                  +{leadsByClient.length - 5} more clients
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-52 flex flex-col items-center justify-center text-rillation-text-muted">
            <Building2 size={40} className="mb-3 opacity-50" />
            <p className="text-sm">No engaged leads data</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
