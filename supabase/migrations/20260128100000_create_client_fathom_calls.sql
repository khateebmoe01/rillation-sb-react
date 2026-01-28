-- Migration: Create client_fathom_calls table for storing synced Fathom meeting data
-- This table must be created BEFORE generated_filters (which references it as a foreign key)
-- Created: 2026-01-28

CREATE TABLE IF NOT EXISTS client_fathom_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fathom_call_id text UNIQUE NOT NULL,  -- Recording ID from Fathom API
  client text,  -- Matched client name (can be null if unassigned)
  title text NOT NULL,  -- Meeting title
  call_date timestamptz,  -- When the call occurred
  duration_seconds integer,  -- Call duration
  transcript text,  -- Full transcript text
  summary text,  -- AI-generated summary from Fathom
  participants jsonb DEFAULT '[]',  -- Array of {name, email} objects
  action_items jsonb DEFAULT '[]',  -- Array of action item strings
  call_type text DEFAULT 'general'
    CHECK (call_type IN ('tam_map', 'opportunity_review', 'messaging_review', 'general')),
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'archived')),
  auto_matched boolean DEFAULT false,  -- Whether client was auto-matched from title
  match_confidence numeric(3,2) DEFAULT 0,  -- 0.0 to 1.0 confidence score
  fathom_recording_url text,  -- URL to view recording in Fathom
  fathom_raw_data jsonb,  -- Full raw response from Fathom API
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for filtering by client
CREATE INDEX IF NOT EXISTS idx_client_fathom_calls_client ON client_fathom_calls(client);

-- Index for filtering by call date
CREATE INDEX IF NOT EXISTS idx_client_fathom_calls_date ON client_fathom_calls(call_date DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_client_fathom_calls_status ON client_fathom_calls(status);

-- Index for fast lookup by Fathom recording ID
CREATE INDEX IF NOT EXISTS idx_client_fathom_calls_fathom_id ON client_fathom_calls(fathom_call_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_fathom_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_client_fathom_calls_updated_at ON client_fathom_calls;
CREATE TRIGGER trigger_client_fathom_calls_updated_at
  BEFORE UPDATE ON client_fathom_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_client_fathom_calls_updated_at();

-- Enable RLS (optional - depends on your security model)
ALTER TABLE client_fathom_calls ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all calls
CREATE POLICY "Allow authenticated read access" ON client_fathom_calls
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for service role to insert/update (used by edge functions)
CREATE POLICY "Allow service role full access" ON client_fathom_calls
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE client_fathom_calls IS 'Synced meeting data from Fathom AI, used for generating Clay filters';
