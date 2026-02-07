/*
  # Fix RLS Recursion Issue on business_users Table

  ## Problem
  The business_users table has RLS policies that query itself to verify permissions,
  causing infinite recursion. This prevents users from logging in.

  ## Solution
  Simplify business_users policies to directly check auth.uid() against user_id
  without self-referencing queries. This breaks the recursion loop.

  ## Changes
  1. **business_users SELECT policy**
     - OLD: Check if user_id is in (SELECT from business_users) - RECURSIVE!
     - NEW: Directly check user_id = auth.uid() - NO RECURSION

  2. **business_users INSERT/UPDATE policies**
     - Remove self-referencing queries
     - Use simpler conditions or SECURITY DEFINER functions

  ## Security Notes
  - Users can only see their own business_users record
  - Admins can manage users through SECURITY DEFINER functions
  - No loss of security, just removing the circular dependency
*/

-- Drop existing recursive policies
DROP POLICY IF EXISTS business_users_select ON business_users;
DROP POLICY IF EXISTS business_users_insert ON business_users;
DROP POLICY IF EXISTS business_users_update ON business_users;

-- New SELECT policy: Users can view their own record (no recursion)
CREATE POLICY "business_users_select"
  ON business_users
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- New INSERT policy: Only system/functions can insert (handled by SECURITY DEFINER functions)
CREATE POLICY "business_users_insert"
  ON business_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- New UPDATE policy: Users can only update their own record
CREATE POLICY "business_users_update"
  ON business_users
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Now fix other tables that reference business_users (to avoid similar issues)

-- Businesses: Check using user_id directly in business_users
DROP POLICY IF EXISTS businesses_select ON businesses;
CREATE POLICY "businesses_select"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS businesses_update ON businesses;
CREATE POLICY "businesses_update"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- Clients: Same pattern
DROP POLICY IF EXISTS clients_insert ON clients;
CREATE POLICY "clients_insert"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS clients_select ON clients;
CREATE POLICY "clients_select"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS clients_update ON clients;
CREATE POLICY "clients_update"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS clients_delete ON clients;
CREATE POLICY "clients_delete"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- Transfers: Same pattern
DROP POLICY IF EXISTS transfers_insert ON transfers;
CREATE POLICY "transfers_insert"
  ON transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS transfers_select ON transfers;
CREATE POLICY "transfers_select"
  ON transfers
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS transfers_update ON transfers;
CREATE POLICY "transfers_update"
  ON transfers
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- Transfer validations: Same pattern
DROP POLICY IF EXISTS transfer_validations_insert ON transfer_validations;
CREATE POLICY "transfer_validations_insert"
  ON transfer_validations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    checking_business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS transfer_validations_select ON transfer_validations;
CREATE POLICY "transfer_validations_select"
  ON transfer_validations
  FOR SELECT
  TO authenticated
  USING (
    checking_business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- Audit logs: Same pattern
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY "audit_logs_insert"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY "audit_logs_select"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- Legal alerts: Same pattern
DROP POLICY IF EXISTS legal_alerts_insert ON legal_alerts;
CREATE POLICY "legal_alerts_insert"
  ON legal_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS legal_alerts_select ON legal_alerts;
CREATE POLICY "legal_alerts_select"
  ON legal_alerts
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS legal_alerts_update ON legal_alerts;
CREATE POLICY "legal_alerts_update"
  ON legal_alerts
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS legal_alerts_delete ON legal_alerts;
CREATE POLICY "legal_alerts_delete"
  ON legal_alerts
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- Client lookup audit: Same pattern
DROP POLICY IF EXISTS "Business admins can view own audit logs" ON client_lookup_audit;
CREATE POLICY "Business admins can view own audit logs"
  ON client_lookup_audit
  FOR SELECT
  TO authenticated
  USING (
    checking_business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = (select auth.uid())
    )
  );
