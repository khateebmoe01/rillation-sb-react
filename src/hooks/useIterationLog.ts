import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { dataCache, DataCache } from '../lib/cache'

export interface MentionedUser {
  slack_id: string
  display_name: string
}

export interface IterationLogEntry {
  id: number
  client: string
  action_type: string
  description: string
  created_by: string
  campaign_name?: string
  mentioned_users?: MentionedUser[]
  created_at: string
}

export interface CreateIterationLogEntry {
  client: string
  action_type: string
  description: string
  created_by: string
  campaign_name?: string
  mentioned_users?: MentionedUser[]
}

export interface UseIterationLogParams {
  client?: string
}

// Common action types for iteration logs
export const ACTION_TYPES = [
  'Strategy Change',
  'Copy Update',
  'Targeting Adjustment',
  'Sequence Modification',
  'Campaign Pause',
  'Campaign Launch',
  'A/B Test Started',
  'Performance Review',
  'Client Feedback',
  'Other',
] as const

export function useIterationLog({ client }: UseIterationLogParams = {}) {
  const [logs, setLogs] = useState<IterationLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const hasInitialData = useRef(false)

  const fetchLogs = useCallback(async (isBackgroundRefresh = false) => {
    if (!client) {
      setLogs([])
      setLoading(false)
      return
    }

    const cacheKey = DataCache.createKey('iteration-logs', { client })

    // Try to get cached data first
    if (!isBackgroundRefresh) {
      const cached = dataCache.get<IterationLogEntry[]>(cacheKey)
      if (cached) {
        setLogs(cached.data)
        hasInitialData.current = true
        
        if (!cached.isStale) {
          setLoading(false)
          return
        }
        setLoading(false)
      }
    }

    try {
      if (!hasInitialData.current && !isBackgroundRefresh) {
        setLoading(true)
      }
      setError(null)

      const { data, error: queryError } = await supabase
        .from('client_iteration_logs')
        .select('*')
        .eq('client', client)
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      const logsData = (data || []) as IterationLogEntry[]
      setLogs(logsData)
      hasInitialData.current = true

      // Cache the results
      dataCache.set(cacheKey, logsData)
    } catch (err) {
      // If table doesn't exist, just return empty array
      if (err instanceof Error && err.message.includes('relation')) {
        setLogs([])
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch iteration logs')
      }
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const addLog = useCallback(async (entry: CreateIterationLogEntry): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      // Build insert data - conditionally include new columns if they have values
      // This allows the code to work even if migration hasn't been applied yet
      const insertData: any = {
        client: entry.client,
        action_type: entry.action_type,
        description: entry.description,
        created_by: entry.created_by,
      }
      
      // Only include new columns if they have values (columns may not exist yet if migration not applied)
      if (entry.campaign_name) {
        insertData.campaign_name = entry.campaign_name
      }
      if (entry.mentioned_users && entry.mentioned_users.length > 0) {
        insertData.mentioned_users = entry.mentioned_users
      }
      
      let { error: insertError } = await supabase
        .from('client_iteration_logs')
        .insert(insertData)

      // If columns don't exist yet (migration not applied), retry without new columns
      if (insertError && (insertError.message.includes('column "campaign_name"') || insertError.message.includes('column "mentioned_users"'))) {
        console.warn('New columns not found, inserting without them. Please run the migration!')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallbackData: any = {
          client: entry.client,
          action_type: entry.action_type,
          description: entry.description,
          created_by: entry.created_by,
        }
        const retryResult = await supabase
          .from('client_iteration_logs')
          .insert(fallbackData)
        insertError = retryResult.error
      }

      if (insertError) throw insertError

      // Send Slack notification if there are mentioned users
      if (entry.mentioned_users && entry.mentioned_users.length > 0) {
        try {
          console.log('Sending Slack notification with mentioned users:', entry.mentioned_users)
          const { data, error: slackErr } = await supabase.functions.invoke('slack-notify', {
            body: {
              client: entry.client,
              campaign_name: entry.campaign_name,
              action_type: entry.action_type,
              description: entry.description,
              created_by: entry.created_by,
              mentioned_users: entry.mentioned_users,
            },
          })
          
          if (slackErr) {
            console.error('Slack notification error:', slackErr)
          } else if (data) {
            console.log('Slack notification response:', data)
            if (data.error) {
              console.error('Slack notification failed:', data.error)
            } else if (data.sent) {
              console.log('Slack notification sent successfully')
            }
          }
        } catch (slackErr) {
          // Log but don't fail the operation if Slack notification fails
          console.error('Failed to send Slack notification:', slackErr)
        }
      } else {
        console.log('No mentioned users to notify')
      }

      // Invalidate cache and refetch
      if (client) {
        const cacheKey = DataCache.createKey('iteration-logs', { client })
        dataCache.invalidate(cacheKey)
      }
      await fetchLogs(false)
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Failed to add iteration log:', errorMessage, err)
      setError(errorMessage || 'Failed to add iteration log')
      return false
    } finally {
      setSaving(false)
    }
  }, [client, fetchLogs])

  const deleteLog = useCallback(async (logId: number): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('client_iteration_logs')
        .delete()
        .eq('id', logId)

      if (deleteError) throw deleteError

      // Invalidate cache and refetch
      if (client) {
        const cacheKey = DataCache.createKey('iteration-logs', { client })
        dataCache.invalidate(cacheKey)
      }
      await fetchLogs(false)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete iteration log')
      return false
    } finally {
      setSaving(false)
    }
  }, [client, fetchLogs])

  const refetch = useCallback(() => {
    if (client) {
      const cacheKey = DataCache.createKey('iteration-logs', { client })
      dataCache.invalidate(cacheKey)
    }
    return fetchLogs(false)
  }, [fetchLogs, client])

  return { 
    logs, 
    loading, 
    error, 
    saving,
    addLog, 
    deleteLog,
    refetch 
  }
}

