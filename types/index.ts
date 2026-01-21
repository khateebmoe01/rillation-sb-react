// Atomic CRM Types - Updated with merged company fields

// ============================================
// CONTACT (Now includes company fields)
// ============================================
export interface Contact {
  id: string
  client: string
  
  // Personal Info
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  lead_phone: string | null
  avatar_url: string | null
  title: string | null
  job_title: string | null
  department: string | null
  linkedin_url: string | null
  profile_url: string | null
  seniority_level: string | null
  
  // Company Info (embedded - no more separate companies table)
  company_name: string | null
  company_domain: string | null
  company_linkedin: string | null
  company_phone: string | null
  company_website: string | null
  company_size: string | null
  company_industry: string | null
  annual_revenue: string | null
  company_hq_city: string | null
  company_hq_state: string | null
  company_hq_country: string | null
  year_founded: number | null
  business_model: string | null
  funding_stage: string | null
  tech_stack: string[] | null
  is_hiring: boolean | null
  growth_score: string | null
  num_locations: number | null
  company_logo_url: string | null
  company_address: string | null
  company_postal_code: string | null
  company_sector: string | null
  
  // Pipeline/Sales
  status: ContactStatus
  stage: string | null
  epv: number | null
  context: string | null
  next_touch: string | null
  notes: string | null
  assignee: string | null
  lead_source: string | null
  campaign_name: string | null
  campaign_id: string | null
  
  // Pipeline Progress
  pipeline_progress: {
    meeting_booked?: string | null
    disco_show?: string | null
    qualified?: string | null
    demo_booked?: string | null
    demo_show?: string | null
    proposal_sent?: string | null
    closed?: string | null
  } | null
  
  // Meeting Info
  meeting_date: string | null
  meeting_link: string | null
  rescheduling_link: string | null
  
  // Contact History
  last_contacted_at: string | null
  background: string | null
  
  // Metadata
  tags: string[]
  custom_variables_jsonb: Record<string, unknown> | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type ContactStatus = 'cold' | 'warm' | 'hot' | 'in-contract' | 'customer' | 'inactive'

// Pipeline stages for contacts
export const CONTACT_STAGES = [
  'new',
  'contacted',
  'meeting_booked',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const

export type ContactStage = typeof CONTACT_STAGES[number]

export const CONTACT_STAGE_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: '#d4d3cf', bgColor: '#1e293b' },
  contacted: { label: 'Contacted', color: '#60a5fa', bgColor: '#1e3a5f' },
  meeting_booked: { label: 'Meeting Booked', color: '#a78bfa', bgColor: '#3d2f5c' },
  qualified: { label: 'Qualified', color: '#fbbf24', bgColor: '#422006' },
  proposal: { label: 'Proposal', color: '#fb923c', bgColor: '#431407' },
  negotiation: { label: 'Negotiation', color: '#2dd4bf', bgColor: '#134e4a' },
  closed_won: { label: 'Closed Won', color: '#22c55e', bgColor: '#14532d' },
  closed_lost: { label: 'Closed Lost', color: '#f87171', bgColor: '#450a0a' },
}

// ============================================
// DEAL
// ============================================
export interface Deal {
  id: string
  client: string
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
  lead: { label: 'Lead', color: '#d4d3cf', bgColor: '#1e293b', probability: 10 },
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
  contact?: Contact
  deal?: Deal
}

export type TaskType = 'task' | 'call' | 'email' | 'meeting' | 'follow_up' | 'reminder'

export const TASK_TYPE_INFO: Record<TaskType, { label: string; icon: string; color: string }> = {
  task: { label: 'Task', icon: 'CheckSquare', color: '#d4d3cf' },
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
  contact_id: string | null
  deal_id: string | null
  text: string
  type: NoteType
  created_at: string
  updated_at: string
  created_by: string | null
  attachments: Attachment[]
  
  // Joined
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
  entity_type: 'contact' | 'deal'
  created_at: string
}

// ============================================
// CRM DASHBOARD STATS
// ============================================
export interface CRMStats {
  contacts: {
    total: number
    byStatus: Record<ContactStatus, number>
    byStage: Record<string, number>
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
  contact_id?: string
  tags?: string[]
  company_industry?: string
  company_size?: string
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
