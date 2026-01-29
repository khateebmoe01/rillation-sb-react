import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Clock, User, Tag, FileText, Loader2, ChevronDown, ChevronUp, Megaphone } from 'lucide-react'
import { useIterationLog, ACTION_TYPES, MentionedUser } from '../../hooks/useIterationLog'
import { useCampaignStats } from '../../hooks/useCampaignStats'
import Button from './Button'
import ModalPortal from './ModalPortal'
import MentionInput from './MentionInput'
import AnimatedSelect from './AnimatedSelect'

interface IterationLogModalProps {
  isOpen: boolean
  onClose: () => void
  client: string
}

export default function IterationLogModal({ isOpen, onClose, client }: IterationLogModalProps) {
  const { logs, loading, error, saving, addLog, deleteLog } = useIterationLog({ client })
  
  // Fetch campaigns for this client
  const { campaigns } = useCampaignStats({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
    endDate: new Date(),
    client,
    page: 1,
    pageSize: 100,
  })
  const campaignNames = campaigns.map(c => c.campaign_name).filter(Boolean) as string[]
  
  // Form state
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [actionType, setActionType] = useState<string>(ACTION_TYPES[0])
  const [description, setDescription] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [campaignName, setCampaignName] = useState<string>('')
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([])
  
  // Expanded entries state
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set())

  const toggleEntry = (id: number) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !createdBy.trim()) return

    const success = await addLog({
      client,
      action_type: actionType,
      description: description.trim(),
      created_by: createdBy.trim(),
      campaign_name: campaignName || undefined,
      mentioned_users: mentionedUsers.length > 0 ? mentionedUsers : undefined,
    })

    if (success) {
      setIsAddingNew(false)
      setDescription('')
      setActionType(ACTION_TYPES[0])
      setCampaignName('')
      setMentionedUsers([])
      // Keep createdBy for convenience
    }
  }

  const handleDelete = async (logId: number) => {
    if (window.confirm('Are you sure you want to delete this log entry?')) {
      await deleteLog(logId)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get color for action type
  const getActionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Strategy Change': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      'Copy Update': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Targeting Adjustment': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Sequence Modification': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'Campaign Pause': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Campaign Launch': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'A/B Test Started': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'Performance Review': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'Client Feedback': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Other': 'bg-slate-500/20 text-rillation-text border-slate-500/30',
    }
    return colors[type] || colors['Other']
  }

  if (!isOpen) return null

  return (
    <ModalPortal isOpen={isOpen}>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col mx-auto"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-rillation-border">
          <div>
            <h2 className="text-xl font-semibold text-white">Iteration Log</h2>
            <p className="text-sm text-white/90 mt-1">
              Track changes and iterations for {client}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isAddingNew && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus size={14} />
                Add Entry
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-white/90" />
            </button>
          </div>
        </div>

        {/* Add New Entry Form */}
        <AnimatePresence>
          {isAddingNew && (
            <motion.form
              onSubmit={handleSubmit}
              className="p-5 border-b border-rillation-border bg-slate-800/50"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Action Type */}
                  <AnimatedSelect
                    label="Action Type"
                    labelIcon={<Tag size={14} />}
                    value={actionType}
                    onChange={setActionType}
                    options={ACTION_TYPES.map(type => ({ value: type, label: type }))}
                  />

                  {/* Created By */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1.5">
                      <User size={14} className="inline mr-1.5" />
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-white/80 focus:outline-none focus:border-violet-500"
                      required
                    />
                  </div>
                </div>

                {/* Campaign Selector (Optional) */}
                <AnimatedSelect
                  label="Campaign"
                  labelIcon={<Megaphone size={14} />}
                  value={campaignName}
                  onChange={setCampaignName}
                  placeholder="General (No specific campaign)"
                  options={[
                    { value: '', label: 'General (No specific campaign)' },
                    ...campaignNames.map(name => ({ value: name, label: name }))
                  ]}
                />

                {/* Description with @mentions */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1.5">
                    <FileText size={14} className="inline mr-1.5" />
                    Description
                    <span className="text-white/80 ml-2 text-xs">Type @ to mention team members</span>
                  </label>
                  <MentionInput
                    value={description}
                    onChange={setDescription}
                    onMentionsChange={setMentionedUsers}
                    placeholder="Describe the change or iteration... Type @ to mention someone"
                    rows={3}
                  />
                  {mentionedUsers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-white/80">Will notify:</span>
                      {mentionedUsers.map((user) => (
                        <span
                          key={user.slack_id}
                          className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full"
                        >
                          @{user.display_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsAddingNew(false)
                      setDescription('')
                      setCampaignName('')
                      setMentionedUsers([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={saving || !description.trim() || !createdBy.trim()}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Save Entry
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        {error && (
          <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={40} className="text-white/20 mb-3" />
              <p className="text-white/90 text-sm">No iteration logs yet</p>
              <p className="text-white/80 text-xs mt-1">
                Click "Add Entry" to start tracking changes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => {
                const isExpanded = expandedEntries.has(log.id)
                const isLongDescription = log.description.length > 200
                const shouldTruncate = isLongDescription && !isExpanded
                const displayDescription = shouldTruncate
                  ? log.description.substring(0, 200) + '...'
                  : log.description

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 transition-colors ${
                      isLongDescription ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => isLongDescription && toggleEntry(log.id)}
                  >
                    <div className="p-4">
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(log.id)
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all z-10"
                        title="Delete entry"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>

                      {/* Header - Action type on left, metadata on right */}
                      <div className="flex items-center justify-between mb-2 pr-8">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-medium border ${getActionTypeColor(
                              log.action_type
                            )}`}
                          >
                            {log.action_type}
                          </span>
                          {log.campaign_name && (
                            <span className="px-2 py-1 rounded-md text-xs font-medium border bg-slate-700/50 text-rillation-text border-slate-600/50">
                              {log.campaign_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/80">
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {log.created_by}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Mentioned users */}
                      {log.mentioned_users && log.mentioned_users.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {log.mentioned_users.map((user) => (
                            <span
                              key={user.slack_id}
                              className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full"
                            >
                              @{user.display_name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      <motion.div
                        initial={false}
                        animate={{ height: 'auto' }}
                        className="overflow-hidden"
                      >
                        <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                          {displayDescription}
                        </p>
                      </motion.div>

                      {/* Expand/Collapse indicator */}
                      {isLongDescription && (
                        <div className="flex items-center justify-center mt-2 pt-2 border-t border-slate-700/30">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleEntry(log.id)
                            }}
                            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={14} />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                Show more
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </ModalPortal>
  )
}

