-- Clay.com Integration Tables
-- Stores configuration for Clay workbook automation

-- Global workbook templates (reusable across clients)
CREATE TABLE IF NOT EXISTS clay_workbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  table_configs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-client Clay configuration
CREATE TABLE IF NOT EXISTS clay_client_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client TEXT NOT NULL UNIQUE,
  workspace_id TEXT,
  workbook_mappings JSONB DEFAULT '{}',
  table_configs JSONB DEFAULT '[]',
  column_prompts JSONB DEFAULT '{}',
  sync_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution audit log
CREATE TABLE IF NOT EXISTS clay_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client TEXT,
  action TEXT NOT NULL,
  config_snapshot JSONB,
  status TEXT DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clay_client_configs_client ON clay_client_configs(client);
CREATE INDEX IF NOT EXISTS idx_clay_execution_logs_client ON clay_execution_logs(client);
CREATE INDEX IF NOT EXISTS idx_clay_execution_logs_status ON clay_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_clay_execution_logs_started_at ON clay_execution_logs(started_at DESC);

-- Enable RLS
ALTER TABLE clay_workbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clay_client_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clay_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policies (allow authenticated users)
CREATE POLICY "Allow authenticated read clay_workbook_templates" ON clay_workbook_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert clay_workbook_templates" ON clay_workbook_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update clay_workbook_templates" ON clay_workbook_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read clay_client_configs" ON clay_client_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert clay_client_configs" ON clay_client_configs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update clay_client_configs" ON clay_client_configs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read clay_execution_logs" ON clay_execution_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert clay_execution_logs" ON clay_execution_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update clay_execution_logs" ON clay_execution_logs
  FOR UPDATE TO authenticated USING (true);
