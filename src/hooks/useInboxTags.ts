import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { tables } from '../lib/supabase-helpers'

export interface InboxTag {
  id: string
  bison_tag_id: number
  name: string
  client: string
  inbox_count: number
  is_default: boolean
  synced_at?: string
  created_at: string
  updated_at?: string
}

interface UseInboxTagsParams {
  client?: string
}

export function useInboxTags({ client }: UseInboxTagsParams = {}) {
  const [tags, setTags] = useState<InboxTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = tables.inbox_tags()
        .select('*')
        .order('name')

      if (client) {
        query = query.eq('client', client)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const tagsData = (data || []) as InboxTag[]
      
      // Calculate actual inbox counts from assignments (fetch all at once for efficiency)
      if (tagsData.length > 0) {
        const tagIds = tagsData.map(t => t.id)
        const { data: allAssignments } = await tables.inbox_tag_assignments()
          .select('tag_id')
          .in('tag_id', tagIds)

        // Count assignments per tag
        const countsByTagId = new Map<string, number>()
        if (allAssignments) {
          for (const assignment of allAssignments as any[]) {
            const tagId = assignment.tag_id
            countsByTagId.set(tagId, (countsByTagId.get(tagId) || 0) + 1)
          }
        }

        // Merge counts into tags
        const tagsWithCounts = tagsData.map(tag => ({
          ...tag,
          inbox_count: countsByTagId.get(tag.id) || 0,
        }))

        setTags(tagsWithCounts)
      } else {
        setTags(tagsData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Trigger sync from Bison API
  const syncTags = async () => {
    try {
      await supabase.functions.invoke('sync-inbox-tags')
      // Refetch after a delay to allow background processing
      setTimeout(fetchTags, 2000)
      return { ok: true, message: 'Sync started in background' }
    } catch (err) {
      throw err
    }
  }

  // Create a new tag (syncs to Bison)
  const createTag = async (clientName: string, tagName: string) => {
    const { data, error } = await supabase.functions.invoke('manage-inbox-tags', {
      body: {
        action: 'create',
        client: clientName,
        tag_name: tagName,
      }
    })

    if (error) throw error
    await fetchTags()
    return data
  }

  // Delete a tag (syncs to Bison)
  const deleteTag = async (clientName: string, tagId: string) => {
    const { data, error } = await supabase.functions.invoke('manage-inbox-tags', {
      body: {
        action: 'delete',
        client: clientName,
        tag_id: tagId,
      }
    })

    if (error) throw error
    await fetchTags()
    return data
  }

  // Attach tags to inboxes (syncs to Bison)
  const attachTags = async (clientName: string, tagIds: string[], inboxIds: number[]) => {
    const { data, error } = await supabase.functions.invoke('manage-inbox-tags', {
      body: {
        action: 'attach',
        client: clientName,
        tag_ids: tagIds,
        inbox_ids: inboxIds,
      }
    })

    if (error) throw error
    return data
  }

  // Detach tags from inboxes (syncs to Bison)
  const detachTags = async (clientName: string, tagIds: string[], inboxIds: number[]) => {
    const { data, error } = await supabase.functions.invoke('manage-inbox-tags', {
      body: {
        action: 'detach',
        client: clientName,
        tag_ids: tagIds,
        inbox_ids: inboxIds,
      }
    })

    if (error) throw error
    return data
  }

  // Get tags for a specific client
  const getTagsByClient = useCallback((clientName: string) => {
    return tags.filter(t => t.client === clientName)
  }, [tags])

  // Get total inbox count across all tags for a client
  const getTotalTaggedInboxes = useCallback((clientName: string) => {
    return tags
      .filter(t => t.client === clientName)
      .reduce((sum, t) => sum + t.inbox_count, 0)
  }, [tags])

  return {
    tags,
    loading,
    error,
    refetch: fetchTags,
    syncTags,
    createTag,
    deleteTag,
    attachTags,
    detachTags,
    getTagsByClient,
    getTotalTaggedInboxes,
  }
}

// Hook for getting inboxes by tag
export function useInboxesByTag(tagId: string | undefined) {
  const [inboxes, setInboxes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tagId) {
      setInboxes([])
      return
    }

    const fetchInboxes = async () => {
      setLoading(true)
      
      // Get inbox IDs from assignments
      const { data: assignments } = await tables.inbox_tag_assignments()
        .select('inbox_id')
        .eq('tag_id', tagId)

      if (assignments && assignments.length > 0) {
        const inboxIds = assignments.map((a: any) => a.inbox_id)
        
        const { data: inboxData } = await supabase
          .from('inboxes')
          .select('*')
          .in('id', inboxIds)
          .order('email')

        setInboxes(inboxData || [])
      } else {
        setInboxes([])
      }
      
      setLoading(false)
    }

    fetchInboxes()
  }, [tagId])

  return { inboxes, loading }
}
