import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, MessageCircle, Megaphone, Mail } from 'lucide-react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../../lib/supabase'

interface InterestedReply {
  id: string
  from_email: string
  subject: string
  text_body: string
  campaign_id: string
  campaign_name: string
  date_received: string
}

interface InterestedRepliesDrillDownProps {
  isOpen: boolean
  onClose: () => void
  startDate: Date
  endDate: Date
  client: string
  campaignIds?: string[]
}

export default function InterestedRepliesDrillDown({
  isOpen,
  onClose,
  startDate,
  endDate,
  client,
  campaignIds,
}: InterestedRepliesDrillDownProps) {
  const [replies, setReplies] = useState<InterestedReply[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'date_received' | 'campaign_name' | 'from_email'>('date_received')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (!isOpen) return

    async function fetchReplies() {
      setLoading(true)
      setError(null)

      try {
        const startStr = formatDateForQuery(startDate)
        const endStrNextDay = formatDateForQueryEndOfDay(endDate)

        // First, fetch interested replies
        let query = supabase
          .from('replies')
          .select('reply_id, from_email, subject, text_body, campaign_id, date_received')
          .eq('category', 'Interested')
          .eq('client', client)
          .gte('date_received', startStr)
          .lt('date_received', endStrNextDay)
          .order('date_received', { ascending: false })

        if (campaignIds && campaignIds.length > 0) {
          query = query.in('campaign_id', campaignIds)
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        // Get unique campaign IDs to fetch campaign names
        const uniqueCampaignIds = [...new Set((data || []).map((r: any) => r.campaign_id).filter(Boolean))]

        // Fetch campaign names
        let campaignNameMap: Record<string, string> = {}
        if (uniqueCampaignIds.length > 0) {
          const { data: campaignData } = await supabase
            .from('Campaigns')
            .select('campaign_id, campaign_name')
            .in('campaign_id', uniqueCampaignIds)

          if (campaignData) {
            campaignNameMap = Object.fromEntries(
              campaignData.map((c: any) => [c.campaign_id, c.campaign_name || 'Unknown Campaign'])
            )
          }
        }

        const repliesData: InterestedReply[] = (data || []).map((r: any) => ({
          id: r.reply_id || `${r.from_email}-${r.date_received}`,
          from_email: r.from_email || '',
          subject: r.subject || '-',
          text_body: r.text_body || '',
          campaign_id: r.campaign_id || '',
          campaign_name: campaignNameMap[r.campaign_id] || 'Unknown Campaign',
          date_received: r.date_received || '',
        }))

        // Deduplicate by from_email, keeping the earliest reply per contact
        const emailToReply = new Map<string, InterestedReply>()
        for (const reply of repliesData) {
          const existing = emailToReply.get(reply.from_email)
          if (!existing || new Date(reply.date_received) < new Date(existing.date_received)) {
            emailToReply.set(reply.from_email, reply)
          }
        }
        const deduplicatedReplies = Array.from(emailToReply.values())

        setReplies(deduplicatedReplies)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch interested replies')
      } finally {
        setLoading(false)
      }
    }

    fetchReplies()
  }, [isOpen, startDate, endDate, client, campaignIds])

  // Sort replies
  const sortedReplies = [...replies].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'date_received':
        comparison = new Date(a.date_received).getTime() - new Date(b.date_received).getTime()
        break
      case 'campaign_name':
        comparison = (a.campaign_name || '').localeCompare(b.campaign_name || '')
        break
      case 'from_email':
        comparison = (a.from_email || '').localeCompare(b.from_email || '')
        break
    }
    return sortDir === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '-'
    // Remove line breaks and extra whitespace
    const cleaned = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (cleaned.length <= maxLength) return cleaned
    return cleaned.substring(0, maxLength) + '...'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-slate-900/95 rounded-xl border border-slate-700/60 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <MessageCircle size={20} className="text-green-400" />
            <h3 className="text-lg font-semibold text-white">Interested Replies</h3>
            <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full">
              {replies.length}
            </span>
            <span className="text-xs text-slate-500">(based on internal data)</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Table Header */}
        <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700/30">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
            <button
              onClick={() => handleSort('date_received')}
              className="col-span-1 flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              Date
              {sortField === 'date_received' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <button
              onClick={() => handleSort('from_email')}
              className="col-span-2 flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              Contact
              {sortField === 'from_email' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <div className="col-span-3">Subject</div>
            <button
              onClick={() => handleSort('campaign_name')}
              className="col-span-2 flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              Campaign
              {sortField === 'campaign_name' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <div className="col-span-4">Reply Preview</div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-red-400">{error}</div>
          ) : replies.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">No interested replies found</div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {sortedReplies.map((reply, index) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="px-6 py-4 hover:bg-slate-800/40 transition-colors grid grid-cols-12 gap-4 items-center"
                >
                  {/* Date */}
                  <div className="col-span-1">
                    <span className="text-sm font-medium text-white">
                      {formatDate(reply.date_received)}
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-500 flex-shrink-0" />
                      <span className="text-sm text-slate-200 truncate" title={reply.from_email}>
                        {reply.from_email}
                      </span>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="col-span-3 min-w-0">
                    <span className="text-sm text-slate-300 truncate block" title={reply.subject}>
                      {reply.subject}
                    </span>
                  </div>

                  {/* Campaign */}
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Megaphone size={10} className="text-pink-400 flex-shrink-0" />
                      <span className="text-xs text-slate-300 truncate" title={reply.campaign_name}>
                        {reply.campaign_name}
                      </span>
                    </div>
                  </div>

                  {/* Reply Preview */}
                  <div className="col-span-4 min-w-0">
                    <span
                      className="text-xs text-slate-400 line-clamp-2"
                      title={reply.text_body}
                    >
                      {truncateText(reply.text_body, 150)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {replies.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/40">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-6">
                <span>
                  <span className="text-white font-medium">{replies.length}</span> interested contacts
                </span>
                <span>
                  <span className="text-white font-medium">{new Set(replies.map(r => r.campaign_name)).size}</span> campaigns
                </span>
              </div>
              <span className="text-slate-500">
                Scroll to see all
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
