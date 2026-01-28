-- Fix Fathom sync cron job
-- The previous cron job failed because SUPABASE_SERVICE_ROLE_KEY wasn't in Vault
-- This migration removes the broken job and recreates it properly
-- Created: 2026-01-28

-- First, unschedule any existing fathom sync jobs
SELECT cron.unschedule('sync-fathom-calls-every-2-min');

-- Check if we have the required extensions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron extension is required but not installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'pg_net extension is required but not installed';
  END IF;
END $$;

-- Create a helper function to get the service role key
-- This uses the service_role key from Supabase's built-in auth
CREATE OR REPLACE FUNCTION get_service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_value TEXT;
BEGIN
  -- Try vault first
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF key_value IS NOT NULL THEN
    RETURN key_value;
  END IF;

  -- Fallback: try to get from current_setting (set by Supabase)
  BEGIN
    key_value := current_setting('supabase.service_role_key', true);
    IF key_value IS NOT NULL AND key_value != '' THEN
      RETURN key_value;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

-- Re-create the cron job with better error handling
-- Runs every 5 minutes (less aggressive than 2 minutes)
SELECT cron.schedule(
  'sync-fathom-calls-every-5-min',
  '*/5 * * * *',
  $$
  DO $$
  DECLARE
    service_key TEXT;
    request_result BIGINT;
  BEGIN
    -- Get the service role key
    service_key := get_service_role_key();

    IF service_key IS NULL THEN
      RAISE WARNING 'Fathom sync: No service role key available. Please add SUPABASE_SERVICE_ROLE_KEY to Vault.';
      RETURN;
    END IF;

    -- Make the HTTP request
    SELECT net.http_post(
      url := 'https://pfxgcavxdktxooiqthoi.supabase.co/functions/v1/sync-fathom-calls',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'limit', 50,
        'force', false,
        'scheduled', true,
        'timestamp', now()
      )
    ) INTO request_result;

    RAISE NOTICE 'Fathom sync triggered, request_id: %', request_result;
  END $$;
  $$
);

-- Add a comment explaining how to add the vault secret
COMMENT ON FUNCTION get_service_role_key() IS
'Returns the Supabase service role key for cron jobs.
To configure: Go to Supabase Dashboard > Settings > Vault > Secrets
Add a secret named "SUPABASE_SERVICE_ROLE_KEY" with your service role key value.';
