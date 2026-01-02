import { useState } from 'react'
import { Settings, Search, Eye, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../components/ui/Button'
import MiniScorecard from '../components/ui/MiniScorecard'
import ConfigureTargetsModal from '../components/ui/ConfigureTargetsModal'
import { usePerformanceData } from '../hooks/usePerformanceData'
import { useCampaignScorecardData, type CampaignStatus } from '../hooks/useCampaignScorecardData'
import { useFilters } from '../contexts/FilterContext'
import type { ClientBubbleData } from '../types/database'

const STATUS_OPTIONS: { value: CampaignStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Statuses', color: 'text-slate-400' },
  { value: 'active', label: 'Active', color: 'text-green-400' },
  { value: 'paused', label: 'Paused', color: 'text-yellow-400' },
  { value: 'completed', label: 'Completed', color: 'text-slate-500' },
]

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

// Component to display campaign scorecard
function CampaignScorecard({ 
  campaignName,
  metrics,
  chartData,
  dateRange,
}: { 
  campaignName: string
  metrics: any
  chartData: any[]
  dateRange: { start: Date; end: Date }
}) {
  return (
    <MiniScorecard
      clientName={campaignName}
      metrics={metrics}
      chartData={chartData}
      dateRange={dateRange}
    />
  )
}

export default function PerformanceOverview() {
  // Use global filters
  const { dateRange, selectedClient } = useFilters()
  const navigate = useNavigate()
  
  // Filter state
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<CampaignStatus | 'all'>('all')
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  
  // Determine if we're in client view mode
  const isClientView = !!selectedClient
  
  // Fetch client data (for all clients view)
  const { clientData, scorecardData, loading: clientsLoading, error: clientsError, refetch } = usePerformanceData({
    startDate: dateRange.start,
    endDate: dateRange.end,
  })
  
  // Fetch campaign data (for single client view)
  const { campaigns: campaignScorecards, loading: campaignsLoading, error: campaignsError } = useCampaignScorecardData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    client: selectedClient,
  })

  // Filter client data based on search query
  const filteredClientData = clientData.filter(client => 
    client.client.toLowerCase().includes(clientSearchQuery.toLowerCase())
  )
  
  // Filter campaign data based on search query and status
  const filteredCampaignData = campaignScorecards.filter(campaign => {
    const matchesSearch = campaign.campaignName.toLowerCase().includes(campaignSearchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus
    return matchesSearch && matchesStatus
  })
  
  // Count campaigns by status
  const statusCounts = {
    all: campaignScorecards.length,
    active: campaignScorecards.filter(c => c.status === 'active').length,
    paused: campaignScorecards.filter(c => c.status === 'paused').length,
    completed: campaignScorecards.filter(c => c.status === 'completed').length,
  }

  // Determine loading and error states
  const loading = isClientView ? campaignsLoading : clientsLoading
  const error = isClientView ? campaignsError : clientsError

  // Handle clear search
  const handleClear = () => {
    setClientSearchQuery('')
    setCampaignSearchQuery('')
    setSelectedStatus('all')
  }

  // Handle client click - navigate to client detail view
  const handleClientClick = (client: ClientBubbleData) => {
    const encodedClientName = encodeURIComponent(client.client)
    navigate(`/performance/${encodedClientName}`)
  }

  // Handle view client insights click
  const handleViewClientInsights = () => {
    const encodedClientName = encodeURIComponent(selectedClient)
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
            {!isClientView && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm bg-rillation-bg border border-rillation-border rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-rillation-purple w-64"
                />
              </div>
            )}
            {isClientView && (
              <>
                {/* Status Filter Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text hover:border-rillation-text transition-colors"
                  >
                    <span className={STATUS_OPTIONS.find(s => s.value === selectedStatus)?.color}>
                      {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                    </span>
                    <span className="text-slate-500">
                      ({statusCounts[selectedStatus]})
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isStatusDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full left-0 mt-1 bg-rillation-card border border-rillation-border rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSelectedStatus(option.value)
                              setIsStatusDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-rillation-bg transition-colors ${
                              selectedStatus === option.value ? 'bg-rillation-bg' : ''
                            }`}
                          >
                            <span className={option.color}>{option.label}</span>
                            <span className="text-slate-500">
                              {statusCounts[option.value]}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Campaign Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" size={16} />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={campaignSearchQuery}
                    onChange={(e) => setCampaignSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text w-48"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isClientView && clientSearchQuery && (
              <Button variant="secondary" size="sm" onClick={handleClear}>
                Clear
              </Button>
            )}
            {isClientView && (
              <Button variant="primary" size="sm" onClick={handleViewClientInsights}>
                <Eye size={14} />
                View Client Insights
              </Button>
            )}
            <Button variant={isClientView ? "secondary" : "primary"} size="sm" onClick={handleConfigureTargetsClick}>
              <Settings size={14} />
              Configure Targets
            </Button>
          </div>
        </div>
      </div>

      {/* Title for client view */}
      {isClientView && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <h2 className="text-xl font-bold text-white">{selectedClient}</h2>
          <span className="text-sm text-slate-400">
            {filteredCampaignData.length} campaign{filteredCampaignData.length !== 1 ? 's' : ''}
          </span>
        </motion.div>
      )}

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

      {/* Client Scorecards (All Clients View) */}
      <AnimatePresence mode="wait">
        {!loading && !isClientView && clientData.length > 0 && (
          <motion.div
            key="clients-grid"
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

      {/* Campaign Scorecards (Single Client View) */}
      <AnimatePresence mode="wait">
        {!loading && isClientView && campaignScorecards.length > 0 && (
          <motion.div
            key="campaigns-grid"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            {filteredCampaignData.map((campaign) => (
              <motion.div
                key={campaign.campaignId}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <CampaignScorecard 
                  campaignName={campaign.campaignName}
                  metrics={campaign.metrics}
                  chartData={campaign.chartData}
                  dateRange={dateRange}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty States */}
      {!loading && !isClientView && clientData.length === 0 && (
        <div className="text-center py-12 text-rillation-text-muted">
          No client data found for the selected filters.
        </div>
      )}
      {!loading && !isClientView && clientData.length > 0 && filteredClientData.length === 0 && (
        <div className="text-center py-12 text-rillation-text-muted">
          No clients match your search query.
        </div>
      )}
      {!loading && isClientView && campaignScorecards.length === 0 && (
        <div className="text-center py-12 text-rillation-text-muted">
          No campaign data found for {selectedClient}.
        </div>
      )}
      {!loading && isClientView && campaignScorecards.length > 0 && filteredCampaignData.length === 0 && (
        <div className="text-center py-12 text-rillation-text-muted">
          No campaigns match your filters.
        </div>
      )}

      {/* Configure Targets Modal */}
      <ConfigureTargetsModal
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        client={isClientView ? selectedClient : undefined}
        startDate={dateRange.start}
        endDate={dateRange.end}
        onSave={handleTargetsSaved}
        mode="targets"
      />
    </div>
  )
}
