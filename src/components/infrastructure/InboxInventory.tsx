import { useState } from 'react'
import { Package, Download, Edit, Tag } from 'lucide-react'
import { useInboxes } from '../../hooks/useInboxes'
import { useClients } from '../../hooks/useClients'
import { useInboxTags } from '../../hooks/useInboxTags'
import { normalizeProviderName } from '../../lib/supabase'
import ClientFilter from '../ui/ClientFilter'
import Button from '../ui/Button'
import AnimatedSelect from '../ui/AnimatedSelect'

export default function InboxInventory() {
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedInboxes, setSelectedInboxes] = useState<Set<number>>(new Set())

  const { tags } = useInboxTags({ client: selectedClient || undefined })
  
  const { inboxes, loading, error } = useInboxes({
    client: selectedClient || undefined,
    provider: selectedProvider || undefined,
  })
  
  // Filter by tag if selected (client-side filtering on tags JSONB)
  const filteredInboxes = selectedTag 
    ? inboxes.filter(inbox => {
        const inboxTags = (inbox as any).tags || []
        return Array.isArray(inboxTags) && inboxTags.includes(selectedTag)
      })
    : inboxes

  const handleSelectAll = () => {
    if (selectedInboxes.size === filteredInboxes.length) {
      setSelectedInboxes(new Set())
    } else {
      setSelectedInboxes(new Set(filteredInboxes.map((inbox) => inbox.id).filter(Boolean) as number[]))
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
            <div className="flex items-center gap-2 min-w-[160px]">
              <AnimatedSelect
                value={selectedProvider}
                onChange={setSelectedProvider}
                placeholder="All Providers"
                size="sm"
                showCheck={false}
                options={[
                  { value: '', label: 'All Providers' },
                  ...providers.map(provider => ({ value: provider, label: provider }))
                ]}
              />
            </div>
            <div className="flex items-center gap-2 min-w-[160px]">
              <AnimatedSelect
                value={selectedTag}
                onChange={setSelectedTag}
                placeholder="All Tags"
                size="sm"
                showCheck={false}
                options={[
                  { value: '', label: 'All Tags' },
                  ...tags.map(tag => ({ value: tag.id, label: `${tag.name} (${tag.inbox_count})` }))
                ]}
              />
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
            Inbox Inventory ({filteredInboxes.length})
            {selectedTag && (
              <span className="text-xs bg-rillation-purple/20 text-rillation-purple px-2 py-0.5 rounded-full flex items-center gap-1">
                <Tag size={10} />
                Filtered by tag
              </span>
            )}
          </h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-rillation-purple hover:text-rillation-magenta"
          >
            {selectedInboxes.size === filteredInboxes.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rillation-card-hover">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInboxes.size === filteredInboxes.length && filteredInboxes.length > 0}
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
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredInboxes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-rillation-text-muted">
                    No inboxes found
                  </td>
                </tr>
              ) : (
                filteredInboxes.map((inbox) => {
                  const inboxTagIds = ((inbox as any).tags || []) as string[]
                  const inboxTagNames = inboxTagIds
                    .map(tid => tags.find(t => t.id === tid)?.name)
                    .filter(Boolean)
                  
                  return (
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
                        <div>
                          {inbox.email || '-'}
                          {inboxTagNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {inboxTagNames.slice(0, 2).map((name, i) => (
                                <span key={i} className="text-xs bg-rillation-purple/20 text-rillation-purple px-1.5 py-0.5 rounded">
                                  {name}
                                </span>
                              ))}
                              {inboxTagNames.length > 2 && (
                                <span className="text-xs text-rillation-text-muted">
                                  +{inboxTagNames.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
                            inbox.status === 'Connected'
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}






















