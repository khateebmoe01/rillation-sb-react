-- Create client_iteration_logs table for tracking per-client iterations and changes
CREATE TABLE IF NOT EXISTS client_iteration_logs (
    id BIGSERIAL PRIMARY KEY,
    client TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on client for faster lookups
CREATE INDEX IF NOT EXISTS idx_iteration_logs_client ON client_iteration_logs(client);

-- Add index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_iteration_logs_created_at ON client_iteration_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE client_iteration_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON client_iteration_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Also allow anonymous access (for Supabase anon key)
CREATE POLICY "Allow anonymous access" ON client_iteration_logs
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE client_iteration_logs IS 'Tracks iterations and changes made to client campaigns';
COMMENT ON COLUMN client_iteration_logs.client IS 'Client name';
COMMENT ON COLUMN client_iteration_logs.action_type IS 'Type of action (Strategy Change, Copy Update, etc.)';
COMMENT ON COLUMN client_iteration_logs.description IS 'Description of the change or iteration';
COMMENT ON COLUMN client_iteration_logs.created_by IS 'Name of the person who made the change';
COMMENT ON COLUMN client_iteration_logs.created_at IS 'Timestamp when the log was created';


