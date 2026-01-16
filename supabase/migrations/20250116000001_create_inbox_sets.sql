-- Migration: Create inbox_sets table
-- Created: 2025-01-16
-- Purpose: Track logical groupings of inboxes ordered together

CREATE TABLE IF NOT EXISTS inbox_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  provider TEXT CHECK (provider IN ('google', 'microsoft', 'smtp')),
  domain TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  connected_count INTEGER DEFAULT 0,
  ordered_at TIMESTAMPTZ DEFAULT now(),
  warmup_started_at TIMESTAMPTZ,
  warmup_target_days INTEGER DEFAULT 21,
  status TEXT CHECK (status IN ('ordered', 'warming', 'ready', 'deployed', 'paused', 'archived')) DEFAULT 'ordered',
  avg_warmup_reputation NUMERIC(5,2),
  avg_deliverability_score NUMERIC(5,2),
  notes TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE inbox_sets ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON inbox_sets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inbox_sets_client ON inbox_sets(client);
CREATE INDEX IF NOT EXISTS idx_inbox_sets_status ON inbox_sets(status);
CREATE INDEX IF NOT EXISTS idx_inbox_sets_ordered_at ON inbox_sets(ordered_at DESC);

-- Add foreign key constraint to inboxes table
ALTER TABLE inboxes
ADD CONSTRAINT fk_inboxes_inbox_set
FOREIGN KEY (inbox_set_id) REFERENCES inbox_sets(id) ON DELETE SET NULL;

-- Create function to update inbox_sets aggregates
CREATE OR REPLACE FUNCTION update_inbox_set_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the inbox_set aggregates when an inbox changes
  IF NEW.inbox_set_id IS NOT NULL THEN
    UPDATE inbox_sets
    SET 
      connected_count = (
        SELECT COUNT(*) FROM inboxes 
        WHERE inbox_set_id = NEW.inbox_set_id 
        AND status = 'Connected'
      ),
      avg_warmup_reputation = (
        SELECT AVG(warmup_reputation) FROM inboxes 
        WHERE inbox_set_id = NEW.inbox_set_id 
        AND warmup_reputation IS NOT NULL
      ),
      avg_deliverability_score = (
        SELECT AVG(deliverability_score) FROM inboxes 
        WHERE inbox_set_id = NEW.inbox_set_id 
        AND deliverability_score IS NOT NULL
      ),
      updated_at = now()
    WHERE id = NEW.inbox_set_id;
  END IF;
  
  -- Also update old set if inbox was moved
  IF TG_OP = 'UPDATE' AND OLD.inbox_set_id IS NOT NULL AND OLD.inbox_set_id != NEW.inbox_set_id THEN
    UPDATE inbox_sets
    SET 
      connected_count = (
        SELECT COUNT(*) FROM inboxes 
        WHERE inbox_set_id = OLD.inbox_set_id 
        AND status = 'Connected'
      ),
      updated_at = now()
    WHERE id = OLD.inbox_set_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_inbox_set_aggregates ON inboxes;
CREATE TRIGGER trigger_update_inbox_set_aggregates
  AFTER INSERT OR UPDATE OF inbox_set_id, status, warmup_reputation, deliverability_score
  ON inboxes
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_set_aggregates();

COMMENT ON TABLE inbox_sets IS 'Logical groupings of inboxes ordered together for bulk management';
COMMENT ON COLUMN inbox_sets.warmup_target_days IS 'Target number of days for warmup (default 21)';
COMMENT ON COLUMN inbox_sets.connected_count IS 'Auto-calculated count of connected inboxes in set';
