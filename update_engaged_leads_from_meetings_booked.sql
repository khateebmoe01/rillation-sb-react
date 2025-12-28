-- ============================================================================
-- SQL Script: Update Engaged Leads from Meetings Booked
-- Created: 2024-12-19
-- Description: Backfill script to update engaged_leads table with meeting_booked
--              status and meetings_booked_at timestamp by matching email and client
--              from meetings_booked table.
-- ============================================================================

-- Step 1: Add columns if they don't exist
ALTER TABLE engaged_leads 
  ADD COLUMN IF NOT EXISTS meeting_booked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meetings_booked_at TIMESTAMPTZ;

COMMENT ON COLUMN engaged_leads.meeting_booked IS 'Whether this lead has booked a meeting';
COMMENT ON COLUMN engaged_leads.meetings_booked_at IS 'Timestamp when the first meeting was booked';

-- Step 2: Update engaged_leads with meeting_booked = TRUE and meetings_booked_at
-- for all leads that have matching records in meetings_booked
-- Matches on email AND client for multi-tenant safety
-- Uses earliest meeting time (MIN) if a lead has multiple meetings

UPDATE engaged_leads el
SET 
  meeting_booked = TRUE,
  meetings_booked_at = subq.earliest_meeting_time
FROM (
  SELECT 
    email,
    client,
    MIN(created_time) as earliest_meeting_time
  FROM meetings_booked
  WHERE email IS NOT NULL 
    AND client IS NOT NULL
  GROUP BY email, client
) subq
WHERE el.email = subq.email
  AND el.client = subq.client
  AND el.email IS NOT NULL
  AND el.client IS NOT NULL;

-- Optional: Show summary of updated rows
-- Uncomment to see how many rows were updated
-- SELECT COUNT(*) as updated_rows
-- FROM engaged_leads
-- WHERE meeting_booked = TRUE
--   AND meetings_booked_at IS NOT NULL;

