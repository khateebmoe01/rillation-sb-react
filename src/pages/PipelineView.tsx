import { useState, useMemo } from 'react'
import FunnelChart from '../components/charts/FunnelChart'
import OpportunityPipeline from '../components/charts/OpportunityPipeline'
import InlineLeadsTable from '../components/ui/InlineLeadsTable'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import OpportunityStageModal from '../components/ui/OpportunityStageModal'
import SalesMetricCards from '../components/ui/SalesMetricCards'
import SalesMetricsChart from '../components/charts/SalesMetricsChart'
import PipelineMetricsSection from '../components/ui/PipelineMetricsSection'
import { usePipelineData } from '../hooks/usePipelineData'
import { useQuickViewData } from '../hooks/useQuickViewData'
import { useFilters } from '../contexts/FilterContext'
import { useSalesMetrics } from '../hooks/useSalesMetrics'
import { useOpportunities } from '../hooks/useOpportunities'

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

  // Build pipeline chart data from funnel stages
  const pipelineChartData = useMemo(() => {
    const meetingsBooked = funnelStages.find(s => s.name === 'Meetings Booked')?.value || 0
    const showedUp = funnelStages.find(s => s.name === 'Showed Up to Disco')?.value || 0
    const qualified = funnelStages.find(s => s.name === 'Qualified')?.value || 0
    const demo = funnelStages.find(s => s.name === 'Showed Up to Demo')?.value || 0
    const proposalSent = funnelStages.find(s => s.name === 'Proposal Sent')?.value || 0
    const closed = funnelStages.find(s => s.name === 'Closed')?.value || 0

    // Use the performance chart data dates as a template
    return performanceChartData.map((point, idx, arr) => {
      const progress = (idx + 1) / arr.length
      return {
        date: point.date,
        meetingsBooked: Math.round(meetingsBooked * progress),
        showedUp: Math.round(showedUp * progress),
        qualified: Math.round(qualified * progress),
        demo: Math.round(demo * progress),
        proposalSent: Math.round(proposalSent * progress),
        closed: Math.round(closed * progress),
      }
    })
  }, [funnelStages, performanceChartData])

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
          {/* Sales Analytics Section */}
          {!salesLoading && !salesError && (
            <div className="space-y-6">
              {/* Sales Summary Cards */}
              <SalesMetricCards summary={summary} />

              {/* Sales Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SalesMetricsChart
                  data={dailyMetrics}
                  type="revenue"
                  title="Revenue Trend"
                />
                <SalesMetricsChart
                  data={dailyMetrics}
                  type="dealCount"
                  title="Deal Count"
                />
              </div>
              
              {/* Average Deal Value and Win Rate - Same Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SalesMetricsChart
                  data={dailyMetrics}
                  type="avgValue"
                  title="Average Deal Value"
                />
                <SalesMetricsChart
                  data={dailyMetrics}
                  type="winRate"
                  title="Win Rate Over Time"
                />
              </div>
            </div>
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
