import { useState, useMemo, useEffect } from 'react'
import FunnelChart from '../components/charts/FunnelChart'
import OpportunityPipeline from '../components/charts/OpportunityPipeline'
import InlineLeadsTable from '../components/ui/InlineLeadsTable'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import OpportunityStageModal from '../components/ui/OpportunityStageModal'
import CompactSalesMetrics from '../components/ui/CompactSalesMetrics'
import PipelineMetricsSection from '../components/ui/PipelineMetricsSection'
import { usePipelineData } from '../hooks/usePipelineData'
import { useQuickViewData } from '../hooks/useQuickViewData'
import { useFilters } from '../contexts/FilterContext'
import { useSalesMetrics } from '../hooks/useSalesMetrics'
import { useOpportunities } from '../hooks/useOpportunities'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'

// Helper to shift weekend dates to weekdays
function shiftWeekendDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00') // noon to avoid timezone issues
  const dayOfWeek = date.getDay()
  
  if (dayOfWeek === 0) { // Sunday -> Monday
    date.setDate(date.getDate() + 1)
  } else if (dayOfWeek === 6) { // Saturday -> Friday
    date.setDate(date.getDate() - 1)
  }
  
  return date.toISOString().split('T')[0]
}

// Helper to format date for display
function formatDateDisplay(dateStr: string): string {
  const [_year, month, day] = dateStr.split('-').map(Number)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[month - 1]} ${day}`
}

export default function PipelineView() {
  // Get current month/year
  const now = new Date()
  const selectedMonth = now.getMonth() + 1
  const selectedYear = now.getFullYear()
  
  // Use global filter state
  const { dateRange, selectedClient } = useFilters()

  // Inline table state
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  
  // Configure targets modal state
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  
  // Opportunity stage modal state
  const [selectedOpportunityStage, setSelectedOpportunityStage] = useState<string | null>(null)
  
  // Fetch data using global date range
  const { funnelStages, loading, error, refetch } = usePipelineData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    month: selectedMonth,
    year: selectedYear,
  })

  // Fetch opportunities with refetch capability
  const { stages: opportunityStages, loading: opportunitiesLoading, error: opportunitiesError, refetch: refetchOpportunities } = useOpportunities({ client: 'Rillation Revenue' })

  // Fetch sales metrics
  const { dailyMetrics, summary, loading: salesLoading, error: salesError } = useSalesMetrics({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: selectedClient || undefined,
  })

  // Fetch performance data for chart dates template
  const { chartData: performanceChartData, loading: performanceLoading } = useQuickViewData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: 'Rillation Revenue',
  })

  // State for actual daily pipeline data
  const [dailyPipelineData, setDailyPipelineData] = useState<Map<string, {
    meetingsBooked: number
    showedUp: number
    qualified: number
    demo: number
    proposalSent: number
    closed: number
  }>>(new Map())

  // Fetch actual daily data for meetings_booked and engaged_leads
  useEffect(() => {
    async function fetchDailyData() {
      const startStr = formatDateForQuery(dateRange.start)
      const endStrNextDay = formatDateForQueryEndOfDay(dateRange.end)

      try {
        // Fetch meetings_booked with created_time
        const { data: meetingsData } = await supabase
          .from('meetings_booked')
          .select('created_time')
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .eq('client', 'Rillation Revenue')

        // Fetch engaged_leads with stage info
        const { data: engagedData } = await supabase
          .from('engaged_leads')
          .select('date_created, showed_up_to_disco, qualified, demo_booked, showed_up_to_demo, proposal_sent, closed')
          .gte('date_created', startStr)
          .lte('date_created', formatDateForQuery(dateRange.end))
          .eq('client', 'Rillation Revenue')

        // Group by date with weekend shifting
        const dailyMap = new Map<string, {
          meetingsBooked: number
          showedUp: number
          qualified: number
          demo: number
          proposalSent: number
          closed: number
        }>()

        // Process meetings_booked
        ;(meetingsData || []).forEach((meeting: any) => {
          if (!meeting.created_time) return
          const rawDate = meeting.created_time.split('T')[0]
          const shiftedDate = shiftWeekendDate(rawDate)
          
          if (!dailyMap.has(shiftedDate)) {
            dailyMap.set(shiftedDate, { meetingsBooked: 0, showedUp: 0, qualified: 0, demo: 0, proposalSent: 0, closed: 0 })
          }
          dailyMap.get(shiftedDate)!.meetingsBooked += 1
        })

        // Process engaged_leads by their stage on that date
        ;(engagedData || []).forEach((lead: any) => {
          if (!lead.date_created) return
          const shiftedDate = shiftWeekendDate(lead.date_created)
          
          if (!dailyMap.has(shiftedDate)) {
            dailyMap.set(shiftedDate, { meetingsBooked: 0, showedUp: 0, qualified: 0, demo: 0, proposalSent: 0, closed: 0 })
          }
          const entry = dailyMap.get(shiftedDate)!
          
          // Count based on stage flags
          if (lead.closed) entry.closed += 1
          else if (lead.proposal_sent) entry.proposalSent += 1
          else if (lead.showed_up_to_demo) entry.demo += 1
          else if (lead.demo_booked) entry.demo += 1
          else if (lead.qualified) entry.qualified += 1
          else if (lead.showed_up_to_disco) entry.showedUp += 1
        })

        setDailyPipelineData(dailyMap)
      } catch (err) {
        console.error('Error fetching daily pipeline data:', err)
      }
    }

    fetchDailyData()
  }, [dateRange.start, dateRange.end])

  // Build pipeline chart data with actual daily values (non-cumulative)
  const pipelineChartData = useMemo(() => {
    // Use the performance chart data dates as a template
    return performanceChartData.map((point) => {
      // Parse date from display format or use raw date
      // performanceChartData uses format like "Jan 1"
      // We need to match this to our dailyPipelineData keys which are YYYY-MM-DD
      
      // Get the daily data for this date
      const dailyData = dailyPipelineData.get(point.date) || {
        meetingsBooked: 0,
        showedUp: 0,
        qualified: 0,
        demo: 0,
        proposalSent: 0,
        closed: 0,
      }
      
      return {
        date: point.date,
        meetingsBooked: dailyData.meetingsBooked,
        showedUp: dailyData.showedUp,
        qualified: dailyData.qualified,
        demo: dailyData.demo,
        proposalSent: dailyData.proposalSent,
        closed: dailyData.closed,
      }
    })
  }, [performanceChartData, dailyPipelineData])

  // Build pipeline metrics object
  const pipelineMetrics = useMemo(() => ({
    meetingsBooked: funnelStages.find(s => s.name === 'Meetings Booked')?.value || 0,
    showedUp: funnelStages.find(s => s.name === 'Showed Up to Disco')?.value || 0,
    qualified: funnelStages.find(s => s.name === 'Qualified')?.value || 0,
    demo: funnelStages.find(s => s.name === 'Showed Up to Demo')?.value || 0,
    proposalSent: funnelStages.find(s => s.name === 'Proposal Sent')?.value || 0,
    closed: funnelStages.find(s => s.name === 'Closed')?.value || 0,
  }), [funnelStages])

  // Handle funnel stage click - toggle selection
  const handleStageClick = (stageName: string, _stageIndex: number) => {
    if (selectedStage === stageName) {
      setSelectedStage(null)
    } else {
      setSelectedStage(stageName)
    }
  }

  // Handle table close
  const handleTableClose = () => {
    setSelectedStage(null)
  }

  // Handle opportunity stage click
  const handleOpportunityStageClick = (stageName: string, _stageIndex: number) => {
    setSelectedOpportunityStage(stageName)
  }

  // Handle opportunity modal close
  const handleOpportunityModalClose = () => {
    setSelectedOpportunityStage(null)
  }

  // Handle opportunity modal save - refetch opportunities
  const handleOpportunityModalSave = () => {
    setSelectedOpportunityStage(null)
    refetchOpportunities()
  }

  return (
    <div className="space-y-4 sm:space-y-6 fade-in">
      {/* Error State */}
      {(error || salesError) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error || salesError}
        </div>
      )}

      {/* Pipeline Metrics Section - At the top, same design as Performance */}
      <PipelineMetricsSection
        metrics={pipelineMetrics}
        chartData={pipelineChartData}
        loading={loading || performanceLoading}
      />

      {/* Loading State for remaining content */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-rillation-text border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Compact Sales Analytics Section */}
          {!salesLoading && !salesError && (
            <CompactSalesMetrics summary={summary} dailyMetrics={dailyMetrics} />
          )}

          {/* Dual Funnel System - Lead Funnel and Opportunity Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Lead Count Funnel (Full) */}
            <FunnelChart 
              stages={funnelStages}
              onStageClick={handleStageClick}
              clickableFromIndex={2} // Clickable from "Real Replies" onwards
              selectedStageName={selectedStage}
            />
            
            {/* Dollar-based Opportunity Pipeline */}
            <OpportunityPipeline 
              stages={opportunityStages}
              loading={opportunitiesLoading}
              error={opportunitiesError}
              onStageClick={handleOpportunityStageClick}
              onSetEstimatedValue={() => setIsConfigureModalOpen(true)}
            />
          </div>
          
          {/* Inline Leads Table */}
          {selectedStage && (
            <InlineLeadsTable
              stageName={selectedStage}
              startDate={dateRange.start}
              endDate={dateRange.end}
              client="Rillation Revenue"
              onClose={handleTableClose}
            />
          )}
        </>
      )}
      
      {/* Set Estimated Value Modal */}
      <ConfigureTargetsModal
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        client="Rillation Revenue"
        startDate={dateRange.start}
        endDate={dateRange.end}
        onSave={refetch}
        mode="pipeline"
      />
      
      {/* Opportunity Stage Modal */}
      {selectedOpportunityStage && (
        <OpportunityStageModal
          isOpen={!!selectedOpportunityStage}
          onClose={handleOpportunityModalClose}
          stageName={selectedOpportunityStage}
          client="Rillation Revenue"
          startDate={dateRange.start}
          endDate={dateRange.end}
          onSave={handleOpportunityModalSave}
        />
      )}
    </div>
  )
}
