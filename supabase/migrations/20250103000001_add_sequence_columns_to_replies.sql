-- ============================================================================
-- ADD SEQUENCE STEP COLUMNS TO REPLIES
-- ============================================================================
-- Migration: Add sequence step tracking columns to replies table
-- Created: 2025-01-03
-- Description: Add sequence_step_order, sequence_step_id, and sequence_step_variant
--              columns to replies table for better tracking of which sequence step
--              generated the reply
-- ============================================================================

-- ============================================
-- ADD COLUMNS TO REPLIES TABLE
-- ============================================

-- Add sequence_step_order: Order of the sequence step (1, 2, 3, etc.)
ALTER TABLE replies 
ADD COLUMN IF NOT EXISTS sequence_step_order INTEGER;

-- Add sequence_step_id: ID of the sequence step from sequence_steps table
ALTER TABLE replies 
ADD COLUMN IF NOT EXISTS sequence_step_id INTEGER;

-- Add sequence_step_variant: Variant identifier for A/B testing
ALTER TABLE replies 
ADD COLUMN IF NOT EXISTS sequence_step_variant TEXT;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN replies.sequence_step_order IS 'Order of the sequence step that generated this reply (1, 2, 3, etc.)';
COMMENT ON COLUMN replies.sequence_step_id IS 'Step ID from sequence_steps table';
COMMENT ON COLUMN replies.sequence_step_variant IS 'Variant identifier if this reply came from an A/B test variant';

-- ============================================
-- ADD INDEXES FOR QUERY PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_replies_sequence_step_id ON replies(sequence_step_id);
CREATE INDEX IF NOT EXISTS idx_replies_sequence_step_order ON replies(sequence_step_order);

