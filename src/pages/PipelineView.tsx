import { useState } from 'react'
import { Settings } from 'lucide-react'
import Button from '../components/ui/Button'
import FunnelChart from '../components/charts/FunnelChart'
import OpportunityPipeline from '../components/charts/OpportunityPipeline'
import EditableFunnelSpreadsheet from '../components/ui/EditableFunnelSpreadsheet'
import InlineLeadsTable from '../components/ui/InlineLeadsTable'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import OpportunityStageModal from '../components/ui/OpportunityStageModal'
import SalesMetricCards from '../components/ui/SalesMetricCards'
import SalesMetricsChart from '../components/charts/SalesMetricsChart'
import { usePipelineData } from '../hooks/usePipelineData'
import { useClients } from '../hooks/useClients'
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
  
  // Fetch clients for modal
  const { clients } = useClients()

  // Fetch data using global date range
  const { funnelStages, spreadsheetData, loading, error, refetch } = usePipelineData({
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

  // Handle funnel stage click - toggle selection
  const handleStageClick = (stageName: string, _stageIndex: number) => {
    // If clicking the same stage, close it. Otherwise, open the new one.
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
    // Refetch opportunities to show updated values
    refetchOpportunities()
  }

  return (
    <div className="space-y-4 sm:space-y-6 fade-in">
      {/* Set Estimated Value Button - inline with page content */}
      <div className="flex justify-end px-2 sm:px-0">
        <Button variant="primary" size="sm" onClick={() => setIsConfigureModalOpen(true)}>
          <Settings size={14} />
          <span className="hidden sm:inline">Set Estimated Value</span>
          <span className="sm:hidden">Set Value</span>
        </Button>
      </div>

      {/* Error State */}
      {(error || salesError) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error || salesError}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Sales Analytics Section */}
          {!salesLoading && !salesError && (
            <div className="space-y-4">
              {/* Sales Summary Cards */}
              <SalesMetricCards summary={summary} />

              {/* Sales Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SalesMetricsChart
                  data={dailyMetrics}
                  type="revenue"
                  title="Daily Revenue"
                />
                <SalesMetricsChart
                  data={dailyMetrics}
                  type="dealCount"
                  title="Daily Deal Count"
                />
              </div>
              
              {/* Average Deal Value and Win Rate - Same Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Lead Count Funnel */}
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
            />
          </div>
          
          {/* Inline Leads Table - appears between funnel and spreadsheet */}
          {selectedStage && (
            <InlineLeadsTable
              stageName={selectedStage}
              startDate={dateRange.start}
              endDate={dateRange.end}
              client="Rillation Revenue"
              onClose={handleTableClose}
            />
          )}
          
          {/* Editable Spreadsheet */}
          <EditableFunnelSpreadsheet 
            data={spreadsheetData} 
            month={selectedMonth} 
            year={selectedYear}
            onSave={refetch}
          />
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
