import { useState, useMemo } from 'react'
import { 
  Globe, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  Package,
  Clock,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import { useDomainInventory } from '../../hooks/useDomainInventory'
import { useClients } from '../../hooks/useClients'
import type { DomainInventory, DomainStatus, InboxProvider } from '../../types/infrastructure'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'
import AnimatedSelect from '../ui/AnimatedSelect'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'configured', label: 'Configured' },
  { value: 'in_use', label: 'In Use' },
]

const PROVIDER_OPTIONS = [
  { value: '', label: 'All Providers' },
  { value: 'missioninbox', label: 'MissionInbox' },
  { value: 'inboxkit', label: 'InboxKit' },
  { value: 'none', label: 'Unassigned' },
]

type GroupBy = 'none' | 'client' | 'status' | 'inbox_provider' | 'purchase_batch'

export default function DomainInventoryManager() {
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('client')
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']))
  const [showNeedsAction, setShowNeedsAction] = useState(false)
  const [copied, setCopied] = useState(false)

  const { domains, loading, markAsPurchased, assignToProvider, bulkUpdateDomains, deleteDomains } = useDomainInventory({
    client: selectedClient || undefined,
    status: selectedStatus as DomainStatus || undefined,
    inbox_provider: selectedProvider as InboxProvider || undefined,
    needsAction: showNeedsAction,
  })

  // Group domains
  const groupedDomains = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Domains': domains }
    }

    const groups: Record<string, DomainInventory[]> = {}
    for (const domain of domains) {
      let key: string
      switch (groupBy) {
        case 'client':
          key = domain.client || 'Unassigned'
          break
        case 'status':
          key = domain.status
          break
        case 'inbox_provider':
          key = domain.inbox_provider || 'Unassigned'
          break
        default:
          key = 'All'
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(domain)
    }
    return groups
  }, [domains, groupBy])

  const toggleDomain = (id: string) => {
    const newSet = new Set(selectedDomains)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedDomains(newSet)
  }

  const toggleGroup = (groupName: string) => {
    const groupDomains = groupedDomains[groupName] || []
    const allSelected = groupDomains.every(d => selectedDomains.has(d.id))
    
    const newSet = new Set(selectedDomains)
    if (allSelected) {
      groupDomains.forEach(d => newSet.delete(d.id))
    } else {
      groupDomains.forEach(d => newSet.add(d.id))
    }
    setSelectedDomains(newSet)
  }

  const toggleExpanded = (group: string) => {
    const newSet = new Set(expandedGroups)
    if (newSet.has(group)) {
      newSet.delete(group)
    } else {
      newSet.add(group)
    }
    setExpandedGroups(newSet)
  }

  const handleBulkAction = async (action: string, _value?: string) => {
    const ids = Array.from(selectedDomains)
    if (ids.length === 0) return

    switch (action) {
      case 'mark_purchased':
        await markAsPurchased(ids)
        break
      case 'assign_missioninbox':
        await assignToProvider(ids, 'missioninbox')
        break
      case 'assign_inboxkit':
        await assignToProvider(ids, 'inboxkit')
        break
      case 'mark_configured':
        await bulkUpdateDomains(ids, { status: 'configured', dns_configured: true })
        break
      case 'mark_in_use':
        await bulkUpdateDomains(ids, { status: 'in_use' })
        break
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ${ids.length} domain(s)? This cannot be undone.`)) {
          await deleteDomains(ids)
        }
        break
    }
    setSelectedDomains(new Set())
  }

  const copyDomainsToClipboard = async () => {
    const ids = Array.from(selectedDomains)
    // Get the domain names for selected IDs
    const domainNames = domains
      .filter(d => ids.includes(d.id))
      .map(d => d.domain_name)
      .join('\n')
    
    try {
      await navigator.clipboard.writeText(domainNames)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getStatusBadge = (status: DomainStatus) => {
    const styles: Record<DomainStatus, string> = {
      available: 'bg-gray-500/20 text-gray-400',
      purchased: 'bg-rillation-purple/20 text-rillation-purple',
      configured: 'bg-rillation-cyan/20 text-rillation-cyan',
      in_use: 'bg-rillation-green/20 text-rillation-green',
      expired: 'bg-rillation-red/20 text-rillation-red',
      reserved: 'bg-rillation-orange/20 text-rillation-orange',
    }
    return styles[status] || styles.available
  }

  const stats = useMemo(() => ({
    total: domains.length,
    purchased: domains.filter(d => d.status === 'purchased').length,
    configured: domains.filter(d => d.status === 'configured').length,
    inUse: domains.filter(d => d.status === 'in_use').length,
    needsAction: domains.filter(d => d.needs_action).length,
  }), [domains])

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-rillation-text-muted">Total</p>
            <p className="text-xl font-bold text-white">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-rillation-text-muted">Purchased</p>
            <p className="text-xl font-bold text-rillation-purple">{stats.purchased}</p>
          </div>
          <div>
            <p className="text-xs text-rillation-text-muted">Configured</p>
            <p className="text-xl font-bold text-rillation-cyan">{stats.configured}</p>
          </div>
          <div>
            <p className="text-xs text-rillation-text-muted">In Use</p>
            <p className="text-xl font-bold text-rillation-green">{stats.inUse}</p>
          </div>
          {stats.needsAction > 0 && (
            <div className="ml-auto">
              <button
                onClick={() => setShowNeedsAction(!showNeedsAction)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                  showNeedsAction 
                    ? 'bg-rillation-orange text-white' 
                    : 'bg-rillation-orange/20 text-rillation-orange'
                }`}
              >
                <AlertTriangle size={14} />
                {stats.needsAction} Need Action
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center gap-4">
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-rillation-text-muted">Group by:</span>
            <AnimatedSelect
              value={groupBy}
              onChange={(v) => setGroupBy(v as GroupBy)}
              size="sm"
              options={[
                { value: 'client', label: 'Client' },
                { value: 'status', label: 'Status' },
                { value: 'inbox_provider', label: 'Provider' },
                { value: 'none', label: 'None' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedDomains.size > 0 && (
        <div className="bg-white/5 border border-white/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-white">
            {selectedDomains.size} domain{selectedDomains.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyDomainsToClipboard}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Domains'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('mark_purchased')}>
              Mark Purchased
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('mark_configured')}>
              Mark Configured
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('assign_missioninbox')}>
              <Package size={14} />
              Assign MissionInbox
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('assign_inboxkit')}>
              <Package size={14} />
              Assign InboxKit
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => handleBulkAction('delete')}
              className="!text-red-400 hover:!bg-red-500/20 !border-red-500/30"
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Domain Groups */}
      <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
        <div className="p-4 border-b border-rillation-border">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe size={20} className="text-rillation-cyan" />
            Domain Inventory
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : domains.length === 0 ? (
          <div className="p-8 text-center text-rillation-text-muted">
            No domains found. Use the Domain Generator to add domains.
          </div>
        ) : (
          <div className="divide-y divide-rillation-border/30">
            {Object.entries(groupedDomains).map(([groupName, groupDomains]) => (
              <div key={groupName}>
                {/* Group Header */}
                <div 
                  className="flex items-center gap-3 px-4 py-3 bg-rillation-bg/50 cursor-pointer hover:bg-rillation-card-hover"
                  onClick={() => toggleExpanded(groupName)}
                >
                  {expandedGroups.has(groupName) ? (
                    <ChevronDown size={18} className="text-rillation-text-muted" />
                  ) : (
                    <ChevronRight size={18} className="text-rillation-text-muted" />
                  )}
                  <input
                    type="checkbox"
                    checked={groupDomains.every(d => selectedDomains.has(d.id))}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleGroup(groupName)
                    }}
                    className="rounded border-rillation-border"
                  />
                  <span className="font-medium text-white">{groupName}</span>
                  <span className="text-sm text-rillation-text-muted">({groupDomains.length} domains)</span>
                </div>

                {/* Group Content */}
                {expandedGroups.has(groupName) && (
                  <div className="divide-y divide-rillation-border/20">
                    {groupDomains.map((domain) => (
                      <div 
                        key={domain.id}
                        className={`flex items-center gap-4 px-4 py-2 pl-12 hover:bg-rillation-card-hover ${
                          domain.needs_action ? 'bg-rillation-orange/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDomains.has(domain.id)}
                          onChange={() => toggleDomain(domain.id)}
                          className="rounded border-rillation-border"
                        />
                        <span className="flex-1 font-mono text-sm text-white">{domain.domain_name}</span>
                        <span className="w-24 text-sm text-rillation-text-muted">{domain.client || '-'}</span>
                        <span className={`w-24 px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(domain.status)}`}>
                          {domain.status}
                        </span>
                        <span className="w-28 text-xs text-rillation-text-muted">
                          {domain.inbox_provider || 'Unassigned'}
                        </span>
                        <span className="w-20 text-xs text-rillation-text-muted text-right">
                          {domain.inboxes_ordered > 0 ? `${domain.inboxes_ordered} inboxes` : '-'}
                        </span>
                        {domain.needs_action && (
                          <span className="text-rillation-orange" title="Purchased but no inboxes ordered">
                            <Clock size={14} />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
