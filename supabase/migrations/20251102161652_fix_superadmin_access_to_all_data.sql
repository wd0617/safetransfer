/*
  # Fix SuperAdmin Access to All Data

  1. Problem
    - Superadmins can only see their own business data
    - RLS policies are blocking access to other businesses

  2. Solution
    - Add policies that allow superadmins to view all data
    - Use auth metadata to check superadmin status without recursion

  3. Security
    - Only users with is_superadmin = true can access all data
    - Regular users can only see their own business data
*/

-- First, we need to update the auth metadata for superadmin users
-- This avoids RLS recursion by storing the flag in auth.users metadata

-- Create function to check if user is superadmin from business_users
CREATE OR REPLACE FUNCTION is_superadmin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_users
    WHERE business_users.user_id = is_superadmin.user_id
    AND business_users.is_superadmin = true
    AND business_users.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policies for superadmin on businesses table
DROP POLICY IF EXISTS "Superadmins can view all businesses" ON businesses;
CREATE POLICY "Superadmins can view all businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (is_superadmin(auth.uid()));

-- Add policies for superadmin on subscriptions
DROP POLICY IF EXISTS "Superadmins can manage all subscriptions" ON subscriptions;
CREATE POLICY "Superadmins can manage all subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- Add policies for superadmin on payments
DROP POLICY IF EXISTS "Superadmins can manage all payments" ON payments;
CREATE POLICY "Superadmins can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- Add policies for superadmin on clients
DROP POLICY IF EXISTS "Superadmins can view all clients" ON clients;
CREATE POLICY "Superadmins can view all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (is_superadmin(auth.uid()));

-- Add policies for superadmin on transfers
DROP POLICY IF EXISTS "Superadmins can view all transfers" ON transfers;
CREATE POLICY "Superadmins can view all transfers"
  ON transfers
  FOR SELECT
  TO authenticated
  USING (is_superadmin(auth.uid()));

-- Add policies for superadmin on business_users (to see all business users)
DROP POLICY IF EXISTS "Superadmins can view all business users" ON business_users;
CREATE POLICY "Superadmins can view all business users"
  ON business_users
  FOR SELECT
  TO authenticated
  USING (is_superadmin(auth.uid()));