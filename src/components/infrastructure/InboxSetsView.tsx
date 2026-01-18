import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Tag, 
  ChevronRight, 
  Plus,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useInboxTags, useInboxesByTag, type InboxTag } from '../../hooks/useInboxTags'
import { useInfraFilter } from '../../pages/Infrastructure'
import Button from '../ui/Button'

export default function InboxSetsView() {
  const { selectedClient, searchQuery } = useInfraFilter()
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [showOnlySets, setShowOnlySets] = useState(true)

  const { tags, loading, syncTags, createTag, deleteTag, refetch } = useInboxTags({
    client: selectedClient || undefined,
  })

  // Filter tags by search query and "Sets only" filter
  const filteredTags = tags.filter(tag => {
    if (searchQuery && !tag.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (showOnlySets && !tag.name.toLowerCase().includes('set')) {
      return false
    }
    return true
  })

  const toggleTagSelection = (id: string) => {
    const newSet = new Set(selectedTags)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedTags(newSet)
  }

  const toggleAllTags = () => {
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set())
    } else {
      setSelectedTags(new Set(filteredTags.map(t => t.id)))
    }
  }

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedTags)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedTags(newSet)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncTags()
      // Wait longer and refetch multiple times to ensure counts are updated
      setTimeout(() => {
        refetch()
        setTimeout(() => {
          refetch()
          setSyncing(false)
        }, 2000)
      }, 3000)
    } catch (err) {
      console.error('Sync failed:', err)
      setSyncing(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !selectedClient) return
    
    try {
      await createTag(selectedClient, newTagName.trim())
      setShowCreateModal(false)
      setNewTagName('')
    } catch (err) {
      console.error('Failed to create tag:', err)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!selectedClient) return
    if (!confirm('Are you sure you want to delete this tag? This will also remove it from Bison.')) return
    
    try {
      await deleteTag(selectedClient, tagId)
    } catch (err) {
      console.error('Failed to delete tag:', err)
    }
  }

  // Group tags by client when no client is selected
  const tagsByClient = filteredTags.reduce((acc, tag) => {
    const client = tag.client || 'Unknown'
    if (!acc[client]) acc[client] = []
    acc[client].push(tag)
    return acc
  }, {} as Record<string, InboxTag[]>)

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedTags.size > 0 && (
          <motion.div 
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          >
            <span className="text-sm text-white">
              {selectedTags.size} tag{selectedTags.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTags(new Set())}>
                Clear Selection
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tags Table */}
      <motion.div 
        className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="p-4 border-b border-rillation-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag size={20} className="text-white" />
            Tags / Sets ({filteredTags.length})
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOnlySets(!showOnlySets)}
              className={`text-sm transition-colors px-3 py-1.5 rounded-lg border ${
                showOnlySets 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
              }`}
            >
              {showOnlySets ? 'Show All Tags' : 'Show Only Sets'}
            </button>
            <button
              onClick={toggleAllTags}
              className="text-sm text-white hover:text-white transition-colors"
            >
              {selectedTags.size === filteredTags.length ? 'Deselect All' : 'Select All'}
            </button>
            <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Tags'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} disabled={!selectedClient}>
              <Plus size={14} />
              Create Tag
            </Button>
          </div>
        </div>

        <div className="divide-y divide-rillation-border/30">
          {loading ? (
            <div className="p-8 text-center">
              <motion.div 
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="p-8 text-center text-white">
              {selectedClient 
                ? 'No tags found for this client. Click "Sync Tags" to fetch from Bison.'
                : 'Select a client to view tags'}
            </div>
          ) : selectedClient ? (
            // Show flat list when client is selected
            <AnimatePresence>
              {filteredTags.map((tag, index) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <TagRow
                    tag={tag}
                    isSelected={selectedTags.has(tag.id)}
                    isExpanded={expandedTags.has(tag.id)}
                    onToggleSelect={() => toggleTagSelection(tag.id)}
                    onToggleExpand={() => toggleExpanded(tag.id)}
                    onDelete={() => handleDeleteTag(tag.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            // Show grouped by client
            Object.entries(tagsByClient).map(([client, clientTags]) => (
              <div key={client}>
                <div className="px-6 py-3 bg-rillation-bg/50 border-b border-rillation-border/30">
                  <h4 className="font-semibold text-white text-base">{client}</h4>
                  <p className="text-xs text-white/90 mt-0.5">{clientTags.length} tag{clientTags.length !== 1 ? 's' : ''}</p>
                </div>
                {clientTags.map((tag) => (
                  <TagRow
                    key={tag.id}
                    tag={tag}
                    isSelected={selectedTags.has(tag.id)}
                    isExpanded={expandedTags.has(tag.id)}
                    onToggleSelect={() => toggleTagSelection(tag.id)}
                    onToggleExpand={() => toggleExpanded(tag.id)}
                    onDelete={() => handleDeleteTag(tag.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Create Tag Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-rillation-card rounded-xl p-6 w-96 border border-rillation-border shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Create New Tag</h3>
              <p className="text-sm text-white mb-4">
                This tag will be created in Bison for: <strong className="text-white">{selectedClient}</strong>
              </p>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name (e.g., Set 1 - Jan 2025)"
                className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                  Create Tag
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TagRow({
  tag,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onDelete,
}: {
  tag: InboxTag
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
  onDelete: () => void
}) {
  const { inboxes, loading: inboxesLoading } = useInboxesByTag(isExpanded ? tag.id : undefined)

  return (
    <div>
      {/* Tag Row */}
      <div 
        className={`flex items-center gap-6 px-6 py-4 hover:bg-rillation-card-hover transition-colors ${
          isSelected ? 'bg-white/5' : ''
        }`}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-rillation-border bg-transparent checked:bg-white checked:border-white w-4 h-4 flex-shrink-0"
        />

        {/* Expand Button */}
        <motion.button 
          onClick={onToggleExpand} 
          className="text-white hover:text-white flex-shrink-0"
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={18} />
        </motion.button>

        {/* Tag Icon */}
        <Tag size={18} className={`flex-shrink-0 ${tag.is_default ? 'text-emerald-400' : 'text-white'}`} />

        {/* Tag Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{tag.name}</p>
          {tag.is_default && (
            <span className="text-xs text-emerald-400 mt-0.5 block">Default tag</span>
          )}
        </div>

        {/* Client */}
        <div className="w-48 text-sm text-white font-medium">
          {tag.client}
        </div>

        {/* Inbox Count */}
        <div className="w-32 text-center flex-shrink-0">
          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-full font-medium">
            {tag.inbox_count} inboxes
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!tag.is_default && (
            <motion.button 
              onClick={onDelete}
              className="p-2 text-white/90 hover:text-red-400 transition-colors"
              title="Delete tag"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 size={16} />
            </motion.button>
          )}
          <button className="p-2 text-white/90 hover:text-white transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Expanded Inboxes */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="bg-rillation-bg/50 border-t border-rillation-border/30 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {inboxesLoading ? (
              <div className="p-4 text-center">
                <motion.div 
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : inboxes.length === 0 ? (
              <div className="p-4 text-center text-sm text-white">
                No inboxes with this tag
              </div>
            ) : (
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-white">
                      <th className="text-left pb-2">Email</th>
                      <th className="text-left pb-2">Status</th>
                      <th className="text-left pb-2">Domain</th>
                      <th className="text-right pb-2">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rillation-border/20">
                    {inboxes.slice(0, 10).map((inbox: any) => (
                      <tr key={inbox.id} className="text-white">
                        <td className="py-1.5">{inbox.email}</td>
                        <td className="py-1.5">
                          {inbox.status === 'Connected' ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Wifi size={12} /> Connected
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1">
                              <WifiOff size={12} /> Disconnected
                            </span>
                          )}
                        </td>
                        <td className="py-1.5">{inbox.domain || '-'}</td>
                        <td className="py-1.5 text-right">{inbox.emails_sent_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {inboxes.length > 10 && (
                  <p className="text-xs text-white mt-2">
                    + {inboxes.length - 10} more inboxes
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
