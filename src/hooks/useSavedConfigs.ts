import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { SavedConfig } from '../components/clay/workbook-builder'
import type { WorkbookConfig } from '../components/clay/workbook-builder'

interface UseSavedConfigsReturn {
  configs: SavedConfig[]
  recentConfigs: SavedConfig[]
  loading: boolean
  saveConfig: (name: string, type: SavedConfig['type'], config: Partial<WorkbookConfig>) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  loadConfig: (config: SavedConfig) => void
  refetch: () => Promise<void>
}

export function useSavedConfigs(
  client: string | null,
  onLoad?: (config: Partial<WorkbookConfig>) => void
): UseSavedConfigsReturn {
  const [configs, setConfigs] = useState<SavedConfig[]>([])
  const [recentConfigs, setRecentConfigs] = useState<SavedConfig[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConfigs = useCallback(async () => {
    if (!client) {
      setConfigs([])
      setRecentConfigs([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('clay_saved_configs')
        .select('*')
        .eq('client', client)
        .order('created_at', { ascending: false })

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedConfigs: SavedConfig[] = ((data as any[]) || []).map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type as SavedConfig['type'],
        config: {
          sourceConfig: { filters: row.search_filters, maxRows: 100 },
          qualificationColumns: row.ce_columns || [],
        },
        created_at: row.created_at,
        usage_count: row.usage_count || 0,
      }))

      // Split into recent (last 5 used) and all saved
      const sorted = [...formattedConfigs].sort((a, b) => {
        const aUsage = a.usage_count || 0
        const bUsage = b.usage_count || 0
        return bUsage - aUsage
      })

      setConfigs(formattedConfigs)
      setRecentConfigs(sorted.slice(0, 3))
    } catch (err) {
      console.error('Error fetching saved configs:', err)
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const saveConfig = useCallback(
    async (name: string, type: SavedConfig['type'], config: Partial<WorkbookConfig>) => {
      if (!client) return

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('clay_saved_configs') as any).insert({
          name,
          client,
          type,
          search_filters: config.sourceConfig?.filters || null,
          ce_columns: config.qualificationColumns || null,
        })

        if (error) throw error

        await fetchConfigs()
      } catch (err) {
        console.error('Error saving config:', err)
      }
    },
    [client, fetchConfigs]
  )

  const deleteConfig = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('clay_saved_configs').delete().eq('id', id)

        if (error) throw error

        setConfigs((prev) => prev.filter((c) => c.id !== id))
        setRecentConfigs((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        console.error('Error deleting config:', err)
      }
    },
    []
  )

  const loadConfig = useCallback(
    (config: SavedConfig) => {
      // Increment usage count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('clay_saved_configs') as any)
        .update({ usage_count: (config.usage_count || 0) + 1, last_used_at: new Date().toISOString() })
        .eq('id', config.id)
        .then()

      if (onLoad) {
        onLoad(config.config)
      }
    },
    [onLoad]
  )

  return {
    configs,
    recentConfigs,
    loading,
    saveConfig,
    deleteConfig,
    loadConfig,
    refetch: fetchConfigs,
  }
}

export default useSavedConfigs
