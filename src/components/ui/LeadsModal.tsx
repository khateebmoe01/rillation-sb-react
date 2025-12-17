import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, formatDateForQuery } from '../../lib/supabase'

interface LeadsModalProps {
  isOpen: boolean
  onClose: () => void
  stageName: string
  startDate: Date
  endDate: Date
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
}

const PAGE_SIZE = 15

export default function LeadsModal({
  isOpen,
  onClose,
  stageName,
  startDate,
  endDate,
}: LeadsModalProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    async function fetchLeads() {
      setLoading(true)
      const startStr = formatDateForQuery(startDate)
      const endStr = formatDateForQuery(endDate)
      const offset = (currentPage - 1) * PAGE_SIZE

      try {
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

          // For Real Replies, exclude Out Of Office
          if (stageName === 'Real Replies') {
            query = query
              .not('category', 'ilike', '%out of office%')
              .not('category', 'ilike', '%ooo%')
          }

          const { data, count, error } = await query

          if (error) throw error

          // Transform replies data to match Lead interface
          const transformedLeads = (data || []).map((reply: any) => ({
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
          }))

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
          const { data, count, error } = await supabase
            .from('meetings_booked')
            .select('*', { count: 'exact' })
            .gte('created_time', startStr)
            .lte('created_time', endStr)
            .order('created_time', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)

          if (error) throw error

          const transformedLeads = (data || []).map((lead) => ({
            ...lead,
            current_stage: stageName,
            last_activity: lead.created_time,
          }))

          setLeads(transformedLeads)
          setTotalCount(count || 0)
        } else {
          // Fetch from engaged_leads table filtering by the stage's boolean
          let query = supabase
            .from('engaged_leads')
            .select('*', { count: 'exact' })
            .eq(booleanColumn, true)
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)

          const { data, count, error } = await query

          if (error) throw error

          // Transform data - use current_stage column if available, otherwise use stageName
          const transformedLeads = (data || []).map((lead: any) => ({
            id: lead.id,
            first_name: lead.first_name,
            last_name: lead.last_name,
            full_name: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            company: lead.company,
            email: lead.email,
            title: lead.title,
            campaign_name: lead.campaign_name,
            current_stage: lead.current_stage || stageName, // Use current_stage column from DB
            last_activity: lead.last_activity || lead.updated_at || lead.created_at,
          }))

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
  }, [isOpen, stageName, startDate, endDate, currentPage])

  if (!isOpen) return null

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const startItem = (currentPage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-5xl max-h-[80vh] overflow-hidden shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div>
            <h2 className="text-lg font-semibold text-rillation-text">
              {stageName === 'Real Replies' || stageName === 'Total Sent' || stageName === 'Total Replies' ? 'Replies' : 'Leads'} at {stageName}
            </h2>
            <p className="text-sm text-rillation-text-muted">
              Showing {startItem} - {endItem} of {totalCount} {stageName === 'Real Replies' || stageName === 'Total Sent' || stageName === 'Total Replies' ? 'replies' : 'leads'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-rillation-card-hover">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                    Current Stage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                    Campaign
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, index) => (
                  <tr
                    key={lead.id || index}
                    className="border-b border-rillation-border/30 hover:bg-rillation-card-hover transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-rillation-text">
                      {lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text">
                      {lead.company || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text">
                      {lead.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text">
                      <span className="px-2 py-1 bg-rillation-purple/20 text-rillation-purple rounded text-xs">
                        {lead.current_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {lead.last_activity 
                        ? new Date(lead.last_activity).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {lead.campaign_name || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-rillation-border">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-rillation-text-muted hover:text-rillation-text disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-rillation-purple text-white'
                        : 'text-rillation-text-muted hover:bg-rillation-card-hover'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-rillation-text-muted hover:text-rillation-text disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

