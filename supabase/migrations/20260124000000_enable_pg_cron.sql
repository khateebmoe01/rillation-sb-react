-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Note: After running this migration, you may need to configure database settings:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'your-supabase-url';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
