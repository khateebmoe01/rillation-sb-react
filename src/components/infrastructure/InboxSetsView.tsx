import { useState } from 'react'
import { 
  Tag, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useInboxTags, useInboxesByTag, type InboxTag } from '../../hooks/useInboxTags'
import { useClients } from '../../hooks/useClients'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

export default function InboxSetsView() {
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [syncing, setSyncing] = useState(false)

  const { tags, loading, syncTags, createTag, deleteTag, refetch } = useInboxTags({
    client: selectedClient || undefined,
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
    if (selectedTags.size === tags.length) {
      setSelectedTags(new Set())
    } else {
      setSelectedTags(new Set(tags.map(t => t.id)))
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
      // Wait a bit for background processing then refetch
      setTimeout(() => {
        refetch()
        setSyncing(false)
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

  // Group tags by client
  const tagsByClient = tags.reduce((acc, tag) => {
    const client = tag.client || 'Unknown'
    if (!acc[client]) acc[client] = []
    acc[client].push(tag)
    return acc
  }, {} as Record<string, InboxTag[]>)

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
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Tags'}
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)} disabled={!selectedClient}>
              <Plus size={16} />
              Create Tag
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedTags.size > 0 && (
        <div className="bg-rillation-purple/10 border border-rillation-purple/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-rillation-text">
            {selectedTags.size} tag{selectedTags.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedTags(new Set())}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Tags Table */}
      <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
        <div className="p-4 border-b border-rillation-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-rillation-text flex items-center gap-2">
            <Tag size={20} className="text-rillation-purple" />
            Tags / Sets ({tags.length})
          </h3>
          <button
            onClick={toggleAllTags}
            className="text-sm text-rillation-purple hover:text-rillation-magenta"
          >
            {selectedTags.size === tags.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="divide-y divide-rillation-border/30">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : tags.length === 0 ? (
            <div className="p-8 text-center text-rillation-text-muted">
              {selectedClient 
                ? 'No tags found for this client. Click "Sync Tags" to fetch from Bison.'
                : 'Select a client to view tags'}
            </div>
          ) : selectedClient ? (
            // Show flat list when client is selected
            tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                isSelected={selectedTags.has(tag.id)}
                isExpanded={expandedTags.has(tag.id)}
                onToggleSelect={() => toggleTagSelection(tag.id)}
                onToggleExpand={() => toggleExpanded(tag.id)}
                onDelete={() => handleDeleteTag(tag.id)}
              />
            ))
          ) : (
            // Show grouped by client
            Object.entries(tagsByClient).map(([client, clientTags]) => (
              <div key={client}>
                <div className="px-4 py-2 bg-rillation-bg/50 font-medium text-rillation-text-muted text-sm">
                  {client} ({clientTags.length} tags)
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
      </div>

      {/* Create Tag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-rillation-card rounded-xl p-6 w-96 border border-rillation-border">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Tag</h3>
            <p className="text-sm text-rillation-text-muted mb-4">
              This tag will be created in Bison for: <strong>{selectedClient}</strong>
            </p>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name (e.g., Set 1 - Jan 2025)"
              className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white mb-4"
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
          </div>
        </div>
      )}
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

        {/* Tag Icon */}
        <Tag size={16} className={tag.is_default ? 'text-rillation-cyan' : 'text-rillation-purple'} />

        {/* Tag Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{tag.name}</p>
          {tag.is_default && (
            <span className="text-xs text-rillation-cyan">Default tag</span>
          )}
        </div>

        {/* Client */}
        <div className="w-32 text-sm text-rillation-text-muted truncate">
          {tag.client}
        </div>

        {/* Inbox Count */}
        <div className="w-24 text-center">
          <span className="px-2 py-1 bg-rillation-purple/20 text-rillation-purple text-sm rounded-full">
            {tag.inbox_count} inboxes
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!tag.is_default && (
            <button 
              onClick={onDelete}
              className="p-1 text-rillation-text-muted hover:text-rillation-red"
              title="Delete tag"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button className="p-1 text-rillation-text-muted hover:text-white">
            <MoreHorizontal size={18} />
          </button>
        </div>
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
              No inboxes with this tag
            </div>
          ) : (
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-rillation-text-muted">
                    <th className="text-left pb-2">Email</th>
                    <th className="text-left pb-2">Status</th>
                    <th className="text-left pb-2">Domain</th>
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
                      <td className="py-1.5">{inbox.domain || '-'}</td>
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
