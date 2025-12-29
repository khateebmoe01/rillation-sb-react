import { useState } from 'react'
import { Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CampaignFilter from '../components/ui/CampaignFilter'
import Button from '../components/ui/Button'
import ClientBubble from '../components/ui/ClientBubble'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import { useClients } from '../hooks/useClients'
import { useCampaigns } from '../hooks/useCampaigns'
import { usePerformanceData } from '../hooks/usePerformanceData'
import { useFilters } from '../contexts/FilterContext'
import type { ClientBubbleData } from '../types/database'

export default function PerformanceOverview() {
  // Use global filters
  const { dateRange } = useFilters()
  const navigate = useNavigate()
  
  // Filter state
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  
  // Fetch data
  const { clients } = useClients()
  const { campaigns } = useCampaigns()
  const { clientData, loading, error, refetch } = usePerformanceData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    campaign: selectedCampaign || undefined,
  })

  // Handle clear campaign filter (client and date filters are global)
  const handleClear = () => {
    setSelectedCampaign('')
  }

  // Handle client click - navigate to client detail view
  const handleClientClick = (client: ClientBubbleData) => {
    // Encode client name for URL (handle special characters)
    const encodedClientName = encodeURIComponent(client.client)
    navigate(`/client-detail/${encodedClientName}`)
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
      {/* Campaign Filter Bar (only campaign filter is local to this page) */}
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
              className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Bubbles with Framer Motion Animation */}
      <AnimatePresence mode="wait">
        {!loading && clientData.length > 0 && (
          <motion.div
            key="grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            style={{ perspective: '1000px' }}
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
            {clientData.map((client) => (
              <motion.div
                key={client.client}
                layoutId={`card-${client.client}`}
                variants={{
                  hidden: { 
                    opacity: 0, 
                    scale: 0.8,
                    y: 20,
                  },
                  show: { 
                    opacity: 1, 
                    scale: 1,
                    y: 0,
                    transition: {
                      type: 'spring',
                      stiffness: 300,
                      damping: 25,
                    },
                  },
                  exit: {
                    opacity: 0,
                    scale: 0.8,
                    y: -20,
                    transition: {
                      duration: 0.2,
                    },
                  },
                }}
              >
                <ClientBubble 
                  data={client}
                  onClick={() => handleClientClick(client)}
                />
              </motion.div>
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

      {/* Configure Targets Modal */}
      <ConfigureTargetsModal
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        client={clients?.[0] || 'Rillation Revenue'}
        startDate={dateRange.start}
        endDate={dateRange.end}
        onSave={handleTargetsSaved}
        mode="targets"
      />
    </div>
  )
}
