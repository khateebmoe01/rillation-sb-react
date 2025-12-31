// Infrastructure Operational Hub Types

export interface Domain {
  id?: number
  domain: string
  provider: string
  client?: string
  registered_date?: string
  expiry_date?: string
  dns_configured?: boolean
  health_status?: string
  created_at?: string
  updated_at?: string
}

export interface DomainGeneration {
  id?: number
  base_name: string
  prefixes?: string[]
  suffixes?: string[]
  client?: string
  generated_count?: number
  created_at?: string
}

export interface DomainAvailabilityCheck {
  id?: number
  domain: string
  available: boolean
  price?: number
  checked_at: string
  expires_at?: string
}

export interface InboxOrder {
  id?: number
  provider: string
  quantity: number
  domain_id?: number
  domain?: string
  client?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  cost?: number
  order_id?: string
  created_at?: string
  updated_at?: string
}

export interface InboxProvider {
  id?: number
  name: string
  api_key?: string
  api_secret?: string
  workspace_id?: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface InboxAnalytics {
  id?: number
  inbox_id?: number
  client?: string
  provider?: string
  deliverability_score?: number
  emails_sent?: number
  emails_delivered?: number
  date: string
  created_at?: string
}

export interface DomainProvider {
  id?: number
  name: string
  api_key?: string
  api_secret?: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}















