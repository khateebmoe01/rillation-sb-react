import { useState } from 'react'
import { Settings } from 'lucide-react'
import DateRangeFilter from '../components/ui/DateRangeFilter'
import Button from '../components/ui/Button'
import FunnelChart from '../components/charts/FunnelChart'
import EditableFunnelSpreadsheet from '../components/ui/EditableFunnelSpreadsheet'
import LeadsModal from '../components/ui/LeadsModal'
import { usePipelineData } from '../hooks/usePipelineData'
import { getDateRange } from '../lib/supabase'

export default function PipelineView() {
  // Get current month/year
  const now = new Date()
  const [selectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear] = useState(now.getFullYear())
  
  // Date state
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))

  // Modal state
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch data
  const { funnelStages, spreadsheetData, loading, error, refetch } = usePipelineData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    month: selectedMonth,
    year: selectedYear,
  })

  // Handle date preset change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    setDateRange(getDateRange(preset))
  }

  // Handle clear
  const handleClear = () => {
    setDatePreset('thisMonth')
    setDateRange(getDateRange('thisMonth'))
  }

  // Handle funnel stage click
  const handleStageClick = (stageName: string, stageIndex: number) => {
    setSelectedStage(stageName)
    setIsModalOpen(true)
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedStage(null)
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Filters Bar */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DateRangeFilter
            startDate={dateRange.start}
            endDate={dateRange.end}
            onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
            onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
            onPresetChange={handlePresetChange}
            activePreset={datePreset}
          />
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button variant="primary" size="sm">
              <Settings size={14} />
              Configure Targets
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

      {/* Content */}
      {!loading && (
        <>
          {/* Funnel Chart */}
          <FunnelChart 
            stages={funnelStages}
            onStageClick={handleStageClick}
            clickableFromIndex={2} // Clickable from "Real Replies" onwards
          />
          
          {/* Editable Spreadsheet */}
          <EditableFunnelSpreadsheet 
            data={spreadsheetData} 
            month={selectedMonth} 
            year={selectedYear}
            onSave={refetch}
          />
        </>
      )}

      {/* Leads Modal */}
      <LeadsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        stageName={selectedStage || ''}
        startDate={dateRange.start}
        endDate={dateRange.end}
      />
    </div>
  )
}
