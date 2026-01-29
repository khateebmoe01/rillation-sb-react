import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, Calendar, Building2, MapPin, DollarSign, Users, Megaphone } from 'lucide-react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../../lib/supabase'

interface Meeting {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  company: string
  title: string
  campaign_name: string
  campaign_id: string
  created_time: string
  industry?: string
  company_size?: string
  annual_revenue?: string
  company_hq_state?: string
  company_hq_city?: string
}

interface MeetingsDrillDownProps {
  isOpen: boolean
  onClose: () => void
  startDate: Date
  endDate: Date
  client: string
  campaignIds?: string[]
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
  const [sortField, setSortField] = useState<'created_time' | 'company' | 'campaign_name' | 'industry'>('created_time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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
          .select('*')
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .eq('client', client)
          .order('created_time', { ascending: false })

        if (campaignIds && campaignIds.length > 0) {
          query = query.in('campaign_id', campaignIds)
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        const meetingsData: Meeting[] = (data || []).map((m: any) => ({
          id: m.id || `${m.email}-${m.created_time}`,
          email: m.email || '',
          first_name: m.first_name || '',
          last_name: m.last_name || '',
          full_name: m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown',
          company: m.company || '-',
          title: m.title || '-',
          campaign_name: m.campaign_name || '-',
          campaign_id: m.campaign_id || '',
          created_time: m.created_time || '',
          industry: m.industry,
          company_size: m.company_size,
          annual_revenue: m.annual_revenue,
          company_hq_state: m.company_hq_state,
          company_hq_city: m.company_hq_city,
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
      case 'company':
        comparison = (a.company || '').localeCompare(b.company || '')
        break
      case 'campaign_name':
        comparison = (a.campaign_name || '').localeCompare(b.campaign_name || '')
        break
      case 'industry':
        comparison = (a.industry || '').localeCompare(b.industry || '')
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

  const getLocation = (meeting: Meeting) => {
    if (meeting.company_hq_city && meeting.company_hq_state) {
      return `${meeting.company_hq_city}, ${meeting.company_hq_state}`
    }
    return meeting.company_hq_state || meeting.company_hq_city || '-'
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
            <Calendar size={20} className="text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Meetings Booked</h3>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full">
              {meetings.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} className="text-rillation-text/70" />
          </button>
        </div>

        {/* Table Header */}
        <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700/30">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium text-rillation-text/70 uppercase tracking-wide">
            <button 
              onClick={() => handleSort('created_time')}
              className="col-span-1 flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              Date
              {sortField === 'created_time' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <div className="col-span-2">Contact</div>
            <button 
              onClick={() => handleSort('company')}
              className="col-span-2 flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              Company
              {sortField === 'company' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <button 
              onClick={() => handleSort('industry')}
              className="col-span-2 flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              Industry
              {sortField === 'industry' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
            <div className="col-span-1">Revenue</div>
            <div className="col-span-1">Size</div>
            <div className="col-span-1">Location</div>
            <button 
              onClick={() => handleSort('campaign_name')}
              className="col-span-2 flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              Campaign
              {sortField === 'campaign_name' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-red-400">{error}</div>
          ) : meetings.length === 0 ? (
            <div className="px-6 py-12 text-center text-rillation-text/60">No meetings found</div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {sortedMeetings.map((meeting, index) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="px-6 py-4 hover:bg-slate-800/40 transition-colors grid grid-cols-12 gap-4 items-center"
                >
                  {/* Date */}
                  <div className="col-span-1">
                    <span className="text-sm font-medium text-white">
                      {formatDate(meeting.created_time)}
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="col-span-2 min-w-0">
                    <div className="text-sm font-medium text-white truncate" title={meeting.full_name}>
                      {meeting.full_name}
                    </div>
                    <div className="text-xs text-rillation-text/70 truncate" title={meeting.title}>
                      {meeting.title}
                    </div>
                  </div>

                  {/* Company */}
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-rillation-text/60 flex-shrink-0" />
                      <span className="text-sm text-rillation-text truncate" title={meeting.company}>
                        {meeting.company}
                      </span>
                    </div>
                  </div>

                  {/* Industry */}
                  <div className="col-span-2 min-w-0">
                    {meeting.industry ? (
                      <span className="inline-flex px-2 py-0.5 bg-blue-500/15 text-blue-300 text-xs font-medium rounded truncate" title={meeting.industry}>
                        {meeting.industry}
                      </span>
                    ) : (
                      <span className="text-xs text-rillation-text/60">-</span>
                    )}
                  </div>

                  {/* Revenue */}
                  <div className="col-span-1 min-w-0">
                    {meeting.annual_revenue ? (
                      <div className="flex items-center gap-1">
                        <DollarSign size={10} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-rillation-text truncate" title={meeting.annual_revenue}>
                          {meeting.annual_revenue}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-rillation-text/60">-</span>
                    )}
                  </div>

                  {/* Company Size */}
                  <div className="col-span-1 min-w-0">
                    {meeting.company_size ? (
                      <div className="flex items-center gap-1">
                        <Users size={10} className="text-violet-400 flex-shrink-0" />
                        <span className="text-xs text-rillation-text truncate" title={meeting.company_size}>
                          {meeting.company_size}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-rillation-text/60">-</span>
                    )}
                  </div>

                  {/* Location */}
                  <div className="col-span-1 min-w-0">
                    {getLocation(meeting) !== '-' ? (
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-orange-400 flex-shrink-0" />
                        <span className="text-xs text-rillation-text truncate" title={getLocation(meeting)}>
                          {meeting.company_hq_state || '-'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-rillation-text/60">-</span>
                    )}
                  </div>

                  {/* Campaign */}
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Megaphone size={10} className="text-pink-400 flex-shrink-0" />
                      <span className="text-xs text-rillation-text truncate" title={meeting.campaign_name}>
                        {meeting.campaign_name}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {meetings.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/40">
            <div className="flex items-center justify-between text-xs text-rillation-text/70">
              <div className="flex items-center gap-6">
                <span>
                  <span className="text-white font-medium">{meetings.length}</span> meetings
                </span>
                <span>
                  <span className="text-white font-medium">{new Set(meetings.map(m => m.campaign_name)).size}</span> campaigns
                </span>
                <span>
                  <span className="text-white font-medium">{new Set(meetings.filter(m => m.industry).map(m => m.industry)).size}</span> industries
                </span>
              </div>
              <span className="text-rillation-text/60">
                Scroll to see all
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
