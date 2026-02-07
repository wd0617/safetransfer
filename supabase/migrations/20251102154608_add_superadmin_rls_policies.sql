/*
  # Add SuperAdmin RLS Policies

  1. Changes
    - Update RLS policies to allow superadmins to view all data across businesses
    - Superadmins can view (SELECT) all businesses, clients, transfers, and related data
    - Superadmins cannot modify data in other businesses (no INSERT/UPDATE/DELETE)
    - Regular users are unaffected and maintain their existing permissions

  2. Security
    - SELECT-only access for superadmins ensures they can monitor but not interfere
    - All existing policies remain in place for non-superadmin users
    - Superadmin status is verified through business_users.is_superadmin field

  3. Tables Affected
    - businesses: Allow superadmins to view all businesses
    - clients: Allow superadmins to view all clients
    - transfers: Allow superadmins to view all transfers
    - business_users: Allow superadmins to view all users
    - legal_alerts: Allow superadmins to view all alerts
*/

-- Allow superadmins to view all businesses
CREATE POLICY "Superadmins can view all businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

-- Allow superadmins to view all clients
CREATE POLICY "Superadmins can view all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

-- Allow superadmins to view all transfers
CREATE POLICY "Superadmins can view all transfers"
  ON transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

-- Allow superadmins to view all business users
CREATE POLICY "Superadmins can view all business users"
  ON business_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.user_id = auth.uid()
      AND bu.is_superadmin = true
      AND bu.is_active = true
    )
  );

-- Allow superadmins to view all legal alerts
CREATE POLICY "Superadmins can view all legal alerts"
  ON legal_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );