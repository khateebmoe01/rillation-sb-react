import { useState } from 'react'
import { Settings } from 'lucide-react'
import Button from '../components/ui/Button'
import FunnelChart from '../components/charts/FunnelChart'
import OpportunityPipeline from '../components/charts/OpportunityPipeline'
import EditableFunnelSpreadsheet from '../components/ui/EditableFunnelSpreadsheet'
import InlineLeadsTable from '../components/ui/InlineLeadsTable'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import { usePipelineData } from '../hooks/usePipelineData'
import { useClients } from '../hooks/useClients'
import { useFilters } from '../contexts/FilterContext'

export default function PipelineView() {
  // Get current month/year
  const now = new Date()
  const selectedMonth = now.getMonth() + 1
  const selectedYear = now.getFullYear()
  
  // Use global filter state
  const { dateRange } = useFilters()

  // Inline table state
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  
  // Configure targets modal state
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  
  // Fetch clients for modal
  const { clients } = useClients()

  // Fetch data using global date range
  const { funnelStages, spreadsheetData, loading, error, refetch } = usePipelineData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    month: selectedMonth,
    year: selectedYear,
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

      {/* Content */}
      {!loading && (
        <>
          {/* Dual Funnel System - Lead Funnel and Opportunity Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Count Funnel */}
            <div className="lg:col-span-1">
              <FunnelChart 
                stages={funnelStages}
                onStageClick={handleStageClick}
                clickableFromIndex={2} // Clickable from "Real Replies" onwards
                selectedStageName={selectedStage}
              />
            </div>
            
            {/* Dollar-based Opportunity Pipeline - Takes 2/3 of space */}
            <div className="lg:col-span-2">
              <OpportunityPipeline client="Rillation Revenue" />
            </div>
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
    </div>
  )
}
