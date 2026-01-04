-- ============================================================================
-- MIGRATION: Add JSONB Column for Custom Variables
-- ============================================================================
-- Created: 2025-01-03
-- Description: Adds a JSONB column to meetings_booked table to store all custom
--              variables from Bison API, enabling future-proof data storage
--              without schema changes for new variables.
-- ============================================================================

-- Add JSONB column to store all custom variables
ALTER TABLE meetings_booked 
  ADD COLUMN IF NOT EXISTS custom_variables_jsonb JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB querying
-- This allows fast queries like: WHERE custom_variables_jsonb->>'variable_name' = 'value'
CREATE INDEX IF NOT EXISTS idx_meetings_booked_custom_vars 
  ON meetings_booked USING gin(custom_variables_jsonb);

-- Add comment for documentation
COMMENT ON COLUMN meetings_booked.custom_variables_jsonb IS 
  'Stores all custom variables from Bison API in JSON format. Enables discovery of new variables and future column promotion without schema changes.';

-- ============================================================================
-- USAGE EXAMPLES:
-- ============================================================================
-- Query a specific custom variable:
--   SELECT * FROM meetings_booked WHERE custom_variables_jsonb->>'tech_stack' IS NOT NULL;
--
-- Get all unique custom variable names:
--   SELECT DISTINCT jsonb_object_keys(custom_variables_jsonb) FROM meetings_booked;
--
-- Count records with a specific variable:
--   SELECT COUNT(*) FROM meetings_booked WHERE custom_variables_jsonb ? 'company_size';
-- ============================================================================


