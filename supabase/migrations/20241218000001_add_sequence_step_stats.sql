-- ============================================================================
-- ADD SEQUENCE STEP STATS COLUMN
-- ============================================================================
-- Migration: Add sequence_step_stats JSONB column to campaign_reporting
-- Created: 2024-12-18
-- Description: Stores merged sequence step copy + stats from Bison APIs
-- ============================================================================

ALTER TABLE campaign_reporting 
ADD COLUMN IF NOT EXISTS sequence_step_stats JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN campaign_reporting.sequence_step_stats IS 'Merged sequence step copy + stats from Bison APIs';
