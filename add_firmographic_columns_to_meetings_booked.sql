-- Add firmographic columns to meetings_booked table
-- These columns are copied from engaged_leads table

ALTER TABLE meetings_booked 
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS annual_revenue TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS company_hq_city TEXT,
  ADD COLUMN IF NOT EXISTS company_hq_state TEXT,
  ADD COLUMN IF NOT EXISTS company_hq_country TEXT,
  ADD COLUMN IF NOT EXISTS year_founded TEXT,
  ADD COLUMN IF NOT EXISTS business_model TEXT,
  ADD COLUMN IF NOT EXISTS funding_stage TEXT,
  ADD COLUMN IF NOT EXISTS tech_stack TEXT[],
  ADD COLUMN IF NOT EXISTS is_hiring BOOLEAN,
  ADD COLUMN IF NOT EXISTS growth_score TEXT;

-- Update meetings_booked with data from engaged_leads
-- Matching on email and client to ensure correct records are updated
UPDATE meetings_booked mb
SET 
  company_size = el.company_size,
  annual_revenue = el.annual_revenue,
  industry = el.industry,
  company_hq_city = el.company_hq_city,
  company_hq_state = el.company_hq_state,
  company_hq_country = el.company_hq_country,
  year_founded = el.year_founded,
  business_model = el.business_model,
  funding_stage = el.funding_stage,
  tech_stack = el.tech_stack,
  is_hiring = el.is_hiring,
  growth_score = el.growth_score
FROM engaged_leads el
WHERE mb.email = el.email 
  AND mb.client = el.client
  AND (
    el.company_size IS NOT NULL
    OR el.annual_revenue IS NOT NULL
    OR el.industry IS NOT NULL
    OR el.company_hq_city IS NOT NULL
    OR el.company_hq_state IS NOT NULL
    OR el.company_hq_country IS NOT NULL
    OR el.year_founded IS NOT NULL
    OR el.business_model IS NOT NULL
    OR el.funding_stage IS NOT NULL
    OR el.tech_stack IS NOT NULL
    OR el.is_hiring IS NOT NULL
    OR el.growth_score IS NOT NULL
  );

