import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Phone,
  Calendar,
  Clock,
  FileText,
  Trash2,
  ChevronRight,
  Users,
  CheckSquare,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react'
import type { FathomCall } from '../../hooks/useClientStrategy'

interface FathomCallLibraryProps {
  client: string
  calls: FathomCall[]
  loading: boolean
  onAddCall: (call: Partial<FathomCall>) => Promise<FathomCall | null>
  onDeleteCall: (id: string) => Promise<boolean>
  compact?: boolean
}

const CALL_TYPES = [
  { value: 'tam_map', label: 'TAM Map', color: 'bg-blue-500' },
  { value: 'opportunity_review', label: 'Opportunity Review', color: 'bg-green-500' },
  { value: 'messaging_review', label: 'Messaging Review', color: 'bg-purple-500' },
  { value: 'general', label: 'General', color: 'bg-gray-500' },
  { value: 'other', label: 'Other', color: 'bg-orange-500' },
] as const

function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface AddCallModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (call: Partial<FathomCall>) => Promise<void>
  isAdding: boolean
}

function AddCallModal({ isOpen, onClose, onAdd, isAdding }: AddCallModalProps) {
  const [title, setTitle] = useState('')
  const [callType, setCallType] = useState<FathomCall['call_type']>('tam_map')
  const [callDate, setCallDate] = useState('')
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAdd({
      title,
      call_type: callType,
      call_date: callDate ? new Date(callDate).toISOString() : undefined,
      transcript,
      summary,
      status: 'pending',
    })
    // Reset form
    setTitle('')
    setCallType('tam_map')
    setCallDate('')
    setTranscript('')
    setSummary('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-rillation-border">
            <h2 className="text-lg font-semibold text-rillation-text">Add Fathom Call</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-rillation-card-hover rounded-lg">
              <X size={18} className="text-rillation-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-rillation-text mb-2">Call Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., TAM Map Session 1 - Initial Discovery"
                className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted"
                required
              />
            </div>

            {/* Call Type & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-rillation-text mb-2">Call Type</label>
                <select
                  value={callType}
                  onChange={(e) => setCallType(e.target.value as FathomCall['call_type'])}
                  className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-text-muted"
                >
                  {CALL_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-rillation-text mb-2">Call Date</label>
                <input
                  type="datetime-local"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-text-muted"
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-rillation-text mb-2">Summary (optional)</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary of the call..."
                rows={2}
                className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted resize-none"
              />
            </div>

            {/* Transcript */}
            <div>
              <label className="block text-sm font-medium text-rillation-text mb-2">
                Transcript
                <span className="text-rillation-text-muted font-normal ml-2">(paste from Fathom)</span>
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste the full transcript here..."
                rows={8}
                className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted resize-none font-mono text-xs"
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
              disabled={!title || isAdding}
              className="flex items-center gap-2 px-5 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Add Call
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

interface CallCardProps {
  call: FathomCall
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  isDeleting: boolean
}

function CallCard({ call, isExpanded, onToggle, onDelete, isDeleting }: CallCardProps) {
  const typeConfig = CALL_TYPES.find(t => t.value === call.call_type) || CALL_TYPES[3]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-rillation-card-hover transition-colors text-left"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight size={18} className="text-rillation-text-muted" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className={`w-2 h-2 rounded-full ${typeConfig.color}`} />
            <span className="text-xs text-rillation-text-muted uppercase tracking-wide">
              {typeConfig.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              call.status === 'processed' ? 'bg-rillation-green/20 text-rillation-green' :
              call.status === 'archived' ? 'bg-rillation-text-muted/20 text-rillation-text-muted' :
              'bg-rillation-yellow/20 text-rillation-yellow'
            }`}>
              {call.status}
            </span>
          </div>
          <h3 className="text-sm font-medium text-rillation-text truncate">{call.title}</h3>
        </div>

        <div className="flex items-center gap-4 text-xs text-rillation-text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{formatDate(call.call_date)}</span>
          </div>
          {call.duration_seconds && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{formatDuration(call.duration_seconds)}</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-2 border-t border-rillation-border/50 space-y-4">
              {/* Summary */}
              {call.summary && (
                <div>
                  <h4 className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide mb-2">
                    Summary
                  </h4>
                  <p className="text-sm text-rillation-text leading-relaxed">{call.summary}</p>
                </div>
              )}

              {/* Action Items */}
              {call.action_items && call.action_items.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide mb-2 flex items-center gap-2">
                    <CheckSquare size={14} />
                    Action Items
                  </h4>
                  <ul className="space-y-1">
                    {call.action_items.map((item: any, i: number) => (
                      <li key={i} className="text-sm text-rillation-text flex items-start gap-2">
                        <span className="text-rillation-text-muted">•</span>
                        {typeof item === 'string' ? item : item.text || item.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Participants */}
              {call.participants && call.participants.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Users size={14} />
                    Participants
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {call.participants.map((p: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-rillation-bg rounded-lg text-rillation-text">
                        {typeof p === 'string' ? p : p.name || p.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript Preview */}
              {call.transcript && (
                <div>
                  <h4 className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText size={14} />
                    Transcript
                  </h4>
                  <div className="bg-rillation-bg rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-rillation-text-muted whitespace-pre-wrap font-mono">
                      {call.transcript.slice(0, 1000)}
                      {call.transcript.length > 1000 && '...'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-rillation-bg text-rillation-text text-xs rounded-lg hover:bg-rillation-card-hover transition-colors">
                  <Sparkles size={14} />
                  Generate Opportunity Map
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-400 text-xs hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FathomCallLibrary({
  client,
  calls,
  loading,
  onAddCall,
  onDeleteCall,
  compact = false,
}: FathomCallLibraryProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAddCall = async (call: Partial<FathomCall>) => {
    setIsAdding(true)
    const result = await onAddCall(call)
    setIsAdding(false)
    if (result) {
      setIsAddModalOpen(false)
    }
  }

  const handleDeleteCall = async (id: string) => {
    setDeletingId(id)
    await onDeleteCall(id)
    setDeletingId(null)
  }

  return (
    <div className={compact ? "space-y-3" : "p-6 space-y-6"}>
      {/* Header - only show in non-compact mode */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rillation-text">Fathom Call Library</h2>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              Manage recorded calls and transcripts for {client}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
            >
              <Plus size={16} />
              Add Call
            </button>
          </div>
        </div>
      )}

      {/* Compact mode actions */}
      {compact && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      )}

      {/* Call List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-rillation-text-muted" />
        </div>
      ) : calls.length === 0 ? (
        <div className={`text-center bg-rillation-card border border-rillation-border rounded-xl ${compact ? 'py-8' : 'py-16'}`}>
          <Phone size={compact ? 24 : 32} className="mx-auto text-rillation-text-muted mb-3" />
          <h3 className="text-sm font-medium text-rillation-text mb-1">No calls yet</h3>
          <p className="text-xs text-rillation-text-muted mb-3">
            Add your first Fathom call to start building the knowledge base.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus size={14} />
            Add Call
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              isExpanded={expandedCallId === call.id}
              onToggle={() => setExpandedCallId(expandedCallId === call.id ? null : call.id)}
              onDelete={() => handleDeleteCall(call.id)}
              isDeleting={deletingId === call.id}
            />
          ))}
        </div>
      )}

      {/* Add Call Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <AddCallModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddCall}
            isAdding={isAdding}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
