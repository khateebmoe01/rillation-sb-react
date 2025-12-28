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












