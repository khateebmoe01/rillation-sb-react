-- Add campaign_name and mentioned_users columns to client_iteration_logs
-- for @mention functionality with Slack notifications

-- Add campaign_name column (optional - can be "General" or a specific campaign)
ALTER TABLE client_iteration_logs
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- Add mentioned_users column (JSONB array of {slack_id, display_name})
ALTER TABLE client_iteration_logs
ADD COLUMN IF NOT EXISTS mentioned_users JSONB DEFAULT '[]'::jsonb;

-- Add comment for new columns
COMMENT ON COLUMN client_iteration_logs.campaign_name IS 'Optional campaign name associated with this iteration log entry';
COMMENT ON COLUMN client_iteration_logs.mentioned_users IS 'Array of mentioned users with slack_id and display_name for Slack notifications';

-- Add index for campaign_name lookups
CREATE INDEX IF NOT EXISTS idx_iteration_logs_campaign_name ON client_iteration_logs(campaign_name);
