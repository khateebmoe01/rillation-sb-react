import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox,
  Phone,
  Calendar,
  Clock,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useFathomAutoSync } from '../../hooks/useFathomAutoSync'

// Helper to get table reference without type checking
const getTable = (name: string) => (supabase as any).from(name)

interface UnassignedCall {
  id: string
  fathom_call_id: string
  title: string
  call_date?: string
  duration_seconds?: number
  summary?: string
  transcript?: string
  participants: any[]
  match_confidence: number
}

interface UnassignedCallsInboxProps {
  clients: string[]
  onCallAssigned?: () => void
}

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

interface CallCardProps {
  call: UnassignedCall
  clients: string[]
  onAssign: (callId: string, client: string) => Promise<void>
  isAssigning: boolean
}

function CallCard({ call, clients, onAssign, isAssigning }: CallCardProps) {
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAssign = async () => {
    if (selectedClient) {
      await onAssign(call.id, selectedClient)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-rillation-bg rounded-lg transition-colors"
        >
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
            <ChevronRight size={16} className="text-rillation-text-muted" />
          </motion.div>
        </button>

        <div className="w-10 h-10 rounded-lg bg-rillation-yellow/20 flex items-center justify-center flex-shrink-0">
          <Phone size={18} className="text-rillation-yellow" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-rillation-text truncate">{call.title}</h3>
          <div className="flex items-center gap-4 mt-1 text-xs text-rillation-text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(call.call_date)}
            </span>
            {call.duration_seconds && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(call.duration_seconds)}
              </span>
            )}
          </div>
        </div>

        {/* Assignment Controls */}
        <div className="flex items-center gap-2">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-3 py-1.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-text-muted min-w-[150px]"
          >
            <option value="">Select client...</option>
            {clients.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedClient || isAssigning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAssigning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Assign
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-rillation-border/50"
          >
            <div className="p-4 bg-rillation-bg/30 space-y-3">
              {call.summary && (
                <div>
                  <h4 className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide mb-1">
                    Summary
                  </h4>
                  <p className="text-sm text-rillation-text">{call.summary}</p>
                </div>
              )}
              
              {call.participants && call.participants.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide mb-1">
                    Participants
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {call.participants.map((p: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-rillation-card rounded-lg text-rillation-text">
                        {typeof p === 'string' ? p : p.name || p.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript Preview */}
              {call.transcript && (
                <div>
                  <h4 className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide mb-1 flex items-center gap-2">
                    <FileText size={12} />
                    Transcript
                  </h4>
                  <div className="bg-rillation-card rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-rillation-text-muted whitespace-pre-wrap font-mono">
                      {call.transcript.slice(0, 1500)}
                      {call.transcript.length > 1500 && '...'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function UnassignedCallsInbox({ clients, onCallAssigned }: UnassignedCallsInboxProps) {
  const [calls, setCalls] = useState<UnassignedCall[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch unassigned calls
  const fetchUnassignedCalls = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await getTable('client_fathom_calls')
        .select('*')
        .or('client.is.null,client.eq.')
        .order('call_date', { ascending: false })

      if (error) throw error
      setCalls(data || [])
    } catch (err) {
      console.error('Error fetching unassigned calls:', err)
      setError('Failed to load unassigned calls')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnassignedCalls()
  }, [fetchUnassignedCalls])

  // Auto-refresh calls every 30 seconds
  useFathomAutoSync({
    enabled: true,
    onRefetch: fetchUnassignedCalls,
    intervalMs: 30000, // 30 seconds
  })

  // Assign call to client
  const assignCall = async (callId: string, client: string) => {
    setAssigningId(callId)

    try {
      const { error } = await getTable('client_fathom_calls')
        .update({ 
          client, 
          auto_matched: false,
          updated_at: new Date().toISOString() 
        })
        .eq('id', callId)

      if (error) throw error

      // Remove from local state
      setCalls(prev => prev.filter(c => c.id !== callId))
      
      // Notify parent
      onCallAssigned?.()
    } catch (err) {
      console.error('Error assigning call:', err)
      setError('Failed to assign call')
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rillation-yellow/20 flex items-center justify-center">
            <Inbox size={24} className="text-rillation-yellow" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-rillation-text">Unassigned Calls</h1>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              {calls.length} call{calls.length !== 1 ? 's' : ''} need{calls.length === 1 ? 's' : ''} to be assigned to a client
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Calls List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-rillation-text-muted" />
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-16 bg-rillation-card border border-rillation-border rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rillation-green/20 flex items-center justify-center">
            <Check size={32} className="text-rillation-green" />
          </div>
          <h3 className="text-base font-medium text-rillation-text mb-2">All caught up!</h3>
          <p className="text-sm text-rillation-text-muted">
            All calls have been assigned to clients.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {calls.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                clients={clients}
                onAssign={assignCall}
                isAssigning={assigningId === call.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
