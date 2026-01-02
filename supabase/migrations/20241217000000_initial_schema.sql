-- ============================================================================
-- RILLATION REVENUE ANALYTICS - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Migration: Initial Schema
-- Created: 2024-12-17
-- Description: Complete database schema for Rillation Revenue Analytics
--              including all tables, indexes, and documentation
-- ============================================================================

-- ============================================
-- TABLE: Clients
-- Purpose: Master list of clients with Bison API credentials
-- Used by: useClients, usePerformanceData
-- ============================================
CREATE TABLE IF NOT EXISTS "Clients" (
  id SERIAL PRIMARY KEY,
  "Business" TEXT NOT NULL UNIQUE,
  "Api Key - Bison" TEXT,
  "Client ID - Bison" TEXT,
  "App URL- Bison" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "Clients" IS 'Master client list with Bison integration credentials';
COMMENT ON COLUMN "Clients"."Business" IS 'Client business name - used as foreign key reference in other tables';


-- ============================================
-- TABLE: Campaigns
-- Purpose: Campaign metadata linking campaign IDs to clients
-- Used by: Campaign filtering and lookup
-- ============================================
CREATE TABLE IF NOT EXISTS "Campaigns" (
  id SERIAL PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  uuid TEXT,
  client TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "Campaigns" IS 'Campaign metadata with Bison campaign IDs';


-- ============================================
-- TABLE: campaign_reporting
-- Purpose: Daily aggregated campaign metrics (emails sent, opened, bounced, etc.)
-- Used by: useQuickViewData, usePerformanceData, usePipelineData, useCampaigns
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_reporting (
  id SERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  client TEXT,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  total_leads_contacted INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  opened_percentage DECIMAL(5,2) DEFAULT 0,
  unique_replies_per_contact INTEGER DEFAULT 0,
  unique_replies_per_contact_percentage DECIMAL(5,2) DEFAULT 0,
  bounced INTEGER DEFAULT 0,
  bounced_percentage DECIMAL(5,2) DEFAULT 0,
  interested INTEGER DEFAULT 0,
  interested_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE campaign_reporting IS 'Daily campaign metrics aggregated from Bison';
COMMENT ON COLUMN campaign_reporting.date IS 'The date these metrics apply to';
COMMENT ON COLUMN campaign_reporting.total_leads_contacted IS 'Unique prospects contacted';


-- ============================================
-- TABLE: replies
-- Purpose: Individual email replies with categorization
-- Categories: Interested, Not Interested, Out Of Office, etc.
-- Used by: useQuickViewData, usePerformanceData, usePipelineData
-- ============================================
CREATE TABLE IF NOT EXISTS replies (
  id SERIAL PRIMARY KEY,
  reply_id TEXT NOT NULL UNIQUE,
  type TEXT,
  lead_id TEXT,
  subject TEXT,
  category TEXT,
  text_body TEXT,
  campaign_id TEXT,
  date_received TIMESTAMPTZ,
  from_email TEXT,
  primary_to_email TEXT,
  client TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE replies IS 'Individual email replies with AI-categorized sentiment';
COMMENT ON COLUMN replies.category IS 'Reply category: Interested, Not Interested, Out Of Office, OOO, etc.';


-- ============================================
-- TABLE: meetings_booked
-- Purpose: Booked meeting records from campaigns
-- Used by: useQuickViewData, usePerformanceData, usePipelineData
-- ============================================
CREATE TABLE IF NOT EXISTS meetings_booked (
  id SERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  title TEXT,
  company TEXT,
  company_linkedin TEXT,
  company_domain TEXT,
  campaign_name TEXT,
  profile_url TEXT,
  client TEXT,
  created_time TIMESTAMPTZ,
  campaign_id TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE meetings_booked IS 'Booked meetings/calls from outbound campaigns';


-- ============================================
-- TABLE: client_targets
-- Purpose: Daily performance targets per client
-- Used by: usePerformanceData (ClientBubble progress indicators)
-- ============================================
CREATE TABLE IF NOT EXISTS client_targets (
  id SERIAL PRIMARY KEY,
  client TEXT NOT NULL UNIQUE,
  emails_per_day INTEGER DEFAULT 0,
  prospects_per_day INTEGER DEFAULT 0,
  replies_per_day INTEGER DEFAULT 0,
  bounces_per_day INTEGER DEFAULT 0,
  meetings_per_day INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE client_targets IS 'Daily KPI targets for each client';
COMMENT ON COLUMN client_targets.emails_per_day IS 'Target emails to send per day';


-- ============================================
-- TABLE: funnel_forecasts
-- Purpose: Monthly forecast data with estimates and actuals
-- Used by: usePipelineData, EditableFunnelSpreadsheet
-- ============================================
CREATE TABLE IF NOT EXISTS funnel_forecasts (
  id SERIAL PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  metric_key TEXT NOT NULL,
  estimate_low DECIMAL(10,2) DEFAULT 0,
  estimate_avg DECIMAL(10,2) DEFAULT 0,
  estimate_high DECIMAL(10,2) DEFAULT 0,
  estimate_1 DECIMAL(10,2) DEFAULT 0,
  estimate_2 DECIMAL(10,2) DEFAULT 0,
  actual DECIMAL(10,2) DEFAULT 0,
  projected DECIMAL(10,2) DEFAULT 0,
  client TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year, metric_key, client)
);

COMMENT ON TABLE funnel_forecasts IS 'Monthly funnel forecasts with low/avg/high estimates';
COMMENT ON COLUMN funnel_forecasts.metric_key IS 'Metric identifier: total_messages_sent, response_rate, total_booked, etc.';


-- ============================================
-- TABLE: engaged_leads
-- Purpose: Lead pipeline tracking with boolean stage progression
-- Used by: usePipelineData (funnel stages calculation)
-- ============================================
CREATE TABLE IF NOT EXISTS engaged_leads (
  id SERIAL PRIMARY KEY,
  client TEXT,
  lead_id TEXT,
  email TEXT,
  full_name TEXT,
  company TEXT,
  date_created DATE,
  showed_up_to_disco BOOLEAN DEFAULT FALSE,
  qualified BOOLEAN DEFAULT FALSE,
  demo_booked BOOLEAN DEFAULT FALSE,
  showed_up_to_demo BOOLEAN DEFAULT FALSE,
  proposal_sent BOOLEAN DEFAULT FALSE,
  pilot_accepted BOOLEAN DEFAULT FALSE,
  closed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE engaged_leads IS 'Lead progression through sales funnel stages';
COMMENT ON COLUMN engaged_leads.showed_up_to_disco IS 'Lead attended discovery call';
COMMENT ON COLUMN engaged_leads.qualified IS 'Lead qualified after discovery';
COMMENT ON COLUMN engaged_leads.pilot_accepted IS 'Lead accepted pilot/proposal';


-- ============================================
-- TABLE: inboxes
-- Purpose: Email inbox inventory with sending stats
-- Used by: useInboxes, InboxInventory component
-- ============================================
CREATE TABLE IF NOT EXISTS inboxes (
  id SERIAL PRIMARY KEY,
  bison_inbox_id TEXT UNIQUE,
  workspace TEXT,
  name TEXT,
  email TEXT,
  daily_limit INTEGER DEFAULT 0,
  type TEXT,
  status TEXT,
  emails_sent_count INTEGER DEFAULT 0,
  total_replied_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unique_replied_count INTEGER DEFAULT 0,
  interested_leads_count INTEGER DEFAULT 0,
  client TEXT,
  provider TEXT,
  warmup_status TEXT,
  health_score DECIMAL(5,2),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inboxes IS 'Email sending inbox inventory with performance metrics';
COMMENT ON COLUMN inboxes.type IS 'Provider type: google_workspace, microsoft_oauth, custom_smtp';
COMMENT ON COLUMN inboxes.status IS 'Inbox status: active, paused, warming, disconnected';


-- ============================================
-- TABLE: inbox_orders
-- Purpose: Track bulk inbox orders (pending, processing, completed, failed)
-- Used by: useInboxOrders, InboxOrders component
-- ============================================
CREATE TABLE IF NOT EXISTS inbox_orders (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  domain_id INTEGER,
  domain TEXT,
  client TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  cost DECIMAL(10,2),
  order_id TEXT,
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inbox_orders IS 'Bulk inbox order tracking';
COMMENT ON COLUMN inbox_orders.status IS 'Order status: pending, processing, completed, failed';


-- ============================================
-- TABLE: domains
-- Purpose: Domain inventory for email infrastructure
-- Used by: useDomains, DomainList component
-- ============================================
CREATE TABLE IF NOT EXISTS domains (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  provider TEXT,
  client TEXT,
  registered_date DATE,
  expiry_date DATE,
  dns_configured BOOLEAN DEFAULT FALSE,
  health_status TEXT,
  mx_records_set BOOLEAN DEFAULT FALSE,
  spf_configured BOOLEAN DEFAULT FALSE,
  dkim_configured BOOLEAN DEFAULT FALSE,
  dmarc_configured BOOLEAN DEFAULT FALSE,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE domains IS 'Domain inventory for email sending infrastructure';
COMMENT ON COLUMN domains.provider IS 'Domain registrar: porkbun, namecheap, godaddy, etc.';
COMMENT ON COLUMN domains.health_status IS 'DNS health: healthy, warning, error';


-- ============================================
-- TABLE: storeleads
-- Purpose: Lead data from StoreLeads (e-commerce stores)
-- Note: This table has ~80 columns - showing key columns here
-- ============================================
CREATE TABLE IF NOT EXISTS storeleads (
  id SERIAL PRIMARY KEY,
  domain TEXT,
  emails TEXT,
  phones TEXT,
  company_location TEXT,
  description TEXT,
  platform TEXT,
  plan TEXT,
  status TEXT,
  products_sold INTEGER,
  estimated_monthly_sales DECIMAL(12,2),
  -- Social media
  facebook TEXT,
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  pinterest TEXT,
  youtube TEXT,
  tiktok TEXT,
  -- Company info
  company_name TEXT,
  industry TEXT,
  employee_count INTEGER,
  founded_year INTEGER,
  -- Contact info
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  -- Enrichment data
  technologies TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE storeleads IS 'E-commerce store leads from StoreLeads integration';


-- ============================================
-- INDEXES FOR QUERY PERFORMANCE
-- ============================================

-- Campaign reporting indexes
CREATE INDEX IF NOT EXISTS idx_campaign_reporting_date ON campaign_reporting(date);
CREATE INDEX IF NOT EXISTS idx_campaign_reporting_client ON campaign_reporting(client);
CREATE INDEX IF NOT EXISTS idx_campaign_reporting_campaign ON campaign_reporting(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaign_reporting_date_client ON campaign_reporting(date, client);

-- Replies indexes
CREATE INDEX IF NOT EXISTS idx_replies_date ON replies(date_received);
CREATE INDEX IF NOT EXISTS idx_replies_client ON replies(client);
CREATE INDEX IF NOT EXISTS idx_replies_category ON replies(category);
CREATE INDEX IF NOT EXISTS idx_replies_date_client ON replies(date_received, client);

-- Meetings indexes
CREATE INDEX IF NOT EXISTS idx_meetings_created ON meetings_booked(created_time);
CREATE INDEX IF NOT EXISTS idx_meetings_client ON meetings_booked(client);

-- Engaged leads indexes
CREATE INDEX IF NOT EXISTS idx_engaged_leads_client ON engaged_leads(client);
CREATE INDEX IF NOT EXISTS idx_engaged_leads_date ON engaged_leads(date_created);

-- Infrastructure indexes
CREATE INDEX IF NOT EXISTS idx_inboxes_client ON inboxes(client);
CREATE INDEX IF NOT EXISTS idx_inboxes_status ON inboxes(status);
CREATE INDEX IF NOT EXISTS idx_domains_client ON domains(client);
CREATE INDEX IF NOT EXISTS idx_domains_provider ON domains(provider);
CREATE INDEX IF NOT EXISTS idx_inbox_orders_status ON inbox_orders(status);
CREATE INDEX IF NOT EXISTS idx_inbox_orders_client ON inbox_orders(client);

-- Funnel forecasts indexes
CREATE INDEX IF NOT EXISTS idx_funnel_forecasts_period ON funnel_forecasts(year, month);
CREATE INDEX IF NOT EXISTS idx_funnel_forecasts_client ON funnel_forecasts(client);


-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_client_targets_updated_at
  BEFORE UPDATE ON client_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funnel_forecasts_updated_at
  BEFORE UPDATE ON funnel_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engaged_leads_updated_at
  BEFORE UPDATE ON engaged_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inboxes_updated_at
  BEFORE UPDATE ON inboxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inbox_orders_updated_at
  BEFORE UPDATE ON inbox_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Uncomment and configure as needed
-- ============================================

-- Enable RLS on sensitive tables
-- ALTER TABLE "Clients" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaign_reporting ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meetings_booked ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inboxes ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow authenticated users to read all data
-- CREATE POLICY "Allow authenticated read access" ON campaign_reporting
--   FOR SELECT TO authenticated USING (true);

-- Example policy: Restrict by client (for multi-tenant)
-- CREATE POLICY "Users can only see their client data" ON campaign_reporting
--   FOR SELECT TO authenticated
--   USING (client = auth.jwt() ->> 'client_name');
















