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
import Button from '../components/ui/Button'
import TrendChart from '../components/charts/TrendChart'
import ExpandableDataPanel from '../components/ui/ExpandableDataPanel'
import CampaignsTable from '../components/ui/CampaignsTable'
import CampaignDetailModal from '../components/ui/CampaignDetailModal'
import { useClients } from '../hooks/useClients'
import { useQuickViewData } from '../hooks/useQuickViewData'
import { useCampaignStats } from '../hooks/useCampaignStats'
import { supabase, getDateRange, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import type { CampaignStat } from '../hooks/useCampaignStats'

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
  
  // Expandable panel state - support multiple open panels
  const [activeMetrics, setActiveMetrics] = useState<Set<'meetings' | 'replies' | 'totalReplies'>>(new Set())
  
  // Separate state for each metric panel
  const [meetingsData, setMeetingsData] = useState<any[]>([])
  const [meetingsCount, setMeetingsCount] = useState(0)
  const [meetingsPage, setMeetingsPage] = useState(1)
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  
  const [repliesData, setRepliesData] = useState<any[]>([])
  const [repliesCount, setRepliesCount] = useState(0)
  const [repliesPage, setRepliesPage] = useState(1)
  const [repliesLoading, setRepliesLoading] = useState(false)
  
  const [totalRepliesData, setTotalRepliesData] = useState<any[]>([])
  const [totalRepliesCount, setTotalRepliesCount] = useState(0)
  const [totalRepliesPage, setTotalRepliesPage] = useState(1)
  const [totalRepliesLoading, setTotalRepliesLoading] = useState(false)
  
  // Campaigns table state
  const [campaignsPage, setCampaignsPage] = useState(1)
  const [selectedCampaignForModal, setSelectedCampaignForModal] = useState<CampaignStat | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Fetch data
  const { clients } = useClients()
  const { metrics, chartData, loading, error } = useQuickViewData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: selectedClient || undefined,
  })
  
  // Fetch campaign stats for table
  const {
    campaigns: campaignStats,
    totalCount: campaignsTotalCount,
    loading: campaignsLoading,
    error: campaignsError,
  } = useCampaignStats({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: selectedClient || undefined,
    page: campaignsPage,
    pageSize: 10,
  })

  // Fetch meetings data when meetings panel is active
  useEffect(() => {
    async function fetchMeetingsData() {
      if (!activeMetrics.has('meetings')) {
        setMeetingsData([])
        setMeetingsCount(0)
        return
      }

      setMeetingsLoading(true)
      const startStr = formatDateForQuery(dateRange.start)
      const endStrNextDay = formatDateForQueryEndOfDay(dateRange.end)
      const offset = (meetingsPage - 1) * PAGE_SIZE

      try {
        // created_time is TIMESTAMPTZ, use lt() with next day to include entire end date
        let query = supabase
          .from('meetings_booked')
          .select('*', { count: 'exact' })
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .order('created_time', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (selectedClient) query = query.eq('client', selectedClient)

        const { data, count, error } = await query
        if (error) throw error
        
        setMeetingsData(data || [])
        setMeetingsCount(count || 0)
      } catch (err) {
        console.error('Error fetching meetings data:', err)
      } finally {
        setMeetingsLoading(false)
      }
    }

    fetchMeetingsData()
  }, [activeMetrics, meetingsPage, dateRange, selectedClient])

  // Fetch real replies data when replies panel is active
  useEffect(() => {
    async function fetchRepliesData() {
      if (!activeMetrics.has('replies')) {
        setRepliesData([])
        setRepliesCount(0)
        return
      }

      setRepliesLoading(true)
      const startStr = formatDateForQuery(dateRange.start)
      const endStrNextDay = formatDateForQueryEndOfDay(dateRange.end)
      const offset = (repliesPage - 1) * PAGE_SIZE

      try {
        // date_received is TIMESTAMPTZ, use lt() with next day to include entire end date
        let query = supabase
          .from('replies')
          .select('*', { count: 'exact' })
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .not('category', 'ilike', '%out of office%')
          .not('category', 'ilike', '%ooo%')
          .order('date_received', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (selectedClient) query = query.eq('client', selectedClient)

        const { data, count, error } = await query
        if (error) throw error
        
        setRepliesData(data || [])
        setRepliesCount(count || 0)
      } catch (err) {
        console.error('Error fetching replies data:', err)
      } finally {
        setRepliesLoading(false)
      }
    }

    fetchRepliesData()
  }, [activeMetrics, repliesPage, dateRange, selectedClient])

  // Fetch total replies data when totalReplies panel is active
  useEffect(() => {
    async function fetchTotalRepliesData() {
      if (!activeMetrics.has('totalReplies')) {
        setTotalRepliesData([])
        setTotalRepliesCount(0)
        return
      }

      setTotalRepliesLoading(true)
      const startStr = formatDateForQuery(dateRange.start)
      const endStrNextDay = formatDateForQueryEndOfDay(dateRange.end)
      const offset = (totalRepliesPage - 1) * PAGE_SIZE

      try {
        // date_received is TIMESTAMPTZ, use lt() with next day to include entire end date
        let query = supabase
          .from('replies')
          .select('*', { count: 'exact' })
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .order('date_received', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (selectedClient) query = query.eq('client', selectedClient)

        const { data, count, error } = await query
        if (error) throw error
        
        setTotalRepliesData(data || [])
        setTotalRepliesCount(count || 0)
      } catch (err) {
        console.error('Error fetching total replies data:', err)
      } finally {
        setTotalRepliesLoading(false)
      }
    }

    fetchTotalRepliesData()
  }, [activeMetrics, totalRepliesPage, dateRange, selectedClient])

  // Handle metric click - toggle metric in Set
  const handleMetricClick = (metric: 'meetings' | 'replies' | 'totalReplies') => {
    setActiveMetrics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(metric)) {
        newSet.delete(metric)
      } else {
        newSet.add(metric)
        // Reset page when opening a panel
        if (metric === 'meetings') setMeetingsPage(1)
        if (metric === 'replies') setRepliesPage(1)
        if (metric === 'totalReplies') setTotalRepliesPage(1)
      }
      return newSet
    })
  }
  
  // Handle closing a specific metric panel
  const handleCloseMetric = (metric: 'meetings' | 'replies' | 'totalReplies') => {
    setActiveMetrics(prev => {
      const newSet = new Set(prev)
      newSet.delete(metric)
      return newSet
    })
  }

  // Handle date preset change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    setDateRange(getDateRange(preset))
    setActiveMetrics(new Set())
  }

  // Handle clear filters - resets to show ALL historical data
  const handleClear = () => {
    setSelectedClient('')
    setDatePreset('allTime')
    // Set a very wide date range to show all historical data (from 2000 to today)
    const allTimeRange = {
      start: new Date(2000, 0, 1), // January 1, 2000 (go back 25 years)
      end: new Date() // Today
    }
    setDateRange(allTimeRange)
    setActiveMetrics(new Set())
    setCampaignsPage(1)
    setMeetingsPage(1)
    setRepliesPage(1)
    setTotalRepliesPage(1)
  }
  
  // Handle campaign row click
  const handleCampaignRowClick = (campaign: CampaignStat) => {
    setSelectedCampaignForModal(campaign)
    setIsModalOpen(true)
  }
  
  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedCampaignForModal(null)
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
              isActive={activeMetrics.has('totalReplies')}
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
              isActive={activeMetrics.has('replies')}
              onClick={() => handleMetricClick('replies')}
            />
            <MetricCard
              title="Interested"
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
              isActive={activeMetrics.has('meetings')}
              onClick={() => handleMetricClick('meetings')}
            />
          </div>

          {/* Trend Chart */}
          <TrendChart data={chartData} />

          {/* Expandable Data Panels - ABOVE Campaign Table, side by side */}
          {activeMetrics.size > 0 && (
            <div className={`grid gap-4 ${
              activeMetrics.size === 1 ? 'grid-cols-1' : 
              activeMetrics.size === 2 ? 'grid-cols-1 lg:grid-cols-2' : 
              'grid-cols-1 lg:grid-cols-3'
            }`}>
              {/* Meetings Panel */}
              {activeMetrics.has('meetings') && (
                meetingsLoading ? (
                  <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ExpandableDataPanel
                    title="Meetings Booked"
                    data={meetingsData}
                    columns={meetingsColumns}
                    totalCount={meetingsCount}
                    currentPage={meetingsPage}
                    pageSize={PAGE_SIZE}
                    onPageChange={setMeetingsPage}
                    onClose={() => handleCloseMetric('meetings')}
                    isOpen={true}
                  />
                )
              )}
              
              {/* Real Replies Panel */}
              {activeMetrics.has('replies') && (
                repliesLoading ? (
                  <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ExpandableDataPanel
                    title="Real Replies"
                    data={repliesData}
                    columns={repliesColumns}
                    totalCount={repliesCount}
                    currentPage={repliesPage}
                    pageSize={PAGE_SIZE}
                    onPageChange={setRepliesPage}
                    onClose={() => handleCloseMetric('replies')}
                    isOpen={true}
                  />
                )
              )}
              
              {/* Total Replies Panel */}
              {activeMetrics.has('totalReplies') && (
                totalRepliesLoading ? (
                  <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ExpandableDataPanel
                    title="Total Replies"
                    data={totalRepliesData}
                    columns={repliesColumns}
                    totalCount={totalRepliesCount}
                    currentPage={totalRepliesPage}
                    pageSize={PAGE_SIZE}
                    onPageChange={setTotalRepliesPage}
                    onClose={() => handleCloseMetric('totalReplies')}
                    isOpen={true}
                  />
                )
              )}
            </div>
          )}

          {/* Campaigns Table - BELOW the panels */}
          {campaignsError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              Error loading campaigns: {campaignsError}
            </div>
          )}
          <CampaignsTable
            campaigns={campaignStats}
            totalCount={campaignsTotalCount}
            currentPage={campaignsPage}
            pageSize={10}
            loading={campaignsLoading}
            selectedCampaign={selectedCampaignForModal?.campaign_name || null}
            onPageChange={setCampaignsPage}
            onRowClick={handleCampaignRowClick}
          />

          {/* Campaign Detail Modal */}
          <CampaignDetailModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            campaign={selectedCampaignForModal}
            startDate={dateRange.start}
            endDate={dateRange.end}
            clientFilter={selectedClient || undefined}
          />
        </>
      )}
    </div>
  )
}
