-- Schedule sync-fathom-calls to run every 2 minutes
-- Syncs Fathom call recordings and transcripts
-- Created: 2026-01-24

SELECT cron.schedule(
  'sync-fathom-calls-every-2-min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pfxgcavxdktxooiqthoi.supabase.co/functions/v1/sync-fathom-calls',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := jsonb_build_object(
      'limit', 50,
      'force', false,
      'scheduled', true,
      'timestamp', now()
    )
  ) as request_id;
  $$
);

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

-- View job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To unschedule this job (if needed):
-- SELECT cron.unschedule('sync-fathom-calls-every-2-min');
