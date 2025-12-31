import { useState } from 'react'
import { Settings, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CampaignFilter from '../components/ui/CampaignFilter'
import Button from '../components/ui/Button'
import MiniScorecard from '../components/ui/MiniScorecard'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import { useCampaigns } from '../hooks/useCampaigns'
import { usePerformanceData } from '../hooks/usePerformanceData'
import { useFilters } from '../contexts/FilterContext'
import type { ClientBubbleData } from '../types/database'

// Component to display individual client scorecard
function ClientScorecard({ 
  client, 
  scorecardData,
  dateRange, 
  onClick 
}: { 
  client: ClientBubbleData
  scorecardData?: { metrics: any; chartData: any[] }
  dateRange: { start: Date; end: Date }
  onClick: () => void 
}) {
  if (!scorecardData) {
    return (
      <motion.div
        className="bg-rillation-card rounded-xl p-4 border border-rillation-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-center py-8">
          <motion.div
            className="w-6 h-6 border-2 border-rillation-text border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </motion.div>
    )
  }

  return (
    <MiniScorecard
      clientName={client.client}
      metrics={scorecardData.metrics}
      chartData={scorecardData.chartData}
      targets={{
        emailsTarget: client.emailsTarget,
        prospectsTarget: client.prospectsTarget,
        repliesTarget: client.repliesTarget,
        meetingsTarget: client.meetingsTarget,
      }}
      dateRange={dateRange}
      onClick={onClick}
    />
  )
}

export default function PerformanceOverview() {
  // Use global filters
  const { dateRange } = useFilters()
  const navigate = useNavigate()
  
  // Filter state
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  
  // Fetch data
  const { campaigns } = useCampaigns()
  const { clientData, scorecardData, loading, error, refetch } = usePerformanceData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    campaign: selectedCampaign || undefined,
  })

  // Filter client data based on search query
  const filteredClientData = clientData.filter(client => 
    client.client.toLowerCase().includes(clientSearchQuery.toLowerCase())
  )

  // Handle clear campaign filter (client and date filters are global)
  const handleClear = () => {
    setSelectedCampaign('')
  }

  // Handle client click - navigate to client detail view
  const handleClientClick = (client: ClientBubbleData) => {
    // Encode client name for URL (handle special characters)
    const encodedClientName = encodeURIComponent(client.client)
    navigate(`/performance/${encodedClientName}`)
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
      {/* Filter Bar */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-rillation-text-muted">CAMPAIGN</span>
              <CampaignFilter
                campaigns={campaigns}
                selectedCampaign={selectedCampaign}
                onChange={setSelectedCampaign}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" size={16} />
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text w-48"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleClear}>
              Clear Campaign Filter
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
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <motion.div
              className="w-8 h-8 border-2 border-rillation-text border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Scorecards with Framer Motion Animation */}
      <AnimatePresence mode="wait">
        {!loading && clientData.length > 0 && (
          <motion.div
            key="grid"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            {filteredClientData.map((client) => (
              <ClientScorecard 
                key={client.client}
                client={client}
                scorecardData={scorecardData.get(client.client)}
                dateRange={dateRange}
                onClick={() => handleClientClick(client)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && clientData.length === 0 && (
        <div className="text-center py-12 text-rillation-text-muted">
          No client data found for the selected filters.
        </div>
      )}
      {!loading && clientData.length > 0 && filteredClientData.length === 0 && (
        <div className="text-center py-12 text-rillation-text-muted">
          No clients match your search query.
        </div>
      )}

      {/* Configure Targets Modal */}
      <ConfigureTargetsModal
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        startDate={dateRange.start}
        endDate={dateRange.end}
        onSave={handleTargetsSaved}
        mode="targets"
      />
    </div>
  )
}
