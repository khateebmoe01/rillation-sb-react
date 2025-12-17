import { useState, useEffect } from 'react'
import { MessageSquare, Users, Calendar, Filter, TrendingUp, PieChart } from 'lucide-react'
import DateRangeFilter from '../components/ui/DateRangeFilter'
import ClientFilter from '../components/ui/ClientFilter'
import Button from '../components/ui/Button'
import { useClients } from '../hooks/useClients'
import { supabase, getDateRange, formatDateForQuery, formatNumber } from '../lib/supabase'
import type { Reply, MeetingBooked } from '../types/database'
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
} from 'recharts'

type AnalysisType = 'replies' | 'engaged_leads' | 'meetings'

const analysisTypes = [
  { id: 'replies' as const, label: 'Reply Analysis', icon: MessageSquare },
  { id: 'engaged_leads' as const, label: 'Engaged Lead Analysis', icon: Users },
  { id: 'meetings' as const, label: 'Meetings Booked Analysis', icon: Calendar },
]

const COLORS = ['#a855f7', '#22d3ee', '#22c55e', '#f97316', '#ef4444', '#d946ef']

export default function DeepView() {
  // Analysis type state
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('replies')
  
  // Date state
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))
  
  // Filter state
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // Data state
  const [replies, setReplies] = useState<Reply[]>([])
  const [engagedLeads, setEngagedLeads] = useState<any[]>([])
  const [meetings, setMeetings] = useState<MeetingBooked[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Analytics data
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([])
  const [clientBreakdown, setClientBreakdown] = useState<any[]>([])
  const [dailyTrend, setDailyTrend] = useState<any[]>([])
  
  // Fetch data
  const { clients } = useClients()

  // Fetch data based on active analysis
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        
        const startStr = formatDateForQuery(dateRange.start)
        const endStr = formatDateForQuery(dateRange.end)

        if (activeAnalysis === 'replies') {
          // Fetch replies
          let query = supabase
            .from('replies')
            .select('*')
            .gte('date_received', startStr)
            .lte('date_received', endStr)
            .order('date_received', { ascending: false })
            .limit(100)

          if (selectedClient) query = query.eq('client', selectedClient)
          if (selectedCategory) query = query.eq('category', selectedCategory)

          const { data, error: queryError } = await query
          if (queryError) throw queryError
          setReplies(data || [])

          // Calculate category breakdown
          const categories = new Map<string, number>()
          data?.forEach((r) => {
            const cat = r.category || 'Unknown'
            categories.set(cat, (categories.get(cat) || 0) + 1)
          })
          setCategoryBreakdown(
            Array.from(categories.entries()).map(([name, value]) => ({ name, value }))
          )

        } else if (activeAnalysis === 'engaged_leads') {
          // Fetch engaged leads
          let query = supabase
            .from('engaged_leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

          if (selectedClient) query = query.eq('client', selectedClient)

          const { data, error: queryError } = await query
          if (queryError) throw queryError
          setEngagedLeads(data || [])

          // Calculate client breakdown
          const clientCounts = new Map<string, number>()
          data?.forEach((l) => {
            const client = l.client || 'Unknown'
            clientCounts.set(client, (clientCounts.get(client) || 0) + 1)
          })
          setClientBreakdown(
            Array.from(clientCounts.entries()).map(([name, value]) => ({ name, value }))
          )

        } else if (activeAnalysis === 'meetings') {
          // Fetch meetings
          let query = supabase
            .from('meetings_booked')
            .select('*')
            .gte('created_time', startStr)
            .lte('created_time', endStr)
            .order('created_time', { ascending: false })

          if (selectedClient) query = query.eq('client', selectedClient)

          const { data, error: queryError } = await query
          if (queryError) throw queryError
          setMeetings(data || [])

          // Calculate daily trend
          const dailyCounts = new Map<string, number>()
          data?.forEach((m) => {
            const date = m.created_time?.split('T')[0] || ''
            dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1)
          })
          setDailyTrend(
            Array.from(dailyCounts.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([date, count]) => ({
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                meetings: count,
              }))
          )

          // Calculate client breakdown for meetings
          const meetingsByClient = new Map<string, number>()
          data?.forEach((m) => {
            const client = m.client || 'Unknown'
            meetingsByClient.set(client, (meetingsByClient.get(client) || 0) + 1)
          })
          setClientBreakdown(
            Array.from(meetingsByClient.entries()).map(([name, value]) => ({ name, value }))
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeAnalysis, dateRange, selectedClient, selectedCategory])

  // Handle date preset change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    setDateRange(getDateRange(preset))
  }

  // Category colors
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Interested':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'Not Interested':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Out of Office':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Analysis Type Tabs */}
      <div className="flex gap-2">
        {analysisTypes.map((type) => {
          const Icon = type.icon
          const isActive = activeAnalysis === type.id
          
          return (
            <button
              key={type.id}
              onClick={() => setActiveAnalysis(type.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${isActive
                  ? 'bg-gradient-to-r from-rillation-purple to-rillation-magenta text-white'
                  : 'bg-rillation-card border border-rillation-border text-rillation-text-muted hover:text-rillation-text hover:bg-rillation-card-hover'
                }
              `}
            >
              <Icon size={16} />
              {type.label}
            </button>
          )
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
            {activeAnalysis === 'replies' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rillation-text-muted">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple cursor-pointer"
                >
                  <option value="">All Categories</option>
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Out of Office">Out of Office</option>
                </select>
              </div>
            )}
            <DateRangeFilter
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
              onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
              onPresetChange={handlePresetChange}
              activePreset={datePreset}
            />
          </div>
          <Button variant="secondary" size="sm">
            <Filter size={14} />
            More Filters
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Reply Analysis */}
      {!loading && activeAnalysis === 'replies' && (
        <div className="space-y-6">
          {/* Category Breakdown Chart */}
          {categoryBreakdown.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
                <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-rillation-purple" />
                  Category Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
                <h3 className="text-lg font-semibold text-rillation-text mb-4">Summary Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rillation-bg rounded-lg p-4">
                    <p className="text-2xl font-bold text-rillation-text">{replies.length}</p>
                    <p className="text-xs text-rillation-text-muted">Total Replies</p>
                  </div>
                  <div className="bg-rillation-bg rounded-lg p-4">
                    <p className="text-2xl font-bold text-rillation-green">
                      {replies.filter((r) => r.category === 'Interested').length}
                    </p>
                    <p className="text-xs text-rillation-text-muted">Interested</p>
                  </div>
                  <div className="bg-rillation-bg rounded-lg p-4">
                    <p className="text-2xl font-bold text-rillation-red">
                      {replies.filter((r) => r.category === 'Not Interested').length}
                    </p>
                    <p className="text-xs text-rillation-text-muted">Not Interested</p>
                  </div>
                  <div className="bg-rillation-bg rounded-lg p-4">
                    <p className="text-2xl font-bold text-rillation-orange">
                      {replies.filter((r) => r.category === 'Out of Office').length}
                    </p>
                    <p className="text-xs text-rillation-text-muted">Out of Office</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replies List */}
          <div className="bg-rillation-card rounded-xl border border-rillation-border">
            <div className="p-4 border-b border-rillation-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-rillation-text flex items-center gap-2">
                <MessageSquare size={20} className="text-rillation-purple" />
                Recent Replies
              </h3>
              <span className="text-sm text-rillation-text-muted">
                Showing {replies.length} replies
              </span>
            </div>
            <div className="divide-y divide-rillation-border/30 max-h-[400px] overflow-auto">
              {replies.map((reply) => (
                <div
                  key={reply.reply_id}
                  className="p-4 hover:bg-rillation-card-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getCategoryColor(reply.category)}`}>
                          {reply.category}
                        </span>
                        <span className="text-xs text-rillation-text-muted">{reply.client}</span>
                      </div>
                      <p className="text-sm font-medium text-rillation-text mb-1">
                        {reply.subject || '(No Subject)'}
                      </p>
                      <p className="text-xs text-rillation-text-muted truncate">
                        From: {reply.from_email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-rillation-text-muted">
                        {new Date(reply.date_received).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Engaged Leads Analysis */}
      {!loading && activeAnalysis === 'engaged_leads' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-text">{formatNumber(engagedLeads.length)}</p>
              <p className="text-sm text-rillation-text-muted mt-1">Total Engaged Leads</p>
            </div>
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-purple">{clientBreakdown.length}</p>
              <p className="text-sm text-rillation-text-muted mt-1">Clients</p>
            </div>
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-cyan">
                {engagedLeads.length > 0 ? Math.round(engagedLeads.length / clientBreakdown.length) : 0}
              </p>
              <p className="text-sm text-rillation-text-muted mt-1">Avg per Client</p>
            </div>
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-green">
                {clientBreakdown.length > 0 ? clientBreakdown[0]?.name : '-'}
              </p>
              <p className="text-sm text-rillation-text-muted mt-1">Top Client</p>
            </div>
          </div>

          {/* Client Distribution Chart */}
          {clientBreakdown.length > 0 && (
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-rillation-purple" />
                Leads by Client
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientBreakdown}>
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

          {/* Leads Table */}
          <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
            <div className="p-4 border-b border-rillation-border">
              <h3 className="text-lg font-semibold text-rillation-text">Engaged Leads</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-rillation-card-hover">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rillation-border/30">
                  {engagedLeads.slice(0, 20).map((lead, index) => (
                    <tr key={index} className="hover:bg-rillation-card-hover">
                      <td className="px-4 py-3 text-sm text-rillation-text">{lead.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-rillation-text">{lead.client || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-rillation-purple/20 text-rillation-purple rounded text-xs">
                          {lead.status || 'Engaged'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-rillation-text-muted">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Meetings Analysis */}
      {!loading && activeAnalysis === 'meetings' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-text">{formatNumber(meetings.length)}</p>
              <p className="text-sm text-rillation-text-muted mt-1">Total Meetings</p>
            </div>
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-purple">{clientBreakdown.length}</p>
              <p className="text-sm text-rillation-text-muted mt-1">Clients with Meetings</p>
            </div>
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-cyan">
                {dailyTrend.length > 0 
                  ? Math.round(meetings.length / dailyTrend.length * 10) / 10
                  : 0
                }
              </p>
              <p className="text-sm text-rillation-text-muted mt-1">Avg per Day</p>
            </div>
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <p className="text-3xl font-bold text-rillation-green">
                {Math.max(...dailyTrend.map((d) => d.meetings), 0)}
              </p>
              <p className="text-sm text-rillation-text-muted mt-1">Best Day</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend */}
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-rillation-purple" />
                Daily Trend
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12121a',
                      border: '1px solid #2a2a3a',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="meetings" fill="#d946ef" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By Client */}
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
                <PieChart size={20} className="text-rillation-purple" />
                By Client
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={clientBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {clientBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Meetings Table */}
          <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
            <div className="p-4 border-b border-rillation-border">
              <h3 className="text-lg font-semibold text-rillation-text">Recent Meetings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-rillation-card-hover">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rillation-border/30">
                  {meetings.slice(0, 20).map((meeting, index) => (
                    <tr key={index} className="hover:bg-rillation-card-hover">
                      <td className="px-4 py-3 text-sm text-rillation-text">{meeting.full_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-rillation-text">{meeting.company || '-'}</td>
                      <td className="px-4 py-3 text-sm text-rillation-text">{meeting.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-rillation-text-muted">{meeting.campaign_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-rillation-text-muted">
                        {meeting.created_time 
                          ? new Date(meeting.created_time).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && 
        ((activeAnalysis === 'replies' && replies.length === 0) ||
         (activeAnalysis === 'engaged_leads' && engagedLeads.length === 0) ||
         (activeAnalysis === 'meetings' && meetings.length === 0)) && (
        <div className="text-center py-12 text-rillation-text-muted">
          No data found for the selected filters.
        </div>
      )}
    </div>
  )
}
