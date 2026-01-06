import { useState } from 'react'
import { Package, Download, Edit } from 'lucide-react'
import { useInboxes } from '../../hooks/useInboxes'
import { useClients } from '../../hooks/useClients'
import { normalizeProviderName } from '../../lib/supabase'
import ClientFilter from '../ui/ClientFilter'
import Button from '../ui/Button'

export default function InboxInventory() {
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedInboxes, setSelectedInboxes] = useState<Set<number>>(new Set())

  const { inboxes, loading, error } = useInboxes({
    client: selectedClient || undefined,
    provider: selectedProvider || undefined,
  })

  const handleSelectAll = () => {
    if (selectedInboxes.size === inboxes.length) {
      setSelectedInboxes(new Set())
    } else {
      setSelectedInboxes(new Set(inboxes.map((inbox) => inbox.id).filter(Boolean) as number[]))
    }
  }

  const handleSelectInbox = (id: number) => {
    const newSet = new Set(selectedInboxes)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedInboxes(newSet)
  }

  // Get unique normalized provider names
  const providers = Array.from(new Set(inboxes.map((i) => normalizeProviderName(i.type)).filter((p) => p !== '-')))

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-rillation-text-muted">Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="appearance-none px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple cursor-pointer"
              >
                <option value="">All Providers</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedInboxes.size > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                <Edit size={14} />
                Bulk Edit ({selectedInboxes.size})
              </Button>
              <Button variant="primary" size="sm">
                <Download size={14} />
                Export Selected
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Inboxes Table */}
      <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
        <div className="p-4 border-b border-rillation-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-rillation-text flex items-center gap-2">
            <Package size={20} className="text-rillation-purple" />
            Inbox Inventory ({inboxes.length})
          </h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-rillation-purple hover:text-rillation-magenta"
          >
            {selectedInboxes.size === inboxes.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rillation-card-hover">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInboxes.size === inboxes.length && inboxes.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-rillation-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Deliverability
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rillation-border/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : inboxes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-rillation-text-muted">
                    No inboxes found
                  </td>
                </tr>
              ) : (
                inboxes.map((inbox) => (
                  <tr
                    key={inbox.id}
                    className="hover:bg-rillation-card-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedInboxes.has(inbox.id as number)}
                        onChange={() => handleSelectInbox(inbox.id as number)}
                        className="rounded border-rillation-border"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text font-medium">
                      {inbox.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {inbox.client || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {normalizeProviderName(inbox.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          inbox.status === 'active'
                            ? 'bg-rillation-green/20 text-rillation-green'
                            : 'bg-rillation-red/20 text-rillation-red'
                        }`}
                      >
                        {inbox.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {inbox.deliverability_score
                        ? `${inbox.deliverability_score}%`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {inbox.created_at
                        ? new Date(inbox.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}






















