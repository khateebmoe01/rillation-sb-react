-- Create client_opportunities table for deal/pipeline tracking
CREATE TABLE IF NOT EXISTS client_opportunities (
  id SERIAL PRIMARY KEY,
  client TEXT NOT NULL,
  opportunity_name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Qualification',
  -- Stages: Qualification, Discovery, Proposal, Negotiation, Closed Won, Closed Lost
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_close_date DATE,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_opportunities_client ON client_opportunities(client);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON client_opportunities(stage);

-- Add monthly contract value to existing targets table
ALTER TABLE client_targets 
ADD COLUMN IF NOT EXISTS monthly_contract_value DECIMAL(12,2) DEFAULT 0;

-- Add updated_at trigger for client_opportunities
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_opportunities_updated_at 
    BEFORE UPDATE ON client_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();




