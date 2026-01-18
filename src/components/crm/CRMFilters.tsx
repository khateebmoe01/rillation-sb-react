import { ChevronDown, X, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CRM_STAGES, LEAD_SOURCES, type CRMFilters as CRMFiltersType } from '../../types/crm'

interface CRMFiltersProps {
  filters: CRMFiltersType
  onFiltersChange: (filters: CRMFiltersType) => void
  uniqueAssignees: string[]
}

export default function CRMFilters({ filters, onFiltersChange, uniqueAssignees }: CRMFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenDropdown(null)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleStageToggle = (stageId: string) => {
    const currentStages = filters.stage || []
    const newStages = currentStages.includes(stageId)
      ? currentStages.filter((s) => s !== stageId)
      : [...currentStages, stageId]
    
    onFiltersChange({
      ...filters,
      stage: newStages.length > 0 ? newStages : undefined,
    })
  }

  const handleAssigneeChange = (assignee: string | undefined) => {
    onFiltersChange({ ...filters, assignee })
    setOpenDropdown(null)
  }

  const handleLeadSourceChange = (source: string | undefined) => {
    onFiltersChange({ ...filters, leadSource: source })
    setOpenDropdown(null)
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasFilters = filters.stage?.length || filters.assignee || filters.leadSource

  return (
    <div ref={containerRef} className="flex items-center gap-2 flex-wrap">
      {/* Stage Filter */}
      <div className="relative">
        <motion.button
          onClick={() => setOpenDropdown(openDropdown === 'stage' ? null : 'stage')}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border
            ${filters.stage?.length
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Stage
          {filters.stage?.length ? ` (${filters.stage.length})` : ''}
          <motion.div animate={{ rotate: openDropdown === 'stage' ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {openDropdown === 'stage' && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 w-52 z-50"
            >
              <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-700/50">
                  <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Filter by Stage</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {CRM_STAGES.map((stage, index) => (
                    <motion.button
                      key={stage.id}
                      onClick={() => handleStageToggle(stage.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ x: 2 }}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          filters.stage?.includes(stage.id)
                            ? 'bg-emerald-400 border-emerald-400'
                            : 'border-slate-500'
                        }`}
                      >
                        {filters.stage?.includes(stage.id) && <Check size={10} className="text-white" />}
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-white/90">{stage.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assignee Filter */}
      <div className="relative">
        <motion.button
          onClick={() => setOpenDropdown(openDropdown === 'assignee' ? null : 'assignee')}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border
            ${filters.assignee
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {filters.assignee || 'Assignee'}
          <motion.div animate={{ rotate: openDropdown === 'assignee' ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {openDropdown === 'assignee' && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 w-52 z-50"
            >
              <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-700/50">
                  <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Select Assignee</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  <motion.button
                    onClick={() => handleAssigneeChange(undefined)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                      !filters.assignee ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/5'
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      !filters.assignee ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'
                    }`}>
                      {!filters.assignee && <Check size={12} className="text-emerald-400" />}
                    </div>
                    <span>All Assignees</span>
                  </motion.button>
                  {uniqueAssignees.map((assignee, index) => (
                    <motion.button
                      key={assignee}
                      onClick={() => handleAssigneeChange(assignee)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                        filters.assignee === assignee ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/5'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ x: 2 }}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        filters.assignee === assignee ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'
                      }`}>
                        {filters.assignee === assignee && <Check size={12} className="text-emerald-400" />}
                      </div>
                      <span>{assignee}</span>
                    </motion.button>
                  ))}
                  {uniqueAssignees.length === 0 && (
                    <div className="px-3 py-4 text-center text-white/80 text-sm">No assignees yet</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lead Source Filter */}
      <div className="relative">
        <motion.button
          onClick={() => setOpenDropdown(openDropdown === 'source' ? null : 'source')}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border
            ${filters.leadSource
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {filters.leadSource || 'Lead Source'}
          <motion.div animate={{ rotate: openDropdown === 'source' ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {openDropdown === 'source' && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 w-52 z-50"
            >
              <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-700/50">
                  <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Select Source</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  <motion.button
                    onClick={() => handleLeadSourceChange(undefined)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                      !filters.leadSource ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/5'
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      !filters.leadSource ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'
                    }`}>
                      {!filters.leadSource && <Check size={12} className="text-emerald-400" />}
                    </div>
                    <span>All Sources</span>
                  </motion.button>
                  {LEAD_SOURCES.map((source, index) => (
                    <motion.button
                      key={source}
                      onClick={() => handleLeadSourceChange(source)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                        filters.leadSource === source ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/5'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ x: 2 }}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        filters.leadSource === source ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'
                      }`}>
                        {filters.leadSource === source && <Check size={12} className="text-emerald-400" />}
                      </div>
                      <span>{source}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear Filters */}
      <AnimatePresence>
        {hasFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={14} />
            Clear
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
