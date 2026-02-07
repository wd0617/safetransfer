/*
  # Fix RLS Policies - No Recursion V2

  ## Problem
  Previous policies caused infinite recursion by querying the same table they protect.
  
  ## Solution
  Use simple subqueries that don't create circular dependencies
  
  ## Changes
  - Drop ALL existing policies
  - Create simple, non-recursive policies
  - Use IN clauses with subqueries instead of EXISTS
  
  ## Security
  - Users can only access their own business data
  - No recursive policy checks
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "authenticated_insert_business" ON businesses;
DROP POLICY IF EXISTS "authenticated_select_business" ON businesses;
DROP POLICY IF EXISTS "admin_update_business" ON businesses;
DROP POLICY IF EXISTS "anyone_can_create_business" ON businesses;
DROP POLICY IF EXISTS "view_own_business" ON businesses;

DROP POLICY IF EXISTS "authenticated_insert_business_user" ON business_users;
DROP POLICY IF EXISTS "user_select_own_business_user" ON business_users;
DROP POLICY IF EXISTS "user_update_own_business_user" ON business_users;
DROP POLICY IF EXISTS "admin_update_business_users" ON business_users;
DROP POLICY IF EXISTS "create_own_profile" ON business_users;
DROP POLICY IF EXISTS "view_own_profile" ON business_users;
DROP POLICY IF EXISTS "update_own_profile" ON business_users;

DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can view their business clients" ON clients;
DROP POLICY IF EXISTS "Users can update their business clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their business clients" ON clients;
DROP POLICY IF EXISTS "insert_clients" ON clients;
DROP POLICY IF EXISTS "view_clients" ON clients;
DROP POLICY IF EXISTS "update_clients" ON clients;
DROP POLICY IF EXISTS "delete_clients" ON clients;

DROP POLICY IF EXISTS "Users can insert transfers" ON transfers;
DROP POLICY IF EXISTS "Users can view their business transfers" ON transfers;
DROP POLICY IF EXISTS "Users can update their business transfers" ON transfers;
DROP POLICY IF EXISTS "insert_transfers" ON transfers;
DROP POLICY IF EXISTS "view_transfers" ON transfers;
DROP POLICY IF EXISTS "update_transfers" ON transfers;

DROP POLICY IF EXISTS "Users can insert alerts" ON legal_alerts;
DROP POLICY IF EXISTS "Users can view their business alerts" ON legal_alerts;
DROP POLICY IF EXISTS "Users can update their business alerts" ON legal_alerts;
DROP POLICY IF EXISTS "Users can delete their business alerts" ON legal_alerts;
DROP POLICY IF EXISTS "insert_alerts" ON legal_alerts;
DROP POLICY IF EXISTS "view_alerts" ON legal_alerts;
DROP POLICY IF EXISTS "update_alerts" ON legal_alerts;
DROP POLICY IF EXISTS "delete_alerts" ON legal_alerts;

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================

CREATE POLICY "businesses_insert"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "businesses_select"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "businesses_update"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- BUSINESS_USERS TABLE - Only check own user_id
-- ============================================================================

CREATE POLICY "business_users_insert"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "business_users_select"
  ON business_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "business_users_update"
  ON business_users FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================

CREATE POLICY "clients_insert"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clients_select"
  ON clients FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clients_update"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clients_delete"
  ON clients FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRANSFERS TABLE
-- ============================================================================

CREATE POLICY "transfers_insert"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transfers_select"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transfers_update"
  ON transfers FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRANSFER_VALIDATIONS TABLE
-- ============================================================================

CREATE POLICY "transfer_validations_insert"
  ON transfer_validations FOR INSERT
  TO authenticated
  WITH CHECK (
    checking_business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transfer_validations_select"
  ON transfer_validations FOR SELECT
  TO authenticated
  USING (
    checking_business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
    OR
    found_business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================

CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- LEGAL_ALERTS TABLE
-- ============================================================================

CREATE POLICY "legal_alerts_insert"
  ON legal_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "legal_alerts_select"
  ON legal_alerts FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "legal_alerts_update"
  ON legal_alerts FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "legal_alerts_delete"
  ON legal_alerts FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );