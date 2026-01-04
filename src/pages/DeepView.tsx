import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, ChevronDown, X } from 'lucide-react'
import { useFilters } from '../contexts/FilterContext'
import { useDeepInsights } from '../hooks/useDeepInsights'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import InsightsSummaryBar from '../components/insights/InsightsSummaryBar'
import ReplyInsightsPanel from '../components/insights/ReplyInsightsPanel'
import EngagedLeadsPanel from '../components/insights/EngagedLeadsPanel'
import MeetingsInsightsPanel from '../components/insights/MeetingsInsightsPanel'
import ExpandableDataPanel from '../components/ui/ExpandableDataPanel'
import ReplyDetailModal from '../components/ui/ReplyDetailModal'
import type { Reply, MeetingBooked } from '../types/database'

const PAGE_SIZE = 15

const repliesColumns = [
  { key: 'from_email', label: 'From' },
  { key: 'subject', label: 'Subject' },
  { key: 'category', label: 'Category' },
  { key: 'client', label: 'Client' },
  { key: 'date_received', label: 'Date', format: 'datetime' as const },
]

const meetingsColumns = [
  { key: 'full_name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'industry', label: 'Industry' },
  { key: 'company_hq_state', label: 'State' },
  { key: 'campaign_name', label: 'Campaign' },
  { key: 'created_time', label: 'Date', format: 'date' as const },
]

const engagedLeadsColumns = [
  { key: 'email', label: 'Email' },
  { key: 'client', label: 'Client' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date', format: 'datetime' as const },
]

export default function DeepView() {
  const { selectedClient, dateRange } = useFilters()
  
  // Deep insights data
  const { data, loading, error, refetch } = useDeepInsights({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: selectedClient || undefined,
  })

  // Expanded panels state
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set())
  const [activeMetric, setActiveMetric] = useState<string | null>(null)

  // Detail table data
  const [repliesData, setRepliesData] = useState<Reply[]>([])
  const [repliesPage, setRepliesPage] = useState(1)
  const [repliesCount, setRepliesCount] = useState(0)
  const [repliesLoading, setRepliesLoading] = useState(false)

  const [meetingsData, setMeetingsData] = useState<MeetingBooked[]>([])
  const [meetingsPage, setMeetingsPage] = useState(1)
  const [meetingsCount, setMeetingsCount] = useState(0)
  const [meetingsLoading, setMeetingsLoading] = useState(false)

  const [leadsData, setLeadsData] = useState<any[]>([])
  const [leadsPage, setLeadsPage] = useState(1)
  const [leadsCount, setLeadsCount] = useState(0)
  const [leadsLoading, setLeadsLoading] = useState(false)

  // Reply modal
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null)
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false)
  
  // Handle metric click in summary bar
  const handleMetricClick = (metric: string) => {
    setActiveMetric(activeMetric === metric ? null : metric)
    
    // Auto-expand relevant panel
    if (metric === 'replies' || metric === 'interested' || metric === 'notInterested' || metric === 'ooo') {
      setExpandedPanels(prev => {
        const newSet = new Set(prev)
        if (!newSet.has('replies')) {
          newSet.add('replies')
        }
        return newSet
      })
    } else if (metric === 'leads') {
      setExpandedPanels(prev => {
        const newSet = new Set(prev)
        if (!newSet.has('leads')) {
          newSet.add('leads')
        }
        return newSet
      })
    } else if (metric === 'meetings') {
      setExpandedPanels(prev => {
        const newSet = new Set(prev)
        if (!newSet.has('meetings')) {
          newSet.add('meetings')
        }
        return newSet
      })
    }
  }

  // Toggle panel expansion
  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(panel)) {
        newSet.delete(panel)
      } else {
        newSet.add(panel)
      }
      return newSet
    })
  }

  // Fetch replies data when panel is expanded - show UNIQUE leads only
  useEffect(() => {
    async function fetchRepliesData() {
      if (!expandedPanels.has('replies')) return

      setRepliesLoading(true)
      const startStr = formatDateForQuery(dateRange.start)
      const endStrNextDay = formatDateForQueryEndOfDay(dateRange.end)
      const offset = (repliesPage - 1) * PAGE_SIZE

      try {
          // Fetch ALL replies to deduplicate (we need to do this client-side)
          let query = supabase
            .from('replies')
            .select('*')
            .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
            .order('date_received', { ascending: false })

          if (selectedClient) query = query.eq('client', selectedClient)

        const { data, error } = await query
        if (error) throw error

        // Deduplicate by lead_id or from_email, keeping the most recent reply per lead
        const seenLeads = new Map<string, any>()
        ;(data || []).forEach((reply: any) => {
          const uniqueKey = reply.lead_id || reply.from_email || ''
          if (!uniqueKey) return
          
          // Only keep if we haven't seen this lead yet (first occurrence is most recent due to ordering)
          if (!seenLeads.has(uniqueKey)) {
            seenLeads.set(uniqueKey, reply)
          }
        })
        
        // Convert to array and apply pagination
        const uniqueReplies = Array.from(seenLeads.values())
        const totalUniqueCount = uniqueReplies.length
        const paginatedReplies = uniqueReplies.slice(offset, offset + PAGE_SIZE)

        setRepliesData(paginatedReplies)
        setRepliesCount(totalUniqueCount)
      } catch (err) {
        console.error('Error fetching replies:', err)
      } finally {
        setRepliesLoading(false)
      }
    }

    fetchRepliesData()
  }, [expandedPanels, repliesPage, dateRange, selectedClient])

  // Fetch meetings data when panel is expanded
  useEffect(() => {
    async function fetchMeetingsData() {
      if (!expandedPanels.has('meetings')) return

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

        if (selectedClient) query = query.eq('client', selectedClient)

        const { data, count, error } = await query
        if (error) throw error

        setMeetingsData(data || [])
        setMeetingsCount(count || 0)
      } catch (err) {
        console.error('Error fetching meetings:', err)
      } finally {
        setMeetingsLoading(false)
      }
    }

    fetchMeetingsData()
  }, [expandedPanels, meetingsPage, dateRange, selectedClient])

  // Fetch engaged leads data when panel is expanded
  useEffect(() => {
    async function fetchLeadsData() {
      if (!expandedPanels.has('leads')) return

      setLeadsLoading(true)
      const offset = (leadsPage - 1) * PAGE_SIZE

      try {
          let query = supabase
            .from('engaged_leads')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)

          if (selectedClient) query = query.eq('client', selectedClient)

        const { data, count, error } = await query
        if (error) throw error

        setLeadsData(data || [])
        setLeadsCount(count || 0)
      } catch (err) {
        console.error('Error fetching leads:', err)
      } finally {
        setLeadsLoading(false)
      }
    }

    fetchLeadsData()
  }, [expandedPanels, leadsPage, selectedClient])

  // Reset pagination when filters change
  useEffect(() => {
    setRepliesPage(1)
    setMeetingsPage(1)
    setLeadsPage(1)
  }, [selectedClient, dateRange])

  // Handle row click for replies table
  const handleReplyClick = (row: any) => {
    setSelectedReply(row as Reply)
    setIsReplyModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2 rounded-xl bg-gradient-to-br from-rillation-purple/20 to-rillation-magenta/20 border border-rillation-purple/30"
            animate={{
              boxShadow: [
                '0 0 20px rgba(168, 85, 247, 0.1)',
                '0 0 30px rgba(168, 85, 247, 0.2)',
                '0 0 20px rgba(168, 85, 247, 0.1)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles size={24} className="text-rillation-purple" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-white">Deep Insights</h1>
            <p className="text-xs text-white">
              Comprehensive analytics across replies, leads & meetings
            </p>
          </div>
        </div>
        <motion.button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rillation-card border border-rillation-border text-white hover:text-white hover:border-rillation-purple/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="text-sm">Refresh</span>
        </motion.button>
      </motion.div>

      {/* Error State */}
      <AnimatePresence>
      {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400"
          >
          {error}
          </motion.div>
      )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {loading && !data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              className="w-12 h-12 border-3 border-rillation-purple border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="mt-4 text-sm text-white">Loading insights...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {data && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Summary Bar */}
          <InsightsSummaryBar
            totalReplies={data.totalReplies}
            interested={data.interestedCount}
            notInterested={data.notInterestedCount}
            outOfOffice={data.outOfOfficeCount}
            engagedLeads={data.engagedLeadsCount}
            meetingsBooked={data.meetingsBookedCount}
            onMetricClick={handleMetricClick}
            activeMetric={activeMetric || undefined}
          />

          {/* Row 1: Reply Insights + Engaged Leads */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Reply Insights Panel */}
            <ReplyInsightsPanel
              categoryBreakdown={data.repliesByCategory}
              repliesByDay={data.repliesByDay}
              campaignPerformance={data.campaignPerformance}
              avgRepliesPerDay={data.avgRepliesPerDay}
              bestDay={data.bestDay}
              onExpandClick={() => togglePanel('replies')}
              isExpanded={expandedPanels.has('replies')}
            />

            {/* Engaged Leads Panel */}
            <EngagedLeadsPanel
              totalLeads={data.engagedLeadsCount}
              leadsByClient={data.engagedLeadsByClient}
              onExpandClick={() => togglePanel('leads')}
              isExpanded={expandedPanels.has('leads')}
            />
              </div>
              
          {/* Row 2: Meetings Insights - Full Width */}
          <MeetingsInsightsPanel
            totalMeetings={data.meetingsBookedCount}
            meetingsByIndustry={data.meetingsByIndustry}
            meetingsByState={data.meetingsByState}
            meetingsByRevenue={data.meetingsByRevenue}
            meetingsByCompanyAge={data.meetingsByCompanyAge}
            meetingsByDay={data.meetingsByDay}
            onExpandClick={() => togglePanel('meetings')}
            isExpanded={expandedPanels.has('meetings')}
          />

          {/* Expandable Detail Tables */}
          <AnimatePresence>
            {expandedPanels.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChevronDown size={16} className="text-white" />
                    <span className="text-sm font-medium text-white">
                      Detail Tables
                        </span>
                  </div>
                  <motion.button
                    onClick={() => setExpandedPanels(new Set())}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-white hover:text-white hover:bg-rillation-card-hover transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <X size={14} />
                    Close All
                  </motion.button>
                </div>

                {/* Tables Grid */}
                <div className={`grid gap-4 ${
                  expandedPanels.size === 1 ? 'grid-cols-1' :
                  expandedPanels.size === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                  'grid-cols-1'
                }`}>
                  {/* Replies Table */}
                  {expandedPanels.has('replies') && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      {repliesLoading && repliesData.length === 0 ? (
                        <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-rillation-cyan border-t-transparent rounded-full animate-spin" />
              </div>
                      ) : (
                        <ExpandableDataPanel
                          title="All Replies"
                          data={repliesData}
                          columns={repliesColumns}
                          totalCount={repliesCount}
                          currentPage={repliesPage}
                          pageSize={PAGE_SIZE}
                          onPageChange={setRepliesPage}
                          onClose={() => togglePanel('replies')}
                          isOpen={true}
                          onRowClick={handleReplyClick}
                        />
                      )}
                    </motion.div>
                  )}

                  {/* Engaged Leads Table */}
                  {expandedPanels.has('leads') && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      {leadsLoading && leadsData.length === 0 ? (
                        <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
                      ) : (
                        <ExpandableDataPanel
                          title="Engaged Leads"
                          data={leadsData}
                          columns={engagedLeadsColumns}
                          totalCount={leadsCount}
                          currentPage={leadsPage}
                          pageSize={PAGE_SIZE}
                          onPageChange={setLeadsPage}
                          onClose={() => togglePanel('leads')}
                          isOpen={true}
                        />
                      )}
                    </motion.div>
                  )}

                  {/* Meetings Table */}
                  {expandedPanels.has('meetings') && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      {meetingsLoading && meetingsData.length === 0 ? (
                        <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-rillation-magenta border-t-transparent rounded-full animate-spin" />
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
                          onClose={() => togglePanel('meetings')}
                          isOpen={true}
                        />
                      )}
                    </motion.div>
                )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && data && data.totalReplies === 0 && data.meetingsBookedCount === 0 && data.engagedLeadsCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-rillation-card border border-rillation-border flex items-center justify-center mb-4">
            <Sparkles size={24} className="text-white" />
        </div>
          <h3 className="text-lg font-medium text-white mb-2">No Data Found</h3>
          <p className="text-sm text-white max-w-md">
            No insights available for the selected date range and filters. Try adjusting your filters or selecting a different time period.
          </p>
        </motion.div>
      )}

      {/* Reply Detail Modal */}
      <ReplyDetailModal
        isOpen={isReplyModalOpen}
        onClose={() => {
          setIsReplyModalOpen(false)
          setSelectedReply(null)
        }}
        reply={selectedReply}
      />
    </div>
  )
}
