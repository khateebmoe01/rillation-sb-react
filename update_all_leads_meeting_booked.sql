-- ============================================================================
-- SQL Script: Update all_leads Meeting Booked Status
-- Created: 2025-01-05
-- Description: Marks all leads in all_leads table as having booked a meeting
--              with precise campaign attribution when available
-- ============================================================================

-- Pass 1: Match by email + client + campaign_id (precise attribution)
-- For the 114 meetings_booked records that have campaign_id
UPDATE all_leads al
SET 
  "meeting_booked" = TRUE,
  "booked_date" = mb.created_time
FROM meetings_booked mb
WHERE LOWER(TRIM(al.email)) = LOWER(TRIM(mb.email))
  AND al.client = mb.client
  AND al.campaign_id = mb.campaign_id
  AND mb.campaign_id IS NOT NULL
  AND al.email IS NOT NULL
  AND mb.email IS NOT NULL;

-- Pass 2: Match by email + client only (for 37 without campaign_id)
-- Falls back to marking all campaigns for that lead
UPDATE all_leads al
SET 
  "meeting_booked" = TRUE,
  "booked_date" = mb.created_time
FROM meetings_booked mb
WHERE LOWER(TRIM(al.email)) = LOWER(TRIM(mb.email))
  AND al.client = mb.client
  AND mb.campaign_id IS NULL
  AND al.email IS NOT NULL
  AND mb.email IS NOT NULL;

-- Pass 3: INSERT missing leads (those in meetings_booked but not in all_leads)
-- For records WITH campaign_id - insert with precise campaign
INSERT INTO all_leads (
  email,
  campaign_id,
  client,
  first_name,
  last_name,
  full_name,
  job_title,
  company,
  company_linkedin,
  company_domain,
  campaign_name,
  profile_url,
  created_time,
  industry,
  annual_revenue,
  company_size,
  year_founded,
  company_hq_city,
  company_hq_state,
  company_hq_country,
  tech_stack,
  is_hiring,
  business_model,
  funding_stage,
  growth_score,
  custom_variables_jsonb,
  "meeting_booked",
  "booked_date"
)
SELECT 
  mb.email,
  mb.campaign_id,
  mb.client,
  mb.first_name,
  mb.last_name,
  mb.full_name,
  mb.title,
  mb.company,
  mb.company_linkedin,
  mb.company_domain,
  mb.campaign_name,
  mb.profile_url,
  mb.created_time,
  mb.industry,
  mb.annual_revenue,
  mb.company_size,
  mb.year_founded,
  mb.company_hq_city,
  mb.company_hq_state,
  mb.company_hq_country,
  mb.tech_stack,
  mb.is_hiring,
  mb.business_model,
  mb.funding_stage,
  mb.growth_score,
  mb.custom_variables_jsonb,
  TRUE,
  mb.created_time
FROM meetings_booked mb
WHERE NOT EXISTS (
  SELECT 1 FROM all_leads al
  WHERE LOWER(TRIM(al.email)) = LOWER(TRIM(mb.email))
    AND al.client = mb.client
    AND (
      -- Match on campaign_id if both have it
      (al.campaign_id = mb.campaign_id AND mb.campaign_id IS NOT NULL)
      -- Or match just email+client if meetings_booked has no campaign_id
      OR mb.campaign_id IS NULL
    )
)
AND mb.email IS NOT NULL;

-- Show results
SELECT COUNT(*) as total_leads_with_meeting_booked
FROM all_leads
WHERE "meeting_booked" = TRUE;
