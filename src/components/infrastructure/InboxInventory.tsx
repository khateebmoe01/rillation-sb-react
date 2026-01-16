import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Download, Edit, Tag } from 'lucide-react'
import { useInboxes } from '../../hooks/useInboxes'
import { useInboxTags } from '../../hooks/useInboxTags'
import { useInfraFilter } from '../../pages/Infrastructure'
import { normalizeProviderName } from '../../lib/supabase'
import Button from '../ui/Button'
import AnimatedSelect from '../ui/AnimatedSelect'

export default function InboxInventory() {
  const { selectedClient, searchQuery } = useInfraFilter()
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedInboxes, setSelectedInboxes] = useState<Set<number>>(new Set())

  const { tags } = useInboxTags({ client: selectedClient || undefined })
  
  // Fetch all inboxes without provider filter (we'll filter client-side)
  const { inboxes, loading, error } = useInboxes({
    client: selectedClient || undefined,
  })
  
  // Filter by provider, tag, and search query
  const filteredInboxes = useMemo(() => {
    let result = inboxes

    // Filter by provider (using normalized name)
    if (selectedProvider) {
      result = result.filter(inbox => normalizeProviderName(inbox.type) === selectedProvider)
    }

    // Filter by tag
    if (selectedTag) {
      result = result.filter(inbox => {
        const inboxTags = (inbox as any).tags || []
        return Array.isArray(inboxTags) && inboxTags.includes(selectedTag)
      })
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(inbox => 
        inbox.email?.toLowerCase().includes(query) ||
        inbox.client?.toLowerCase().includes(query) ||
        inbox.domain?.toLowerCase().includes(query)
      )
    }

    return result
  }, [inboxes, selectedProvider, selectedTag, searchQuery])

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
      {/* Filters Row */}
      <motion.div 
        className="flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
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
        
        <AnimatePresence>
          {selectedInboxes.size > 0 && (
            <motion.div 
              className="flex items-center gap-2 ml-auto"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <Button variant="secondary" size="sm">
                <Edit size={14} />
                Bulk Edit ({selectedInboxes.size})
              </Button>
              <Button variant="primary" size="sm">
                <Download size={14} />
                Export Selected
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Inboxes Table */}
      <motion.div 
        className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="p-4 border-b border-rillation-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package size={20} className="text-white" />
            Inbox Inventory ({filteredInboxes.length})
            {selectedTag && (
              <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Tag size={10} />
                Filtered by tag
              </span>
            )}
          </h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-white hover:text-white transition-colors"
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
                    className="rounded border-rillation-border bg-transparent"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">
                  Deliverability
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rillation-border/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <motion.div 
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </td>
                </tr>
              ) : filteredInboxes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white">
                    No inboxes found
                  </td>
                </tr>
              ) : (
                filteredInboxes.map((inbox, index) => {
                  const inboxTagIds = ((inbox as any).tags || []) as string[]
                  const inboxTagNames = inboxTagIds
                    .map(tid => tags.find(t => t.id === tid)?.name)
                    .filter(Boolean)
                  
                  return (
                    <motion.tr
                      key={inbox.id}
                      className="hover:bg-rillation-card-hover transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedInboxes.has(inbox.id as number)}
                          onChange={() => handleSelectInbox(inbox.id as number)}
                          className="rounded border-rillation-border bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        <div>
                          {inbox.email || '-'}
                          {inboxTagNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {inboxTagNames.slice(0, 2).map((name, i) => (
                                <span key={i} className="text-xs bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                                  {name}
                                </span>
                              ))}
                              {inboxTagNames.length > 2 && (
                                <span className="text-xs text-white">
                                  +{inboxTagNames.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {inbox.client || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {normalizeProviderName(inbox.type)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            inbox.status === 'Connected'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {inbox.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {inbox.deliverability_score
                          ? `${inbox.deliverability_score}%`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {inbox.created_at
                          ? new Date(inbox.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
