-- ============================================================================
-- AUTHENTICATION POLICIES
-- ============================================================================
-- Migration: Setup Auth Policies
-- Created: 2025-01-10
-- Description: Enable RLS and create policies for authenticated users
-- ============================================================================

-- Helper function to safely enable RLS on a table if it exists
DO $$
DECLARE
  tbl_name TEXT;
  tables_to_enable TEXT[] := ARRAY[
    'Clients',
    'Campaigns',
    'campaign_reporting',
    'replies',
    'meetings_booked',
    'client_targets',
    'funnel_forecasts',
    'inboxes',
    'storeleads',
    'client_opportunities',
    'client_iteration_logs'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_enable
  LOOP
    -- Check if table exists and enable RLS
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND information_schema.tables.table_name = CASE 
        WHEN tbl_name = 'Clients' THEN 'Clients' 
        WHEN tbl_name = 'Campaigns' THEN 'Campaigns'
        ELSE LOWER(tbl_name) 
      END
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 
        CASE 
          WHEN tbl_name = 'Clients' THEN 'Clients' 
          WHEN tbl_name = 'Campaigns' THEN 'Campaigns'
          ELSE tbl_name 
        END);
      RAISE NOTICE 'Enabled RLS on table: %', tbl_name;
    ELSE
      RAISE NOTICE 'Table does not exist, skipping: %', tbl_name;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- CLIENTS TABLE
-- ============================================
-- Allow authenticated users to read all clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'Clients' 
    AND policyname = 'Allow authenticated users to read clients'
  ) THEN
    CREATE POLICY "Allow authenticated users to read clients"
    ON "Clients"
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
-- Allow authenticated users to read all campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'Campaigns' 
    AND policyname = 'Allow authenticated users to read campaigns'
  ) THEN
    CREATE POLICY "Allow authenticated users to read campaigns"
    ON "Campaigns"
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- ============================================
-- CAMPAIGN_REPORTING TABLE
-- ============================================
-- Allow authenticated users to read all campaign reporting data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'campaign_reporting' 
    AND policyname = 'Allow authenticated users to read campaign_reporting'
  ) THEN
    CREATE POLICY "Allow authenticated users to read campaign_reporting"
    ON campaign_reporting
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- ============================================
-- REPLIES TABLE
-- ============================================
-- Allow authenticated users to read all replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'replies' 
    AND policyname = 'Allow authenticated users to read replies'
  ) THEN
    CREATE POLICY "Allow authenticated users to read replies"
    ON replies
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'replies' 
    AND policyname = 'Allow authenticated users to insert replies'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert replies"
    ON replies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'replies' 
    AND policyname = 'Allow authenticated users to update replies'
  ) THEN
    CREATE POLICY "Allow authenticated users to update replies"
    ON replies
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- MEETINGS_BOOKED TABLE
-- ============================================
-- Allow authenticated users to read all meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'meetings_booked' 
    AND policyname = 'Allow authenticated users to read meetings_booked'
  ) THEN
    CREATE POLICY "Allow authenticated users to read meetings_booked"
    ON meetings_booked
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'meetings_booked' 
    AND policyname = 'Allow authenticated users to insert meetings_booked'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert meetings_booked"
    ON meetings_booked
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'meetings_booked' 
    AND policyname = 'Allow authenticated users to update meetings_booked'
  ) THEN
    CREATE POLICY "Allow authenticated users to update meetings_booked"
    ON meetings_booked
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- CLIENT_TARGETS TABLE
-- ============================================
-- Allow authenticated users to read all targets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_targets' 
    AND policyname = 'Allow authenticated users to read client_targets'
  ) THEN
    CREATE POLICY "Allow authenticated users to read client_targets"
    ON client_targets
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_targets' 
    AND policyname = 'Allow authenticated users to manage client_targets'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage client_targets"
    ON client_targets
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- FUNNEL_FORECASTS TABLE
-- ============================================
-- Allow authenticated users to read all forecasts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'funnel_forecasts' 
    AND policyname = 'Allow authenticated users to read funnel_forecasts'
  ) THEN
    CREATE POLICY "Allow authenticated users to read funnel_forecasts"
    ON funnel_forecasts
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'funnel_forecasts' 
    AND policyname = 'Allow authenticated users to manage funnel_forecasts'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage funnel_forecasts"
    ON funnel_forecasts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- INBOXES TABLE
-- ============================================
-- Allow authenticated users to read all inboxes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'inboxes' 
    AND policyname = 'Allow authenticated users to read inboxes'
  ) THEN
    CREATE POLICY "Allow authenticated users to read inboxes"
    ON inboxes
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'inboxes' 
    AND policyname = 'Allow authenticated users to manage inboxes'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage inboxes"
    ON inboxes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- STORELEADS TABLE
-- ============================================
-- Allow authenticated users to read all leads (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'storeleads'
  ) THEN
    -- Allow authenticated users to read all leads
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'storeleads' 
      AND policyname = 'Allow authenticated users to read storeleads'
    ) THEN
      CREATE POLICY "Allow authenticated users to read storeleads"
      ON storeleads
      FOR SELECT
      TO authenticated
      USING (true);
    END IF;

    -- Allow authenticated users to insert/update leads
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'storeleads' 
      AND policyname = 'Allow authenticated users to manage storeleads'
    ) THEN
      CREATE POLICY "Allow authenticated users to manage storeleads"
      ON storeleads
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============================================
-- CLIENT_OPPORTUNITIES TABLE
-- ============================================
-- Allow authenticated users to read all opportunities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_opportunities' 
    AND policyname = 'Allow authenticated users to read client_opportunities'
  ) THEN
    CREATE POLICY "Allow authenticated users to read client_opportunities"
    ON client_opportunities
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_opportunities' 
    AND policyname = 'Allow authenticated users to manage client_opportunities'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage client_opportunities"
    ON client_opportunities
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- CLIENT_ITERATION_LOGS TABLE
-- ============================================
-- Allow authenticated users to read all iteration logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_iteration_logs' 
    AND policyname = 'Allow authenticated users to read client_iteration_logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to read client_iteration_logs"
    ON client_iteration_logs
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_iteration_logs' 
    AND policyname = 'Allow authenticated users to insert client_iteration_logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert client_iteration_logs"
    ON client_iteration_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_iteration_logs' 
    AND policyname = 'Allow authenticated users to update client_iteration_logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to update client_iteration_logs"
    ON client_iteration_logs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- These policies allow ALL authenticated users to access ALL data.
-- For production, you may want to restrict access based on:
-- - User roles (admin, user, viewer)
-- - Client associations (users can only see their assigned clients)
-- - Organization/team membership
--
-- Example of more restrictive policy:
-- CREATE POLICY "Users can only see their client data"
-- ON campaign_reporting
-- FOR SELECT
-- TO authenticated
-- USING (client = auth.jwt() ->> 'client_name');
-- ============================================================================
