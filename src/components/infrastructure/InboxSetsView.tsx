import { useState } from 'react'
import { 
  Package, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  Pause,
  Play,
  CheckCircle,
  Archive,
  Download,
  MoreHorizontal,
  Flame,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useInboxSets, useInboxesInSet } from '../../hooks/useInboxSets'
import { useClients } from '../../hooks/useClients'
import type { InboxSet, InboxSetStatus } from '../../types/infrastructure'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'
import AnimatedSelect from '../ui/AnimatedSelect'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'warming', label: 'Warming' },
  { value: 'ready', label: 'Ready' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'paused', label: 'Paused' },
]

const PROVIDER_OPTIONS = [
  { value: '', label: 'All Providers' },
  { value: 'google', label: 'Google' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'smtp', label: 'SMTP' },
]

export default function InboxSetsView() {
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set())
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { sets, loading, bulkUpdateSets, bulkArchiveSets } = useInboxSets({
    client: selectedClient || undefined,
    status: selectedStatus as InboxSetStatus || undefined,
    provider: selectedProvider as any || undefined,
  })

  const toggleSetSelection = (id: string) => {
    const newSet = new Set(selectedSets)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedSets(newSet)
  }

  const toggleAllSets = () => {
    if (selectedSets.size === sets.length) {
      setSelectedSets(new Set())
    } else {
      setSelectedSets(new Set(sets.map(s => s.id)))
    }
  }

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedSets)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedSets(newSet)
  }

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedSets)
    if (ids.length === 0) return

    switch (action) {
      case 'pause':
        await bulkUpdateSets(ids, { status: 'paused' })
        break
      case 'resume':
        await bulkUpdateSets(ids, { status: 'warming' })
        break
      case 'ready':
        await bulkUpdateSets(ids, { status: 'ready' })
        break
      case 'deploy':
        await bulkUpdateSets(ids, { status: 'deployed' })
        break
      case 'archive':
        await bulkArchiveSets(ids)
        break
    }
    setSelectedSets(new Set())
  }

  const getStatusBadge = (status: InboxSetStatus) => {
    const styles: Record<string, string> = {
      ordered: 'bg-rillation-purple/20 text-rillation-purple',
      warming: 'bg-rillation-orange/20 text-rillation-orange',
      ready: 'bg-rillation-cyan/20 text-rillation-cyan',
      deployed: 'bg-rillation-green/20 text-rillation-green',
      paused: 'bg-gray-500/20 text-gray-400',
      archived: 'bg-gray-700/20 text-gray-500',
    }
    return styles[status] || styles.ordered
  }

  const getProviderBadge = (provider: string) => {
    const styles: Record<string, string> = {
      google: 'bg-blue-500/20 text-blue-400',
      microsoft: 'bg-sky-500/20 text-sky-400',
      smtp: 'bg-violet-500/20 text-violet-400',
    }
    return styles[provider] || 'bg-gray-500/20 text-gray-400'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
            <AnimatedSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="All Statuses"
              size="sm"
              options={STATUS_OPTIONS}
            />
            <AnimatedSelect
              value={selectedProvider}
              onChange={setSelectedProvider}
              placeholder="All Providers"
              size="sm"
              options={PROVIDER_OPTIONS}
            />
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create Set
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedSets.size > 0 && (
        <div className="bg-rillation-purple/10 border border-rillation-purple/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-rillation-text">
            {selectedSets.size} set{selectedSets.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('pause')}>
              <Pause size={14} />
              Pause Warmup
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('resume')}>
              <Play size={14} />
              Resume Warmup
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('ready')}>
              <CheckCircle size={14} />
              Mark Ready
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('deploy')}>
              <CheckCircle size={14} />
              Mark Deployed
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('archive')}>
              <Archive size={14} />
              Archive
            </Button>
          </div>
        </div>
      )}

      {/* Sets Table */}
      <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
        <div className="p-4 border-b border-rillation-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-rillation-text flex items-center gap-2">
            <Package size={20} className="text-rillation-purple" />
            Inbox Sets ({sets.length})
          </h3>
          <button
            onClick={toggleAllSets}
            className="text-sm text-rillation-purple hover:text-rillation-magenta"
          >
            {selectedSets.size === sets.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="divide-y divide-rillation-border/30">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : sets.length === 0 ? (
            <div className="p-8 text-center text-rillation-text-muted">
              No inbox sets found
            </div>
          ) : (
            sets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                isSelected={selectedSets.has(set.id)}
                isExpanded={expandedSets.has(set.id)}
                onToggleSelect={() => toggleSetSelection(set.id)}
                onToggleExpand={() => toggleExpanded(set.id)}
                getStatusBadge={getStatusBadge}
                getProviderBadge={getProviderBadge}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SetRow({
  set,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  getStatusBadge,
  getProviderBadge,
}: {
  set: InboxSet
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
  getStatusBadge: (status: InboxSetStatus) => string
  getProviderBadge: (provider: string) => string
}) {
  const { inboxes, loading: inboxesLoading } = useInboxesInSet(isExpanded ? set.id : undefined)

  return (
    <div>
      {/* Set Row */}
      <div 
        className={`flex items-center gap-4 px-4 py-3 hover:bg-rillation-card-hover transition-colors ${
          isSelected ? 'bg-rillation-purple/5' : ''
        }`}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-rillation-border"
        />

        {/* Expand Button */}
        <button onClick={onToggleExpand} className="text-rillation-text-muted hover:text-white">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Set Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{set.name}</p>
          <p className="text-xs text-rillation-text-muted">{set.domain}</p>
        </div>

        {/* Client */}
        <div className="w-32">
          <p className="text-sm text-rillation-text-muted truncate">{set.client}</p>
        </div>

        {/* Provider */}
        <div className="w-24">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getProviderBadge(set.provider)}`}>
            {set.provider}
          </span>
        </div>

        {/* Count */}
        <div className="w-24 text-center">
          <span className="text-sm">
            <span className="text-rillation-green">{set.connected_count}</span>
            <span className="text-rillation-text-muted"> / {set.quantity}</span>
          </span>
        </div>

        {/* Warmup Progress */}
        <div className="w-32">
          {set.status === 'warming' && set.warmup_progress !== undefined ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rillation-orange flex items-center gap-1">
                  <Flame size={12} />
                  {set.days_warming}d
                </span>
                <span className="text-rillation-text-muted">{set.warmup_progress}%</span>
              </div>
              <div className="h-1.5 bg-rillation-bg rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rillation-orange to-rillation-green transition-all"
                  style={{ width: `${set.warmup_progress}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-xs text-rillation-text-muted">-</span>
          )}
        </div>

        {/* Status */}
        <div className="w-24">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(set.status)}`}>
            {set.status}
          </span>
        </div>

        {/* Actions */}
        <button className="p-1 text-rillation-text-muted hover:text-white">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Expanded Inboxes */}
      {isExpanded && (
        <div className="bg-rillation-bg/50 border-t border-rillation-border/30">
          {inboxesLoading ? (
            <div className="p-4 text-center">
              <div className="w-4 h-4 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : inboxes.length === 0 ? (
            <div className="p-4 text-center text-sm text-rillation-text-muted">
              No inboxes in this set
            </div>
          ) : (
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-rillation-text-muted">
                    <th className="text-left pb-2">Email</th>
                    <th className="text-left pb-2">Status</th>
                    <th className="text-left pb-2">Warmup</th>
                    <th className="text-right pb-2">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rillation-border/20">
                  {inboxes.slice(0, 10).map((inbox: any) => (
                    <tr key={inbox.id} className="text-rillation-text-muted">
                      <td className="py-1.5">{inbox.email}</td>
                      <td className="py-1.5">
                        {inbox.status === 'Connected' ? (
                          <span className="text-rillation-green flex items-center gap-1">
                            <Wifi size={12} /> Connected
                          </span>
                        ) : (
                          <span className="text-rillation-red flex items-center gap-1">
                            <WifiOff size={12} /> Disconnected
                          </span>
                        )}
                      </td>
                      <td className="py-1.5">
                        {inbox.warmup_reputation ? `${inbox.warmup_reputation}%` : '-'}
                      </td>
                      <td className="py-1.5 text-right">{inbox.emails_sent_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inboxes.length > 10 && (
                <p className="text-xs text-rillation-text-muted mt-2">
                  + {inboxes.length - 10} more inboxes
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
