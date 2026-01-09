import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { CRMContact, CRMFilters, CRMSort } from '../types/crm'

interface UseCRMContactsOptions {
  filters?: CRMFilters
  sort?: CRMSort
}

interface UseCRMContactsReturn {
  contacts: CRMContact[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateContact: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
  createContact: (contact: Partial<CRMContact>) => Promise<CRMContact | null>
  deleteContact: (id: string) => Promise<boolean>
  updateStage: (id: string, stage: string) => Promise<boolean>
  updateEstimatedValue: (contact: CRMContact, value: number) => Promise<boolean>
  // Grouped by stage for kanban
  contactsByStage: Record<string, CRMContact[]>
  // Unique values for filters
  uniqueAssignees: string[]
  uniqueStages: string[]
}

const CLIENT = 'Rillation Revenue'

export function useCRMContacts(options: UseCRMContactsOptions = {}): UseCRMContactsReturn {
  const { filters, sort } = options
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Serialize filters and sort for stable dependency
  const filterKey = useMemo(() => JSON.stringify({
    stage: filters?.stage,
    assignee: filters?.assignee,
    leadSource: filters?.leadSource,
    search: filters?.search,
    dateRange: filters?.dateRange ? {
      start: filters.dateRange.start.toISOString(),
      end: filters.dateRange.end.toISOString(),
    } : null,
  }), [filters?.stage, filters?.assignee, filters?.leadSource, filters?.search, filters?.dateRange])

  const sortKey = useMemo(() => JSON.stringify(sort), [sort])

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('engaged_leads')
        .select('*')
        .eq('client', CLIENT)

      // Apply filters
      if (filters?.stage && filters.stage.length > 0) {
        query = query.in('stage', filters.stage)
      }
      if (filters?.assignee) {
        query = query.eq('assignee', filters.assignee)
      }
      if (filters?.leadSource) {
        query = query.eq('lead_source', filters.leadSource)
      }
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm},company.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
      }
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString())
      }

      // Apply sorting
      if (sort) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Fetch opportunities to get estimated values
      const { data: opportunities } = await supabase
        .from('client_opportunities')
        .select('id, contact_email, value, stage')
        .eq('client', CLIENT)

      // Create a map of email -> opportunity for quick lookup
      const opportunityMap = new Map<string, { id: string; value: number; stage: string }>()
      ;(opportunities || []).forEach((opp: any) => {
        if (opp.contact_email) {
          // Use the highest value if multiple opportunities exist
          const existing = opportunityMap.get(opp.contact_email)
          if (!existing || (opp.value || 0) > existing.value) {
            opportunityMap.set(opp.contact_email, {
              id: opp.id,
              value: opp.value || 0,
              stage: opp.stage,
            })
          }
        }
      })

      // Transform data - ensure full_name exists and merge opportunity values
      const transformedData = (data || []).map((contact: any) => {
        const opportunity = opportunityMap.get(contact.email)
        return {
          ...contact,
          full_name: contact.full_name || 
            [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 
            contact.email?.split('@')[0] || 
            'Unknown',
          stage: contact.stage || 'new',
          estimated_value: opportunity?.value || 0,
          opportunity_id: opportunity?.id || null,
        }
      })

      setContacts(transformedData)
    } catch (err) {
      console.error('Error fetching CRM contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, sortKey])

  // Initial fetch - only once on mount, then when filters change
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Update a contact
  const updateContact = useCallback(async (id: string, updates: Partial<CRMContact>): Promise<boolean> => {
    // Optimistic update
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))

    try {
      const { error: updateError } = await (supabase
        .from('engaged_leads') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (err) {
      console.error('Error updating contact:', err)
      // Revert optimistic update
      await fetchContacts()
      return false
    }
  }, [fetchContacts])

  // Update stage specifically (for drag and drop)
  const updateStage = useCallback(async (id: string, stage: string): Promise<boolean> => {
    return updateContact(id, { stage })
  }, [updateContact])

  // Create a new contact
  const createContact = useCallback(async (contact: Partial<CRMContact>): Promise<CRMContact | null> => {
    try {
      const newContact = {
        ...contact,
        client: CLIENT,
        stage: contact.stage || 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error: insertError } = await (supabase
        .from('engaged_leads') as any)
        .insert(newContact)
        .select()
        .single()

      if (insertError) throw insertError

      // Add to local state
      setContacts(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating contact:', err)
      return null
    }
  }, [])

  // Delete a contact
  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    // Optimistic update
    setContacts(prev => prev.filter(c => c.id !== id))

    try {
      const { error: deleteError } = await supabase
        .from('engaged_leads')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      return true
    } catch (err) {
      console.error('Error deleting contact:', err)
      await fetchContacts()
      return false
    }
  }, [fetchContacts])

  // Group contacts by stage for kanban view
  const contactsByStage = useMemo(() => {
    const grouped: Record<string, CRMContact[]> = {}
    
    contacts.forEach(contact => {
      const stage = contact.stage || 'new'
      if (!grouped[stage]) {
        grouped[stage] = []
      }
      grouped[stage].push(contact)
    })

    return grouped
  }, [contacts])

  // Get unique values for filter dropdowns
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>()
    contacts.forEach(c => {
      if (c.assignee) assignees.add(c.assignee)
    })
    return Array.from(assignees).sort()
  }, [contacts])

  const uniqueStages = useMemo(() => {
    const stages = new Set<string>()
    contacts.forEach(c => {
      if (c.stage) stages.add(c.stage)
    })
    return Array.from(stages)
  }, [contacts])

  // Update estimated value (creates/updates/deletes in client_opportunities)
  const updateEstimatedValue = useCallback(async (contact: CRMContact, value: number): Promise<boolean> => {
    // Optimistic update
    setContacts(prev => prev.map(c => 
      c.id === contact.id ? { ...c, estimated_value: value } : c
    ))

    try {
      if (value === 0 && contact.opportunity_id) {
        // Delete the opportunity if value is 0
        const { error: deleteError } = await supabase
          .from('client_opportunities')
          .delete()
          .eq('id', contact.opportunity_id)
        
        if (deleteError) throw deleteError
        
        // Update local state to remove opportunity_id
        setContacts(prev => prev.map(c => 
          c.id === contact.id ? { ...c, estimated_value: 0, opportunity_id: undefined } : c
        ))
      } else if (value > 0 && contact.opportunity_id) {
        // Update existing opportunity
        const { error: updateError } = await (supabase
          .from('client_opportunities') as any)
          .update({ value, updated_at: new Date().toISOString() })
          .eq('id', contact.opportunity_id)
        
        if (updateError) throw updateError
      } else if (value > 0) {
        // Create new opportunity
        const { data: newOpp, error: insertError } = await (supabase
          .from('client_opportunities') as any)
          .insert({
            client: CLIENT,
            contact_email: contact.email,
            contact_name: contact.full_name || contact.email,
            stage: contact.stage || 'new',
            value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        
        if (insertError) throw insertError
        
        // Update local state with new opportunity_id
        if (newOpp?.id) {
          setContacts(prev => prev.map(c => 
            c.id === contact.id ? { ...c, estimated_value: value, opportunity_id: newOpp.id } : c
          ))
        }
      }
      
      return true
    } catch (err) {
      console.error('Error updating estimated value:', err)
      // Revert optimistic update
      await fetchContacts()
      return false
    }
  }, [fetchContacts])

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts,
    updateContact,
    createContact,
    deleteContact,
    updateStage,
    updateEstimatedValue,
    contactsByStage,
    uniqueAssignees,
    uniqueStages,
  }
}
