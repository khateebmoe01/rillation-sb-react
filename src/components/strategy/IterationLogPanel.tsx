import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  Plus,
  Clock,
  User,
  Loader2,
  MessageSquare,
  Zap,
  Settings,
  FileText,
  X,
  ChevronDown,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Helper to get table reference without type checking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTable = (name: string) => (supabase as any).from(name)

interface IterationLog {
  id: number
  client: string
  action_type: string
  description: string
  created_by: string
  created_at: string
  campaign_name?: string
  mentioned_users?: { slack_id: string; display_name: string }[]
}

interface IterationLogPanelProps {
  client: string
  compact?: boolean
}

const ACTION_TYPES = [
  { value: 'copy_update', label: 'Copy Update', icon: FileText, color: 'bg-blue-500' },
  { value: 'strategy_change', label: 'Strategy Change', icon: Zap, color: 'bg-purple-500' },
  { value: 'config_change', label: 'Config Change', icon: Settings, color: 'bg-orange-500' },
  { value: 'meeting_notes', label: 'Meeting Notes', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'general', label: 'General', icon: RefreshCw, color: 'bg-gray-500' },
]

// Compact Action Type Filter Dropdown
function ActionTypeFilter({ 
  value, 
  onChange 
}: { 
  value: string | null
  onChange: (value: string | null) => void 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedType = value ? ACTION_TYPES.find(t => t.value === value) : null
  const displayValue = selectedType ? selectedType.label : 'All Types'

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-rillation-card border border-rillation-border rounded-lg text-xs text-white hover:border-white/30 transition-colors"
      >
        {selectedType && (
          <div className={`w-2 h-2 rounded-full ${selectedType.color}`} />
        )}
        <span>{displayValue}</span>
        <ChevronDown size={12} className={`text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-1 min-w-[140px] z-50 bg-rillation-card border border-rillation-border rounded-lg shadow-xl overflow-hidden"
          >
            {/* All Option */}
            <button
              onClick={() => { onChange(null); setIsOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                value === null ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="w-2 h-2" />
              <span>All Types</span>
              {value === null && <Check size={10} className="ml-auto text-emerald-400" />}
            </button>

            {/* Action Type Options */}
            {ACTION_TYPES.map((type) => {
              const isSelected = value === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => { onChange(type.value); setIsOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                    isSelected ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${type.color}`} />
                  <span>{type.label}</span>
                  {isSelected && <Check size={10} className="ml-auto text-emerald-400" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface AddLogModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (log: Partial<IterationLog>) => Promise<void>
  isAdding: boolean
}

function AddLogModal({ isOpen, onClose, onAdd, isAdding }: AddLogModalProps) {
  const [actionType, setActionType] = useState('general')
  const [description, setDescription] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [campaignName, setCampaignName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAdd({
      action_type: actionType,
      description,
      created_by: createdBy,
      campaign_name: campaignName || undefined,
    })
    // Reset form
    setActionType('general')
    setDescription('')
    setCreatedBy('')
    setCampaignName('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-lg shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-rillation-border">
            <h2 className="text-lg font-semibold text-rillation-text">Add Iteration Log</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-rillation-card-hover rounded-lg">
              <X size={18} className="text-rillation-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-rillation-text mb-2">Action Type</label>
              <div className="grid grid-cols-3 gap-2">
                {ACTION_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = actionType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setActionType(type.value)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-white/10 border-white/20'
                          : 'bg-rillation-bg border-rillation-border hover:border-rillation-text-muted'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${type.color}`}>
                        <Icon size={14} className="text-white" />
                      </div>
                      <span className="text-xs text-rillation-text">{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-rillation-text mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was changed or updated..."
                rows={4}
                className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted resize-none"
                required
              />
            </div>

            {/* Created By */}
            <div>
              <label className="block text-sm font-medium text-rillation-text mb-2">Your Name</label>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="e.g., Ziad"
                className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted"
                required
              />
            </div>

            {/* Campaign Name (optional) */}
            <div>
              <label className="block text-sm font-medium text-rillation-text mb-2">
                Campaign Name <span className="text-rillation-text-muted font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Related campaign..."
                className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-rillation-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-rillation-text-muted hover:text-rillation-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description || !createdBy || isAdding}
              className="flex items-center gap-2 px-5 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Add Log
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function LogCard({ log }: { log: IterationLog }) {
  const typeConfig = ACTION_TYPES.find(t => t.value === log.action_type) || ACTION_TYPES[4]
  const Icon = typeConfig.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-rillation-card border border-rillation-border rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
          <Icon size={18} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide">
              {typeConfig.label}
            </span>
            {log.campaign_name && (
              <span className="text-xs px-2 py-0.5 bg-rillation-bg rounded text-rillation-text-muted">
                {log.campaign_name}
              </span>
            )}
          </div>
          
          <p className="text-sm text-rillation-text mb-2 whitespace-pre-wrap">{log.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-rillation-text-muted">
            <div className="flex items-center gap-1.5">
              <User size={12} />
              <span>{log.created_by}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>
                {new Date(log.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function IterationLogPanel({ client, compact = false }: IterationLogPanelProps) {
  const [logs, setLogs] = useState<IterationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getTable('client_iteration_logs')
        .select('*')
        .eq('client', client)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching iteration logs:', err)
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleAddLog = async (log: Partial<IterationLog>) => {
    setIsAdding(true)
    try {
      const { error } = await getTable('client_iteration_logs')
        .insert({ ...log, client })

      if (error) throw error
      
      await fetchLogs()
      setIsAddModalOpen(false)
    } catch (err) {
      console.error('Error adding iteration log:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const filteredLogs = filter
    ? logs.filter(log => log.action_type === filter)
    : logs

  return (
    <div className={compact ? "space-y-4" : "p-6 space-y-6"}>
      {/* Header - only in non-compact mode */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rillation-text">Iteration Log</h2>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              Track changes and updates for {client}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus size={16} />
            Add Log
          </button>
        </div>
      )}

      {/* Add button for compact mode */}
      {compact && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus size={14} />
            Add Log
          </button>
        </div>
      )}

      {/* Filter Dropdown */}
      <ActionTypeFilter value={filter} onChange={setFilter} />

      {/* Log List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-rillation-text-muted" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className={`text-center bg-rillation-card border border-rillation-border rounded-xl ${compact ? 'py-8' : 'py-16'}`}>
          <RefreshCw size={compact ? 24 : 32} className="mx-auto text-rillation-text-muted mb-3" />
          <h3 className="text-sm font-medium text-rillation-text mb-1">No logs yet</h3>
          <p className="text-xs text-rillation-text-muted mb-3">
            {filter ? `No ${ACTION_TYPES.find(t => t.value === filter)?.label} logs found.` : 'Start tracking iterations.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus size={14} />
            Add First Log
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <AddLogModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddLog}
            isAdding={isAdding}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
