-- Migration: Create generated_filters table for Clay filter generation from Fathom calls
-- Created: 2026-01-28

-- Table to store AI-generated Clay filters from Fathom call analysis
CREATE TABLE IF NOT EXISTS generated_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fathom_call_id uuid REFERENCES client_fathom_calls(id) ON DELETE CASCADE,
  client text NOT NULL,  -- matches client_fathom_calls.client (not a foreign key)

  -- The generated filter configuration (CompanySearchFilters)
  filters jsonb NOT NULL DEFAULT '{}',

  -- AI reasoning for the filter choices
  reasoning text,

  -- Suggested row limit
  suggested_limit integer DEFAULT 100,

  -- Confidence score (0-1)
  confidence numeric(3,2),

  -- Workflow status
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'submitted', 'failed')),

  -- Track user modifications
  user_edits jsonb,

  -- Clay submission tracking
  clay_task_id text,  -- from run-enrichment preview
  clay_table_id text,  -- from wizard import
  clay_response jsonb,  -- full response from Clay
  submitted_to_clay_at timestamptz,

  -- Error tracking
  error_message text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for looking up filters by client
CREATE INDEX IF NOT EXISTS idx_generated_filters_client ON generated_filters(client);

-- Index for looking up by fathom call
CREATE INDEX IF NOT EXISTS idx_generated_filters_fathom_call ON generated_filters(fathom_call_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_generated_filters_status ON generated_filters(status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_generated_filters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generated_filters_updated_at ON generated_filters;
CREATE TRIGGER trigger_generated_filters_updated_at
  BEFORE UPDATE ON generated_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_filters_updated_at();

-- Add comment
COMMENT ON TABLE generated_filters IS 'AI-generated Clay Find Companies filters from Fathom call analysis';
