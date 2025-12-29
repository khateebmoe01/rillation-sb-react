import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Users, MessageSquare, MessageCircle, CheckCircle, XCircle, Calendar } from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import ClickableMetricCard from '../components/ui/ClickableMetricCard'
import TrendChart from '../components/charts/TrendChart'
import TopCampaignsChart from '../components/charts/TopCampaignsChart'
import ExpandableDataPanel from '../components/ui/ExpandableDataPanel'
import CampaignBreakdownTable from '../components/ui/CampaignBreakdownTable'
import MeetingsBookedTable from '../components/ui/MeetingsBookedTable'
import { useQuickViewData } from '../hooks/useQuickViewData'
import { useCampaignStats } from '../hooks/useCampaignStats'
import { useFilters } from '../contexts/FilterContext'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'

const PAGE_SIZE = 15

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
  { key: 'date_received', label: 'Date', format: 'datetime' as const },
]

export default function ClientDetailView() {
  const { clientName } = useParams<{ clientName: string }>()
  const navigate = useNavigate()
  const { dateRange, setSelectedClient, selectedClient } = useFilters()
  
  // Decode client name from URL
  const decodedClientName = clientName ? decodeURIComponent(clientName) : ''
  
  // Track if we're setting the filter from URL to prevent navigation loops
  const isSettingFromUrl = useRef(false)
  
  // Set client filter when component mounts or client name changes
  useEffect(() => {
    if (decodedClientName && decodedClientName !== selectedClient) {
      isSettingFromUrl.current = true
      setSelectedClient(decodedClientName)
      // Reset flag after state update
      setTimeout(() => {
        isSettingFromUrl.current = false
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedClientName]) // Only depend on decodedClientName to avoid loops

  // Navigate to new client when filter changes (but only if it wasn't set from URL)
  useEffect(() => {
    if (!isSettingFromUrl.current && selectedClient && selectedClient !== decodedClientName && selectedClient.trim() !== '') {
      const encodedClientName = encodeURIComponent(selectedClient)
      navigate(`/client-detail/${encodedClientName}`, { replace: true })
    }
  }, [selectedClient, decodedClientName, navigate])

  // Backspace key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Backspace if not typing in an input/textarea
      if (event.key === 'Backspace' && 
          event.target instanceof HTMLElement && 
          event.target.tagName !== 'INPUT' && 
          event.target.tagName !== 'TEXTAREA') {
        event.preventDefault()
        navigate('/performance')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate])

  // Expandable panel state
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

  // Fetch QuickView data
  const { metrics, chartData, loading, error } = useQuickViewData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: decodedClientName || undefined,
  })

  // Fetch campaign stats
  const {
    campaigns: campaignStats,
    loading: campaignsLoading,
  } = useCampaignStats({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: decodedClientName || undefined,
    page: 1,
    pageSize: 100,
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
        let query = supabase
          .from('meetings_booked')
          .select('*', { count: 'exact' })
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .order('created_time', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (decodedClientName) query = query.eq('client', decodedClientName)

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
  }, [activeMetrics, meetingsPage, dateRange, decodedClientName])

  // Fetch replies data when replies panel is active
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
        let query = supabase
          .from('replies')
          .select('*', { count: 'exact' })
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .not('category', 'ilike', '%out of office%')
          .not('category', 'ilike', '%ooo%')
          .order('date_received', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (decodedClientName) query = query.eq('client', decodedClientName)

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
  }, [activeMetrics, repliesPage, dateRange, decodedClientName])

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
        let query = supabase
          .from('replies')
          .select('*', { count: 'exact' })
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .order('date_received', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (decodedClientName) query = query.eq('client', decodedClientName)

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
  }, [activeMetrics, totalRepliesPage, dateRange, decodedClientName])

  // Handle metric click
  const handleMetricClick = (metric: 'meetings' | 'replies' | 'totalReplies') => {
    setActiveMetrics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(metric)) {
        newSet.delete(metric)
      } else {
        newSet.add(metric)
        if (metric === 'meetings') setMeetingsPage(1)
        if (metric === 'replies') setRepliesPage(1)
        if (metric === 'totalReplies') setTotalRepliesPage(1)
      }
      return newSet
    })
  }

  const handleCloseMetric = (metric: 'meetings' | 'replies' | 'totalReplies') => {
    setActiveMetrics(prev => {
      const newSet = new Set(prev)
      newSet.delete(metric)
      return newSet
    })
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

  // Show loading state if client name is not yet decoded
  if (!decodedClientName || !clientName) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate('/performance')}
            className="flex items-center gap-2 px-4 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text hover:bg-rillation-card-hover transition-colors"
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} />
            Back to Performance
          </motion.button>
        </div>
        <div className="flex items-center justify-center py-12">
          <motion.div
            className="w-8 h-8 border-2 border-rillation-text border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </motion.div>
    )
  }

  // Animation variants
  const pageVariants = {
    initial: {
      opacity: 0,
      x: 50,
      scale: 0.95,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.4,
      },
    },
    exit: {
      opacity: 0,
      x: -50,
      scale: 0.95,
      transition: {
        duration: 0.3,
      },
    },
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
  }

  return (
    <motion.div
      className="space-y-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layoutId={`page-${decodedClientName}`}
    >
      {/* Header with Back Button */}
      <motion.div 
        className="flex items-center gap-4"
        variants={itemVariants}
      >
        <motion.button
          onClick={() => navigate('/gtm-scoreboard')}
          className="flex items-center gap-2 px-4 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text hover:bg-rillation-card-hover transition-colors"
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <ArrowLeft size={16} />
          Back to Performance
        </motion.button>
        <motion.h1 
          className="text-2xl font-bold text-rillation-text"
          variants={itemVariants}
        >
          {decodedClientName}
        </motion.h1>
      </motion.div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <motion.div
          className="flex items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-rillation-text border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Metrics Grid */}
      {!loading && metrics && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <MetricCard
                title="Total Email Sent"
                value={metrics.totalEmailsSent}
                icon={<Mail size={18} />}
                trend="up"
                trendValue="-"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MetricCard
                title="Unique Prospects"
                value={metrics.uniqueProspects}
                icon={<Users size={18} />}
                trend="up"
                trendValue="-"
                colorClass="text-rillation-text-muted"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <ClickableMetricCard
                title="Total Replies"
                value={metrics.totalReplies}
                percentage={replyRate}
                percentageLabel="incl. OOO"
                icon={<MessageSquare size={18} />}
                colorClass="text-rillation-text-muted"
                isClickable={true}
                isActive={activeMetrics.has('totalReplies')}
                onClick={() => handleMetricClick('totalReplies')}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <ClickableMetricCard
                title="Real Replies"
                value={metrics.realReplies}
                percentage={realReplyRate}
                percentageLabel="excl. OOO"
                icon={<MessageCircle size={18} />}
                colorClass="text-rillation-text-muted"
                isClickable={true}
                isActive={activeMetrics.has('replies')}
                onClick={() => handleMetricClick('replies')}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MetricCard
                title="Interested"
                value={metrics.positiveReplies}
                percentage={positiveRate}
                icon={<CheckCircle size={18} />}
                trend="up"
                trendValue="-"
                colorClass="text-rillation-green"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MetricCard
                title="Bounces"
                value={metrics.bounces}
                percentage={bounceRate}
                icon={<XCircle size={18} />}
                trend="down"
                trendValue="-"
                colorClass="text-rillation-red"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <ClickableMetricCard
                title="Meetings Booked"
                value={metrics.meetingsBooked}
                percentage={meetingRate}
                icon={<Calendar size={18} />}
                colorClass="text-rillation-text-muted"
                isClickable={true}
                isActive={activeMetrics.has('meetings')}
                onClick={() => handleMetricClick('meetings')}
              />
            </motion.div>
          </motion.div>

          {/* Trend Chart */}
          <motion.div variants={itemVariants}>
            <TrendChart data={chartData} />
          </motion.div>

          {/* Expandable Data Panels */}
          {activeMetrics.size > 0 && (
            <div className={`grid gap-4 ${
              activeMetrics.size === 1 ? 'grid-cols-1' : 
              activeMetrics.size === 2 ? 'grid-cols-1 lg:grid-cols-2' : 
              'grid-cols-1 lg:grid-cols-3'
            }`}>
              {activeMetrics.has('meetings') && (
                meetingsLoading ? (
                  <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-rillation-text border-t-transparent rounded-full animate-spin" />
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
              
              {activeMetrics.has('replies') && (
                repliesLoading ? (
                  <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-rillation-text border-t-transparent rounded-full animate-spin" />
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
              
              {activeMetrics.has('totalReplies') && (
                totalRepliesLoading ? (
                  <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-rillation-text border-t-transparent rounded-full animate-spin" />
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

          {/* Campaign Performance */}
          {!campaignsLoading && campaignStats.length > 0 && (
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-semibold text-rillation-text mb-4">Campaign Performance</h2>
              <TopCampaignsChart campaigns={campaignStats} maxItems={10} />
            </motion.div>
          )}

          {/* Breakdown by Campaign Table */}
          <motion.div variants={itemVariants}>
            <CampaignBreakdownTable client={decodedClientName} />
          </motion.div>

          {/* Meetings Booked with Firmographic Data */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold text-rillation-text mb-4">Meetings Booked Details</h2>
            <MeetingsBookedTable 
              client={decodedClientName}
              startDate={dateRange.start}
              endDate={dateRange.end}
            />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}

