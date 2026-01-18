import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Types
export interface FathomCall {
  id: string
  client: string
  fathom_call_id?: string
  title: string
  call_date?: string
  duration_seconds?: number
  transcript?: string
  summary?: string
  participants: any[]
  action_items: any[]
  call_type: 'tam_map' | 'opportunity_review' | 'messaging_review' | 'general' | 'other'
  status: 'pending' | 'processed' | 'archived'
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface OpportunityMapSegment {
  tier: number
  name: string
  description?: string
  pain_points: string[]
  value_proposition: string
  job_titles: { primary: string[]; champions: string[] }
  signals: string[]
}

export interface OpportunityMap {
  id: string
  client: string
  version: number
  title: string
  status: 'draft' | 'confirmed' | 'archived'
  source_call_ids: string[]
  segments: OpportunityMapSegment[]
  geographies: { tier: number; geography: string; reason: string }[]
  company_size_bands: string[]
  revenue_bands: string[]
  social_proof: {
    case_studies?: string[]
    testimonials?: string[]
    publications?: string[]
    certifications?: string[]
    pilots?: string[]
  }
  campaign_architecture: {
    monthly_volume?: number
    segment_distribution?: Record<string, number>
    month_plans?: any[]
  }
  events_conferences: string[]
  next_steps: string[]
  content_json: Record<string, any>
  pdf_url?: string
  generated_by?: string
  ai_model?: string
  confirmed_at?: string
  confirmed_by?: string
  created_at: string
  updated_at: string
}

export interface KnowledgeBase {
  id: string
  client: string
  company: {
    name?: string
    description?: string
    industry?: string
    size?: string
    website?: string
    founded?: string
    headquarters?: string
  }
  company_people: any[]
  company_offer: {
    products?: string[]
    services?: string[]
    value_props?: string[]
    pricing?: string
  }
  company_competition: any[]
  prospect_companies: Record<string, any>
  prospect_people: Record<string, any>
  copy_structures: any[]
  copy_variables: Record<string, any>
  copy_variable_unique_data: Record<string, any>
  data_quality_assurance: Record<string, any>
  sending_technicalities: Record<string, any>
  last_updated_by?: string
  last_updated_section?: string
  created_at: string
  updated_at: string
}

export interface PlanOfAction {
  id: string
  client: string
  list_building_clay: Record<string, any>
  tables_architecture: any[]
  prompt_injections: any[]
  expected_quality_outputs: any[]
  table_structure: Record<string, any>
  connections: any[]
  implementation_notes?: string
  campaign_plan: Record<string, any>
  tasks: { id: string; title: string; status: string; due_date?: string; assignee?: string }[]
  analysis_surface: any[]
  analysis_effects: any[]
  created_at: string
  updated_at: string
}

export interface ClientStrategyStats {
  hasKnowledgeBase: boolean
  hasOpportunityMap: boolean
  callCount: number
}

// Helper to get table reference without type checking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTable = (name: string) => (supabase as any).from(name)

export function useClientStrategy(selectedClient: string | null) {
  const [fathomCalls, setFathomCalls] = useState<FathomCall[]>([])
  const [opportunityMaps, setOpportunityMaps] = useState<OpportunityMap[]>([])
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [planOfAction, setPlanOfAction] = useState<PlanOfAction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all data for selected client
  const fetchClientData = useCallback(async () => {
    if (!selectedClient) {
      setFathomCalls([])
      setOpportunityMaps([])
      setKnowledgeBase(null)
      setPlanOfAction(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all data in parallel
      const [callsRes, mapsRes, kbRes, poaRes] = await Promise.all([
        getTable('client_fathom_calls')
          .select('*')
          .eq('client', selectedClient)
          .order('call_date', { ascending: false }),
        getTable('client_opportunity_maps')
          .select('*')
          .eq('client', selectedClient)
          .order('version', { ascending: false }),
        getTable('client_knowledge_base')
          .select('*')
          .eq('client', selectedClient)
          .single(),
        getTable('client_plan_of_action')
          .select('*')
          .eq('client', selectedClient)
          .single(),
      ])

      if (callsRes.error && callsRes.error.code !== 'PGRST116') throw callsRes.error
      if (mapsRes.error && mapsRes.error.code !== 'PGRST116') throw mapsRes.error
      // PGRST116 = no rows returned (expected for single())

      setFathomCalls(callsRes.data || [])
      setOpportunityMaps(mapsRes.data || [])
      setKnowledgeBase(kbRes.data || null)
      setPlanOfAction(poaRes.data || null)
    } catch (err) {
      console.error('Error fetching client strategy data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  // CRUD Operations for Fathom Calls
  const addFathomCall = useCallback(async (call: Partial<FathomCall>) => {
    if (!selectedClient) return null
    
    try {
      const { data, error } = await getTable('client_fathom_calls')
        .insert({ ...call, client: selectedClient })
        .select()
        .single()

      if (error) throw error
      setFathomCalls(prev => [data, ...prev])
      return data as FathomCall
    } catch (err) {
      console.error('Error adding Fathom call:', err)
      return null
    }
  }, [selectedClient])

  const updateFathomCall = useCallback(async (id: string, updates: Partial<FathomCall>) => {
    try {
      const { data, error } = await getTable('client_fathom_calls')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setFathomCalls(prev => prev.map(c => c.id === id ? data : c))
      }
      return data as FathomCall
    } catch (err) {
      console.error('Error updating Fathom call:', err)
      return null
    }
  }, [])

  const deleteFathomCall = useCallback(async (id: string) => {
    try {
      const { error } = await getTable('client_fathom_calls')
        .delete()
        .eq('id', id)

      if (error) throw error
      setFathomCalls(prev => prev.filter(c => c.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting Fathom call:', err)
      return false
    }
  }, [])

  // Knowledge Base Operations
  const saveKnowledgeBase = useCallback(async (updates: Partial<KnowledgeBase>) => {
    if (!selectedClient) return null

    try {
      const { data, error } = await getTable('client_knowledge_base')
        .upsert({
          client: selectedClient,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client' })
        .select()
        .single()

      if (error) throw error
      setKnowledgeBase(data)
      return data as KnowledgeBase
    } catch (err) {
      console.error('Error saving knowledge base:', err)
      return null
    }
  }, [selectedClient])

  // Plan of Action Operations
  const savePlanOfAction = useCallback(async (updates: Partial<PlanOfAction>) => {
    if (!selectedClient) return null

    try {
      const { data, error } = await getTable('client_plan_of_action')
        .upsert({
          client: selectedClient,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client' })
        .select()
        .single()

      if (error) throw error
      setPlanOfAction(data)
      return data as PlanOfAction
    } catch (err) {
      console.error('Error saving plan of action:', err)
      return null
    }
  }, [selectedClient])

  // Opportunity Map Operations
  const createOpportunityMap = useCallback(async (map: Partial<OpportunityMap>) => {
    if (!selectedClient) return null

    try {
      // Get next version number from DATABASE (not local state) to avoid stale data
      const { data: existingMaps } = await getTable('client_opportunity_maps')
        .select('version')
        .eq('client', selectedClient)
        .order('version', { ascending: false })
        .limit(1)
      
      const currentVersion = existingMaps && existingMaps.length > 0 ? existingMaps[0].version : 0
      
      const { data, error } = await getTable('client_opportunity_maps')
        .insert({
          ...map,
          client: selectedClient,
          version: currentVersion + 1,
        })
        .select()
        .single()

      if (error) throw error
      setOpportunityMaps(prev => [data, ...prev])
      return data as OpportunityMap
    } catch (err) {
      console.error('Error creating opportunity map:', err)
      return null
    }
  }, [selectedClient])

  const updateOpportunityMap = useCallback(async (id: string, updates: Partial<OpportunityMap>) => {
    try {
      const { data, error } = await getTable('client_opportunity_maps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setOpportunityMaps(prev => prev.map(m => m.id === id ? data : m))
      }
      return data as OpportunityMap
    } catch (err) {
      console.error('Error updating opportunity map:', err)
      return null
    }
  }, [])

  const deleteOpportunityMap = useCallback(async (id: string) => {
    try {
      const { error } = await getTable('client_opportunity_maps')
        .delete()
        .eq('id', id)

      if (error) throw error
      setOpportunityMaps(prev => prev.filter(m => m.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting opportunity map:', err)
      return false
    }
  }, [])

  return {
    // Data
    fathomCalls,
    opportunityMaps,
    knowledgeBase,
    planOfAction,
    loading,
    error,
    
    // Actions
    refetch: fetchClientData,
    addFathomCall,
    updateFathomCall,
    deleteFathomCall,
    saveKnowledgeBase,
    savePlanOfAction,
    createOpportunityMap,
    updateOpportunityMap,
    deleteOpportunityMap,
  }
}

// Hook to get stats for all clients (for the list view)
export function useClientStrategyStats(clients: string[]) {
  const [stats, setStats] = useState<Record<string, ClientStrategyStats>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      if (clients.length === 0) return
      
      setLoading(true)
      try {
        const [callsRes, mapsRes, kbRes] = await Promise.all([
          getTable('client_fathom_calls')
            .select('client')
            .in('client', clients),
          getTable('client_opportunity_maps')
            .select('client')
            .in('client', clients),
          getTable('client_knowledge_base')
            .select('client')
            .in('client', clients),
        ])

        const newStats: Record<string, ClientStrategyStats> = {}
        
        clients.forEach(client => {
          const callCount = (callsRes.data || []).filter((c: any) => c.client === client).length
          const hasOpportunityMap = (mapsRes.data || []).some((m: any) => m.client === client)
          const hasKnowledgeBase = (kbRes.data || []).some((k: any) => k.client === client)
          
          newStats[client] = { callCount, hasOpportunityMap, hasKnowledgeBase }
        })

        setStats(newStats)
      } catch (err) {
        console.error('Error fetching client stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [clients])

  return { stats, loading }
}
