import { useState, useEffect, useMemo } from 'react'
import { X, Save, Loader2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { supabase, formatDateForQuery, formatCurrency } from '../../lib/supabase'
import { isLeadAtDeepestStage, stageToBooleanMap, PIPELINE_STAGES_ORDERED } from '../../lib/pipeline-utils'
import Button from './Button'
import ModalPortal from './ModalPortal'

interface ConfigureTargetsModalProps {
  isOpen: boolean
  onClose: () => void
  client?: string // Optional for targets mode
  startDate: Date
  endDate: Date
  onSave?: () => void
  mode?: 'pipeline' | 'targets' // 'pipeline' for estimated values, 'targets' for daily targets
}

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
}

interface StageGroup {
  stage: string
  leads: LeadWithOpportunity[]
  collapsed: boolean
}

// Pipeline stages we support in Configure Targets modal
// Include Meeting Booked plus all stages from engaged_leads
const PIPELINE_STAGES = [
  'Meeting Booked',
  ...PIPELINE_STAGES_ORDERED
]

// stageToBooleanMap is now imported from pipeline-utils

export default function ConfigureTargetsModal({
  isOpen,
  onClose,
  client,
  startDate,
  endDate,
  onSave,
  mode = 'pipeline', // Default to pipeline mode for estimated values
}: ConfigureTargetsModalProps) {
  const [stageGroups, setStageGroups] = useState<StageGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // State for targets mode
  const [selectedClientForTargets, setSelectedClientForTargets] = useState<string>('')
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [allClients, setAllClients] = useState<string[]>([])
  const [emailsPerDay, setEmailsPerDay] = useState(0)
  const [prospectsPerDay, setProspectsPerDay] = useState(0)
  const [repliesPerDay, setRepliesPerDay] = useState(0)
  const [interestedPerDay, setInterestedPerDay] = useState(0)
  const [meetingsPerDay, setMeetingsPerDay] = useState(0)

  // Fetch all clients for targets mode
  useEffect(() => {
    if (!isOpen || mode !== 'targets') return

    async function fetchClients() {
      try {
        const { data, error } = await supabase
          .from('Clients')
          .select('Business')
          .order('Business')

        if (error) throw error

        const clientNames = (data || [])
          .map((c: any) => c.Business)
          .filter((name): name is string => Boolean(name))
        
        setAllClients(clientNames)
      } catch (err) {
        console.error('Error fetching clients:', err)
      }
    }

    fetchClients()
  }, [isOpen, mode])

  // Fetch targets for selected client
  useEffect(() => {
    if (!isOpen || mode !== 'targets' || !selectedClientForTargets) return

    async function fetchTargets() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('client_targets')
          .select('*')
          .eq('client', selectedClientForTargets)
          .single()

        if (error && error.code !== 'PGRST116') throw error

        type TargetRow = {
          client: string
          emails_per_day: number | null
          prospects_per_day: number | null
          replies_per_day: number | null
          interested_per_day?: number | null
          meetings_per_day: number | null
        }

        const targetData = data as TargetRow | null

        if (targetData) {
          setEmailsPerDay(targetData.emails_per_day || 0)
          setProspectsPerDay(targetData.prospects_per_day || 0)
          setRepliesPerDay(targetData.replies_per_day || 0)
          setInterestedPerDay(targetData.interested_per_day || 0)
          setMeetingsPerDay(targetData.meetings_per_day || 0)
        } else {
          // Reset to 0 if no targets found
          setEmailsPerDay(0)
          setProspectsPerDay(0)
          setRepliesPerDay(0)
          setInterestedPerDay(0)
          setMeetingsPerDay(0)
        }
      } catch (err) {
        console.error('Error fetching targets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTargets()
  }, [isOpen, selectedClientForTargets, mode])

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return allClients
    const query = clientSearchQuery.toLowerCase()
    return allClients.filter(client => client.toLowerCase().includes(query))
  }, [allClients, clientSearchQuery])

  // Fetch leads and opportunities for pipeline mode
  useEffect(() => {
    if (!isOpen || mode !== 'pipeline' || !client) return

    async function fetchData() {
      setLoading(true)
      try {
        const startStr = formatDateForQuery(startDate)
        const endStr = formatDateForQuery(endDate)

        // Fetch existing opportunities for this client
        const { data: opportunitiesData, error: oppError } = await supabase
          .from('client_opportunities')
          .select('*')
          .eq('client', client!)

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

        // Fetch leads for each pipeline stage
        const groups: StageGroup[] = []

        for (const stage of PIPELINE_STAGES) {
          // Handle Meeting Booked stage specially - comes from meetings_booked table
          if (stage === 'Meeting Booked') {
            const { data: meetingsData, error: meetingsError } = await supabase
              .from('meetings_booked')
              .select('*')
              .eq('client', client!)
              .gte('created_time', startStr)
              .lte('created_time', endStr + 'T23:59:59')
              .order('created_time', { ascending: false })

            if (meetingsError) {
              console.error('Error fetching meetings:', meetingsError)
              continue
            }

            const leads: LeadWithOpportunity[] = (meetingsData || []).map((meeting: any) => {
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
              }
            })

            groups.push({
              stage,
              leads,
              collapsed: false,
            })
            continue
          }

          const booleanColumn = stageToBooleanMap[stage]
          if (!booleanColumn) continue

          // Fetch leads at this stage
          let query = supabase
            .from('engaged_leads')
            .select('*')
            .eq(booleanColumn, true)
            .eq('client', client!)
            .gte('date_created', startStr)
            .lte('date_created', endStr)
            .order('created_at', { ascending: false })

          const { data: leadsData, error: leadsError } = await query

          if (leadsError) {
            console.error(`Error fetching leads for ${stage}:`, leadsError)
            continue
          }

          // Filter to only include leads whose DEEPEST stage matches this stage
          // This prevents a closed lead from also appearing in Demo Booked, etc.
          const filteredLeads = (leadsData || []).filter((lead: any) => 
            isLeadAtDeepestStage(lead, stage)
          )

          // Transform leads and merge with opportunities
          const leads: LeadWithOpportunity[] = filteredLeads.map((lead: any) => {
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
              current_stage: lead.current_stage || stage,
              opportunityId: opportunity?.id,
              estimatedValue: opportunity?.value || 0,
              opportunityValue: opportunity?.value,
            }
          })

          groups.push({
            stage,
            leads,
            collapsed: false,
          })
        }

        setStageGroups(groups)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, client, startDate, endDate])

  // Toggle collapse for a stage
  const toggleCollapse = (stage: string) => {
    setStageGroups((prev) =>
      prev.map((group) =>
        group.stage === stage ? { ...group, collapsed: !group.collapsed } : group
      )
    )
  }

  // Handle value change for a lead
  const handleValueChange = (stage: string, leadIndex: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0
    setStageGroups((prev) =>
      prev.map((group) => {
        if (group.stage === stage) {
          const updatedLeads = [...group.leads]
          updatedLeads[leadIndex] = {
            ...updatedLeads[leadIndex],
            estimatedValue: numValue,
          }
          return { ...group, leads: updatedLeads }
        }
        return group
      })
    )
  }

  // Handle focus - select all
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  // Save targets for targets mode
  const handleSaveTargets = async () => {
    if (!selectedClientForTargets) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('client_targets')
        .upsert({
          client: selectedClientForTargets,
          emails_per_day: emailsPerDay,
          prospects_per_day: prospectsPerDay,
          replies_per_day: repliesPerDay,
          interested_per_day: interestedPerDay,
          meetings_per_day: meetingsPerDay,
        } as any, {
          onConflict: 'client'
        })

      if (error) throw error

      onSave?.()
      // Don't close, allow configuring more clients
      setSelectedClientForTargets('')
      setClientSearchQuery('')
    } catch (err) {
      console.error('Error saving targets:', err)
      alert('Failed to save targets')
    } finally {
      setSaving(false)
    }
  }

  // Handle client selection
  const handleClientSelect = (clientName: string) => {
    setSelectedClientForTargets(clientName)
    setClientSearchQuery('')
  }

  // Initialize selected client when modal opens with a client prop
  useEffect(() => {
    if (isOpen && mode === 'targets' && client) {
      setSelectedClientForTargets(client)
    }
  }, [isOpen, mode, client])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClientForTargets('')
      setClientSearchQuery('')
    }
  }, [isOpen])

  // Save all opportunities for pipeline mode
  const handleSave = async () => {
    setSaving(true)
    try {
      const upsertData: any[] = []

      // Collect all leads with estimated values
      stageGroups.forEach((group) => {
        group.leads.forEach((lead) => {
          // Save if: value > 0 OR there's an existing opportunity (even if setting to 0)
          if (lead.estimatedValue > 0 || lead.opportunityId) {
            const contactName = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'
            upsertData.push({
              id: lead.opportunityId || null,
              client,
              opportunity_name: lead.full_name || lead.company || lead.email || 'Unknown',
              stage: group.stage,
              value: lead.estimatedValue,
              contact_email: lead.email || null,
              contact_name: contactName,
            })
          }
        })
      })

      if (upsertData.length > 0) {
        // Upsert opportunities (update if id exists, insert if not)
        for (const opp of upsertData) {
          if (opp.id) {
            // Update existing
            const { error, data } = await (supabase as any)
              .from('client_opportunities')
              .update({
                value: opp.value,
                stage: opp.stage,
                opportunity_name: opp.opportunity_name,
                contact_name: opp.contact_name,
              })
              .eq('id', opp.id)
              .select()

            if (error) {
              console.error('Error updating opportunity:', opp.id, error)
              throw error
            }
            console.log('Updated opportunity:', data)
          } else {
            // Insert new - build insert data without null/undefined fields
            const insertData: Record<string, any> = {
              client: opp.client,
              opportunity_name: opp.opportunity_name,
              stage: opp.stage,
              value: opp.value,
              contact_name: opp.contact_name,
            }
            // Only include contact_email if it has a value
            if (opp.contact_email) {
              insertData.contact_email = opp.contact_email
            }

            const { error, data } = await (supabase as any)
              .from('client_opportunities')
              .insert(insertData)
              .select()

            if (error) {
              console.error('Error inserting opportunity:', insertData, error)
              throw error
            }
            console.log('Inserted opportunity:', data)
          }
        }
      }

      onSave?.()
      onClose()
    } catch (err) {
      console.error('Error saving opportunities:', err)
      alert('Failed to save estimated values. Please check the console for details.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // Calculate totals only for pipeline mode
  const totalLeads = mode === 'pipeline' 
    ? stageGroups.reduce((sum, group) => sum + group.leads.length, 0)
    : 0
  const totalValue = mode === 'pipeline'
    ? stageGroups.reduce(
        (sum, group) =>
          sum + group.leads.reduce((leadSum, lead) => leadSum + (lead.estimatedValue || 0), 0),
        0
      )
    : 0

  return (
    <ModalPortal isOpen={isOpen}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div>
            <h2 className="text-xl font-semibold text-rillation-text">
              {mode === 'pipeline' ? 'Set Estimated Value' : 'Configure Performance Targets'}
            </h2>
            <p className="text-sm text-rillation-text-muted mt-1">
              {mode === 'pipeline' 
                ? 'Set estimated values (potential MRR) for leads in the pipeline'
                : 'Configure daily performance targets for this client'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {mode === 'targets' ? (
          /* Targets Mode Content */
          <div className="p-4 md:p-6 overflow-y-auto flex-1">
            {!selectedClientForTargets ? (
              /* Client Selection View */
              <div className="max-w-xl mx-auto space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" size={18} />
                  <input
                    type="text"
                    placeholder="Type to search for a client..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-10 pr-4 py-4 bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text text-base"
                    autoFocus
                  />
                </div>
                
                {clientSearchQuery && (
                  <div className="bg-rillation-bg rounded-xl border border-rillation-border overflow-hidden shadow-lg">
                    {filteredClients.length === 0 ? (
                      <div className="p-6 text-center text-rillation-text-muted">
                        No clients found matching "{clientSearchQuery}"
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {filteredClients.slice(0, 10).map((clientName) => (
                          <button
                            key={clientName}
                            onClick={() => handleClientSelect(clientName)}
                            className="w-full px-4 py-3 text-left hover:bg-rillation-card-hover transition-colors text-rillation-text border-b border-rillation-border/30 last:border-b-0"
                          >
                            {clientName}
                          </button>
                        ))}
                        {filteredClients.length > 10 && (
                          <div className="p-3 text-center text-xs text-rillation-text-muted border-t border-rillation-border/30">
                            Showing first 10 results. Type more to refine search.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {!clientSearchQuery && (
                  <div className="text-center py-12">
                    <Search className="mx-auto mb-4 text-rillation-text-muted" size={32} />
                    <p className="text-rillation-text-muted">
                      Type in the search box above to find a client
                    </p>
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-rillation-text border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              /* Targets Form View */
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-rillation-text">
                    Configure Targets: {selectedClientForTargets}
                  </h3>
                  <button
                    onClick={() => setSelectedClientForTargets('')}
                    className="text-sm text-rillation-text-muted hover:text-rillation-text"
                  >
                    ← Back to Client List
                  </button>
                </div>
                
                <div className="bg-rillation-bg rounded-xl border border-rillation-border p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-rillation-text mb-2">
                      Emails per Day
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={emailsPerDay || ''}
                      onChange={(e) => setEmailsPerDay(parseFloat(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-4 py-2 bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-rillation-text mb-2">
                      Prospects per Day
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={prospectsPerDay || ''}
                      onChange={(e) => setProspectsPerDay(parseFloat(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-4 py-2 bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-rillation-text mb-2">
                      Replies per Day
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={repliesPerDay || ''}
                      onChange={(e) => setRepliesPerDay(parseFloat(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-4 py-2 bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-rillation-text mb-2">
                      Interested Replies per Day
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={interestedPerDay || ''}
                      onChange={(e) => setInterestedPerDay(parseFloat(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-4 py-2 bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-rillation-text mb-2">
                      Meetings per Day
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={meetingsPerDay || ''}
                      onChange={(e) => setMeetingsPerDay(parseFloat(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-4 py-2 bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-text"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Summary Stats for Pipeline Mode */}
            <div className="px-6 py-4 border-b border-rillation-border bg-rillation-bg">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-rillation-text-muted">Total Leads: </span>
                  <span className="font-semibold text-rillation-text">{totalLeads}</span>
                </div>
                <div>
                  <span className="text-rillation-text-muted">Total Pipeline Value: </span>
                  <span className="font-semibold text-rillation-purple">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </div>

            {/* Pipeline Mode Content */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stageGroups.length === 0 ? (
                <div className="text-center py-12 text-rillation-text-muted">
                  No leads found in pipeline stages
                </div>
              ) : (
                <div className="space-y-4">
                  {stageGroups.map((group) => (
                    <div
                      key={group.stage}
                      className="bg-rillation-bg rounded-xl border border-rillation-border overflow-hidden"
                    >
                      {/* Stage Header */}
                      <button
                        onClick={() => toggleCollapse(group.stage)}
                        className="w-full flex items-center justify-between p-4 hover:bg-rillation-card-hover transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-rillation-text">
                            {group.stage}
                          </span>
                          <span className="text-sm text-rillation-text-muted">
                            ({group.leads.length} leads)
                          </span>
                          <span className="text-sm font-semibold text-rillation-purple">
                            {formatCurrency(
                              group.leads.reduce(
                                (sum, lead) => sum + (lead.estimatedValue || 0),
                                0
                              )
                            )}
                          </span>
                        </div>
                        {group.collapsed ? (
                          <ChevronDown size={20} className="text-rillation-text-muted" />
                        ) : (
                          <ChevronUp size={20} className="text-rillation-text-muted" />
                        )}
                      </button>

                      {/* Stage Leads */}
                      {!group.collapsed && (
                        <div className="border-t border-rillation-border">
                          {group.leads.length === 0 ? (
                            <div className="p-4 text-center text-sm text-rillation-text-muted">
                              No leads at this stage
                            </div>
                          ) : (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                              <table className="w-full min-w-[600px]">
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
                                      Estimated Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-rillation-border/30">
                                  {group.leads.map((lead, index) => (
                                    <tr
                                      key={lead.id || lead.email || index}
                                      className="hover:bg-rillation-card-hover transition-colors"
                                    >
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
                                      <td className="px-2 sm:px-4 py-3">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                          <span className="text-rillation-text-muted text-xs sm:text-sm">$</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={lead.estimatedValue || ''}
                                            onChange={(e) =>
                                              handleValueChange(group.stage, index, e.target.value)
                                            }
                                            onFocus={handleFocus}
                                            placeholder="0"
                                            className="w-28 sm:w-36 md:w-40 px-2 sm:px-3 py-1.5 sm:py-2 bg-rillation-card border border-rillation-border rounded-lg text-xs sm:text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-rillation-border gap-3">
          <Button variant="secondary" onClick={onClose}>
            {mode === 'targets' && selectedClientForTargets ? 'Cancel' : 'Close'}
          </Button>
          {mode === 'targets' && selectedClientForTargets && (
            <Button 
              variant="primary" 
              onClick={handleSaveTargets} 
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Targets
            </Button>
          )}
          {mode === 'pipeline' && (
            <Button 
              variant="primary" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Estimated Values
            </Button>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
