-- Migration: Add inbox lifecycle tracking columns
-- Created: 2025-01-16
-- Purpose: Enable warmup tracking, lifecycle status, and deliverability monitoring

-- Add new columns to inboxes table for lifecycle tracking
ALTER TABLE inboxes
ADD COLUMN IF NOT EXISTS warmup_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warmup_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS warmup_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warmup_reputation NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS deliverability_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS inbox_set_id UUID,
ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_campaign_id TEXT,
ADD COLUMN IF NOT EXISTS provider_inbox_id TEXT;

-- Add check constraint for lifecycle_status
ALTER TABLE inboxes
ADD CONSTRAINT inboxes_lifecycle_status_check 
CHECK (lifecycle_status IS NULL OR lifecycle_status IN ('ordered', 'warming', 'ready', 'active', 'paused', 'disconnected', 'canceled'));

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_inboxes_lifecycle_status ON inboxes(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_inboxes_warmup_enabled ON inboxes(warmup_enabled) WHERE warmup_enabled = true;
CREATE INDEX IF NOT EXISTS idx_inboxes_client_status ON inboxes(client, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_inboxes_domain ON inboxes(domain);
CREATE INDEX IF NOT EXISTS idx_inboxes_inbox_set_id ON inboxes(inbox_set_id);

-- Backfill domain column from email addresses
UPDATE inboxes 
SET domain = SPLIT_PART(email, '@', 2)
WHERE domain IS NULL AND email IS NOT NULL AND email LIKE '%@%';

-- Set initial lifecycle_status based on current status
UPDATE inboxes
SET lifecycle_status = CASE
  WHEN status = 'Connected' THEN 'active'
  WHEN status = 'Not connected' THEN 'disconnected'
  WHEN status = 'Failed' THEN 'disconnected'
  ELSE 'active'
END
WHERE lifecycle_status IS NULL OR lifecycle_status = 'active';

COMMENT ON COLUMN inboxes.warmup_enabled IS 'Whether warmup is currently active for this inbox';
COMMENT ON COLUMN inboxes.warmup_started_at IS 'When warmup was started';
COMMENT ON COLUMN inboxes.warmup_days IS 'Number of days inbox has been warming';
COMMENT ON COLUMN inboxes.warmup_reputation IS 'Warmup reputation score from provider (0-100)';
COMMENT ON COLUMN inboxes.lifecycle_status IS 'Current lifecycle stage: ordered, warming, ready, active, paused, disconnected, canceled';
COMMENT ON COLUMN inboxes.domain IS 'Domain extracted from email address for grouping';
COMMENT ON COLUMN inboxes.deliverability_score IS 'Calculated deliverability score (0-100)';
COMMENT ON COLUMN inboxes.inbox_set_id IS 'Reference to inbox_sets table for grouping';
COMMENT ON COLUMN inboxes.ordered_at IS 'When this inbox was ordered from provider';
