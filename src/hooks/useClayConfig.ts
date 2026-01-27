import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ClayClientConfig, ClayWorkbookTemplate, ClayExecutionLog } from '../types/database'

// Fetch client's Clay configuration
async function fetchClayConfig(client: string): Promise<ClayClientConfig | null> {
  const { data, error } = await (supabase as any)
    .from('clay_client_configs')
    .select('*')
    .eq('client', client)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data as ClayClientConfig | null
}

// Fetch all workbook templates
async function fetchTemplates(): Promise<ClayWorkbookTemplate[]> {
  const { data, error } = await (supabase as any)
    .from('clay_workbook_templates')
    .select('*')
    .order('name')

  if (error) throw error
  return (data as ClayWorkbookTemplate[]) || []
}

// Fetch execution logs for a client
async function fetchExecutionLogs(client?: string): Promise<ClayExecutionLog[]> {
  let query = (supabase as any)
    .from('clay_execution_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50)

  if (client) {
    query = query.eq('client', client)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as ClayExecutionLog[]) || []
}

// Save/update client configuration
async function saveClayConfig(config: Partial<ClayClientConfig> & { client: string }): Promise<ClayClientConfig> {
  const payload = {
    client: config.client,
    workspace_id: config.workspace_id,
    workbook_mappings: config.workbook_mappings || {},
    table_configs: config.table_configs || [],
    column_prompts: config.column_prompts || {},
    sync_settings: config.sync_settings || {},
    saved_searches: config.saved_searches || [],
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await (supabase as any)
    .from('clay_client_configs')
    .upsert(payload, { onConflict: 'client' })
    .select()
    .single()

  if (error) throw error
  return data as ClayClientConfig
}

// Hook for client Clay configuration
export function useClayConfig(client?: string) {
  const queryClient = useQueryClient()

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['clay-config', client],
    queryFn: () => fetchClayConfig(client!),
    enabled: !!client,
  })

  const { mutate: saveConfig, isPending: isSaving } = useMutation({
    mutationFn: saveClayConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clay-config', client] })
    },
  })

  return {
    config,
    loading: isLoading,
    error: error?.message,
    saveConfig,
    isSaving,
  }
}

// Hook for workbook templates
export function useClayTemplates() {
  const queryClient = useQueryClient()

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['clay-templates'],
    queryFn: fetchTemplates,
  })

  const { mutate: createTemplate } = useMutation({
    mutationFn: async (template: { name: string; description?: string; table_configs: unknown[] }) => {
      const { data, error } = await (supabase as any)
        .from('clay_workbook_templates')
        .insert({
          name: template.name,
          description: template.description,
          table_configs: template.table_configs,
        })
        .select()
        .single()
      if (error) throw error
      return data as ClayWorkbookTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clay-templates'] })
    },
  })

  return {
    templates,
    loading: isLoading,
    error: error?.message,
    createTemplate,
  }
}

// Hook for execution logs
export function useClayExecutionLogs(client?: string) {
  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['clay-execution-logs', client],
    queryFn: () => fetchExecutionLogs(client),
    refetchInterval: 10000, // Refresh every 10 seconds for active logs
  })

  return {
    logs,
    loading: isLoading,
    error: error?.message,
    refetch,
  }
}
