// Atomic CRM Types - Using engaged_leads as single source of truth

// ============================================
// CONTACT (Maps directly to engaged_leads table)
// ============================================
export interface Contact {
  id: string
  client: string
  
  // Personal Info
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  lead_phone: string | null
  job_title: string | null
  seniority_level: string | null
  linkedin_url: string | null
  
  // Company Info (from engaged_leads)
  company: string | null
  company_domain: string | null
  company_linkedin: string | null
  company_phone: string | null
  company_website: string | null
  company_size: string | null
  industry: string | null
  annual_revenue: string | null
  company_hq_city: string | null
  company_hq_state: string | null
  company_hq_country: string | null
  year_founded: number | null
  business_model: string | null
  funding_stage: string | null
  tech_stack: string[] | null
  is_hiring: boolean | null
  growth_score: number | null
  num_locations: number | null
  main_product_service: string | null
  
  // Campaign Info
  campaign_id: string | null
  campaign_name: string | null
  lead_source: string | null
  
  // Pipeline Stages (boolean flags)
  meeting_booked: boolean
  qualified: boolean
  showed_up_to_disco: boolean
  demo_booked: boolean
  showed_up_to_demo: boolean
  proposal_sent: boolean
  closed: boolean
  
  // Pipeline Timestamps
  meeting_booked_at: string | null
  qualified_at: string | null
  showed_up_to_disco_at: string | null
  demo_booked_at: string | null
  showed_up_to_demo_at: string | null
  proposal_sent_at: string | null
  closed_at: string | null
  
  // Current stage (derived or set)
  stage: string | null
  current_stage: string | null
  
  // Pipeline/Sales
  epv: number | null
  context: string | null
  next_touchpoint: string | null
  notes: string | null
  assignee: string | null
  last_contact: string | null
  
  // Meeting Info
  meeting_date: string | null
  meeting_link: string | null
  rescheduling_link: string | null
  
  // Date fields
  date_created: string | null
  
  // Metadata
  custom_variables_jsonb: Record<string, unknown> | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Derived status based on pipeline stage flags
export type ContactStatus = 'new' | 'engaged' | 'meeting_booked' | 'qualified' | 'demo' | 'proposal' | 'closed'

export function getContactStatus(contact: Contact): ContactStatus {
  if (contact.closed) return 'closed'
  if (contact.proposal_sent) return 'proposal'
  if (contact.showed_up_to_demo || contact.demo_booked) return 'demo'
  if (contact.qualified) return 'qualified'
  if (contact.meeting_booked || contact.showed_up_to_disco) return 'meeting_booked'
  if (contact.stage && contact.stage !== 'new') return 'engaged'
  return 'new'
}

// Pipeline stages for contacts
export const CONTACT_STAGES = [
  'new',
  'engaged',
  'meeting_booked',
  'showed_up_to_disco',
  'qualified',
  'demo_booked',
  'showed_up_to_demo',
  'proposal_sent',
  'closed',
] as const

export type ContactStage = typeof CONTACT_STAGES[number]

export const CONTACT_STAGE_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: '#94a3b8', bgColor: '#1e293b' },
  engaged: { label: 'Engaged', color: '#60a5fa', bgColor: '#1e3a5f' },
  meeting_booked: { label: 'Meeting Booked', color: '#a78bfa', bgColor: '#3d2f5c' },
  showed_up_to_disco: { label: 'Showed to Disco', color: '#c084fc', bgColor: '#4c1d95' },
  qualified: { label: 'Qualified', color: '#fbbf24', bgColor: '#422006' },
  demo_booked: { label: 'Demo Booked', color: '#fb923c', bgColor: '#431407' },
  showed_up_to_demo: { label: 'Showed to Demo', color: '#f97316', bgColor: '#7c2d12' },
  proposal_sent: { label: 'Proposal Sent', color: '#2dd4bf', bgColor: '#134e4a' },
  closed: { label: 'Closed Won', color: '#22c55e', bgColor: '#14532d' },
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
    byStatus: Record<string, number>
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
  industry?: string
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
