-- ============================================================================
-- TRIGGER: Auto-enrich meetings_booked from engaged_leads
-- Created: 2024-12-19
-- Description: Automatically enriches meetings_booked rows with lead details
--              from engaged_leads when a new meeting is inserted.
--              Matches by email AND client for multi-tenant safety.
-- ============================================================================

-- ============================================
-- TRIGGER FUNCTION: enrich_meetings_booked_from_leads
-- Purpose: Enriches a newly inserted meetings_booked row with data from
--          engaged_leads by matching email and client
-- ============================================

CREATE OR REPLACE FUNCTION enrich_meetings_booked_from_leads()
RETURNS TRIGGER AS $$
DECLARE
  lead_record engaged_leads%ROWTYPE;
BEGIN
  -- Skip if email or client is NULL
  IF NEW.email IS NULL OR NEW.client IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find matching lead in engaged_leads by email and client
  SELECT * INTO lead_record
  FROM engaged_leads
  WHERE email = NEW.email
    AND client = NEW.client
  LIMIT 1;

  -- If no matching lead found, return the row unchanged
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Update the new row with data from engaged_leads
  -- Overwrite strategy: Always use values from engaged_leads (even if NULL)
  -- Basic lead info (engaged_leads has first_name/last_name, not full_name)
  NEW.full_name = TRIM(COALESCE(lead_record.first_name, '') || ' ' || COALESCE(lead_record.last_name, ''));
  NEW.first_name = lead_record.first_name;
  NEW.last_name = lead_record.last_name;
  NEW.company = lead_record.company;

  -- Firmographic columns
  NEW.company_size = lead_record.company_size;
  NEW.annual_revenue = lead_record.annual_revenue;
  NEW.industry = lead_record.industry;
  NEW.company_hq_city = lead_record.company_hq_city;
  NEW.company_hq_state = lead_record.company_hq_state;
  NEW.company_hq_country = lead_record.company_hq_country;
  NEW.year_founded = lead_record.year_founded;
  NEW.business_model = lead_record.business_model;
  NEW.funding_stage = lead_record.funding_stage;
  NEW.tech_stack = lead_record.tech_stack;
  NEW.is_hiring = lead_record.is_hiring;
  NEW.growth_score = lead_record.growth_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: enrich_meetings_booked_on_insert
-- Purpose: Fires before INSERT on meetings_booked to enrich with lead data
--          Using BEFORE allows us to modify NEW directly without an extra UPDATE
-- ============================================

CREATE TRIGGER enrich_meetings_booked_on_insert
  BEFORE INSERT ON meetings_booked
  FOR EACH ROW
  EXECUTE FUNCTION enrich_meetings_booked_from_leads();

COMMENT ON FUNCTION enrich_meetings_booked_from_leads() IS 'Enriches meetings_booked rows with lead details from engaged_leads by matching email and client';
COMMENT ON TRIGGER enrich_meetings_booked_on_insert ON meetings_booked IS 'Automatically enriches newly inserted meetings with lead data from engaged_leads';

