import { useState } from 'react'
import { BarChart3, TrendingUp, PieChart } from 'lucide-react'
import { useInboxes } from '../../hooks/useInboxes'
import { useClients } from '../../hooks/useClients'
import DateRangeFilter from '../ui/DateRangeFilter'
import ClientFilter from '../ui/ClientFilter'
import MetricCard from '../ui/MetricCard'
import { getDateRange } from '../../lib/supabase'
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
  Legend,
  LineChart,
  Line,
} from 'recharts'

const COLORS = ['#a855f7', '#22d3ee', '#22c55e', '#f97316', '#ef4444', '#d946ef']

export default function InboxAnalytics() {
  const { clients } = useClients()
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')

  const { inboxes, loading, error } = useInboxes({
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
    const provider = inbox.type || 'Unknown'
    acc[provider] = (acc[provider] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgDeliverability = inboxes.length > 0
    ? inboxes.reduce((sum, inbox) => sum + (inbox.deliverability_score || 0), 0) / inboxes.length
    : 0

  // Prepare chart data
  const clientChartData = Object.entries(inboxesByClient)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const providerChartData = Object.entries(inboxesByProvider)
    .map(([name, value]) => ({ name, value }))

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

