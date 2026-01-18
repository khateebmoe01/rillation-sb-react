import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Save, Loader2, Trash2, Building2, Briefcase } from 'lucide-react'
import { supabase, formatDateForQuery, formatCurrency } from '../../lib/supabase'
import { isLeadAtDeepestStage, stageToBooleanMap } from '../../lib/pipeline-utils'

interface LeadWithOpportunity {
  id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  company?: string
  email?: string
  title?: string
  current_stage?: string
  opportunityId?: number
  estimatedValue: number
  opportunityValue?: number
  markedForDeletion?: boolean
  industry?: string
  annual_revenue?: string
  created_time?: string
}

interface OpportunityStageDropdownProps {
  stageName: string
  stageValue: number
  stageCount: number
  isExpanded: boolean
  onToggle: () => void
  client: string
  startDate: Date
  endDate: Date
  onSave?: () => void
}

const ITEMS_PER_PAGE = 10

export default function OpportunityStageDropdown({
  stageName,
  stageValue,
  stageCount,
  isExpanded,
  onToggle,
  client,
  startDate,
  endDate,
  onSave,
}: OpportunityStageDropdownProps) {
  const [leads, setLeads] = useState<LeadWithOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate pagination
  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE)
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return leads.slice(start, start + ITEMS_PER_PAGE)
  }, [leads, currentPage])

  // Reset to page 1 when dropdown opens
  useEffect(() => {
    if (isExpanded) {
      setCurrentPage(1)
    }
  }, [isExpanded])

  // Fetch leads and opportunities when expanded
  useEffect(() => {
    if (!isExpanded) return

    async function fetchData() {
      setLoading(true)
      try {
        const startStr = formatDateForQuery(startDate)
        const endStr = formatDateForQuery(endDate)

        // Fetch existing opportunities for this client
        const { data: opportunitiesData, error: oppError } = await supabase
          .from('client_opportunities')
          .select('*')
          .eq('client', client)

        if (oppError) {
          console.error('Error fetching opportunities:', oppError)
        }

        // Create a map of email -> opportunity for quick lookup
        const opportunityMap = new Map<string, any>()
        ;(opportunitiesData || []).forEach((opp: any) => {
          if (opp.contact_email) {
            opportunityMap.set(opp.contact_email.toLowerCase(), opp)
          }
        })

        // Handle Meeting Booked stage differently - it comes from meetings_booked table
        // Only show leads who haven't progressed to engaged_leads
        if (stageName === 'Meeting Booked') {
          const { data: meetingsData, error: meetingsError } = await supabase
            .from('meetings_booked')
            .select('*')
            .eq('client', client)
            .gte('created_time', startStr)
            .lte('created_time', endStr + 'T23:59:59')
            .order('created_time', { ascending: false })

          if (meetingsError) {
            console.error('Error fetching meetings:', meetingsError)
            setLeads([])
            return
          }

          // Also fetch engaged_leads to check which meetings have progressed
          const { data: engagedData } = await supabase
            .from('engaged_leads')
            .select('email')
            .eq('client', client)
            .gte('date_created', startStr)
            .lte('date_created', endStr)

          // Create set of engaged lead emails
          const engagedEmails = new Set<string>()
          ;(engagedData || []).forEach((lead: any) => {
            if (lead.email) {
              engagedEmails.add(lead.email.toLowerCase())
            }
          })

          // Filter out meetings where lead has progressed to engaged_leads
          const filteredMeetings = (meetingsData || []).filter((meeting: any) => {
            const email = (meeting.email || '').toLowerCase()
            return !engagedEmails.has(email)
          })

          // De-duplicate by email to match useOpportunities logic
          const seenEmails = new Set<string>()
          const uniqueMeetings = filteredMeetings.filter((meeting: any) => {
            const email = (meeting.email || '').toLowerCase()
            if (!email || seenEmails.has(email)) return false
            seenEmails.add(email)
            return true
          })

          const transformedLeads: LeadWithOpportunity[] = uniqueMeetings.map((meeting: any) => {
            const email = (meeting.email || '').toLowerCase()
            const opportunity = email ? opportunityMap.get(email) : null

            return {
              id: meeting.id,
              first_name: meeting.first_name,
              last_name: meeting.last_name,
              full_name: meeting.full_name || `${meeting.first_name || ''} ${meeting.last_name || ''}`.trim(),
              company: meeting.company,
              email: meeting.email,
              title: meeting.title,
              current_stage: 'Meeting Booked',
              opportunityId: opportunity?.id,
              estimatedValue: opportunity?.value || 0,
              opportunityValue: opportunity?.value,
              industry: meeting.industry,
              annual_revenue: meeting.annual_revenue,
              created_time: meeting.created_time,
            }
          })

          setLeads(transformedLeads)
          return
        }

        // Get the boolean column for this stage
        const booleanColumn = stageToBooleanMap[stageName]
        if (!booleanColumn) {
          console.error(`No boolean column mapping for stage: ${stageName}`)
          setLeads([])
          return
        }

        // Fetch leads at this stage with more details
        const { data: leadsData, error: leadsError } = await supabase
          .from('engaged_leads')
          .select('*')
          .eq(booleanColumn, true)
          .eq('client', client)
          .gte('date_created', startStr)
          .lte('date_created', endStr)
          .order('created_at', { ascending: false })

        if (leadsError) {
          console.error(`Error fetching leads for ${stageName}:`, leadsError)
          setLeads([])
          return
        }

        // Filter to only include leads whose DEEPEST stage matches this stage
        const filteredLeads = (leadsData || []).filter((lead: any) =>
          isLeadAtDeepestStage(lead, stageName)
        )

        // De-duplicate by email to match useOpportunities logic
        const seenEmails = new Set<string>()
        const uniqueLeads = filteredLeads.filter((lead: any) => {
          const email = (lead.email || '').toLowerCase()
          if (!email || seenEmails.has(email)) return false
          seenEmails.add(email)
          return true
        })

        // Transform leads and merge with opportunities
        const transformedLeads: LeadWithOpportunity[] = uniqueLeads.map((lead: any) => {
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
            current_stage: lead.current_stage || stageName,
            opportunityId: opportunity?.id,
            estimatedValue: opportunity?.value || 0,
            opportunityValue: opportunity?.value,
            industry: lead.industry,
            annual_revenue: lead.annual_revenue,
            created_time: lead.created_at || lead.date_created,
          }
        })

        setLeads(transformedLeads)
      } catch (err) {
        console.error('Error fetching data:', err)
        setLeads([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isExpanded, stageName, client, startDate, endDate])

  // Handle value change for a lead - need to find correct index in full array
  const handleValueChange = (paginatedIndex: number, value: string) => {
    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + paginatedIndex
    const numValue = value === '' ? 0 : parseFloat(value) || 0
    setLeads((prev) => {
      const updated = [...prev]
      updated[actualIndex] = {
        ...updated[actualIndex],
        estimatedValue: numValue,
        markedForDeletion: false,
      }
      return updated
    })
    setHasChanges(true)
  }

  // Handle delete/clear for a lead
  const handleDelete = (paginatedIndex: number) => {
    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + paginatedIndex
    setLeads((prev) => {
      const updated = [...prev]
      updated[actualIndex] = {
        ...updated[actualIndex],
        estimatedValue: 0,
        markedForDeletion: true,
      }
      return updated
    })
    setHasChanges(true)
  }

  // Save all opportunities
  const handleSave = async () => {
    setSaving(true)
    try {
      const deleteIds: number[] = []
      const upsertData: any[] = []

      console.log('Starting save, leads:', leads.length, 'client:', client, 'stage:', stageName)

      leads.forEach((lead) => {
        console.log('Processing lead:', lead.email, 'value:', lead.estimatedValue, 'oppId:', lead.opportunityId)
        if (lead.markedForDeletion || (lead.estimatedValue === 0 && lead.opportunityId)) {
          if (lead.opportunityId) {
            deleteIds.push(lead.opportunityId)
          }
        } else if (lead.estimatedValue > 0) {
          const contactName = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'
          upsertData.push({
            id: lead.opportunityId || undefined,
            client,
            opportunity_name: lead.full_name || lead.company || lead.email || 'Unknown',
            stage: stageName,
            value: Number(lead.estimatedValue),
            contact_email: lead.email || null,
            contact_name: contactName,
          })
        }
      })

      console.log('Saving opportunities:', { deleteIds, upsertData, client })

      // Delete opportunities marked for deletion
      for (const id of deleteIds) {
        const { error } = await supabase.from('client_opportunities').delete().eq('id', id)
        if (error) {
          console.error('Error deleting opportunity:', id, error)
          throw error
        }
      }

      // Upsert opportunities
      // Use type assertion to bypass strict Supabase typing for this table
      const opportunitiesTable = supabase.from('client_opportunities') as any
      
      for (const opp of upsertData) {
        console.log('Processing opp:', opp)
        if (opp.id !== undefined && opp.id !== null) {
          console.log('Updating existing opportunity:', opp.id)
          const updateData = {
            value: opp.value,
            stage: opp.stage,
            opportunity_name: opp.opportunity_name,
            contact_name: opp.contact_name,
          }
          const { error, data } = await opportunitiesTable
            .update(updateData)
            .eq('id', opp.id)
            .select()
          
          if (error) {
            console.error('Error updating opportunity:', opp.id, error)
            throw error
          }
          console.log('Updated opportunity result:', data)
        } else {
          console.log('Inserting new opportunity')
          const insertData = {
            client: opp.client,
            opportunity_name: opp.opportunity_name,
            stage: opp.stage,
            value: opp.value,
            contact_name: opp.contact_name,
            contact_email: opp.contact_email || null,
          }
          console.log('Insert data:', insertData)
          
          const { error, data } = await opportunitiesTable.insert(insertData).select()
          if (error) {
            console.error('Error inserting opportunity:', insertData, error)
            throw error
          }
          console.log('Inserted opportunity result:', data)
        }
      }

      setHasChanges(false)
      onSave?.()
    } catch (err) {
      console.error('Error saving opportunities:', err)
      alert('Failed to save estimated values.')
    } finally {
      setSaving(false)
    }
  }

  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="w-full">
      {/* Dropdown Header - Stage Card */}
      <motion.button
        onClick={onToggle}
        className={`w-full rounded-lg px-4 py-3.5 border-l-4 bg-rillation-bg border-l-[#EB1A1A] transition-all duration-200 text-left ${
          isExpanded ? 'ring-2 ring-[#EB1A1A]/30' : ''
        }`}
        whileHover={{ 
          scale: 1.01,
          boxShadow: '0 4px 12px rgba(235, 26, 26, 0.2)',
        }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white truncate">
              {stageName}
            </h4>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} className="text-white/90" />
            </motion.div>
          </div>
          <p className="text-xl font-bold text-white ml-4 flex-shrink-0">
            ${stageValue.toLocaleString()}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 relative overflow-hidden rounded-full h-1.5 bg-[#EB1A1A]/20">
          <motion.div
            className="h-full bg-[#EB1A1A] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((stageValue / Math.max(stageValue, 1)) * 100, 100)}%` }}
          />
        </div>

        <p className="text-xs text-white/90 font-medium">
          {stageCount} {stageCount === 1 ? 'opportunity' : 'opportunities'}
        </p>
      </motion.button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#EB1A1A] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-6 text-white/90 text-sm">
                  No leads found at this stage
                </div>
              ) : (
                <>
                  {/* Header with summary and save button */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
                    <span className="text-sm text-white/90">
                      {leads.length} lead{leads.length !== 1 ? 's' : ''} • Total: <span className="font-semibold text-white">{formatCurrency(totalValue)}</span>
                    </span>
                    {hasChanges && (
                      <motion.button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 transition-colors"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </motion.button>
                    )}
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-700/30 rounded-lg mb-2 text-xs font-semibold text-white/90 uppercase tracking-wide">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Company</div>
                    <div className="col-span-2">Title</div>
                    <div className="col-span-3 text-right">Est. Value</div>
                  </div>

                  {/* Leads List */}
                  <div className="space-y-1">
                    {paginatedLeads.map((lead, index) => (
                      <motion.div
                        key={lead.id || lead.email || index}
                        className="grid grid-cols-12 gap-2 items-center px-3 py-3 bg-slate-800/40 rounded-lg hover:bg-slate-700/40 transition-colors group"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        {/* Name */}
                        <div className="col-span-4 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {lead.full_name || lead.first_name || 'Unknown'}
                          </p>
                          {lead.created_time && (
                            <p className="text-[10px] text-white/80 mt-0.5">
                              {formatDate(lead.created_time)}
                            </p>
                          )}
                        </div>

                        {/* Company */}
                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={12} className="text-white/80 flex-shrink-0" />
                            <p className="text-sm text-white/80 truncate">
                              {lead.company || '-'}
                            </p>
                          </div>
                          {lead.industry && (
                            <p className="text-[10px] text-white/80 mt-0.5 truncate pl-4">
                              {lead.industry}
                            </p>
                          )}
                        </div>

                        {/* Title */}
                        <div className="col-span-2 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-white/80 flex-shrink-0" />
                            <p className="text-sm text-white/90 truncate">
                              {lead.title || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Estimated Value Input */}
                        <div className="col-span-3 flex items-center justify-end gap-1.5">
                          <span className="text-white/80 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={lead.estimatedValue || ''}
                            onChange={(e) => handleValueChange(index, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                // Find next input in list
                                const inputs = e.currentTarget.closest('.space-y-1')?.querySelectorAll('input[type="number"]')
                                if (inputs) {
                                  const currentIndex = Array.from(inputs).indexOf(e.currentTarget)
                                  const nextInput = inputs[currentIndex + 1] as HTMLInputElement
                                  if (nextInput) {
                                    nextInput.focus()
                                    nextInput.select()
                                  }
                                }
                              }
                            }}
                            placeholder="0"
                            className="w-20 px-2 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded text-xs text-white text-right focus:outline-none focus:border-[#EB1A1A]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {lead.opportunityId && (
                            <button
                              onClick={() => handleDelete(index)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Clear value"
                            >
                              <Trash2 
                                size={12} 
                                className={`text-white/80 hover:text-red-400 ${lead.markedForDeletion ? 'text-red-400' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                      <span className="text-xs text-white/80">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, leads.length)} of {leads.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg bg-slate-700/50 text-white/90 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs text-white/90 min-w-[60px] text-center">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-lg bg-slate-700/50 text-white/90 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
