import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { supabase, formatDateForQuery } from '../../lib/supabase'

interface InlineLeadsTableProps {
  stageName: string
  startDate: Date
  endDate: Date
  client?: string
  onClose: () => void
}

interface Lead {
  id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  company?: string
  email?: string
  title?: string
  campaign_name?: string
  current_stage?: string
  last_activity?: string
  created_time?: string
  opportunityId?: number
  estimatedValue: number
}

const PAGE_SIZE = 15

export default function InlineLeadsTable({
  stageName,
  startDate,
  endDate,
  client,
  onClose,
}: InlineLeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [savingValue, setSavingValue] = useState<number | null>(null)

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true)
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const offset = (currentPage - 1) * PAGE_SIZE

      try {
        // Fetch existing opportunities for this client to get estimated values
        const { data: opportunitiesData } = await supabase
          .from('client_opportunities')
          .select('*')
          .eq('client', client || '')

        // Create a map of email -> opportunity for quick lookup
        const opportunityMap = new Map<string, any>()
        ;(opportunitiesData || []).forEach((opp: any) => {
          if (opp.contact_email) {
            opportunityMap.set(opp.contact_email.toLowerCase(), opp)
          }
        })
        // Handle replies stages
        if (stageName === 'Real Replies' || stageName === 'Total Sent' || stageName === 'Total Replies') {
          // Fetch from replies table
          let query = supabase
            .from('replies')
            .select('*', { count: 'exact' })
            .gte('date_received', startStr)
            .lte('date_received', endStr)
            .order('date_received', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)

          // Filter by client if provided
          if (client) query = query.eq('client', client)

          // For Real Replies, exclude Out Of Office
          if (stageName === 'Real Replies') {
            query = query
              .not('category', 'ilike', '%out of office%')
              .not('category', 'ilike', '%ooo%')
          }

          const { data, count, error } = await query

          if (error) throw error

          // Transform replies data to match Lead interface
          const transformedLeads = (data || []).map((reply: any) => {
            const email = (reply.from_email || '').toLowerCase()
            const opportunity = email ? opportunityMap.get(email) : null
            return {
              id: reply.id,
              first_name: '',
              last_name: '',
              full_name: reply.from_email?.split('@')[0] || '-',
              company: '',
              email: reply.from_email,
              title: '',
              campaign_name: reply.campaign_name || '',
              current_stage: reply.category || stageName,
              last_activity: reply.date_received,
              opportunityId: opportunity?.id,
              estimatedValue: opportunity?.value || 0,
            }
          })

          setLeads(transformedLeads)
          setTotalCount(count || 0)
          return
        }

        // Map stage names to boolean column names in engaged_leads table
        const stageToBooleanMap: Record<string, string> = {
          'Meetings Booked': 'meetings_booked',
          'Showed Up to Disco': 'showed_up_to_disco',
          'Qualified': 'qualified',
          'Demo Booked': 'demo_booked',
          'Showed Up to Demo': 'showed_up_to_demo',
          'Proposal Sent': 'proposal_sent',
          'Closed': 'closed',
        }

        const booleanColumn = stageToBooleanMap[stageName]
        
        if (!booleanColumn) {
          // For stages before "Meetings Booked", use meetings_booked
          let query = supabase
            .from('meetings_booked')
            .select('*', { count: 'exact' })
            .gte('created_time', startStr)
            .lte('created_time', endStr)
            .order('created_time', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)
          
          // Filter by client if provided
          if (client) query = query.eq('client', client)
          
          const { data, count, error } = await query

          if (error) throw error

          const meetingRows = (data || []) as any[]
          const transformedLeads = meetingRows.map((lead) => {
            const email = (lead.email || '').toLowerCase()
            const opportunity = email ? opportunityMap.get(email) : null
            return {
              id: lead.id,
              first_name: lead.first_name,
              last_name: lead.last_name,
              full_name: lead.full_name,
              company: lead.company,
              email: lead.email,
              title: lead.title,
              campaign_name: lead.campaign_name,
              current_stage: stageName,
              last_activity: lead.created_time,
              opportunityId: opportunity?.id,
              estimatedValue: opportunity?.value || 0,
            }
          })

          setLeads(transformedLeads)
          setTotalCount(count || 0)
        } else {
          // Fetch from engaged_leads table filtering by the stage's boolean
          // Also filter by date range to match the funnel counts
          let query = supabase
            .from('engaged_leads')
            .select('*', { count: 'exact' })
            .eq(booleanColumn, true)
            .gte('date_created', startStr)
            .lte('date_created', endStr)
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)
          
          // Filter by client if provided
          if (client) query = query.eq('client', client)

          const { data, count, error } = await query

          if (error) throw error

          // Transform data - use current_stage column if available, otherwise use stageName
          const transformedLeads = (data || []).map((lead: any) => {
            const email = (lead.email || '').toLowerCase()
            const opportunity = email ? opportunityMap.get(email) : null
            return {
              id: lead.id,
              first_name: lead.first_name,
              last_name: lead.last_name,
              full_name: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
              company: lead.company,
              email: lead.email,
              title: lead.title,
              campaign_name: lead.campaign_name,
              current_stage: lead.current_stage || stageName,
              last_activity: lead.last_activity || lead.updated_at || lead.created_at,
              opportunityId: opportunity?.id,
              estimatedValue: opportunity?.value || 0,
            }
          })

          setLeads(transformedLeads)
          setTotalCount(count || 0)
        }
      } catch (err) {
        console.error('Error fetching leads:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [stageName, startDate, endDate, client, currentPage])

  // Handle value change for a lead
  const handleValueChange = async (lead: Lead, newValue: string) => {
    const numValue = newValue === '' ? 0 : parseFloat(newValue) || 0
    const leadIndex = leads.findIndex((l) => (l.id && lead.id && l.id === lead.id) || (l.email && lead.email && l.email === lead.email))
    
    if (leadIndex === -1) return

    setSavingValue(leadIndex)

    try {
      // Update local state immediately
      setLeads((prev) => {
        const updated = [...prev]
        updated[leadIndex] = { ...updated[leadIndex], estimatedValue: numValue }
        return updated
      })

      // Save to database
      if (lead.opportunityId) {
        // Update existing opportunity (even if value is 0)
        const { error } = await supabase
          .from('client_opportunities')
          .update({
            value: numValue,
            stage: stageName,
          })
          .eq('id', lead.opportunityId)

        if (error) throw error
      } else if (numValue > 0) {
        // Create new opportunity if value is set
        const { error } = await supabase
          .from('client_opportunities')
          .insert({
            client: client || '',
            opportunity_name: lead.full_name || lead.company || lead.email || 'Unknown',
            stage: stageName,
            value: numValue,
            contact_email: lead.email,
            contact_name: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          })

        if (error) throw error

        // Fetch the new opportunity ID and update local state
        const { data: newOpp } = await supabase
          .from('client_opportunities')
          .select('id')
          .eq('client', client || '')
          .eq('contact_email', lead.email)
          .eq('stage', stageName)
          .single()

        if (newOpp) {
          setLeads((prev) => {
            const updated = [...prev]
            updated[leadIndex] = { ...updated[leadIndex], opportunityId: newOpp.id }
            return updated
          })
        }
      }
    } catch (err) {
      console.error('Error saving estimated value:', err)
      alert('Failed to save estimated value')
      // Revert on error
      setLeads((prev) => {
        const updated = [...prev]
        updated[leadIndex] = { ...updated[leadIndex], estimatedValue: lead.estimatedValue }
        return updated
      })
    } finally {
      setSavingValue(null)
    }
  }

  // Handle focus - select all
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const startItem = (currentPage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount)

  return (
    <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-rillation-border">
        <div>
          <h3 className="text-lg font-semibold text-rillation-text">
            Leads at {stageName}
          </h3>
          <p className="text-sm text-rillation-text-muted">
            Showing {startItem} - {endItem} of {totalCount} leads
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
        >
          <X size={20} className="text-rillation-text-muted" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead className="bg-rillation-card-hover">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Name
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase hidden md:table-cell">
                  Company
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase hidden lg:table-cell">
                  Email
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Stage
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase hidden md:table-cell">
                  Last Activity
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rillation-border/30">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-rillation-text-muted">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => (
                  <tr key={lead.id || lead.email} className="hover:bg-rillation-card-hover transition-colors">
                    <td className="px-2 sm:px-4 py-3 text-sm text-rillation-text">
                      <div>
                        {lead.full_name || '-'}
                        <div className="md:hidden text-xs text-rillation-text-muted mt-1">
                          {lead.company || lead.email || ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-sm text-rillation-text-muted hidden md:table-cell">
                      {lead.company || '-'}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-sm text-rillation-text-muted hidden lg:table-cell">
                      {lead.email || '-'}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-rillation-purple/20 text-rillation-purple rounded text-xs whitespace-nowrap">
                        {lead.current_stage || '-'}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-sm text-rillation-text-muted hidden md:table-cell">
                      {lead.last_activity
                        ? new Date(lead.last_activity).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-2 sm:px-4 py-3">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-rillation-text-muted text-xs sm:text-sm">$</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={lead.estimatedValue || ''}
                            onChange={(e) => handleValueChange(lead, e.target.value)}
                            onFocus={handleFocus}
                            placeholder="0"
                            disabled={savingValue === index}
                            className="w-28 sm:w-36 md:w-40 px-2 sm:px-3 py-1.5 sm:py-2 bg-rillation-card border border-rillation-border rounded-lg text-xs sm:text-sm text-rillation-text focus:outline-none focus:border-rillation-purple disabled:opacity-50"
                          />
                          {savingValue === index && (
                            <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2">
                              <Loader2 size={12} className="sm:w-3.5 sm:h-3.5 animate-spin text-rillation-purple" />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-rillation-border flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 bg-rillation-card-hover border border-rillation-border rounded-lg text-sm text-rillation-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rillation-bg transition-colors"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-rillation-text-muted">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-rillation-card-hover border border-rillation-border rounded-lg text-sm text-rillation-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rillation-bg transition-colors"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}












