-- Fix cron job authentication to use correct secret name
-- The secret is stored as SUPABASE_SERVICE_ROLE_KEY in Vault
-- Created: 2026-01-24

-- Unschedule old jobs if they exist (ignore errors if they don't)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-inboxes-bison-every-15-min');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if job doesn't exist
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-inbox-tags-every-30-min');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if job doesn't exist
END $$;

-- Re-schedule with correct Vault secret reference
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
