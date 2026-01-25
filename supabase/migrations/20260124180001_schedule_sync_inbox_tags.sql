-- Schedule sync-inbox-tags to run every 30 minutes
-- Syncs inbox tags and tag assignments from EmailBison API
-- Created: 2026-01-24

SELECT cron.schedule(
  'sync-inbox-tags-every-30-min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pfxgcavxdktxooiqthoi.supabase.co/functions/v1/sync-inbox-tags',
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

COMMENT ON EXTENSION cron IS 'Automated sync job for EmailBison tags - runs every 30 minutes';
