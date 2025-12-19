import { useState } from 'react'
import { BarChart3, TrendingUp, PieChart, Activity, Send, Wifi, WifiOff } from 'lucide-react'
import { useInboxes } from '../../hooks/useInboxes'
import { useClients } from '../../hooks/useClients'
import DateRangeFilter from '../ui/DateRangeFilter'
import ClientFilter from '../ui/ClientFilter'
import MetricCard from '../ui/MetricCard'
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

const COLORS = ['#a855f7', '#22d3ee', '#22c55e', '#f97316', '#ef4444', '#d946ef']

export default function InboxAnalytics() {
  const { clients } = useClients()
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')

  const { inboxes, error } = useInboxes({
    client: selectedClient || undefined,
    provider: selectedProvider || undefined,
  })

  // Calculate metrics
  const totalInboxes = inboxes.length
  const inboxesByClient = inboxes.reduce((acc, inbox) => {
    const client = inbox.client || 'Unassigned'
    acc[client] = (acc[client] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const inboxesByProvider = inboxes.reduce((acc, inbox) => {
    const provider = normalizeProviderName(inbox.type)
    acc[provider] = (acc[provider] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Calculate status counts
  const connectedCount = inboxes.filter((inbox) => 
    inbox.status === 'active' || inbox.status === 'connected'
  ).length
  const disconnectedCount = inboxes.filter((inbox) => 
    inbox.status === 'inactive' || inbox.status === 'disconnected' || inbox.status === 'error'
  ).length
  const totalSends = inboxes.reduce((sum, inbox) => sum + (inbox.emails_sent_count || 0), 0)

  const avgDeliverability = inboxes.length > 0
    ? inboxes.reduce((sum, inbox) => sum + (inbox.deliverability_score || 0), 0) / inboxes.length
    : 0

  // Prepare chart data
  const clientChartData = Object.entries(inboxesByClient)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)

  const providerChartData = Object.entries(inboxesByProvider)
    .map(([name, value]) => ({ name, value: value as number }))

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center gap-4">
          <ClientFilter
            clients={clients}
            selectedClient={selectedClient}
            onChange={setSelectedClient}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-rillation-text-muted">Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="appearance-none px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple cursor-pointer"
            >
              <option value="">All Providers</option>
              <option value="Mission Inbox">Mission Inbox</option>
              <option value="InboxKit">InboxKit</option>
            </select>
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
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inboxes"
          value={totalInboxes}
          icon={<BarChart3 size={18} />}
          colorClass="text-rillation-purple"
        />
        <MetricCard
          title="Clients"
          value={Object.keys(inboxesByClient).length}
          icon={<TrendingUp size={18} />}
          colorClass="text-rillation-cyan"
        />
        <MetricCard
          title="Providers"
          value={Object.keys(inboxesByProvider).length}
          icon={<PieChart size={18} />}
          colorClass="text-rillation-orange"
        />
        <MetricCard
          title="Avg Deliverability"
          value={Math.round(avgDeliverability)}
          percentage={avgDeliverability}
          icon={<TrendingUp size={18} />}
          colorClass="text-rillation-green"
        />
      </div>

      {/* Deliverability Section */}
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
        <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
          <Activity size={20} className="text-rillation-purple" />
          Deliverability Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Connected Status */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Wifi size={16} className="text-rillation-green" />
              <span className="text-xs text-rillation-text-muted">Connected</span>
            </div>
            <p className="text-2xl font-bold text-rillation-green">{connectedCount}</p>
            <p className="text-xs text-rillation-text-muted mt-1">
              {totalInboxes > 0 ? Math.round((connectedCount / totalInboxes) * 100) : 0}% of inboxes
            </p>
          </div>
          
          {/* Disconnected Status */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <WifiOff size={16} className="text-rillation-red" />
              <span className="text-xs text-rillation-text-muted">Disconnected</span>
            </div>
            <p className="text-2xl font-bold text-rillation-red">{disconnectedCount}</p>
            <p className="text-xs text-rillation-text-muted mt-1">
              {totalInboxes > 0 ? Math.round((disconnectedCount / totalInboxes) * 100) : 0}% of inboxes
            </p>
          </div>
          
          {/* Total Sends */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Send size={16} className="text-rillation-cyan" />
              <span className="text-xs text-rillation-text-muted">Total Sends</span>
            </div>
            <p className="text-2xl font-bold text-rillation-cyan">
              {totalSends.toLocaleString()}
            </p>
            <p className="text-xs text-rillation-text-muted mt-1">
              Avg {totalInboxes > 0 ? Math.round(totalSends / totalInboxes) : 0} per inbox
            </p>
          </div>
          
          {/* Warm-up Reputation - Placeholder for API integration */}
          <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-rillation-orange" />
              <span className="text-xs text-rillation-text-muted">Warm-up Reputation</span>
            </div>
            <p className="text-2xl font-bold text-rillation-orange">
              {Math.round(avgDeliverability)}%
            </p>
            <p className="text-xs text-rillation-text-muted mt-1">
              Average across inboxes
            </p>
          </div>
        </div>
      </div>

      {/* Status Breakdown by Provider */}
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
        <h3 className="text-lg font-semibold text-rillation-text mb-4">Status by Provider</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rillation-card-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Connected</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Disconnected</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Total Sends</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Avg Deliverability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rillation-border/30">
              {providerChartData.map(({ name: provider, value: count }) => {
                const providerInboxes = inboxes.filter((i) => normalizeProviderName(i.type) === provider)
                const providerConnected = providerInboxes.filter((i) => 
                  i.status === 'active' || i.status === 'connected'
                ).length
                const providerDisconnected = providerInboxes.filter((i) => 
                  i.status === 'inactive' || i.status === 'disconnected' || i.status === 'error'
                ).length
                const providerSends = providerInboxes.reduce((sum, i) => sum + (i.emails_sent_count || 0), 0)
                const providerAvgDeliverability = providerInboxes.length > 0
                  ? providerInboxes.reduce((sum, i) => sum + (i.deliverability_score || 0), 0) / providerInboxes.length
                  : 0
                
                return (
                  <tr key={provider} className="hover:bg-rillation-card-hover">
                    <td className="px-4 py-3 text-sm font-medium text-rillation-text">{provider}</td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">{count}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-rillation-green/20 text-rillation-green rounded text-xs">
                        {providerConnected}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-rillation-red/20 text-rillation-red rounded text-xs">
                        {providerDisconnected}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {providerSends.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {Math.round(providerAvgDeliverability)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Distribution */}
        {providerChartData.length > 0 && (
          <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
            <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-rillation-purple" />
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
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Client Distribution */}
        {clientChartData.length > 0 && (
          <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
            <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-rillation-purple" />
              Inboxes by Client
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={clientChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12121a',
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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




