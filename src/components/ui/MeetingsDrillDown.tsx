import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, User, Building2, Mail, Calendar, Target, Briefcase } from 'lucide-react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../../lib/supabase'

interface Meeting {
  id: string
  email: string
  first_name: string
  last_name: string
  company_name: string
  job_title: string
  campaign_name: string
  campaign_id: string
  created_time: string
  sequence_step: number
  pipeline_stage: string
  industry?: string
  employee_count?: string
  revenue_range?: string
}

interface MeetingsDrillDownProps {
  isOpen: boolean
  onClose: () => void
  startDate: Date
  endDate: Date
  client: string
  campaignIds?: string[]
}

// Pipeline stage badge colors
const STAGE_COLORS: Record<string, string> = {
  'Meetings Booked': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'Showed Up': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Qualified': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Demo Completed': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'Proposal Sent': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Closed Won': 'bg-green-500/20 text-green-400 border-green-500/30',
  'default': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

function StageBadge({ stage }: { stage: string }) {
  const colorClass = STAGE_COLORS[stage] || STAGE_COLORS['default']
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      <Target size={10} />
      {stage}
    </span>
  )
}

export default function MeetingsDrillDown({
  isOpen,
  onClose,
  startDate,
  endDate,
  client,
  campaignIds,
}: MeetingsDrillDownProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'created_time' | 'pipeline_stage' | 'campaign_name'>('created_time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function fetchMeetings() {
      setLoading(true)
      setError(null)

      try {
        const startStr = formatDateForQuery(startDate)
        const endStrNextDay = formatDateForQueryEndOfDay(endDate)

        let query = supabase
          .from('meetings_booked')
          .select(`
            id,
            email,
            first_name,
            last_name,
            company_name,
            job_title,
            campaign_name,
            campaign_id,
            created_time,
            sequence_step,
            industry,
            employee_count,
            revenue_range
          `)
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .eq('client', client)
          .order('created_time', { ascending: false })

        if (campaignIds && campaignIds.length > 0) {
          query = query.in('campaign_id', campaignIds)
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        // Map data and try to get pipeline stage from engaged_leads
        const meetingsData: Meeting[] = (data || []).map((m: any) => ({
          id: m.id || `${m.email}-${m.created_time}`,
          email: m.email || '',
          first_name: m.first_name || '',
          last_name: m.last_name || '',
          company_name: m.company_name || '',
          job_title: m.job_title || 'Unknown',
          campaign_name: m.campaign_name || '',
          campaign_id: m.campaign_id || '',
          created_time: m.created_time || '',
          sequence_step: m.sequence_step || 1,
          pipeline_stage: 'Meetings Booked', // Default, would need join with engaged_leads for actual stage
          industry: m.industry,
          employee_count: m.employee_count,
          revenue_range: m.revenue_range,
        }))

        setMeetings(meetingsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch meetings')
      } finally {
        setLoading(false)
      }
    }

    fetchMeetings()
  }, [isOpen, startDate, endDate, client, campaignIds])

  // Sort meetings
  const sortedMeetings = [...meetings].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'created_time':
        comparison = new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
        break
      case 'pipeline_stage':
        comparison = a.pipeline_stage.localeCompare(b.pipeline_stage)
        break
      case 'campaign_name':
        comparison = a.campaign_name.localeCompare(b.campaign_name)
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

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-slate-900/90 rounded-xl border border-slate-700/60 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-violet-400" />
            <h3 className="text-lg font-semibold text-white">Meetings Booked</h3>
            <span className="text-sm text-slate-400">
              {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Sort controls */}
        <div className="px-5 py-2 border-b border-slate-700/30 flex items-center gap-4">
          <span className="text-xs text-slate-500">Sort by:</span>
          {[
            { field: 'created_time' as const, label: 'Date' },
            { field: 'pipeline_stage' as const, label: 'Stage' },
            { field: 'campaign_name' as const, label: 'Campaign' },
          ].map(({ field, label }) => (
            <motion.button
              key={field}
              onClick={() => handleSort(field)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                sortField === field
                  ? 'bg-violet-600/30 text-violet-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {label}
              {sortField === field && (
                sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="px-5 py-8 text-center text-red-400">{error}</div>
          ) : meetings.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-500">No meetings found</div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {sortedMeetings.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  className="hover:bg-slate-800/30 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {/* Main row */}
                  <div
                    className="px-5 py-3 flex items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedMeeting(
                      expandedMeeting === meeting.id ? null : meeting.id
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Person info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                          <User size={18} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {meeting.first_name} {meeting.last_name}
                          </div>
                          <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                            <Briefcase size={10} />
                            {meeting.job_title}
                          </div>
                        </div>
                      </div>

                      {/* Company */}
                      <div className="hidden md:flex items-center gap-2 min-w-0">
                        <Building2 size={14} className="text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-300 truncate">
                          {meeting.company_name}
                        </span>
                      </div>
                    </div>

                    {/* Right side info */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Email step */}
                      <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                        <Mail size={12} />
                        Step {meeting.sequence_step}
                      </div>

                      {/* Pipeline stage */}
                      <StageBadge stage={meeting.pipeline_stage} />

                      {/* Date */}
                      <div className="text-xs text-slate-500">
                        {new Date(meeting.created_time).toLocaleDateString()}
                      </div>

                      {/* Expand arrow */}
                      <motion.div
                        animate={{ rotate: expandedMeeting === meeting.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={16} className="text-slate-500" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedMeeting === meeting.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-3 overflow-hidden"
                      >
                        <div className="ml-13 pl-6 border-l border-slate-700/50 grid grid-cols-2 md:grid-cols-4 gap-4 py-3 bg-slate-800/30 rounded-lg px-4">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Campaign</div>
                            <div className="text-sm text-white truncate" title={meeting.campaign_name}>
                              {meeting.campaign_name}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Email</div>
                            <div className="text-sm text-slate-300 truncate">
                              {meeting.email}
                            </div>
                          </div>
                          {meeting.industry && (
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Industry</div>
                              <div className="text-sm text-slate-300 truncate">
                                {meeting.industry}
                              </div>
                            </div>
                          )}
                          {meeting.revenue_range && (
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Revenue</div>
                              <div className="text-sm text-slate-300 truncate">
                                {meeting.revenue_range}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {meetings.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
              </span>
              <span>
                {new Set(meetings.map(m => m.campaign_name)).size} campaigns
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}



