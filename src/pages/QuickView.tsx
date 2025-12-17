import { useState, useEffect } from 'react'
import { 
  Mail, 
  Users, 
  MessageSquare, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Download
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import ClickableMetricCard from '../components/ui/ClickableMetricCard'
import DateRangeFilter from '../components/ui/DateRangeFilter'
import ClientFilter from '../components/ui/ClientFilter'
import CampaignFilter from '../components/ui/CampaignFilter'
import Button from '../components/ui/Button'
import TrendChart from '../components/charts/TrendChart'
import ExpandableDataPanel from '../components/ui/ExpandableDataPanel'
import { useClients } from '../hooks/useClients'
import { useCampaigns } from '../hooks/useCampaigns'
import { useQuickViewData } from '../hooks/useQuickViewData'
import { supabase, getDateRange, formatDateForQuery } from '../lib/supabase'

const PAGE_SIZE = 15

// Column definitions for data panels
const meetingsColumns = [
  { key: 'full_name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'title', label: 'Title' },
  { key: 'campaign_name', label: 'Campaign' },
  { key: 'created_time', label: 'Date', format: 'date' as const },
]

const repliesColumns = [
  { key: 'from_email', label: 'From' },
  { key: 'subject', label: 'Subject' },
  { key: 'category', label: 'Category' },
  { key: 'client', label: 'Client' },
  { key: 'date_received', label: 'Date', format: 'datetime' as const },
]

export default function QuickView() {
  // Date state
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))
  
  // Filter state
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('')
  
  // Expandable panel state
  const [activeMetric, setActiveMetric] = useState<'meetings' | 'replies' | 'totalReplies' | null>(null)
  const [panelData, setPanelData] = useState<any[]>([])
  const [panelTotalCount, setPanelTotalCount] = useState(0)
  const [panelPage, setPanelPage] = useState(1)
  const [panelLoading, setPanelLoading] = useState(false)
  
  // Fetch data
  const { clients } = useClients()
  const { campaigns } = useCampaigns(selectedClient)
  const { metrics, chartData, loading, error } = useQuickViewData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: selectedClient || undefined,
    campaign: selectedCampaign || undefined,
  })

  // Fetch panel data when metric is clicked
  useEffect(() => {
    async function fetchPanelData() {
      if (!activeMetric) {
        setPanelData([])
        setPanelTotalCount(0)
        return
      }

      setPanelLoading(true)
      const startStr = formatDateForQuery(dateRange.start)
      const endStr = formatDateForQuery(dateRange.end)
      const offset = (panelPage - 1) * PAGE_SIZE

      try {
        if (activeMetric === 'meetings') {
          // Fetch meetings
          let query = supabase
            .from('meetings_booked')
            .select('*', { count: 'exact' })
            .gte('created_time', startStr)
            .lte('created_time', endStr)
            .order('created_time', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)

          if (selectedClient) query = query.eq('client', selectedClient)

          const { data, count, error } = await query
          if (error) throw error
          
          setPanelData(data || [])
          setPanelTotalCount(count || 0)
        } else if (activeMetric === 'replies') {
          // Fetch real replies (excluding Out Of Office - case insensitive)
          let query = supabase
            .from('replies')
            .select('*', { count: 'exact' })
            .gte('date_received', startStr)
            .lte('date_received', endStr)
            .not('category', 'ilike', '%out of office%')
            .not('category', 'ilike', '%ooo%')
            .order('date_received', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)

          if (selectedClient) query = query.eq('client', selectedClient)

          const { data, count, error } = await query
          if (error) throw error
          
          setPanelData(data || [])
          setPanelTotalCount(count || 0)
        } else if (activeMetric === 'totalReplies') {
          // Fetch ALL replies (including Out Of Office)
          let query = supabase
            .from('replies')
            .select('*', { count: 'exact' })
            .gte('date_received', startStr)
            .lte('date_received', endStr)
            .order('date_received', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)

          if (selectedClient) query = query.eq('client', selectedClient)

          const { data, count, error } = await query
          if (error) throw error
          
          setPanelData(data || [])
          setPanelTotalCount(count || 0)
        }
      } catch (err) {
        console.error('Error fetching panel data:', err)
      } finally {
        setPanelLoading(false)
      }
    }

    fetchPanelData()
  }, [activeMetric, panelPage, dateRange, selectedClient])

  // Handle metric click
  const handleMetricClick = (metric: 'meetings' | 'replies' | 'totalReplies') => {
    if (activeMetric === metric) {
      setActiveMetric(null)
    } else {
      setActiveMetric(metric)
      setPanelPage(1)
    }
  }

  // Handle date preset change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    setDateRange(getDateRange(preset))
    setActiveMetric(null)
  }

  // Handle clear filters - ALSO resets date range
  const handleClear = () => {
    setSelectedClient('')
    setSelectedCampaign('')
    setDatePreset('thisMonth')
    setDateRange(getDateRange('thisMonth'))
    setActiveMetric(null)
  }

  // Calculate percentages
  const replyRate = metrics && metrics.uniqueProspects > 0 
    ? (metrics.totalReplies / metrics.uniqueProspects) * 100 
    : 0
  
  const realReplyRate = metrics && metrics.uniqueProspects > 0 
    ? (metrics.realReplies / metrics.uniqueProspects) * 100 
    : 0
    
  const positiveRate = metrics && metrics.realReplies > 0 
    ? (metrics.positiveReplies / metrics.realReplies) * 100 
    : 0
    
  const bounceRate = metrics && metrics.totalEmailsSent > 0 
    ? (metrics.bounces / metrics.totalEmailsSent) * 100 
    : 0
    
  const meetingRate = metrics && metrics.positiveReplies > 0 
    ? (metrics.meetingsBooked / metrics.positiveReplies) * 100 
    : 0

  return (
    <div className="space-y-6 fade-in">
      {/* Filters Bar */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
            <CampaignFilter
              campaigns={campaigns}
              selectedCampaign={selectedCampaign}
              onChange={setSelectedCampaign}
            />
            <DateRangeFilter
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
              onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
              onPresetChange={handlePresetChange}
              activePreset={datePreset}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button variant="primary" size="sm">
              <Download size={14} />
              Save Report
            </Button>
          </div>
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

      {/* Metrics Grid */}
      {!loading && metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 stagger-children">
            <MetricCard
              title="Total Email Sent"
              value={metrics.totalEmailsSent}
              icon={<Mail size={18} />}
              trend="up"
              trendValue="-"
            />
            <MetricCard
              title="Unique Prospects"
              value={metrics.uniqueProspects}
              icon={<Users size={18} />}
              trend="up"
              trendValue="-"
              colorClass="text-rillation-orange"
            />
            {/* Clickable Total Replies */}
            <ClickableMetricCard
              title="Total Replies"
              value={metrics.totalReplies}
              percentage={replyRate}
              percentageLabel="incl. OOO"
              icon={<MessageSquare size={18} />}
              colorClass="text-rillation-cyan"
              isClickable={true}
              isActive={activeMetric === 'totalReplies'}
              onClick={() => handleMetricClick('totalReplies')}
            />
            {/* Clickable Real Replies */}
            <ClickableMetricCard
              title="Real Replies"
              value={metrics.realReplies}
              percentage={realReplyRate}
              percentageLabel="excl. OOO"
              icon={<MessageCircle size={18} />}
              colorClass="text-rillation-cyan"
              isClickable={true}
              isActive={activeMetric === 'replies'}
              onClick={() => handleMetricClick('replies')}
            />
            <MetricCard
              title="Positive Replies"
              value={metrics.positiveReplies}
              percentage={positiveRate}
              icon={<CheckCircle size={18} />}
              trend="up"
              trendValue="-"
              colorClass="text-rillation-green"
            />
            <MetricCard
              title="Bounces"
              value={metrics.bounces}
              percentage={bounceRate}
              icon={<XCircle size={18} />}
              trend="down"
              trendValue="-"
              colorClass="text-rillation-red"
            />
            {/* Clickable Meetings Booked */}
            <ClickableMetricCard
              title="Meetings Booked"
              value={metrics.meetingsBooked}
              percentage={meetingRate}
              icon={<Calendar size={18} />}
              colorClass="text-rillation-magenta"
              isClickable={true}
              isActive={activeMetric === 'meetings'}
              onClick={() => handleMetricClick('meetings')}
            />
          </div>

          {/* Trend Chart */}
          <TrendChart data={chartData} />

          {/* Expandable Data Panel */}
          <ExpandableDataPanel
            title={
              activeMetric === 'meetings' ? 'Meetings Booked' :
              activeMetric === 'totalReplies' ? 'Total Replies' :
              'Real Replies'
            }
            data={panelData}
            columns={activeMetric === 'meetings' ? meetingsColumns : repliesColumns}
            totalCount={panelTotalCount}
            currentPage={panelPage}
            pageSize={PAGE_SIZE}
            onPageChange={setPanelPage}
            onClose={() => setActiveMetric(null)}
            isOpen={activeMetric !== null && !panelLoading}
          />
          
          {/* Panel Loading */}
          {activeMetric && panelLoading && (
            <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
