// Atomic CRM Types - Based on Marmelab's Atomic CRM

// ============================================
// COMPANY
// ============================================
export interface Company {
  id: string
  client: string
  name: string
  logo_url: string | null
  website: string | null
  linkedin_url: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  industry: string | null
  sector: string | null
  company_size: string | null
  annual_revenue: string | null
  year_founded: number | null
  size_category: SizeCategory | null
  revenue_category: RevenueCategory | null
  status: CompanyStatus
  tags: string[]
  created_at: string
  updated_at: string
  created_by: string | null
  
  // Computed / joined
  _count?: {
    contacts: number
    deals: number
  }
}

export type CompanyStatus = 'prospect' | 'lead' | 'customer' | 'partner' | 'churned' | 'inactive'
export type SizeCategory = '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1001-5000' | '5000+'
export type RevenueCategory = '0-1M' | '1M-10M' | '10M-50M' | '50M-100M' | '100M-500M' | '500M+'

// ============================================
// CONTACT
// ============================================
export interface Contact {
  id: string
  client: string
  company_id: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  title: string | null
  department: string | null
  linkedin_url: string | null
  status: ContactStatus
  last_contacted_at: string | null
  lead_source: string | null
  campaign_name: string | null
  campaign_id: string | null
  background: string | null
  tags: string[]
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
  
  // Joined
  company?: Company
}

export type ContactStatus = 'cold' | 'warm' | 'hot' | 'in-contract' | 'customer' | 'inactive'

// ============================================
// DEAL
// ============================================
export interface Deal {
  id: string
  client: string
  company_id: string | null
  contact_id: string | null
  name: string
  description: string | null
  stage: DealStage
  amount: number
  currency: string
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  close_reason: string | null
  owner_id: string | null
  index: number
  tags: string[]
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
  
  // Joined
  company?: Company
  contact?: Contact
}

export type DealStage = 'lead' | 'qualification' | 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost'

export const DEAL_STAGES: DealStage[] = [
  'lead',
  'qualification',
  'discovery',
  'demo',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

export const DEAL_STAGE_INFO: Record<DealStage, { label: string; color: string; bgColor: string; probability: number }> = {
  lead: { label: 'Lead', color: '#94a3b8', bgColor: '#1e293b', probability: 10 },
  qualification: { label: 'Qualification', color: '#60a5fa', bgColor: '#1e3a5f', probability: 20 },
  discovery: { label: 'Discovery', color: '#a78bfa', bgColor: '#3d2f5c', probability: 30 },
  demo: { label: 'Demo', color: '#fbbf24', bgColor: '#422006', probability: 50 },
  proposal: { label: 'Proposal', color: '#fb923c', bgColor: '#431407', probability: 70 },
  negotiation: { label: 'Negotiation', color: '#2dd4bf', bgColor: '#134e4a', probability: 85 },
  won: { label: 'Won', color: '#22c55e', bgColor: '#14532d', probability: 100 },
  lost: { label: 'Lost', color: '#f87171', bgColor: '#450a0a', probability: 0 },
}

// ============================================
// TASK
// ============================================
export interface Task {
  id: string
  client: string
  company_id: string | null
  contact_id: string | null
  deal_id: string | null
  type: TaskType
  text: string
  due_date: string | null
  done: boolean
  done_at: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  
  // Joined
  company?: Company
  contact?: Contact
  deal?: Deal
}

export type TaskType = 'task' | 'call' | 'email' | 'meeting' | 'follow_up' | 'reminder'

export const TASK_TYPE_INFO: Record<TaskType, { label: string; icon: string; color: string }> = {
  task: { label: 'Task', icon: 'CheckSquare', color: '#94a3b8' },
  call: { label: 'Call', icon: 'Phone', color: '#22c55e' },
  email: { label: 'Email', icon: 'Mail', color: '#60a5fa' },
  meeting: { label: 'Meeting', icon: 'Calendar', color: '#a78bfa' },
  follow_up: { label: 'Follow Up', icon: 'RotateCcw', color: '#fbbf24' },
  reminder: { label: 'Reminder', icon: 'Bell', color: '#fb923c' },
}

// ============================================
// NOTE / ACTIVITY
// ============================================
export interface Note {
  id: string
  client: string
  company_id: string | null
  contact_id: string | null
  deal_id: string | null
  text: string
  type: NoteType
  created_at: string
  updated_at: string
  created_by: string | null
  attachments: Attachment[]
  
  // Joined
  company?: Company
  contact?: Contact
  deal?: Deal
}

export type NoteType = 'note' | 'email' | 'call' | 'meeting' | 'status_change' | 'deal_created' | 'deal_won' | 'deal_lost' | 'task_completed'

export interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

// ============================================
// TAG
// ============================================
export interface Tag {
  id: string
  client: string
  name: string
  color: string
  entity_type: 'company' | 'contact' | 'deal'
  created_at: string
}

// ============================================
// CRM DASHBOARD STATS
// ============================================
export interface CRMStats {
  companies: {
    total: number
    byStatus: Record<CompanyStatus, number>
  }
  contacts: {
    total: number
    byStatus: Record<ContactStatus, number>
  }
  deals: {
    total: number
    byStage: Record<DealStage, number>
    totalValue: number
    weightedValue: number
    avgDealSize: number
  }
  tasks: {
    total: number
    pending: number
    overdue: number
    completedToday: number
  }
  activities: {
    recentCount: number
  }
}

// ============================================
// FILTER & SORT OPTIONS
// ============================================
export interface CRMFilters {
  search?: string
  status?: string
  stage?: string
  company_id?: string
  contact_id?: string
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

export type SortDirection = 'asc' | 'desc'
export interface SortOption {
  field: string
  direction: SortDirection
}

// ============================================
// VIEW OPTIONS
// ============================================
export type ViewMode = 'list' | 'kanban' | 'grid'
