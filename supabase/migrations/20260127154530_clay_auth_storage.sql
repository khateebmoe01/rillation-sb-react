-- Table to store Clay authentication session
-- Cookies expire after 24 hours and are refreshed daily by the clay-auth-refresh edge function
-- Created: 2026-01-27

CREATE TABLE IF NOT EXISTS clay_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_cookie TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only keep one row (latest session) using a unique constraint on a constant
CREATE UNIQUE INDEX IF NOT EXISTS clay_auth_singleton ON clay_auth ((true));

-- Function to get the current valid Clay session (for use in other SQL if needed)
CREATE OR REPLACE FUNCTION get_clay_session()
RETURNS TEXT AS $$
  SELECT session_cookie
  FROM clay_auth
  WHERE expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Schedule daily refresh at 5 AM UTC (before business hours)
SELECT cron.schedule(
  'refresh-clay-auth-daily',
  '0 5 * * *',  -- Every day at 5:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://pfxgcavxdktxooiqthoi.supabase.co/functions/v1/clay-auth-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := jsonb_build_object(
      'scheduled', true,
      'timestamp', now()
    )
  ) as request_id;
  $$
);

-- Comment for documentation
COMMENT ON TABLE clay_auth IS 'Stores Clay session cookies that are refreshed daily. Cookies expire after 24 hours.';
