// CRM Types for engaged_leads table

export interface CRMContact {
  id: string
  client: string
  email: string
  
  // Contact Info
  first_name?: string
  last_name?: string
  full_name?: string
  lead_phone?: string
  linkedin_url?: string
  job_title?: string
  seniority_level?: string
  
  // Organization
  company?: string
  company_domain?: string
  company_website?: string
  company_phone?: string
  company_hq_city?: string
  company_hq_state?: string
  company_hq_country?: string
  company_size?: string
  industry?: string
  annual_revenue?: string
  year_founded?: number
  num_locations?: number
  main_product_service?: string
  
  // Pipeline Stage
  stage?: string
  current_stage?: string
  meeting_booked?: boolean
  meeting_booked_at?: string
  showed_up_to_disco?: boolean
  showed_up_to_disco_at?: string
  qualified?: boolean
  qualified_at?: string
  demo_booked?: boolean
  demo_booked_at?: string
  showed_up_to_demo?: boolean
  showed_up_to_demo_at?: string
  proposal_sent?: boolean
  proposal_sent_at?: string
  closed?: boolean
  closed_at?: string
  
  // Scheduling & Communication
  meeting_date?: string
  meeting_link?: string
  rescheduling_link?: string
  next_touchpoint?: string
  last_contact?: string
  context?: string
  notes?: string
  
  // Meta
  lead_source?: string
  assignee?: string
  campaign_id?: string
  campaign_name?: string
  date_created?: string
  created_at?: string
  updated_at?: string
  
  // Additional firmographic
  tech_stack?: string[]
  business_model?: string
  funding_stage?: string
  growth_score?: string
  is_hiring?: boolean
}

// CRM Stage definitions
export const CRM_STAGES = [
  { id: 'new', label: 'New', color: '#6b7280' },
  { id: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { id: 'follow_up', label: 'Follow Up', color: '#8b5cf6' },
  { id: 'qualified', label: 'Qualified', color: '#22c55e' },
  { id: 'demo_booked', label: 'Demo Booked', color: '#f59e0b' },
  { id: 'demo_showed', label: 'Demo Showed', color: '#f97316' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: '#ec4899' },
  { id: 'negotiation', label: 'Negotiation', color: '#14b8a6' },
  { id: 'closed_won', label: 'Closed Won', color: '#10b981' },
  { id: 'closed_lost', label: 'Closed Lost', color: '#ef4444' },
  { id: 'disqualified', label: 'Disqualified', color: '#71717a' },
] as const

export type CRMStageId = typeof CRM_STAGES[number]['id']

// Lead source options
export const LEAD_SOURCES = [
  'Email',
  'LinkedIn',
  'Referral',
  'Website',
  'Cold Call',
  'Event',
  'Other',
] as const

export type LeadSource = typeof LEAD_SOURCES[number]

// Company size options
export const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees',
] as const

// View mode for CRM
export type CRMViewMode = 'kanban' | 'list'

// Filter state
export interface CRMFilters {
  stage?: string[]
  assignee?: string
  leadSource?: string
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// Sort options
export interface CRMSort {
  field: keyof CRMContact
  direction: 'asc' | 'desc'
}
