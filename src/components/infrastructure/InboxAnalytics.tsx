import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, PieChart, Activity, Send, Wifi, WifiOff } from 'lucide-react'
import { useInboxes } from '../../hooks/useInboxes'
import { useInfraFilter } from '../../pages/Infrastructure'
import DateRangeFilter from '../ui/DateRangeFilter'
import MetricCard from '../ui/MetricCard'
import AnimatedSelect from '../ui/AnimatedSelect'
import { getDateRange, normalizeProviderName } from '../../lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'

// Monochrome color palette
const COLORS = ['#ffffff', '#888888', '#555555', '#333333', '#666666', '#aaaaaa']

export default function InboxAnalytics() {
  const { selectedClient, searchQuery } = useInfraFilter()
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))
  const [selectedProvider, setSelectedProvider] = useState('')

  // Fetch all inboxes without provider filter (we'll filter client-side)
  const { inboxes, error } = useInboxes({
    client: selectedClient || undefined,
  })

  // Filter by provider and search query
  const filteredInboxes = useMemo(() => {
    let result = inboxes

    // Filter by provider (using normalized name)
    if (selectedProvider) {
      result = result.filter(inbox => normalizeProviderName(inbox.type) === selectedProvider)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(inbox => 
        inbox.email?.toLowerCase().includes(query) ||
        inbox.client?.toLowerCase().includes(query)
      )
    }

    return result
  }, [inboxes, selectedProvider, searchQuery])

  // Calculate metrics
  const totalInboxes = filteredInboxes.length
  const inboxesByClient = filteredInboxes.reduce((acc, inbox) => {
    const client = inbox.client || 'Unassigned'
    acc[client] = (acc[client] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const inboxesByProvider = filteredInboxes.reduce((acc, inbox) => {
    const provider = normalizeProviderName(inbox.type)
    acc[provider] = (acc[provider] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Calculate status counts
  const connectedCount = filteredInboxes.filter((inbox) => 
    inbox.status === 'Connected'
  ).length
  const disconnectedCount = filteredInboxes.filter((inbox) => 
    inbox.status === 'Not connected' || inbox.status === 'Failed'
  ).length
  const totalSends = filteredInboxes.reduce((sum, inbox) => sum + (inbox.emails_sent_count || 0), 0)

  const avgDeliverability = filteredInboxes.length > 0
    ? filteredInboxes.reduce((sum, inbox) => sum + (inbox.deliverability_score || 0), 0) / filteredInboxes.length
    : 0

  // Prepare chart data
  const clientChartData = Object.entries(inboxesByClient)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) // Top 10

  const providerChartData = Object.entries(inboxesByProvider)
    .map(([name, value]) => ({ name, value: value as number }))

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <motion.div 
        className="flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 min-w-[160px]">
          <AnimatedSelect
            value={selectedProvider}
            onChange={setSelectedProvider}
            placeholder="All Providers"
            size="sm"
            showCheck={false}
            options={[
              { value: '', label: 'All Providers' },
              { value: 'Mission Inbox', label: 'Mission Inbox' },
              { value: 'InboxKit', label: 'InboxKit' },
            ]}
          />
        </div>
        <DateRangeFilter
          startDate={dateRange.start}
          endDate={dateRange.end}
          onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
          onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
          onPresetChange={(preset) => {
            setDatePreset(preset)
            setDateRange(getDateRange(preset))
          }}
          activePreset={datePreset}
        />
      </motion.div>

      {/* Metrics Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-5 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <MetricCard
          title="Connected"
          value={connectedCount}
          colorClass="text-emerald-400"
        />
        <MetricCard
          title="Disconnected"
          value={disconnectedCount}
          colorClass="text-red-400"
        />
        <MetricCard
          title="Clients"
          value={Object.keys(inboxesByClient).length}
          colorClass="text-white"
        />
        <MetricCard
          title="Providers"
          value={Object.keys(inboxesByProvider).length}
          colorClass="text-white"
        />
        <MetricCard
          title="Avg Deliverability"
          value={Math.round(avgDeliverability)}
          percentage={avgDeliverability}
          colorClass={avgDeliverability >= 90 ? 'text-emerald-400' : avgDeliverability >= 70 ? 'text-amber-400' : 'text-red-400'}
        />
      </motion.div>

      {/* Deliverability Section */}
      <motion.div 
        className="bg-rillation-card rounded-xl p-6 border border-rillation-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity size={20} className="text-white" />
          Deliverability Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Connected Status */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Wifi size={16} className="text-emerald-400" />
              <span className="text-xs text-white">Connected</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{connectedCount}</p>
            <p className="text-xs text-white mt-1">
              {totalInboxes > 0 ? Math.round((connectedCount / totalInboxes) * 100) : 0}% of inboxes
            </p>
          </div>
          
          {/* Disconnected Status */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <WifiOff size={16} className="text-red-400" />
              <span className="text-xs text-white/80">Disconnected</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{disconnectedCount}</p>
            <p className="text-xs text-white mt-1">
              {totalInboxes > 0 ? Math.round((disconnectedCount / totalInboxes) * 100) : 0}% of inboxes
            </p>
          </div>
          
          {/* Total Sends */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Send size={16} className="text-white" />
              <span className="text-xs text-white">Total Sends</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {totalSends.toLocaleString()}
            </p>
            <p className="text-xs text-white mt-1">
              Avg {totalInboxes > 0 ? Math.round(totalSends / totalInboxes) : 0} per inbox
            </p>
          </div>
          
          {/* Warm-up Reputation */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-400" />
              <span className="text-xs text-white">Warm-up Reputation</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">
              {Math.round(avgDeliverability)}%
            </p>
            <p className="text-xs text-white mt-1">
              Average across inboxes
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status Breakdown by Provider */}
      <motion.div 
        className="bg-rillation-card rounded-xl p-6 border border-rillation-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Status by Provider</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rillation-card-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Connected</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Disconnected</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Total Sends</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Avg Deliverability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rillation-border/30">
              {providerChartData.map(({ name: provider, value: count }) => {
                const providerInboxes = filteredInboxes.filter((i) => normalizeProviderName(i.type) === provider)
                const providerConnected = providerInboxes.filter((i) => 
                  i.status === 'Connected'
                ).length
                const providerDisconnected = providerInboxes.filter((i) => 
                  i.status === 'Not connected' || i.status === 'Failed'
                ).length
                const providerSends = providerInboxes.reduce((sum, i) => sum + (i.emails_sent_count || 0), 0)
                const providerAvgDeliverability = providerInboxes.length > 0
                  ? providerInboxes.reduce((sum, i) => sum + (i.deliverability_score || 0), 0) / providerInboxes.length
                  : 0
                
                return (
                  <tr key={provider} className="hover:bg-rillation-card-hover">
                    <td className="px-4 py-3 text-sm font-medium text-white">{provider}</td>
                    <td className="px-4 py-3 text-sm text-white">{count}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                        {providerConnected}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                        {providerDisconnected}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {providerSends.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {Math.round(providerAvgDeliverability)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Distribution */}
        {providerChartData.length > 0 && (
          <motion.div 
            className="bg-rillation-card rounded-xl p-6 border border-rillation-border"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-white" />
              Provider Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={providerChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {providerChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#141414',
                    border: '1px solid #222222',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Client Distribution */}
        {clientChartData.length > 0 && (
          <motion.div 
            className="bg-rillation-card rounded-xl p-6 border border-rillation-border"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-white" />
              Inboxes by Client
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={clientChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888888" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141414',
                    border: '1px solid #222222',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
                <Bar dataKey="value" fill="#ffffff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
