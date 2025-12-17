import { useState } from 'react'
import { Settings } from 'lucide-react'
import DateRangeFilter from '../components/ui/DateRangeFilter'
import CampaignFilter from '../components/ui/CampaignFilter'
import Button from '../components/ui/Button'
import ClientBubble from '../components/ui/ClientBubble'
import ClientDetailModal from '../components/ui/ClientDetailModal'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import { useClients } from '../hooks/useClients'
import { useCampaigns } from '../hooks/useCampaigns'
import { usePerformanceData } from '../hooks/usePerformanceData'
import { getDateRange } from '../lib/supabase'
import type { ClientBubbleData } from '../types/database'

export default function PerformanceOverview() {
  // Date state
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))
  
  // Filter state
  const [selectedCampaign, setSelectedCampaign] = useState('')
  
  // Modal state
  const [selectedClient, setSelectedClient] = useState<ClientBubbleData | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  
  // Fetch data
  const { clients } = useClients()
  const { campaigns } = useCampaigns()
  const { clientData, loading, error, refetch } = usePerformanceData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    campaign: selectedCampaign || undefined,
  })

  // Handle date preset change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    setDateRange(getDateRange(preset))
  }

  // Handle clear filters
  const handleClear = () => {
    setSelectedCampaign('')
    setDatePreset('thisMonth')
    setDateRange(getDateRange('thisMonth'))
  }

  // Handle client click
  const handleClientClick = (client: ClientBubbleData) => {
    setSelectedClient(client)
    setIsClientModalOpen(true)
  }

  // Handle client modal close
  const handleClientModalClose = () => {
    setIsClientModalOpen(false)
    setSelectedClient(null)
  }

  // Handle configure targets click
  const handleConfigureTargetsClick = () => {
    setIsConfigureModalOpen(true)
  }

  // Handle targets saved
  const handleTargetsSaved = () => {
    refetch()
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Filters Bar */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <DateRangeFilter
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
              onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
              onPresetChange={handlePresetChange}
              activePreset={datePreset}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-rillation-text-muted">CAMPAIGN</span>
              <CampaignFilter
                campaigns={campaigns}
                selectedCampaign={selectedCampaign}
                onChange={setSelectedCampaign}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleClear}>
              Clear Filters
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfigureTargetsClick}>
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

      {/* Client Bubbles Grid - 3 per row for bigger cards */}
      {!loading && clientData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {clientData.map((client) => (
            <ClientBubble 
              key={client.client} 
              data={client}
              onClick={() => handleClientClick(client)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && clientData.length === 0 && (
        <div className="text-center py-12 text-rillation-text-muted">
          No client data found for the selected filters.
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          isOpen={isClientModalOpen}
          onClose={handleClientModalClose}
          clientName={selectedClient.client}
          startDate={dateRange.start}
          endDate={dateRange.end}
          actualData={{
            emailsSent: selectedClient.emailsSent,
            uniqueProspects: selectedClient.uniqueProspects,
            realReplies: selectedClient.realReplies,
            meetings: selectedClient.meetings,
          }}
          onTargetsSaved={handleTargetsSaved}
        />
      )}

      {/* Configure Targets Modal */}
      <ConfigureTargetsModal
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        clients={clients}
        onSave={handleTargetsSaved}
      />
    </div>
  )
}
