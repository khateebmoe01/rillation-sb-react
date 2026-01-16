-- Migration: Create domain inventory and order management tables
-- Created: 2025-01-16
-- Purpose: Track domain purchases, provider orders, and generation templates

-- ============================================
-- Table: domain_inventory
-- Tracks all domains purchased or considered
-- ============================================
CREATE TABLE IF NOT EXISTS domain_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name TEXT NOT NULL UNIQUE,
  client TEXT,
  registrar TEXT CHECK (registrar IN ('porkbun', 'namecheap', 'godaddy', 'other')),
  inbox_provider TEXT CHECK (inbox_provider IN ('missioninbox', 'inboxkit', 'none')),
  status TEXT CHECK (status IN ('available', 'purchased', 'configured', 'in_use', 'expired', 'reserved')) DEFAULT 'available',
  purchased_at TIMESTAMPTZ,
  purchase_price NUMERIC(8,2),
  expires_at DATE,
  dns_configured BOOLEAN DEFAULT false,
  assigned_to_provider_at TIMESTAMPTZ,
  inboxes_ordered INTEGER DEFAULT 0,
  inboxes_active INTEGER DEFAULT 0,
  purchase_batch_id UUID,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE domain_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON domain_inventory
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_domain_inventory_client ON domain_inventory(client);
CREATE INDEX IF NOT EXISTS idx_domain_inventory_status ON domain_inventory(status);
CREATE INDEX IF NOT EXISTS idx_domain_inventory_inbox_provider ON domain_inventory(inbox_provider);
CREATE INDEX IF NOT EXISTS idx_domain_inventory_purchased_at ON domain_inventory(purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_inventory_batch ON domain_inventory(purchase_batch_id);

-- ============================================
-- Table: provider_orders
-- Tracks orders placed with MissionInbox/InboxKit
-- ============================================
CREATE TABLE IF NOT EXISTS provider_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref TEXT UNIQUE DEFAULT 'ORD-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
  provider TEXT NOT NULL CHECK (provider IN ('missioninbox', 'inboxkit')),
  order_type TEXT CHECK (order_type IN ('domains', 'mailboxes', 'both')) NOT NULL,
  client TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  domains JSONB DEFAULT '[]',
  mailbox_config JSONB DEFAULT '{}',
  csv_data TEXT,
  status TEXT CHECK (status IN ('draft', 'exported', 'submitted', 'processing', 'completed', 'failed')) DEFAULT 'draft',
  exported_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE provider_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON provider_orders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_orders_client ON provider_orders(client);
CREATE INDEX IF NOT EXISTS idx_provider_orders_provider ON provider_orders(provider);
CREATE INDEX IF NOT EXISTS idx_provider_orders_status ON provider_orders(status);
CREATE INDEX IF NOT EXISTS idx_provider_orders_created ON provider_orders(created_at DESC);

-- ============================================
-- Table: domain_generation_templates
-- Save reusable domain generation configs
-- ============================================
CREATE TABLE IF NOT EXISTS domain_generation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT,
  base_names JSONB NOT NULL DEFAULT '[]',
  prefixes JSONB DEFAULT '["try", "use", "join", "grow", "choose", "find", "go", "do", "get", "max", "pick", "start", "run", "new", "my", "pro", "top", "true", "next", "best", "one"]',
  suffixes JSONB DEFAULT '["go", "max", "pro", "top"]',
  tlds JSONB DEFAULT '[".co", ".info"]',
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE domain_generation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON domain_generation_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_domain_templates_client ON domain_generation_templates(client);

-- ============================================
-- Table: purchase_batches
-- Group domains purchased together
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  client TEXT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  domain_count INTEGER DEFAULT 0,
  total_cost NUMERIC(10,2),
  registrar TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchase_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON purchase_batches
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add foreign key
ALTER TABLE domain_inventory
ADD CONSTRAINT fk_domain_inventory_batch
FOREIGN KEY (purchase_batch_id) REFERENCES purchase_batches(id) ON DELETE SET NULL;

-- Comments
COMMENT ON TABLE domain_inventory IS 'Master inventory of all domains owned or considered';
COMMENT ON TABLE provider_orders IS 'Orders placed with inbox providers (MissionInbox, InboxKit)';
COMMENT ON TABLE domain_generation_templates IS 'Saved templates for domain name generation';
COMMENT ON TABLE purchase_batches IS 'Groups of domains purchased together';
COMMENT ON COLUMN domain_inventory.inbox_provider IS 'Which inbox provider this domain is assigned to (missioninbox, inboxkit, or none)';
COMMENT ON COLUMN provider_orders.mailbox_config IS 'JSON config for mailbox generation: first_names, last_names, password_pattern, warmup, etc.';
