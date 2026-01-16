// API utilities for calling Supabase Edge Functions

import { supabase } from './supabase'

export async function syncDomainsPorkbun() {
  const { data, error } = await supabase.functions.invoke('sync-domains-porkbun')
  if (error) throw error
  return data
}

export async function checkDomainAvailability(domains: string[]) {
  const { data, error } = await supabase.functions.invoke('check-domain-availability', {
    body: { domains },
  })
  if (error) throw error
  return data
}

export async function generateDomains(params: {
  base_name: string
  prefixes?: string[]
  suffixes?: string[]
  client?: string
  check_availability?: boolean
}) {
  const { data, error } = await supabase.functions.invoke('generate-domains', {
    body: params,
  })
  if (error) throw error
  return data
}

export async function orderInboxesBulk(params: {
  provider: string
  quantity: number
  domain_id?: number
  domain?: string
  client?: string
}) {
  const { data, error } = await supabase.functions.invoke('order-inboxes-bulk', {
    body: params,
  })
  if (error) throw error
  return data
}

export async function syncInboxProviders() {
  const { data, error } = await supabase.functions.invoke('sync-inbox-providers')
  if (error) throw error
  return data
}

export async function syncMeetingsBooked() {
  const { data, error } = await supabase.functions.invoke('sync-meetings-booked')
  if (error) throw error
  return data
}

// New: Sync inboxes from EmailBison API
export async function syncInboxesBison() {
  const { data, error } = await supabase.functions.invoke('sync-inboxes-bison')
  if (error) throw error
  return data
}

// Get inbox health metrics for a client
export async function getInboxHealthMetrics(client?: string) {
  let query = supabase
    .from('inboxes')
    .select('status, lifecycle_status, warmup_enabled, deliverability_score, warmup_reputation')

  if (client) {
    query = query.eq('client', client)
  }

  const { data, error } = await query

  if (error) throw error

  const inboxes = (data || []) as any[]
  return {
    total: inboxes.length,
    connected: inboxes.filter(i => i.status === 'Connected').length,
    disconnected: inboxes.filter(i => i.status === 'Not connected').length,
    warming: inboxes.filter(i => i.lifecycle_status === 'warming' || i.warmup_enabled).length,
    avgDeliverability: inboxes.length > 0
      ? inboxes.reduce((sum, i) => sum + (i.deliverability_score || 0), 0) / inboxes.length
      : 0,
    avgWarmupReputation: inboxes.filter(i => i.warmup_reputation).length > 0
      ? inboxes.filter(i => i.warmup_reputation).reduce((sum, i) => sum + (i.warmup_reputation || 0), 0) / inboxes.filter(i => i.warmup_reputation).length
      : 0,
    lowHealthCount: inboxes.filter(i => (i.deliverability_score || 100) < 70).length,
  }
}

// Get last sync time
export async function getLastSyncTime() {
  const { data, error } = await supabase
    .from('inboxes')
    .select('synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return (data as any)?.synced_at
}












