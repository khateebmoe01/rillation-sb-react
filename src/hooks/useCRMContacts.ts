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

      // Transform data - ensure full_name exists
      const transformedData = (data || []).map((contact: any) => ({
        ...contact,
        full_name: contact.full_name || 
          [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 
          contact.email?.split('@')[0] || 
          'Unknown',
        stage: contact.stage || 'new',
      }))

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

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts,
    updateContact,
    createContact,
    deleteContact,
    updateStage,
    contactsByStage,
    uniqueAssignees,
    uniqueStages,
  }
}
