-- Migration: Add CRM columns to engaged_leads table
-- Purpose: Enable full CRM functionality for Rillation Revenue
-- Non-destructive: Uses ADD COLUMN IF NOT EXISTS to preserve existing data

-- Contact fields
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS lead_phone TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Organization fields
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS num_locations INTEGER;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS main_product_service TEXT;

-- Scheduling fields
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS rescheduling_link TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS next_touchpoint DATE;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS last_contact TIMESTAMPTZ;

-- Communication & Meta
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS context TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE engaged_leads ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'New';

-- Create indexes for CRM queries
CREATE INDEX IF NOT EXISTS idx_engaged_leads_stage ON engaged_leads(stage);
CREATE INDEX IF NOT EXISTS idx_engaged_leads_assignee ON engaged_leads(assignee);
CREATE INDEX IF NOT EXISTS idx_engaged_leads_next_touchpoint ON engaged_leads(next_touchpoint);
CREATE INDEX IF NOT EXISTS idx_engaged_leads_last_contact ON engaged_leads(last_contact);

-- Add comments for documentation
COMMENT ON COLUMN engaged_leads.full_name IS 'Combined first and last name for display';
COMMENT ON COLUMN engaged_leads.lead_phone IS 'Contact phone number';
COMMENT ON COLUMN engaged_leads.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN engaged_leads.company_phone IS 'Company main phone number';
COMMENT ON COLUMN engaged_leads.company_website IS 'Company website URL';
COMMENT ON COLUMN engaged_leads.num_locations IS 'Number of company locations';
COMMENT ON COLUMN engaged_leads.main_product_service IS 'Primary product or service offered';
COMMENT ON COLUMN engaged_leads.meeting_date IS 'Scheduled meeting date/time';
COMMENT ON COLUMN engaged_leads.meeting_link IS 'Video call or meeting link';
COMMENT ON COLUMN engaged_leads.rescheduling_link IS 'Link for rescheduling the meeting';
COMMENT ON COLUMN engaged_leads.next_touchpoint IS 'Next planned follow-up date';
COMMENT ON COLUMN engaged_leads.last_contact IS 'Last interaction timestamp';
COMMENT ON COLUMN engaged_leads.context IS 'Conversation history and notes from interactions';
COMMENT ON COLUMN engaged_leads.lead_source IS 'How the lead was acquired (Email, LinkedIn, Referral, etc)';
COMMENT ON COLUMN engaged_leads.assignee IS 'Team member assigned to this lead';
COMMENT ON COLUMN engaged_leads.notes IS 'Internal notes about the lead';
COMMENT ON COLUMN engaged_leads.stage IS 'Current pipeline stage (New, Contacted, Qualified, etc)';
