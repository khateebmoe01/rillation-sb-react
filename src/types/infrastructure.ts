// Infrastructure Operational Hub Types

// ============================================
// Inbox Types
// ============================================

export type InboxType = 'google_workspace_oauth' | 'microsoft_oauth' | 'custom'
export type InboxStatus = 'Connected' | 'Not connected' | 'Failed'
export type LifecycleStatus = 'ordered' | 'warming' | 'ready' | 'active' | 'paused' | 'disconnected' | 'canceled'

export interface Inbox {
  id: number
  bison_inbox_id: number
  email: string
  name: string
  client: string
  type: InboxType
  status: InboxStatus
  lifecycle_status: LifecycleStatus
  warmup_enabled: boolean
  warmup_started_at?: string
  warmup_days: number
  warmup_reputation?: number
  deliverability_score?: number
  inbox_set_id?: string
  domain?: string
  assigned_campaign_id?: string
  daily_limit?: number
  emails_sent_count?: number
  total_replied_count?: number
  bounced_count?: number
  provider_inbox_id?: string
  ordered_at?: string
  created_at: string
  updated_at?: string
  synced_at: string
}

// ============================================
// Inbox Set Types
// ============================================

export type InboxSetStatus = 'ordered' | 'warming' | 'ready' | 'deployed' | 'paused' | 'archived'
export type InboxSetProvider = 'google' | 'microsoft' | 'smtp'

export interface InboxSet {
  id: string
  name: string
  client: string
  provider: InboxSetProvider
  domain?: string
  quantity: number
  connected_count: number
  ordered_at: string
  warmup_started_at?: string
  warmup_target_days: number
  status: InboxSetStatus
  avg_warmup_reputation?: number
  avg_deliverability_score?: number
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  // Computed/joined fields
  inboxes?: Inbox[]
  warmup_progress?: number // percentage complete
  days_warming?: number
}

// ============================================
// Domain Inventory Types
// ============================================

export type DomainStatus = 'available' | 'purchased' | 'configured' | 'in_use' | 'expired' | 'reserved'
export type Registrar = 'porkbun' | 'namecheap' | 'godaddy' | 'other'
export type InboxProvider = 'missioninbox' | 'inboxkit' | 'none'

export interface DomainInventory {
  id: string
  domain_name: string
  client?: string
  registrar?: Registrar
  inbox_provider?: InboxProvider
  status: DomainStatus
  purchased_at?: string
  purchase_price?: number
  expires_at?: string
  dns_configured: boolean
  assigned_to_provider_at?: string
  inboxes_ordered: number
  inboxes_active: number
  purchase_batch_id?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  // Computed fields
  days_since_purchase?: number
  needs_action?: boolean // purchased but no inboxes ordered
}

export interface PurchaseBatch {
  id: string
  name?: string
  client: string
  purchased_at: string
  domain_count: number
  total_cost?: number
  registrar?: string
  notes?: string
  created_at: string
  // Joined fields
  domains?: DomainInventory[]
}

// ============================================
// Provider Order Types
// ============================================

export type ProviderOrderStatus = 'draft' | 'exported' | 'submitted' | 'processing' | 'completed' | 'failed'
export type OrderType = 'domains' | 'mailboxes' | 'both'
export type OrderProvider = 'missioninbox' | 'inboxkit'

export interface MailboxConfig {
  first_names: string[]
  last_names: string[]
  password_pattern: string
  warmup: 'ON' | 'OFF'
  inboxes_per_domain: number
  platform?: string // for InboxKit
}

export interface ProviderOrder {
  id: string
  order_ref: string
  provider: OrderProvider
  order_type: OrderType
  client: string
  quantity: number
  domains: string[]
  mailbox_config?: MailboxConfig
  csv_data?: string
  status: ProviderOrderStatus
  exported_at?: string
  submitted_at?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// ============================================
// Domain Generation Types
// ============================================

export interface DomainGenerationTemplate {
  id: string
  name: string
  client?: string
  base_names: string[]
  prefixes: string[]
  suffixes: string[]
  tlds: string[]
  last_used_at?: string
  use_count: number
  created_at: string
  updated_at: string
}

export interface GeneratedDomain {
  domain: string
  prefix?: string
  suffix?: string
  base_name: string
  tld: string
  is_available?: boolean
  is_duplicate?: boolean
  duplicate_source?: 'domain_inventory' | 'inboxes' | 'domains'
  price?: number
}

// ============================================
// CSV Export Types
// ============================================

export interface MissionInboxDomainCSV {
  'IP ProviderName': string
  'Domain Name': string
  'Project': string
  'Redirect URL': string
}

export interface MissionInboxMailboxCSV {
  first_name: string
  last_name: string
  full_email: string
  password: string
  reply_to: string
  warmup: 'ON' | 'OFF'
}

export interface InboxKitDomainCSV {
  domain: string
}

export interface InboxKitMailboxCSV {
  first_name: string
  last_name: string
  username: string
  domain_name: string
  platform: string
  profile_picture: string
}

// ============================================
// Aggregated/Dashboard Types
// ============================================

export interface ClientInfrastructureSummary {
  client: string
  total_inboxes: number
  active_inboxes: number
  warming_inboxes: number
  disconnected_inboxes: number
  inbox_sets_count: number
  domains_count: number
  domains_unused: number
  avg_deliverability: number
  avg_warmup_reputation: number
  needs_attention: boolean
  last_synced?: string
}

export interface InboxHealthMetrics {
  total: number
  connected: number
  disconnected: number
  warming: number
  ready: number
  active: number
  paused: number
  avg_deliverability_score: number
  avg_warmup_reputation: number
  low_health_count: number // deliverability < 70%
}

// ============================================
// Bulk Operation Types
// ============================================

export type BulkActionType = 
  | 'pause_warmup'
  | 'resume_warmup'
  | 'mark_ready'
  | 'mark_deployed'
  | 'mark_paused'
  | 'assign_to_set'
  | 'assign_to_provider'
  | 'export'
  | 'archive'
  | 'delete'

export interface BulkOperation {
  action: BulkActionType
  target_ids: string[]
  target_type: 'inboxes' | 'inbox_sets' | 'domains' | 'orders'
  params?: Record<string, any>
}

// ============================================
// Legacy Types (kept for backward compatibility)
// ============================================

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
