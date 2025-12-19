-- ============================================================================
-- SEQUENCE STEPS TABLE
-- ============================================================================
-- Migration: Add sequence_steps table
-- Created: 2024-12-18
-- Description: Stores campaign email sequence step data from Bison API
-- ============================================================================

-- ============================================
-- TABLE: sequence_steps
-- Purpose: Store email sequence steps for campaigns
-- Used by: Campaign sequence management
-- ============================================
CREATE TABLE IF NOT EXISTS sequence_steps (
  id SERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  client TEXT,
  sequence_id INTEGER,
  step_id INTEGER,
  email_subject TEXT,
  "order" INTEGER,
  email_body TEXT,
  wait_in_days INTEGER,
  variant BOOLEAN DEFAULT FALSE,
  variant_from_step_id INTEGER,
  attachments JSONB DEFAULT '[]'::jsonb,
  thread_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sequence_steps IS 'Email sequence steps for campaigns from Bison API';
COMMENT ON COLUMN sequence_steps.campaign_id IS 'Campaign ID this sequence belongs to';
COMMENT ON COLUMN sequence_steps.client IS 'Client name this sequence belongs to';
COMMENT ON COLUMN sequence_steps.sequence_id IS 'Sequence ID from Bison API';
COMMENT ON COLUMN sequence_steps.step_id IS 'Original step ID from API';
COMMENT ON COLUMN sequence_steps."order" IS 'Step order in the sequence';
COMMENT ON COLUMN sequence_steps.wait_in_days IS 'Days to wait before sending this step';
COMMENT ON COLUMN sequence_steps.variant IS 'Whether this step is a variant';
COMMENT ON COLUMN sequence_steps.variant_from_step_id IS 'Parent step ID if this is a variant';
COMMENT ON COLUMN sequence_steps.thread_reply IS 'Whether to reply in the same email thread';


-- ============================================
-- UNIQUE CONSTRAINT FOR UPSERT
-- ============================================
ALTER TABLE sequence_steps ADD CONSTRAINT unique_campaign_step UNIQUE (campaign_id, step_id);


-- ============================================
-- INDEXES FOR QUERY PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sequence_steps_campaign_id ON sequence_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_client ON sequence_steps(client);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_campaign_sequence ON sequence_steps(campaign_id, sequence_id);


-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER update_sequence_steps_updated_at
  BEFORE UPDATE ON sequence_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
