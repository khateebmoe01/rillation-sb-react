import { useState, useEffect } from 'react'
import { X, Save, Loader2, Trash2 } from 'lucide-react'
import { supabase, formatDateForQuery, formatCurrency } from '../../lib/supabase'
import Button from './Button'
import ModalPortal from './ModalPortal'

interface OpportunityStageModalProps {
  isOpen: boolean
  onClose: () => void
  stageName: string
  client: string
  startDate: Date
  endDate: Date
  onSave?: () => void
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
  markedForDeletion?: boolean
}

// Map pipeline stage to boolean column in engaged_leads
const stageToBooleanMap: Record<string, string> = {
  'Showed Up to Disco': 'showed_up_to_disco',
  'Qualified': 'qualified',
  'Demo Booked': 'demo_booked',
  'Showed Up to Demo': 'showed_up_to_demo',
  'Proposal Sent': 'proposal_sent',
  'Closed': 'closed',
}

export default function OpportunityStageModal({
  isOpen,
  onClose,
  stageName,
  client,
  startDate,
  endDate,
  onSave,
}: OpportunityStageModalProps) {
  const [leads, setLeads] = useState<LeadWithOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch leads and opportunities
  useEffect(() => {
    if (!isOpen) return

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

        // Get the boolean column for this stage
        const booleanColumn = stageToBooleanMap[stageName]
        if (!booleanColumn) {
          console.error(`No boolean column mapping for stage: ${stageName}`)
          setLeads([])
          return
        }

        // Fetch leads at this stage
        let query = supabase
          .from('engaged_leads')
          .select('*')
          .eq(booleanColumn, true)
          .eq('client', client)
          .gte('date_created', startStr)
          .lte('date_created', endStr)
          .order('created_at', { ascending: false })

        const { data: leadsData, error: leadsError } = await query

        if (leadsError) {
          console.error(`Error fetching leads for ${stageName}:`, leadsError)
          setLeads([])
          return
        }

        // Transform leads and merge with opportunities
        const transformedLeads: LeadWithOpportunity[] = (leadsData || []).map((lead: any) => {
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
  }, [isOpen, stageName, client, startDate, endDate])

  // Handle value change for a lead
  const handleValueChange = (leadIndex: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0
    setLeads((prev) => {
      const updated = [...prev]
      updated[leadIndex] = {
        ...updated[leadIndex],
        estimatedValue: numValue,
        markedForDeletion: false, // Clear deletion flag if user enters a value
      }
      return updated
    })
  }

  // Handle delete/clear for a lead
  const handleDelete = (leadIndex: number) => {
    setLeads((prev) => {
      const updated = [...prev]
      updated[leadIndex] = {
        ...updated[leadIndex],
        estimatedValue: 0,
        markedForDeletion: true, // Mark for deletion
      }
      return updated
    })
  }

  // Handle focus - select all
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  // Save all opportunities
  const handleSave = async () => {
    setSaving(true)
    try {
      const upsertData: any[] = []
      const deleteIds: number[] = []

      // Separate leads into those to delete and those to upsert
      leads.forEach((lead) => {
        // Mark for deletion if: markedForDeletion is true OR (value is 0 AND there's an existing opportunity)
        if (lead.markedForDeletion || (lead.estimatedValue === 0 && lead.opportunityId)) {
          if (lead.opportunityId) {
            deleteIds.push(lead.opportunityId)
          }
        } else if (lead.estimatedValue > 0) {
          // Only upsert if value > 0
          upsertData.push({
            id: lead.opportunityId || undefined, // Include id if exists for update
            client,
            opportunity_name: lead.full_name || lead.company || lead.email || 'Unknown',
            stage: stageName,
            value: lead.estimatedValue,
            contact_email: lead.email,
            contact_name: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          })
        }
      })

      // Delete opportunities marked for deletion
      if (deleteIds.length > 0) {
        for (const id of deleteIds) {
          const { error } = await supabase
            .from('client_opportunities')
            .delete()
            .eq('id', id)

          if (error) throw error
        }
      }

      // Upsert opportunities (update if id exists, insert if not)
      if (upsertData.length > 0) {
        for (const opp of upsertData) {
          if (opp.id) {
            // Update existing
            const { error } = await (supabase
              .from('client_opportunities') as any)
              .update({
                value: opp.value,
                stage: opp.stage,
                opportunity_name: opp.opportunity_name,
                contact_name: opp.contact_name,
              })
              .eq('id', opp.id)

            if (error) throw error
          } else {
            // Insert new
            const insertData = {
              client: opp.client,
              opportunity_name: opp.opportunity_name,
              stage: opp.stage,
              value: opp.value,
              contact_name: opp.contact_name,
              contact_email: opp.contact_email || undefined,
            }

            const { error } = await (supabase
              .from('client_opportunities') as any)
              .insert(insertData)

            if (error) throw error
          }
        }
      }

      onSave?.()
      onClose()
    } catch (err) {
      console.error('Error saving opportunities:', err)
      alert('Failed to save estimated values')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)

  return (
    <ModalPortal isOpen={isOpen}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div>
            <h2 className="text-xl font-semibold text-rillation-text">
              {stageName} - Leads
            </h2>
            <p className="text-sm text-rillation-text-muted mt-1">
              Set estimated values (potential MRR) for leads at this stage
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="px-6 py-4 border-b border-rillation-border bg-rillation-bg">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-rillation-text-muted">Total Leads: </span>
              <span className="font-semibold text-rillation-text">{leads.length}</span>
            </div>
            <div>
              <span className="text-rillation-text-muted">Total Stage Value: </span>
              <span className="font-semibold text-rillation-purple">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-rillation-text-muted">
              No leads found at this stage
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {leads.map((lead, index) => (
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
                            onChange={(e) => handleValueChange(index, e.target.value)}
                            onFocus={handleFocus}
                            placeholder="0"
                            className="w-28 sm:w-36 md:w-40 px-2 sm:px-3 py-1.5 sm:py-2 bg-rillation-card border border-rillation-border rounded-lg text-xs sm:text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                          />
                          {lead.opportunityId && (
                            <button
                              onClick={() => handleDelete(index)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group"
                              title="Clear estimated value"
                            >
                              <Trash2 
                                size={16} 
                                className={`text-rillation-text-muted group-hover:text-red-400 transition-colors ${
                                  lead.markedForDeletion ? 'text-red-400' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-rillation-border gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Estimated Values
          </Button>
        </div>
      </div>
    </ModalPortal>
  )
}

