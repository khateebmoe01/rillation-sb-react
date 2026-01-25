-- Schedule sync-inboxes-bison to run every 15 minutes
-- Syncs email inbox data from EmailBison API
-- Created: 2026-01-24

SELECT cron.schedule(
  'sync-inboxes-bison-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pfxgcavxdktxooiqthoi.supabase.co/functions/v1/sync-inboxes-bison',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := jsonb_build_object(
      'mode', 'background',
      'scheduled', true,
      'timestamp', now()
    )
  ) as request_id;
  $$
);

COMMENT ON EXTENSION cron IS 'Automated sync job for EmailBison inboxes - runs every 15 minutes';
