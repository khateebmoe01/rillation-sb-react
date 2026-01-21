import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import { useFilters } from '../../../contexts/FilterContext'
import type { Contact, Deal, Task, Note, CRMStats, CRMFilters } from '../types'

// Create an untyped supabase client for CRM tables that aren't in the generated types
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
  
  // Errors
  error: string | null
  
  // Filters
  filters: CRMFilters
  setFilters: (filters: CRMFilters) => void
  
  // CRUD - Contacts
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
  const { selectedClient } = useFilters()
  
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
  
  // Filters
  const [filters, setFilters] = useState<CRMFilters>({})

  // ============================================
  // CONTACTS
  // ============================================
  const fetchContacts = useCallback(async () => {
    if (!selectedClient) return
    setLoading(prev => ({ ...prev, contacts: true }))
    
    try {
      const { data, error: fetchError } = await db
        .from('crm_contacts')
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
    
    // Check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('You are not authenticated. Please log in again.')
      return null
    }
    
    try {
      console.log('Creating contact with client:', selectedClient, 'data:', contactData)
      const { data: created, error: createError } = await db
        .from('crm_contacts')
        .insert({ ...contactData, client: selectedClient })
        .select()
        .single()
      
      if (createError) {
        const errorMessage = createError.message || createError.details || 'Failed to create contact'
        setError(errorMessage)
        console.error('Create contact error:', createError)
        throw createError
      }
      setContacts(prev => [created as Contact, ...prev])
      setError(null) // Clear error on success
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
      const { error: updateError } = await db
        .from('crm_contacts')
        .update(contactData)
        .eq('id', id)
      
      if (updateError) throw updateError
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...contactData } : c))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact')
      return false
    }
  }, [])

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Soft delete
      const { error: deleteError } = await db
        .from('crm_contacts')
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
      const { data, error: fetchError } = await db
        .from('crm_deals')
        .select('*')
        .eq('client', selectedClient)
        .is('deleted_at', null)
        .order('index', { ascending: true })
      
      if (fetchError) throw fetchError
      setDeals((data || []) as Deal[])
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
      setError(null) // Clear error on success
      return created as Deal
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create deal'
      setError(errorMessage)
      console.error('Create deal exception:', err)
      return null
    }
  }, [selectedClient, deals])

  const updateDeal = useCallback(async (id: string, dealData: Partial<Deal>): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('crm_deals')
        .update(dealData)
        .eq('id', id)
      
      if (updateError) throw updateError
      setDeals(prev => prev.map(d => d.id === id ? { ...d, ...dealData } : d))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deal')
      return false
    }
  }, [])

  const moveDealToStage = useCallback(async (dealId: string, stage: string, index: number): Promise<boolean> => {
    try {
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
  }, [])

  const deleteDeal = useCallback(async (id: string): Promise<boolean> => {
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
      setError(null) // Clear error on success
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
  // STATS
  // ============================================
  
  // Type definitions for stats queries
  type ContactStatsRow = { status: string; stage: string | null }
  type DealStatsRow = { stage: string; amount: number | null; probability: number | null }
  type TaskStatsRow = { done: boolean; due_date: string | null; done_at: string | null }
  
  const fetchStats = useCallback(async () => {
    if (!selectedClient) return
    setLoading(prev => ({ ...prev, stats: true }))
    
    try {
      // Fetch all counts in parallel
      const [contactsRes, dealsRes, tasksRes] = await Promise.all([
        db.from('crm_contacts').select('status, stage').eq('client', selectedClient).is('deleted_at', null),
        db.from('crm_deals').select('stage, amount, probability').eq('client', selectedClient).is('deleted_at', null),
        db.from('crm_tasks').select('done, due_date, done_at').eq('client', selectedClient),
      ])
      
      const contactsData = (contactsRes.data || []) as ContactStatsRow[]
      const dealsData = (dealsRes.data || []) as DealStatsRow[]
      const tasksData = (tasksRes.data || []) as TaskStatsRow[]
      
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      const stats: CRMStats = {
        contacts: {
          total: contactsData.length,
          byStatus: contactsData.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          byStage: contactsData.reduce((acc, c) => {
            const stage = c.stage || 'new'
            acc[stage] = (acc[stage] || 0) + 1
            return acc
          }, {} as Record<string, number>),
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
          recentCount: 0, // Would need to fetch from notes
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
      refreshAll()
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
