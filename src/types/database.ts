// Supabase Database Types for Rillation Revenue Analytics

export interface Database {
  public: {
    Tables: {
      campaign_reporting: {
        Row: CampaignReporting
        Insert: Partial<CampaignReporting>
        Update: Partial<CampaignReporting>
      }
      replies: {
        Row: Reply
        Insert: Partial<Reply>
        Update: Partial<Reply>
      }
      meetings_booked: {
        Row: MeetingBooked
        Insert: Partial<MeetingBooked>
        Update: Partial<MeetingBooked>
      }
      Clients: {
        Row: Client
        Insert: Partial<Client>
        Update: Partial<Client>
      }
      client_targets: {
        Row: ClientTarget
        Insert: Partial<ClientTarget>
        Update: Partial<ClientTarget>
      }
      client_opportunities: {
        Row: ClientOpportunity
        Insert: Partial<ClientOpportunity>
        Update: Partial<ClientOpportunity>
      }
      funnel_forecasts: {
        Row: FunnelForecast
        Insert: Partial<FunnelForecast>
        Update: Partial<FunnelForecast>
      }
      inboxes: {
        Row: Inbox
        Insert: Partial<Inbox>
        Update: Partial<Inbox>
      }
      storeleads: {
        Row: StoreLead
        Insert: Partial<StoreLead>
        Update: Partial<StoreLead>
      }
      Campaigns: {
        Row: Campaign
        Insert: Partial<Campaign>
        Update: Partial<Campaign>
      }
    }
  }
}

// Table Types

export interface CampaignReporting {
  id?: number
  campaign_id: string
  campaign_name: string
  client: string
  date: string
  emails_sent: number
  total_leads_contacted: number
  opened: number
  opened_percentage: number
  unique_replies_per_contact: number
  unique_replies_per_contact_percentage: number
  bounced: number
  bounced_percentage: number
  interested: number
  interested_percentage: number
  created_at?: string
  // Additional columns as needed
}

export interface Reply {
  id?: number
  reply_id: string
  type: string
  lead_id: string
  subject: string
  category: string // 'Interested', 'Not Interested', 'OOO', etc.
  text_body: string
  campaign_id: string
  date_received: string
  from_email: string
  primary_to_email: string
  client: string
  created_at?: string
}

export interface MeetingBooked {
  id?: number
  first_name: string
  last_name: string
  full_name: string
  title: string
  company: string
  company_linkedin: string
  company_domain: string
  campaign_name: string
  profile_url: string
  client: string
  created_time: string
  campaign_id: string
  email: string
  // Firmographic fields
  company_size?: string
  annual_revenue?: string
  industry?: string
  company_hq_state?: string
  company_hq_city?: string
  company_hq_country?: string
  year_founded?: string
  business_model?: string
  funding_stage?: string
  tech_stack?: string[]
  is_hiring?: boolean
  growth_score?: string
  // JSONB column for all custom variables (future-proofing)
  custom_variables_jsonb?: Record<string, any>
  created_at?: string
}

export interface Client {
  id?: number
  Business: string
  'Api Key - Bison': string
  'Client ID - Bison': string
  'App URL- Bison': string
}

export interface ClientTarget {
  id?: number
  client: string
  emails_per_day: number
  prospects_per_day: number
  replies_per_day: number
  bounces_per_day: number
  meetings_per_day: number
  monthly_contract_value?: number
  created_at?: string
  updated_at?: string
}

export interface ClientOpportunity {
  id?: number
  client: string
  opportunity_name: string
  stage: string
  value: number
  expected_close_date?: string
  contact_name?: string
  contact_email?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface FunnelForecast {
  id?: number
  month: number
  year: number
  metric_key: string
  estimate_low: number
  estimate_avg: number
  estimate_high: number
  estimate_1: number
  estimate_2: number
  actual: number
  projected: number
  client?: string
  created_at?: string
  updated_at?: string
}

export interface Inbox {
  id?: number
  bison_inbox_id: string
  workspace: string
  name: string
  email: string
  daily_limit: number
  type: string
  status: string
  emails_sent_count: number
  total_replied_count: number
  bounced_count: number
  unique_replied_count: number
  interested_leads_count: number
  client?: string
  // Additional columns (26 total)
}

export interface StoreLead {
  id?: number
  domain: string
  emails: string
  phones: string
  company_location: string
  description: string
  platform: string
  plan: string
  status: string
  products_sold: number
  estimated_monthly_sales: number
  // Social media fields
  facebook: string
  instagram: string
  twitter: string
  linkedin: string
  // Many more columns (80 total)
}

export interface Campaign {
  id?: number
  campaign_name: string
  campaign_id: string
  uuid: string
  client: string
  created_at: string
}

// Aggregated Data Types for Dashboard

export interface QuickViewMetrics {
  totalEmailsSent: number
  uniqueProspects: number
  totalReplies: number
  realReplies: number
  positiveReplies: number
  bounces: number
  meetingsBooked: number
}

export interface ClientBubbleData {
  client: string
  emailsSent: number
  emailsTarget: number
  uniqueProspects: number
  prospectsTarget: number
  realReplies: number
  repliesTarget: number
  meetings: number
  meetingsTarget: number
}

export interface ChartDataPoint {
  date: string
  sent: number
  prospects: number
  replied: number
  positiveReplies: number
  meetings: number
}

export interface FunnelStage {
  name: string
  value: number
  percentage?: number
}

