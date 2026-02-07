/*
  # Simplify RLS Policies to Avoid Recursion

  ## Changes
  1. Use simpler, non-recursive policies
  2. Rely on direct auth.uid() checks where possible
  3. Create helper function for business membership check
  
  ## Security
  - Simple, direct checks without circular dependencies
*/

-- Drop all existing business_users policies
DROP POLICY IF EXISTS "Users can view their own business_user record" ON business_users;
DROP POLICY IF EXISTS "Users can view colleagues via direct business_id match" ON business_users;
DROP POLICY IF EXISTS "Admins can insert users in their business" ON business_users;
DROP POLICY IF EXISTS "Admins can update users in their business" ON business_users;
DROP POLICY IF EXISTS "Users can update own profile fields" ON business_users;

-- Create a simple function to get user's business_id without recursion
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT business_id FROM business_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_business_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() AND role = 'admin' 
    LIMIT 1
  );
$$;

-- Simple policies using helper functions
CREATE POLICY "Users can view their own record"
  ON business_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view same business"
  ON business_users FOR SELECT
  TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Admins can insert users"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (
    is_business_admin() AND 
    business_id = get_user_business_id()
  );

CREATE POLICY "Admins can update users"
  ON business_users FOR UPDATE
  TO authenticated
  USING (business_id = get_user_business_id() AND is_business_admin())
  WITH CHECK (business_id = get_user_business_id() AND is_business_admin());

CREATE POLICY "Users update own profile"
  ON business_users FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update other table policies to use the helper function
DROP POLICY IF EXISTS "Users can view clients in their business" ON clients;
CREATE POLICY "Users can view clients in their business"
  ON clients FOR SELECT
  TO authenticated
  USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users can insert clients in their business" ON clients;
CREATE POLICY "Users can insert clients in their business"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users can update clients in their business" ON clients;
CREATE POLICY "Users can update clients in their business"
  ON clients FOR UPDATE
  TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

-- Update transfers policies
DROP POLICY IF EXISTS "Users can view transfers in their business" ON transfers;
CREATE POLICY "Users can view transfers in their business"
  ON transfers FOR SELECT
  TO authenticated
  USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users can insert transfers in their business" ON transfers;
CREATE POLICY "Users can insert transfers in their business"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users can update transfers in their business" ON transfers;
CREATE POLICY "Users can update transfers in their business"
  ON transfers FOR UPDATE
  TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

-- Update transfer_validations policies
DROP POLICY IF EXISTS "Users can view validations for their business" ON transfer_validations;
CREATE POLICY "Users can view validations for their business"
  ON transfer_validations FOR SELECT
  TO authenticated
  USING (checking_business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users can insert validations for their business" ON transfer_validations;
CREATE POLICY "Users can insert validations for their business"
  ON transfer_validations FOR INSERT
  TO authenticated
  WITH CHECK (checking_business_id = get_user_business_id());

-- Update legal_alerts policies
DROP POLICY IF EXISTS "Users can view alerts for their business" ON legal_alerts;
CREATE POLICY "Users can view alerts for their business"
  ON legal_alerts FOR SELECT
  TO authenticated
  USING (business_id = get_user_business_id());

DROP POLICY IF EXISTS "Users can update alerts in their business" ON legal_alerts;
CREATE POLICY "Users can update alerts in their business"
  ON legal_alerts FOR UPDATE
  TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

-- Update businesses policies
DROP POLICY IF EXISTS "Users can view their own business" ON businesses;
CREATE POLICY "Users can view their own business"
  ON businesses FOR SELECT
  TO authenticated
  USING (id = get_user_business_id());

DROP POLICY IF EXISTS "Admins can update their business" ON businesses;
CREATE POLICY "Admins can update their business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (id = get_user_business_id() AND is_business_admin())
  WITH CHECK (id = get_user_business_id() AND is_business_admin());

-- Update audit_logs policies
DROP POLICY IF EXISTS "Admins can view audit logs for their business" ON audit_logs;
CREATE POLICY "Admins can view audit logs for their business"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (business_id = get_user_business_id() AND is_business_admin());