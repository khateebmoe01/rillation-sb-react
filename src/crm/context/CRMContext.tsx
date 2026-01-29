import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useFilters } from '../../contexts/FilterContext'
import type { Contact, Deal, Task, Note, CRMStats, CRMFilters } from '../types/index'

// Create an untyped supabase client for tables that aren't in the generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ============================================
// CONTEXT TYPE
// ============================================
interface CRMContextType {
  // Data
  contacts: Contact[]
  deals: Deal[]
  tasks: Task[]
  stats: CRMStats | null
  
  // Loading states
  loading: {
    contacts: boolean
    deals: boolean
    tasks: boolean
    stats: boolean
  }
  
  // Initial load flag - true after first data fetch completes
  initialLoadComplete: boolean
  
  // Errors
  error: string | null
  
  // Filters
  filters: CRMFilters
  setFilters: (filters: CRMFilters) => void
  
  // CRUD - Contacts (now using engaged_leads)
  fetchContacts: () => Promise<void>
  createContact: (data: Partial<Contact>) => Promise<Contact | null>
  updateContact: (id: string, data: Partial<Contact>) => Promise<boolean>
  deleteContact: (id: string) => Promise<boolean>
  
  // CRUD - Deals
  fetchDeals: () => Promise<void>
  createDeal: (data: Partial<Deal>) => Promise<Deal | null>
  updateDeal: (id: string, data: Partial<Deal>) => Promise<boolean>
  deleteDeal: (id: string) => Promise<boolean>
  moveDealToStage: (dealId: string, stage: string, index: number) => Promise<boolean>
  
  // CRUD - Tasks
  fetchTasks: () => Promise<void>
  createTask: (data: Partial<Task>) => Promise<Task | null>
  updateTask: (id: string, data: Partial<Task>) => Promise<boolean>
  toggleTask: (id: string) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  
  // Notes
  fetchNotes: (entityType: 'contact' | 'deal', entityId: string) => Promise<Note[]>
  createNote: (data: Partial<Note>) => Promise<Note | null>
  
  // Stats
  fetchStats: () => Promise<void>
  
  // Refresh all
  refreshAll: () => Promise<void>
}

const CRMContext = createContext<CRMContextType | null>(null)

// ============================================
// PROVIDER
// ============================================
export function CRMProvider({ children }: { children: ReactNode }) {
  const { strategyClient: selectedClient } = useFilters()
  
  // Data state
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<CRMStats | null>(null)
  
  // Loading state
  const [loading, setLoading] = useState({
    contacts: true,
    deals: true,
    tasks: true,
    stats: true,
  })
  
  // Error state
  const [error, setError] = useState<string | null>(null)
  
  // Initial load complete flag
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState<CRMFilters>({})

  // ============================================
  // CONTACTS (Using engaged_leads table)
  // ============================================
  const fetchContacts = useCallback(async () => {
    if (!selectedClient) return
    setLoading(prev => ({ ...prev, contacts: true }))
    
    try {
      const { data, error: fetchError } = await db
        .from('engaged_leads')
        .select('*')
        .eq('client', selectedClient)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      setContacts((data || []) as Contact[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts')
    } finally {
      setLoading(prev => ({ ...prev, contacts: false }))
    }
  }, [selectedClient])

  const createContact = useCallback(async (contactData: Partial<Contact>): Promise<Contact | null> => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please check your environment variables.')
      return null
    }
    
    if (!selectedClient) {
      setError('No client selected. Please ensure you are logged in with a valid client assignment.')
      return null
    }
    
    try {
      console.log('Creating contact in engaged_leads with client:', selectedClient, 'data:', contactData)
      const { data: created, error: createError } = await db
        .from('engaged_leads')
        .insert({ 
          ...contactData, 
          client: selectedClient,
          stage: contactData.stage || 'new',
          meeting_booked: false,
          qualified: false,
          showed_up_to_disco: false,
          demo_booked: false,
          showed_up_to_demo: false,
          proposal_sent: false,
          closed: false,
        })
        .select()
        .single()
      
      if (createError) {
        const errorMessage = createError.message || createError.details || 'Failed to create contact'
        setError(errorMessage)
        console.error('Create contact error:', createError)
        throw createError
      }
      setContacts(prev => [created as Contact, ...prev])
      setError(null)
      return created as Contact
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create contact'
      setError(errorMessage)
      console.error('Create contact exception:', err)
      return null
    }
  }, [selectedClient])

  const updateContact = useCallback(async (id: string, contactData: Partial<Contact>): Promise<boolean> => {
    try {
      // Build update object, explicitly including boolean false values
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      // Map Contact interface fields to engaged_leads schema fields
      // This ensures boolean false values are explicitly included
      for (const [key, value] of Object.entries(contactData)) {
        if (value === undefined) continue
        
        // Map Contact fields to engaged_leads fields
        switch (key) {
          case 'company_name':
            updateData.company = value
            break
          case 'company_industry':
            updateData.industry = value
            break
          case 'phone':
            updateData.lead_phone = value
            break
          case 'title':
            updateData.job_title = value
            break
          case 'profile_url':
            updateData.linkedin_url = value
            break
          case 'next_touch':
            updateData.next_touchpoint = value
            break
          case 'last_contacted_at':
            updateData.last_contact = value
            break
          default:
            // Direct mapping for fields that match (including boolean fields like closed, meeting_booked, etc.)
            updateData[key] = value
        }
      }

      const { error: updateError } = await db
        .from('engaged_leads')
        .update(updateData)
        .eq('id', id)
      
      if (updateError) {
        console.error('Update contact error:', updateError)
        throw updateError
      }
      
      // Update local state
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...contactData } : c))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update contact'
      setError(errorMessage)
      console.error('Update contact exception:', err)
      return false
    }
  }, [])

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Soft delete
      const { error: deleteError } = await db
        .from('engaged_leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      
      if (deleteError) throw deleteError
      setContacts(prev => prev.filter(c => c.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact')
      return false
    }
  }, [])

  // ============================================
  // DEALS
  // ============================================
  const fetchDeals = useCallback(async () => {
    if (!selectedClient) return
    setLoading(prev => ({ ...prev, deals: true }))
    
    try {
      // Fetch existing deals from crm_deals
      const { data: fetchedDeals, error: dealsError } = await db
        .from('crm_deals')
        .select('*')
        .eq('client', selectedClient)
        .is('deleted_at', null)
        .order('index', { ascending: true })

      if (dealsError) throw dealsError

      // Use a mutable variable for deals array
      let dealsData = fetchedDeals || []
      
      // Fetch engaged leads
      const { data: leadsData, error: leadsError } = await db
        .from('engaged_leads')
        .select('*')
        .eq('client', selectedClient)
        .is('deleted_at', null)
      
      if (leadsError) throw leadsError
      
      // Fetch opportunities to get deal amounts
      const { data: opportunitiesData, error: oppsError } = await db
        .from('client_opportunities')
        .select('*')
        .eq('client', selectedClient)
      
      if (oppsError) throw oppsError
      
      // Create a map of email -> opportunity for quick lookup
      const opportunityMap = new Map<string, { id: number; value: number }>()
      ;(opportunitiesData || []).forEach((opp: any) => {
        if (opp.contact_email) {
          const email = opp.contact_email.toLowerCase()
          opportunityMap.set(email, { id: opp.id, value: Number(opp.value || 0) })
        }
      })
      
      // Create a map of contact_id -> contact for joining with deals
      const contactMap = new Map<string, Contact>()
      ;(leadsData || []).forEach((lead: any) => {
        const contact: Contact = {
          id: String(lead.id),
          client: lead.client,
          first_name: lead.first_name,
          last_name: lead.last_name,
          full_name: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          email: lead.email,
          lead_phone: lead.lead_phone,
          job_title: lead.job_title,
          seniority_level: lead.seniority_level,
          linkedin_url: lead.linkedin_url,
          company: lead.company,
          company_domain: lead.company_domain,
          company_linkedin: lead.company_linkedin,
          company_phone: lead.company_phone,
          company_website: lead.company_website,
          company_size: lead.company_size,
          industry: lead.industry,
          annual_revenue: lead.annual_revenue,
          company_hq_city: lead.company_hq_city,
          company_hq_state: lead.company_hq_state,
          company_hq_country: lead.company_hq_country,
          year_founded: lead.year_founded,
          business_model: lead.business_model,
          funding_stage: lead.funding_stage,
          tech_stack: lead.tech_stack,
          is_hiring: lead.is_hiring,
          growth_score: lead.growth_score,
          num_locations: lead.num_locations,
          main_product_service: lead.main_product_service,
          campaign_id: lead.campaign_id,
          campaign_name: lead.campaign_name,
          lead_source: lead.lead_source,
          meeting_booked: lead.meeting_booked || false,
          qualified: lead.qualified || false,
          showed_up_to_disco: lead.showed_up_to_disco || false,
          demo_booked: lead.demo_booked || false,
          showed_up_to_demo: lead.showed_up_to_demo || false,
          proposal_sent: lead.proposal_sent || false,
          closed: lead.closed || false,
          meeting_booked_at: lead.meeting_booked_at,
          qualified_at: lead.qualified_at,
          showed_up_to_disco_at: lead.showed_up_to_disco_at,
          demo_booked_at: lead.demo_booked_at,
          showed_up_to_demo_at: lead.showed_up_to_demo_at,
          proposal_sent_at: lead.proposal_sent_at,
          closed_at: lead.closed_at,
          stage: lead.stage,
          current_stage: lead.current_stage,
          epv: lead.epv,
          context: lead.context,
          next_touchpoint: lead.next_touchpoint,
          notes: lead.notes,
          assignee: lead.assignee,
          last_contact: lead.last_contact,
          meeting_date: lead.meeting_date,
          meeting_link: lead.meeting_link,
          rescheduling_link: lead.rescheduling_link,
          date_created: lead.date_created,
          custom_variables_jsonb: lead.custom_variables_jsonb,
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          deleted_at: lead.deleted_at,
        }
        contactMap.set(String(lead.id), contact)
        if (lead.email) {
          contactMap.set(lead.email.toLowerCase(), contact)
        }
      })
      
      // Create a map of contact_id -> deal for existing deals
      const existingDealsByContactId = new Map<string, any>()
      dealsData.forEach((deal: any) => {
        if (deal.contact_id) {
          existingDealsByContactId.set(deal.contact_id, deal)
        }
      })

      // Helper function to map engaged lead pipeline stage to deal stage
      const mapLeadToDealStage = (lead: any): Deal['stage'] => {
        if (lead.closed) return 'closed'
        if (lead.proposal_sent) return 'proposal'
        if (lead.showed_up_to_demo || lead.demo_booked) return 'demo'
        if (lead.qualified || lead.showed_up_to_disco) return 'discovery'
        if (lead.meeting_booked) return 'interested'
        return 'interested'
      }

      // Find engaged_leads that don't have deals yet and create them
      const leadsWithoutDeals = (leadsData || []).filter((lead: any) =>
        !existingDealsByContactId.has(String(lead.id))
      )

      if (leadsWithoutDeals.length > 0) {
        // Bulk create deals for leads that don't have them
        const newDealsToInsert = leadsWithoutDeals.map((lead: any) => {
          const email = (lead.email || '').toLowerCase()
          const opportunity = email ? opportunityMap.get(email) : null
          const dealStage = mapLeadToDealStage(lead)
          const contact = contactMap.get(String(lead.id))

          const dealName = contact?.full_name ||
            contact?.company ||
            contact?.email ||
            'Untitled Deal'

          return {
            client: selectedClient,
            contact_id: String(lead.id),
            name: dealName,
            description: lead.context || lead.notes || null,
            stage: dealStage,
            amount: opportunity?.value || 0,
            currency: 'USD',
            probability: dealStage === 'closed' ? 100 : dealStage === 'lost' ? 0 :
                        dealStage === 'proposal' ? 80 :
                        dealStage === 'demo' ? 40 :
                        dealStage === 'discovery' ? 25 :
                        dealStage === 'interested' ? 10 : 10,
            expected_close_date: lead.closed_at || null,
            actual_close_date: lead.closed_at || null,
            owner_id: lead.assignee || null,
            index: 0,
            tags: [],
          }
        })

        // Insert new deals
        const { data: insertedDeals, error: insertError } = await db
          .from('crm_deals')
          .insert(newDealsToInsert)
          .select()

        if (insertError) {
          console.error('Error creating deals for engaged_leads:', insertError)
        } else if (insertedDeals) {
          // Add the newly created deals to the deals array
          dealsData = [...dealsData, ...insertedDeals]
        }
      }

      // Now join contacts with all deals
      const allDeals: Deal[] = dealsData.map((deal: any) => {
        if (deal.contact_id) {
          const contact = contactMap.get(deal.contact_id)
          if (contact) {
            deal.contact = contact
          }
        }
        return deal as Deal
      })
      
      // Sort by stage and index
      const stageOrder: Deal['stage'][] = ['interested', 'discovery', 'demo', 'negotiation', 'proposal', 'closed', 'lost']
      allDeals.sort((a, b) => {
        const aStageIndex = stageOrder.indexOf(a.stage)
        const bStageIndex = stageOrder.indexOf(b.stage)
        if (aStageIndex !== bStageIndex) {
          return aStageIndex - bStageIndex
        }
        return a.index - b.index
      })
      
      setDeals(allDeals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deals')
    } finally {
      setLoading(prev => ({ ...prev, deals: false }))
    }
  }, [selectedClient])

  const createDeal = useCallback(async (dealData: Partial<Deal>): Promise<Deal | null> => {
    if (!selectedClient) {
      setError('No client selected. Please ensure you are logged in with a valid client assignment.')
      return null
    }
    
    try {
      // Get max index for the stage
      const stageDeals = deals.filter(d => d.stage === (dealData.stage || 'lead'))
      const maxIndex = stageDeals.length > 0 ? Math.max(...stageDeals.map(d => d.index)) + 1 : 0
      
      const { data: created, error: createError } = await db
        .from('crm_deals')
        .insert({ ...dealData, client: selectedClient, index: maxIndex })
        .select()
        .single()
      
      if (createError) {
        const errorMessage = createError.message || createError.details || 'Failed to create deal'
        setError(errorMessage)
        console.error('Create deal error:', createError)
        throw createError
      }
      setDeals(prev => [...prev, created as Deal])
      setError(null)
      return created as Deal
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create deal'
      setError(errorMessage)
      console.error('Create deal exception:', err)
      return null
    }
  }, [selectedClient, deals])

  const updateDeal = useCallback(async (id: string, dealData: Partial<Deal>): Promise<boolean> => {
    // OPTIMISTIC UPDATE: Update local state IMMEDIATELY for instant UI feedback
    const previousDeals = [...deals]
    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...dealData } : d))
    
    try {
      // If this is a deal from engaged leads, update the opportunity and engaged lead
      if (id.startsWith('lead_')) {
        const leadId = id.replace('lead_', '')
        const existingDeal = previousDeals.find(d => d.id === id)
        
        if (!existingDeal || !existingDeal.contact?.email) {
          // Rollback on error
          setDeals(previousDeals)
          setError('Deal or contact not found')
          return false
        }
        
        const email = existingDeal.contact.email.toLowerCase()
        
        // Update or create opportunity in client_opportunities
        if (dealData.amount !== undefined || dealData.stage !== undefined) {
          // Find existing opportunity by email
          const { data: existingOpp } = await db
            .from('client_opportunities')
            .select('id')
            .eq('client', selectedClient)
            .eq('contact_email', email)
            .maybeSingle()
          
          const opportunityData: any = {
            client: selectedClient,
            contact_email: email,
            contact_name: existingDeal.contact.full_name || existingDeal.name || 'Unknown',
            opportunity_name: dealData.name || existingDeal.name,
            value: dealData.amount !== undefined ? Number(dealData.amount) : existingDeal.amount,
            stage: dealData.stage || existingDeal.stage,
          }
          
          if (existingOpp?.id) {
            // Update existing opportunity
            const { error: oppError } = await db
              .from('client_opportunities')
              .update(opportunityData)
              .eq('id', existingOpp.id)
            
            if (oppError) throw oppError
          } else if (opportunityData.value > 0) {
            // Create new opportunity if value > 0
            const { error: oppError } = await db
              .from('client_opportunities')
              .insert(opportunityData)
            
            if (oppError) throw oppError
          }
        }
        
        // Update engaged lead if stage changed (map deal stage to pipeline flags)
        if (dealData.stage) {
          const stageUpdates: any = {
            closed: dealData.stage === 'closed',
            proposal_sent: dealData.stage === 'proposal',
            showed_up_to_demo: dealData.stage === 'demo',
            demo_booked: dealData.stage === 'demo',
            qualified: dealData.stage === 'discovery',
            showed_up_to_disco: dealData.stage === 'discovery',
            meeting_booked: dealData.stage === 'interested',
          }
          
          // Reset all flags first, then set the appropriate one
          const resetFlags = {
            closed: false,
            proposal_sent: false,
            showed_up_to_demo: false,
            demo_booked: false,
            qualified: false,
            showed_up_to_disco: false,
            meeting_booked: false,
          }
          
          await db
            .from('engaged_leads')
            .update({ ...resetFlags, ...stageUpdates })
            .eq('id', leadId)
        }
        
        return true
      }
      
      // Regular deal - update in crm_deals
      const { error: updateError } = await db
        .from('crm_deals')
        .update(dealData)
        .eq('id', id)
      
      if (updateError) throw updateError
      return true
    } catch (err) {
      // Rollback optimistic update on error
      setDeals(previousDeals)
      setError(err instanceof Error ? err.message : 'Failed to update deal')
      return false
    }
  }, [deals, selectedClient])

  const moveDealToStage = useCallback(async (dealId: string, stage: string, index: number): Promise<boolean> => {
    try {
      // If this is a deal from engaged leads, create a new deal in crm_deals
      if (dealId.startsWith('lead_')) {
        const existingDeal = deals.find(d => d.id === dealId)
        
        if (!existingDeal) {
          setError('Deal not found')
          return false
        }
        
        // Get max index for the new stage
        const stageDeals = deals.filter(d => d.stage === stage && !d.id.startsWith('lead_'))
        const maxIndex = stageDeals.length > 0 ? Math.max(...stageDeals.map(d => d.index)) + 1 : 0
        
        // Create new deal in crm_deals
        const newDealData: Partial<Deal> = {
          contact_id: existingDeal.contact_id,
          name: existingDeal.name,
          description: existingDeal.description,
          stage: stage as Deal['stage'],
          amount: existingDeal.amount,
          currency: existingDeal.currency,
          probability: existingDeal.probability,
          expected_close_date: existingDeal.expected_close_date,
          owner_id: existingDeal.owner_id,
          index: maxIndex,
          tags: existingDeal.tags || [],
        }
        
        const { data: created, error: createError } = await db
          .from('crm_deals')
          .insert({ ...newDealData, client: selectedClient })
          .select()
          .single()
        
        if (createError) throw createError
        
        // Replace the lead deal with the new real deal in state
        setDeals(prev => {
          const filtered = prev.filter(d => d.id !== dealId)
          return [...filtered, { ...created as Deal, contact: existingDeal.contact }]
        })
        
        return true
      }
      
      // Regular deal - just update it
      const { error: updateError } = await db
        .from('crm_deals')
        .update({ stage, index })
        .eq('id', dealId)
      
      if (updateError) throw updateError
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: stage as Deal['stage'], index } : d))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move deal')
      return false
    }
  }, [deals, selectedClient])

  const deleteDeal = useCallback(async (id: string): Promise<boolean> => {
    // Deals from engaged leads (prefixed with "lead_") are read-only
    if (id.startsWith('lead_')) {
      setError('This deal is read-only and comes from engaged leads. It cannot be deleted from the deals pipeline.')
      return false
    }
    
    try {
      const { error: deleteError } = await db
        .from('crm_deals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      
      if (deleteError) throw deleteError
      setDeals(prev => prev.filter(d => d.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deal')
      return false
    }
  }, [])

  // ============================================
  // TASKS
  // ============================================
  const fetchTasks = useCallback(async () => {
    if (!selectedClient) return
    setLoading(prev => ({ ...prev, tasks: true }))
    
    try {
      const { data, error: fetchError } = await db
        .from('crm_tasks')
        .select('*')
        .eq('client', selectedClient)
        .order('due_date', { ascending: true, nullsFirst: false })
      
      if (fetchError) throw fetchError
      setTasks((data || []) as Task[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }))
    }
  }, [selectedClient])

  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task | null> => {
    if (!selectedClient) {
      setError('No client selected. Please ensure you are logged in with a valid client assignment.')
      return null
    }
    
    try {
      const { data: created, error: createError } = await db
        .from('crm_tasks')
        .insert({ ...taskData, client: selectedClient })
        .select()
        .single()
      
      if (createError) {
        const errorMessage = createError.message || createError.details || 'Failed to create task'
        setError(errorMessage)
        console.error('Create task error:', createError)
        throw createError
      }
      setTasks(prev => [created as Task, ...prev])
      setError(null)
      return created as Task
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task'
      setError(errorMessage)
      console.error('Create task exception:', err)
      return null
    }
  }, [selectedClient])

  const updateTask = useCallback(async (id: string, taskData: Partial<Task>): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('crm_tasks')
        .update(taskData)
        .eq('id', id)
      
      if (updateError) throw updateError
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...taskData } : t))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
      return false
    }
  }, [])

  const toggleTask = useCallback(async (id: string): Promise<boolean> => {
    const task = tasks.find(t => t.id === id)
    if (!task) return false
    
    const newDone = !task.done
    const updates = {
      done: newDone,
      done_at: newDone ? new Date().toISOString() : null,
    }
    
    return updateTask(id, updates)
  }, [tasks, updateTask])

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await db
        .from('crm_tasks')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      setTasks(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      return false
    }
  }, [])

  // ============================================
  // NOTES
  // ============================================
  const fetchNotes = useCallback(async (
    entityType: 'contact' | 'deal',
    entityId: string
  ): Promise<Note[]> => {
    try {
      const columnMap = {
        contact: 'contact_id',
        deal: 'deal_id',
      }
      
      const { data, error: fetchError } = await db
        .from('crm_notes')
        .select('*')
        .eq(columnMap[entityType], entityId)
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      return (data || []) as Note[]
    } catch {
      return []
    }
  }, [])

  const createNote = useCallback(async (noteData: Partial<Note>): Promise<Note | null> => {
    if (!selectedClient) return null
    
    try {
      const { data: created, error: createError } = await db
        .from('crm_notes')
        .insert({ ...noteData, client: selectedClient })
        .select()
        .single()
      
      if (createError) throw createError
      return created as Note
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
      return null
    }
  }, [selectedClient])

  // ============================================
  // STATS (Using engaged_leads)
  // ============================================
  
  type ContactStatsRow = { 
    stage: string | null
    meeting_booked: boolean
    qualified: boolean
    showed_up_to_disco: boolean
    demo_booked: boolean
    showed_up_to_demo: boolean
    proposal_sent: boolean
    closed: boolean
  }
  type DealStatsRow = { stage: string; amount: number | null; probability: number | null }
  type TaskStatsRow = { done: boolean; due_date: string | null; done_at: string | null }
  
  const fetchStats = useCallback(async () => {
    if (!selectedClient) return
    setLoading(prev => ({ ...prev, stats: true }))
    
    try {
      // Fetch all counts in parallel
      const [contactsRes, dealsRes, tasksRes] = await Promise.all([
        db.from('engaged_leads')
          .select('stage, meeting_booked, qualified, showed_up_to_disco, demo_booked, showed_up_to_demo, proposal_sent, closed')
          .eq('client', selectedClient)
          .is('deleted_at', null),
        db.from('crm_deals').select('stage, amount, probability').eq('client', selectedClient).is('deleted_at', null),
        db.from('crm_tasks').select('done, due_date, done_at').eq('client', selectedClient),
      ])
      
      const contactsData = (contactsRes.data || []) as ContactStatsRow[]
      const dealsData = (dealsRes.data || []) as DealStatsRow[]
      const tasksData = (tasksRes.data || []) as TaskStatsRow[]
      
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Calculate status based on pipeline flags
      const byStatus: Record<string, number> = {
        new: 0,
        engaged: 0,
        meeting_booked: 0,
        qualified: 0,
        demo: 0,
        proposal: 0,
        closed: 0,
      }
      
      const byStage: Record<string, number> = {}
      
      contactsData.forEach(c => {
        // Count by derived status
        if (c.closed) byStatus.closed++
        else if (c.proposal_sent) byStatus.proposal++
        else if (c.showed_up_to_demo || c.demo_booked) byStatus.demo++
        else if (c.qualified) byStatus.qualified++
        else if (c.meeting_booked || c.showed_up_to_disco) byStatus.meeting_booked++
        else if (c.stage && c.stage !== 'new') byStatus.engaged++
        else byStatus.new++
        
        // Count by stage
        const stage = c.stage || 'new'
        byStage[stage] = (byStage[stage] || 0) + 1
      })
      
      const stats: CRMStats = {
        contacts: {
          total: contactsData.length,
          byStatus,
          byStage,
        },
        deals: {
          total: dealsData.length,
          byStage: dealsData.reduce((acc, d) => {
            acc[d.stage] = (acc[d.stage] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          totalValue: dealsData.reduce((sum, d) => sum + (d.amount || 0), 0),
          weightedValue: dealsData.reduce((sum, d) => sum + ((d.amount || 0) * (d.probability || 0) / 100), 0),
          avgDealSize: dealsData.length > 0 
            ? dealsData.reduce((sum, d) => sum + (d.amount || 0), 0) / dealsData.length 
            : 0,
        },
        tasks: {
          total: tasksData.length,
          pending: tasksData.filter(t => !t.done).length,
          overdue: tasksData.filter(t => !t.done && t.due_date && new Date(t.due_date) < now).length,
          completedToday: tasksData.filter(t => t.done && t.done_at && new Date(t.done_at) >= today).length,
        },
        activities: {
          recentCount: 0,
        },
      }
      
      setStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }, [selectedClient])

  // ============================================
  // REFRESH ALL
  // ============================================
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchContacts(),
      fetchDeals(),
      fetchTasks(),
      fetchStats(),
    ])
  }, [fetchContacts, fetchDeals, fetchTasks, fetchStats])

  // Initial fetch
  useEffect(() => {
    if (selectedClient) {
      refreshAll().then(() => {
        setInitialLoadComplete(true)
      })
    }
  }, [selectedClient, refreshAll])

  return (
    <CRMContext.Provider
      value={{
        contacts,
        deals,
        tasks,
        stats,
        loading,
        initialLoadComplete,
        error,
        filters,
        setFilters,
        fetchContacts,
        createContact,
        updateContact,
        deleteContact,
        fetchDeals,
        createDeal,
        updateDeal,
        deleteDeal,
        moveDealToStage,
        fetchTasks,
        createTask,
        updateTask,
        toggleTask,
        deleteTask,
        fetchNotes,
        createNote,
        fetchStats,
        refreshAll,
      }}
    >
      {children}
    </CRMContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================
export function useCRM() {
  const context = useContext(CRMContext)
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider')
  }
  return context
}
