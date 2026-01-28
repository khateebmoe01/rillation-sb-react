-- Diagnose Fathom Cron Job Issues
-- Run this in Supabase SQL Editor to check the cron status

-- 1. Check if pg_cron extension is enabled
SELECT 'pg_cron extension' as check_item,
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
            THEN '✅ Installed' ELSE '❌ Not installed' END as status;

-- 2. Check if pg_net extension is enabled (required for HTTP calls)
SELECT 'pg_net extension' as check_item,
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
            THEN '✅ Installed' ELSE '❌ Not installed' END as status;

-- 3. List all scheduled cron jobs
SELECT '--- SCHEDULED CRON JOBS ---' as section;
SELECT jobid, jobname, schedule, active, command
FROM cron.job
ORDER BY jobname;

-- 4. Check for fathom-specific jobs
SELECT '--- FATHOM CRON JOBS ---' as section;
SELECT jobid, jobname, schedule, active,
       CASE WHEN active THEN '✅ Active' ELSE '❌ Inactive' END as job_status
FROM cron.job
WHERE jobname LIKE '%fathom%';

-- 5. Check recent cron job runs (last 10)
SELECT '--- RECENT CRON JOB RUNS ---' as section;
SELECT
  jobid,
  runid,
  job_pid,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- 6. Check if vault secret exists
SELECT '--- VAULT SECRETS CHECK ---' as section;
SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  ) THEN '✅ SUPABASE_SERVICE_ROLE_KEY found in Vault'
  ELSE '❌ SUPABASE_SERVICE_ROLE_KEY NOT in Vault - this is likely the problem!'
  END as vault_status;

-- 7. Check client_fathom_calls table stats
SELECT '--- FATHOM CALLS TABLE STATS ---' as section;
SELECT
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE client = '' OR client IS NULL) as unassigned_calls,
  COUNT(*) FILTER (WHERE client != '' AND client IS NOT NULL) as assigned_calls,
  MAX(created_at) as last_sync_time
FROM client_fathom_calls;

-- 8. Instructions to fix
SELECT '
=== HOW TO FIX ===

If SUPABASE_SERVICE_ROLE_KEY is NOT in Vault:

1. Go to Supabase Dashboard
2. Navigate to: Settings > Vault > Secrets
3. Click "Add new secret"
4. Name: SUPABASE_SERVICE_ROLE_KEY
5. Value: [Your service role key from Settings > API]
6. Click Save

Then run the new migration or manually trigger a sync.

=== MANUAL SYNC ===

To manually trigger a sync now, run this:

SELECT net.http_post(
  url := ''https://pfxgcavxdktxooiqthoi.supabase.co/functions/v1/sync-fathom-calls'',
  headers := ''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb,
  body := ''{"limit": 50}''::jsonb
);

Replace YOUR_SERVICE_ROLE_KEY with your actual service role key.
' as instructions;
