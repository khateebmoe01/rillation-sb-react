import { useState, useEffect } from 'react'
import { X, Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from './Button'
import type { ClientTarget } from '../../types/database'

interface ConfigureTargetsModalProps {
  isOpen: boolean
  onClose: () => void
  clients: string[]
  onSave?: () => void
}

interface ClientTargetData {
  client: string
  emails_per_day: number
  prospects_per_day: number
  replies_per_day: number
  meetings_per_day: number
}

const CLIENTS_PER_PAGE = 3

export default function ConfigureTargetsModal({
  isOpen,
  onClose,
  clients,
  onSave,
}: ConfigureTargetsModalProps) {
  const [targetsData, setTargetsData] = useState<Map<string, ClientTargetData>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = Math.ceil(clients.length / CLIENTS_PER_PAGE)
  const visibleClients = clients.slice(
    currentPage * CLIENTS_PER_PAGE,
    (currentPage + 1) * CLIENTS_PER_PAGE
  )

  // Fetch all targets
  useEffect(() => {
    if (!isOpen) return

    async function fetchTargets() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('client_targets')
          .select('*')

        if (error) throw error

        const targetMap = new Map<string, ClientTargetData>()
        
        // Initialize all clients with defaults
        clients.forEach((client) => {
          targetMap.set(client, {
            client,
            emails_per_day: 0,
            prospects_per_day: 0,
            replies_per_day: 0,
            meetings_per_day: 0,
          })
        })

        // Override with actual data
        data?.forEach((target) => {
          if (targetMap.has(target.client)) {
            targetMap.set(target.client, {
              client: target.client,
              emails_per_day: target.emails_per_day || 0,
              prospects_per_day: target.prospects_per_day || 0,
              replies_per_day: target.replies_per_day || 0,
              meetings_per_day: target.meetings_per_day || 0,
            })
          }
        })

        setTargetsData(targetMap)
      } catch (err) {
        console.error('Error fetching targets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTargets()
  }, [isOpen, clients])

  // Handle input change
  const handleChange = (client: string, field: keyof ClientTargetData, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0
    setTargetsData((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(client)
      if (current) {
        newMap.set(client, { ...current, [field]: numValue })
      }
      return newMap
    })
  }

  // Handle focus - select all
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  // Save all targets
  const handleSave = async () => {
    setSaving(true)
    try {
      const upsertData = Array.from(targetsData.values())

      const { error } = await supabase
        .from('client_targets')
        .upsert(upsertData, { onConflict: 'client' })

      if (error) throw error

      onSave?.()
      onClose()
    } catch (err) {
      console.error('Error saving targets:', err)
      alert('Failed to save targets')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div>
            <h2 className="text-xl font-semibold text-rillation-text">Configure Daily Targets</h2>
            <p className="text-sm text-rillation-text-muted mt-1">
              Set daily targets for each client
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visibleClients.map((client) => {
                const data = targetsData.get(client)
                
                return (
                  <div 
                    key={client}
                    className="bg-rillation-bg rounded-xl p-5 border border-rillation-border"
                  >
                    <h3 className="text-lg font-semibold text-rillation-text mb-4">{client}</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-rillation-text-muted mb-1">
                          Emails per Day
                        </label>
                        <input
                          type="number"
                          value={data?.emails_per_day ?? ''}
                          onChange={(e) => handleChange(client, 'emails_per_day', e.target.value)}
                          onFocus={handleFocus}
                          className="w-full px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-rillation-text-muted mb-1">
                          Prospects per Day
                        </label>
                        <input
                          type="number"
                          value={data?.prospects_per_day ?? ''}
                          onChange={(e) => handleChange(client, 'prospects_per_day', e.target.value)}
                          onFocus={handleFocus}
                          className="w-full px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-rillation-text-muted mb-1">
                          Replies per Day
                        </label>
                        <input
                          type="number"
                          value={data?.replies_per_day ?? ''}
                          onChange={(e) => handleChange(client, 'replies_per_day', e.target.value)}
                          onFocus={handleFocus}
                          className="w-full px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-rillation-text-muted mb-1">
                          Meetings per Day
                        </label>
                        <input
                          type="number"
                          value={data?.meetings_per_day ?? ''}
                          onChange={(e) => handleChange(client, 'meetings_per_day', e.target.value)}
                          onFocus={handleFocus}
                          className="w-full px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination & Footer */}
        <div className="flex items-center justify-between p-4 border-t border-rillation-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={20} className="text-rillation-text-muted" />
            </button>
            <span className="text-sm text-rillation-text-muted">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight size={20} className="text-rillation-text-muted" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save All Targets
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

