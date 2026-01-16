-- Migration: Create inbox_tags and inbox_tag_assignments tables
-- Created: 2025-01-16
-- Purpose: Track EmailBison tags (sets) and their inbox assignments

-- ============================================
-- Table: inbox_tags
-- Synced from EmailBison tags endpoint
-- ============================================
CREATE TABLE IF NOT EXISTS inbox_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bison_tag_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  inbox_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bison_tag_id, client)
);

-- Enable RLS
ALTER TABLE inbox_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON inbox_tags
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inbox_tags_client ON inbox_tags(client);
CREATE INDEX IF NOT EXISTS idx_inbox_tags_bison_id ON inbox_tags(bison_tag_id);
CREATE INDEX IF NOT EXISTS idx_inbox_tags_name ON inbox_tags(name);

-- ============================================
-- Table: inbox_tag_assignments
-- Junction table for inbox-tag relationships
-- ============================================
CREATE TABLE IF NOT EXISTS inbox_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id INTEGER NOT NULL,
  tag_id UUID NOT NULL REFERENCES inbox_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(inbox_id, tag_id)
);

-- Enable RLS
ALTER TABLE inbox_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON inbox_tag_assignments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inbox_tag_assignments_inbox ON inbox_tag_assignments(inbox_id);
CREATE INDEX IF NOT EXISTS idx_inbox_tag_assignments_tag ON inbox_tag_assignments(tag_id);

-- ============================================
-- Add tags column to inboxes table
-- Stores tag IDs as JSONB array for quick filtering
-- ============================================
ALTER TABLE inboxes
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_inboxes_tags ON inboxes USING GIN (tags);

-- ============================================
-- Function to update inbox_count on inbox_tags
-- ============================================
CREATE OR REPLACE FUNCTION update_inbox_tag_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update count for the affected tag
  IF TG_OP = 'INSERT' THEN
    UPDATE inbox_tags SET inbox_count = inbox_count + 1, updated_at = now()
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE inbox_tags SET inbox_count = inbox_count - 1, updated_at = now()
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_inbox_tag_count ON inbox_tag_assignments;
CREATE TRIGGER trigger_update_inbox_tag_count
  AFTER INSERT OR DELETE ON inbox_tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_tag_count();

-- Comments
COMMENT ON TABLE inbox_tags IS 'Tags synced from EmailBison, displayed as Sets in the UI';
COMMENT ON TABLE inbox_tag_assignments IS 'Junction table linking inboxes to tags';
COMMENT ON COLUMN inbox_tags.bison_tag_id IS 'The tag ID from EmailBison API';
COMMENT ON COLUMN inbox_tags.inbox_count IS 'Auto-calculated count of inboxes with this tag';
COMMENT ON COLUMN inboxes.tags IS 'JSONB array of tag IDs for quick GIN-indexed filtering';
