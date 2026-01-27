import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  Map,
  BookOpen,
  ListTodo,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Circle,
  Inbox,
  PenTool,
} from 'lucide-react'
import { useFilters } from '../contexts/FilterContext'
import { useClients } from '../hooks/useClients'
import { useClientStrategy } from '../hooks/useClientStrategy'
import { useCopywriting } from '../hooks/useCopywriting'
import { useFathomAutoSync } from '../hooks/useFathomAutoSync'
import StrategyHeader from '../components/strategy/StrategyHeader'
import FathomCallLibrary from '../components/strategy/FathomCallLibrary'
import OpportunityMapViewer from '../components/strategy/OpportunityMapViewer'
import KnowledgeBaseEditor from '../components/strategy/KnowledgeBaseEditor'
import CopywritingEditor from '../components/strategy/CopywritingEditor'
import PlanOfActionEditor from '../components/strategy/PlanOfActionEditor'
import AnalysisPanel from '../components/strategy/AnalysisPanel'
import IterationLogPanel from '../components/strategy/IterationLogPanel'
import UnassignedCallsInbox from '../components/strategy/UnassignedCallsInbox'

// Section configuration
type SectionId = 'calls' | 'opportunity-map' | 'knowledge' | 'copywriting' | 'plan' | 'analysis' | 'updates'

interface Section {
  id: SectionId
  label: string
  icon: React.ElementType
  description: string
}

const SECTIONS: Section[] = [
  { id: 'calls', label: 'Fathom Calls', icon: Phone, description: 'Recorded calls and transcripts' },
  { id: 'opportunity-map', label: 'Opportunity Map', icon: Map, description: 'AI-generated strategy document' },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, description: 'Client information and ICP' },
  { id: 'copywriting', label: 'Copywriting', icon: PenTool, description: 'Email sequences and Clay prompts' },
  { id: 'plan', label: 'Plan of Action', icon: ListTodo, description: 'Clay config, prompts, tasks' },
  { id: 'analysis', label: 'Analysis', icon: BarChart3, description: 'What to surface and track' },
  { id: 'updates', label: 'Iteration Log', icon: RefreshCw, description: 'Change history' },
]

// Local storage key for section states
const SECTION_STATE_KEY = 'client-strategy-sections'

// Get initial section state from localStorage
function getInitialSectionState(): Record<SectionId, boolean> {
  try {
    const saved = localStorage.getItem(SECTION_STATE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  // Default: all sections expanded
  return {
    'calls': true,
    'opportunity-map': true,
    'knowledge': false,
    'copywriting': false,
    'plan': false,
    'analysis': false,
    'updates': false,
  }
}

// Collapsible Section Header
interface SectionHeaderProps {
  section: Section
  isOpen: boolean
  onToggle: () => void
  count?: number
  status?: 'complete' | 'partial' | 'empty'
  actions?: React.ReactNode
}

function SectionHeader({ section, isOpen, onToggle, count, status, actions }: SectionHeaderProps) {
  const Icon = section.icon

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-rillation-card border border-rillation-border rounded-xl hover:bg-rillation-card-hover transition-colors">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-rillation-text-muted"
        >
          <ChevronRight size={18} />
        </motion.div>

        <div className="w-9 h-9 rounded-lg bg-rillation-bg flex items-center justify-center">
          <Icon size={18} className="text-rillation-text-muted" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-rillation-text">{section.label}</span>
            {count !== undefined && count > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-rillation-bg rounded text-rillation-text-muted">
                {count}
              </span>
            )}
            {status && (
              <span className="ml-1">
                {status === 'complete' ? (
                  <CheckCircle2 size={14} className="text-rillation-green" />
                ) : status === 'partial' ? (
                  <Circle size={14} className="text-rillation-yellow" />
                ) : null}
              </span>
            )}
          </div>
          <span className="text-xs text-rillation-text-muted">{section.description}</span>
        </div>
      </button>

      {actions && (
        <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  )
}

export default function ClientStrategyView() {
  const { strategyClient } = useFilters()
  const [sectionStates, setSectionStates] = useState<Record<SectionId, boolean>>(getInitialSectionState)
  const [showUnassigned, setShowUnassigned] = useState(false)

  // Fetch clients (for unassigned calls)
  const { clients } = useClients()

  // Fetch strategy data for selected client
  const {
    fathomCalls,
    opportunityMaps,
    knowledgeBase,
    planOfAction,
    loading: dataLoading,
    error,
    refetch,
    addFathomCall,
    deleteFathomCall,
    saveKnowledgeBase,
    savePlanOfAction,
    createOpportunityMap,
    deleteOpportunityMap,
  } = useClientStrategy(strategyClient || null)

  // Fetch copywriting data
  const {
    copywriting,
    loading: copywritingLoading,
    saveCopywriting,
  } = useCopywriting(strategyClient || null)

  // Auto-refresh Fathom calls every 30 seconds when viewing a client or unassigned calls
  useFathomAutoSync({
    enabled: !!strategyClient || showUnassigned,
    onRefetch: refetch,
    intervalMs: 30000, // 30 seconds
  })

  // Reset unassigned view when client is selected
  useEffect(() => {
    if (strategyClient) {
      setShowUnassigned(false)
    }
  }, [strategyClient])

  // Save section states to localStorage
  useEffect(() => {
    localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(sectionStates))
  }, [sectionStates])

  const toggleSection = useCallback((sectionId: SectionId) => {
    setSectionStates(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }, [])

  // Calculate section statuses
  const getSectionStatus = (sectionId: SectionId): 'complete' | 'partial' | 'empty' => {
    switch (sectionId) {
      case 'calls':
        return fathomCalls.length > 0 ? 'complete' : 'empty'
      case 'opportunity-map':
        return opportunityMaps.some(m => m.status === 'confirmed') ? 'complete' :
               opportunityMaps.length > 0 ? 'partial' : 'empty'
      case 'knowledge':
        return knowledgeBase ? 'partial' : 'empty'
      case 'copywriting':
        return (copywriting?.copy_structures?.length ?? 0) > 0 ? 'partial' : 'empty'
      case 'plan':
        return (planOfAction?.tasks?.length ?? 0) > 0 ? 'partial' : 'empty'
      default:
        return 'empty'
    }
  }

  return (
    <div className="h-full flex flex-col bg-rillation-bg">
      {/* Header with Client Dropdown */}
      <StrategyHeader
        title="Client Strategy"
        actions={
          <div className="flex items-center gap-3">
            {/* Unassigned Calls Button */}
            <button
              onClick={() => setShowUnassigned(!showUnassigned)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showUnassigned
                  ? 'bg-white text-black font-medium'
                  : 'text-rillation-text-muted hover:bg-rillation-card-hover hover:text-rillation-text'
              }`}
            >
              <Inbox size={14} />
              Unassigned Calls
            </button>

            {dataLoading && (
              <Loader2 size={18} className="animate-spin text-rillation-text-muted" />
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-rillation-text-muted hover:text-rillation-text transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {showUnassigned ? (
          /* Unassigned Calls View */
          <div className="flex-1 overflow-y-auto">
            <UnassignedCallsInbox
              clients={clients}
              onCallAssigned={() => refetch()}
            />
          </div>
        ) : strategyClient ? (
          <>
            {/* Error State */}
            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                <AlertCircle size={18} className="text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
                <button
                  onClick={refetch}
                  className="ml-auto text-sm text-red-400 hover:text-red-300 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Scrollable Content - All Sections */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Fathom Calls Section */}
              <div>
                <SectionHeader
                  section={SECTIONS[0]}
                  isOpen={sectionStates['calls']}
                  onToggle={() => toggleSection('calls')}
                  count={fathomCalls.length}
                  status={getSectionStatus('calls')}
                />
                <AnimatePresence>
                  {sectionStates['calls'] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3">
                        <FathomCallLibrary
                          client={strategyClient}
                          calls={fathomCalls}
                          loading={dataLoading}
                          onAddCall={addFathomCall}
                          onDeleteCall={deleteFathomCall}
                          compact
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Opportunity Map Section */}
              <div>
                <SectionHeader
                  section={SECTIONS[1]}
                  isOpen={sectionStates['opportunity-map']}
                  onToggle={() => toggleSection('opportunity-map')}
                  count={opportunityMaps.length}
                  status={getSectionStatus('opportunity-map')}
                  actions={
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:opacity-90"
                    >
                      <Sparkles size={12} />
                      Generate
                    </button>
                  }
                />
                <AnimatePresence>
                  {sectionStates['opportunity-map'] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3">
                        <OpportunityMapViewer
                          client={strategyClient}
                          opportunityMaps={opportunityMaps}
                          fathomCalls={fathomCalls}
                          loading={dataLoading}
                          onCreateMap={createOpportunityMap}
                          onDeleteMap={deleteOpportunityMap}
                          compact
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Knowledge Base Section - Always mounted to preserve state */}
              <div>
                <SectionHeader
                  section={SECTIONS[2]}
                  isOpen={sectionStates['knowledge']}
                  onToggle={() => toggleSection('knowledge')}
                  status={getSectionStatus('knowledge')}
                />
                <motion.div
                  initial={false}
                  animate={{
                    height: sectionStates['knowledge'] ? 'auto' : 0,
                    opacity: sectionStates['knowledge'] ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <KnowledgeBaseEditor
                      client={strategyClient}
                      knowledgeBase={knowledgeBase}
                      fathomCalls={fathomCalls}
                      loading={dataLoading}
                      onSave={saveKnowledgeBase}
                      compact
                    />
                  </div>
                </motion.div>
              </div>

              {/* Copywriting Section - Always mounted to preserve state */}
              <div>
                <SectionHeader
                  section={SECTIONS[3]}
                  isOpen={sectionStates['copywriting']}
                  onToggle={() => toggleSection('copywriting')}
                  status={getSectionStatus('copywriting')}
                  count={copywriting?.copy_structures?.length}
                />
                <motion.div
                  initial={false}
                  animate={{
                    height: sectionStates['copywriting'] ? 'auto' : 0,
                    opacity: sectionStates['copywriting'] ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <CopywritingEditor
                      client={strategyClient}
                      copywriting={copywriting}
                      knowledgeBase={knowledgeBase}
                      fathomCalls={fathomCalls}
                      loading={copywritingLoading}
                      onSave={saveCopywriting}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Plan of Action Section */}
              <div>
                <SectionHeader
                  section={SECTIONS[4]}
                  isOpen={sectionStates['plan']}
                  onToggle={() => toggleSection('plan')}
                  status={getSectionStatus('plan')}
                />
                <AnimatePresence>
                  {sectionStates['plan'] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3">
                        <PlanOfActionEditor
                          client={strategyClient}
                          planOfAction={planOfAction}
                          loading={dataLoading}
                          onSave={savePlanOfAction}
                          compact
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Analysis Section */}
              <div>
                <SectionHeader
                  section={SECTIONS[5]}
                  isOpen={sectionStates['analysis']}
                  onToggle={() => toggleSection('analysis')}
                />
                <AnimatePresence>
                  {sectionStates['analysis'] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3">
                        <AnalysisPanel
                          client={strategyClient}
                          planOfAction={planOfAction}
                          onSave={savePlanOfAction}
                          compact
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Iteration Log Section */}
              <div>
                <SectionHeader
                  section={SECTIONS[6]}
                  isOpen={sectionStates['updates']}
                  onToggle={() => toggleSection('updates')}
                />
                <AnimatePresence>
                  {sectionStates['updates'] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3">
                        <IterationLogPanel client={strategyClient} compact />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rillation-card border border-rillation-border flex items-center justify-center">
                <BookOpen size={28} className="text-rillation-text-muted" />
              </div>
              <h2 className="text-xl font-semibold text-rillation-text mb-2">
                Select a Client
              </h2>
              <p className="text-rillation-text-muted text-sm leading-relaxed">
                Choose a client from the dropdown above to view and manage their strategy, including Fathom calls,
                opportunity maps, knowledge base, and plan of action.
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
