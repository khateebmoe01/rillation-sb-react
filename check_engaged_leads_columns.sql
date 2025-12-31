-- Query to check all columns in engaged_leads table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'engaged_leads'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Alternative: Quick check for specific firmographic-related column names
SELECT 
    column_name,
    data_type
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
    )
ORDER BY column_name;




