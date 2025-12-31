import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Settings } from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import ClickableMetricCard from '../components/ui/ClickableMetricCard'
import TrendChart from '../components/charts/TrendChart'
import TopCampaignsChart from '../components/charts/TopCampaignsChart'
import CampaignBreakdownTable from '../components/ui/CampaignBreakdownTable'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import { useQuickViewData } from '../hooks/useQuickViewData'
import { useCampaignStats } from '../hooks/useCampaignStats'
import { useFirmographicInsights } from '../hooks/useFirmographicInsights'
import { useFilters } from '../contexts/FilterContext'
import { supabase } from '../lib/supabase'
import FirmographicInsightsPanel from '../components/insights/FirmographicInsightsPanel'
import CampaignFilter from '../components/ui/CampaignFilter'

type ChartMetric = 'sent' | 'prospects' | 'replied' | 'positiveReplies' | 'meetings' | null

export default function ClientDetailView() {
  const { clientName } = useParams<{ clientName: string }>()
  const navigate = useNavigate()
  const { dateRange, setSelectedClient, selectedClient } = useFilters()
  
  // Decode client name from URL
  // Guard against literal `:clientName` which indicates a broken URL
  const rawClientName = clientName ? decodeURIComponent(clientName) : ''
  const decodedClientName = rawClientName.startsWith(':') ? '' : rawClientName
  
  // Track if we're setting the filter from URL to prevent navigation loops
  const isSettingFromUrl = useRef(false)
  
  // Set client filter when component mounts or client name changes
  useEffect(() => {
    // Don't set invalid client names
    if (decodedClientName && decodedClientName !== selectedClient && !rawClientName.startsWith(':')) {
      isSettingFromUrl.current = true
      setSelectedClient(decodedClientName)
      setTimeout(() => {
        isSettingFromUrl.current = false
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedClientName, rawClientName])

  // Navigate to new client when filter changes
  useEffect(() => {
    if (!isSettingFromUrl.current && selectedClient && selectedClient !== decodedClientName && selectedClient.trim() !== '') {
      const encodedClientName = encodeURIComponent(selectedClient)
      navigate(`/performance/${encodedClientName}`, { replace: true })
    }
  }, [selectedClient, decodedClientName, navigate])

  // Backspace key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace' && 
          event.target instanceof HTMLElement && 
          event.target.tagName !== 'INPUT' && 
          event.target.tagName !== 'TEXTAREA') {
        event.preventDefault()
        navigate('/performance')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  // State
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>(null)
  const [showConfigureTargets, setShowConfigureTargets] = useState(false)

  // Fetch data - pass selectedCampaigns to filter
  const { metrics, chartData, loading, error } = useQuickViewData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: decodedClientName || undefined,
    campaigns: selectedCampaigns.length > 0 ? selectedCampaigns : undefined,
  })

  const [targets, setTargets] = useState<{
    emailsTarget: number
    prospectsTarget: number
    repliesTarget: number
    meetingsTarget: number
  } | null>(null)

  useEffect(() => {
    async function fetchTargets() {
      if (!decodedClientName) return
      try {
        const { data } = await supabase
          .from('client_targets')
          .select('emails_per_day, prospects_per_day, replies_per_day, meetings_per_day')
          .eq('client', decodedClientName)
          .single()

        type TargetData = {
          emails_per_day: number | null
          prospects_per_day: number | null
          replies_per_day: number | null
          meetings_per_day: number | null
        }
        const targetData = data as TargetData | null

        if (targetData) {
          const numDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
          setTargets({
            emailsTarget: (targetData.emails_per_day || 0) * numDays,
            prospectsTarget: (targetData.prospects_per_day || 0) * numDays,
            repliesTarget: (targetData.replies_per_day || 0) * numDays,
            meetingsTarget: (targetData.meetings_per_day || 0) * numDays,
          })
        }
      } catch (err) {
        console.error('Error fetching targets:', err)
      }
    }
    fetchTargets()
  }, [decodedClientName, dateRange])

  const { campaigns: campaignStats, loading: campaignsLoading } = useCampaignStats({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: decodedClientName || undefined,
    page: 1,
    pageSize: 100,
  })

  const { data: firmographicData, loading: firmographicLoading, error: firmographicError } = useFirmographicInsights({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: decodedClientName || undefined,
    campaigns: selectedCampaigns.length > 0 ? selectedCampaigns : undefined,
  })

  // Get client-specific campaigns from campaignStats
  const clientCampaigns = campaignStats.map(c => c.campaign_name).filter(Boolean) as string[]

  // Helper to get target color
  const getTargetColor = (actual: number, target: number): string => {
    if (target === 0) return 'text-white'
    const percentage = (actual / target) * 100
    if (percentage >= 100) return 'text-green-400'
    if (percentage >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }


  // Handle chart metric click
  const handleChartMetricClick = (metric: ChartMetric) => {
    setSelectedChartMetric(prev => prev === metric ? null : metric)
  }

  // Calculate percentages
  const replyRate = metrics && metrics.uniqueProspects > 0 ? (metrics.totalReplies / metrics.uniqueProspects) * 100 : 0
  const realReplyRate = metrics && metrics.uniqueProspects > 0 ? (metrics.realReplies / metrics.uniqueProspects) * 100 : 0
  const positiveRate = metrics && metrics.realReplies > 0 ? (metrics.positiveReplies / metrics.realReplies) * 100 : 0
  const bounceRate = metrics && metrics.totalEmailsSent > 0 ? (metrics.bounces / metrics.totalEmailsSent) * 100 : 0
  const meetingRate = metrics && metrics.positiveReplies > 0 ? (metrics.meetingsBooked / metrics.positiveReplies) * 100 : 0

  // If we have an invalid client name (like `:clientName`), redirect to performance
  useEffect(() => {
    if (rawClientName.startsWith(':') || !rawClientName) {
      navigate('/performance', { replace: true })
    }
  }, [rawClientName, navigate])

  if (!decodedClientName || !clientName || rawClientName.startsWith(':')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/performance')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white hover:bg-slate-700/60 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/gtm-scoreboard')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white hover:bg-slate-700/60 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <h1 className="text-xl font-bold text-white">{decodedClientName}</h1>
          <button
            onClick={() => setShowConfigureTargets(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-white hover:bg-slate-600/50 transition-colors"
          >
            <Settings size={14} />
            Configure Targets
          </button>
        </div>
        <CampaignFilter
          campaigns={clientCampaigns}
          selectedCampaigns={selectedCampaigns}
          onChange={setSelectedCampaigns}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Main Content */}
      {!loading && metrics && (
        <div className="space-y-6">
          {/* Metrics Grid - Clickable to control chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <ClickableMetricCard
              title="Emails Sent"
              value={metrics.totalEmailsSent}
              colorClass={targets ? getTargetColor(metrics.totalEmailsSent, targets.emailsTarget) : 'text-white'}
              isActive={selectedChartMetric === 'sent'}
              onClick={() => handleChartMetricClick('sent')}
            />
            <ClickableMetricCard
              title="Prospects"
              value={metrics.uniqueProspects}
              colorClass={targets ? getTargetColor(metrics.uniqueProspects, targets.prospectsTarget) : 'text-white'}
              isActive={selectedChartMetric === 'prospects'}
              onClick={() => handleChartMetricClick('prospects')}
            />
            <MetricCard
              title="Total Replies"
              value={metrics.totalReplies}
              percentage={replyRate}
              percentageLabel="incl. OOO"
              colorClass={targets ? getTargetColor(metrics.totalReplies, targets.repliesTarget) : 'text-white'}
            />
            <ClickableMetricCard
              title="Real Replies"
              value={metrics.realReplies}
              percentage={realReplyRate}
              percentageLabel="excl. OOO"
              colorClass={targets ? getTargetColor(metrics.realReplies, targets.repliesTarget) : 'text-white'}
              isActive={selectedChartMetric === 'replied'}
              onClick={() => handleChartMetricClick('replied')}
            />
            <ClickableMetricCard
              title="Interested"
              value={metrics.positiveReplies}
              percentage={positiveRate}
              colorClass="text-green-400"
              isActive={selectedChartMetric === 'positiveReplies'}
              onClick={() => handleChartMetricClick('positiveReplies')}
            />
            <MetricCard
              title="Bounces"
              value={metrics.bounces}
              percentage={bounceRate}
              colorClass="text-red-400"
            />
            <ClickableMetricCard
              title="Meetings"
              value={metrics.meetingsBooked}
              percentage={meetingRate}
              colorClass={targets ? getTargetColor(metrics.meetingsBooked, targets.meetingsTarget) : 'text-white'}
              isActive={selectedChartMetric === 'meetings'}
              onClick={() => handleChartMetricClick('meetings')}
            />
          </div>

          {/* Trend Chart */}
          <TrendChart 
            data={chartData} 
            selectedMetric={selectedChartMetric}
            targets={targets || undefined}
            metrics={metrics}
          />


          {/* Firmographic Analysis */}
          <FirmographicInsightsPanel
            data={firmographicData}
            loading={firmographicLoading}
            error={firmographicError}
          />

          {/* Campaign Performance */}
          {!campaignsLoading && campaignStats.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Campaign Performance</h2>
              <TopCampaignsChart campaigns={campaignStats} maxItems={10} />
            </div>
          )}

          {/* Breakdown by Campaign Table */}
          <CampaignBreakdownTable client={decodedClientName} />
        </div>
      )}

      {/* Configure Targets Modal */}
      <ConfigureTargetsModal
        isOpen={showConfigureTargets}
        client={decodedClientName}
        startDate={dateRange.start}
        endDate={dateRange.end}
        mode="targets"
        onClose={() => setShowConfigureTargets(false)}
        onSave={() => {
          setShowConfigureTargets(false)
          // Refetch targets after save
          const fetchTargets = async () => {
            try {
              const { data } = await supabase
                .from('client_targets')
                .select('emails_per_day, prospects_per_day, replies_per_day, meetings_per_day')
                .eq('client', decodedClientName)
                .single()
              if (data) {
                const numDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                setTargets({
                  emailsTarget: ((data as any).emails_per_day || 0) * numDays,
                  prospectsTarget: ((data as any).prospects_per_day || 0) * numDays,
                  repliesTarget: ((data as any).replies_per_day || 0) * numDays,
                  meetingsTarget: ((data as any).meetings_per_day || 0) * numDays,
                })
              }
            } catch (err) {
              console.error('Error refetching targets:', err)
            }
          }
          fetchTargets()
        }}
      />
    </motion.div>
  )
}
