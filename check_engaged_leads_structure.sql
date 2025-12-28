-- Query to check all columns in engaged_leads table
-- Run this in your Supabase SQL Editor to see all columns

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'engaged_leads'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Alternative: Check for firmographic-related columns specifically
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'engaged_leads'
    AND table_schema = 'public'
    AND (
        column_name ILIKE '%size%'
        OR column_name ILIKE '%industry%'
        OR column_name ILIKE '%revenue%'
        OR column_name ILIKE '%employee%'
        OR column_name ILIKE '%location%'
        OR column_name ILIKE '%city%'
        OR column_name ILIKE '%state%'
        OR column_name ILIKE '%country%'
        OR column_name ILIKE '%firmographic%'
        OR column_name ILIKE '%company%'
    )
ORDER BY column_name;

-- Get a sample row to see actual column names (only if table has data)
SELECT * 
FROM engaged_leads 
LIMIT 1;

