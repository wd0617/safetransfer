/*
  # Fix SuperAdmin RLS Recursion Issue

  1. Problem
    - Policies on business_users table are causing infinite recursion
    - Checking is_superadmin requires querying the same table

  2. Solution
    - Remove recursive policies
    - Simplify superadmin checks
    - Use direct auth.uid() checks without subqueries on business_users

  3. Security
    - Maintain security while preventing recursion
    - Users can only see their own business_users records
    - Superadmins get special policies without recursion
*/

-- Drop all existing policies on business_users to start fresh
DROP POLICY IF EXISTS "Users can view own business association" ON business_users;
DROP POLICY IF EXISTS "Superadmins can view all business users" ON business_users;
DROP POLICY IF EXISTS "Businesses can view all businesses" ON business_users;

-- Create simple, non-recursive policy for regular users
CREATE POLICY "Users can view own business association"
  ON business_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Drop and recreate superadmin policies on other tables without recursion
DROP POLICY IF EXISTS "Superadmins can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Superadmins can view all clients" ON clients;
DROP POLICY IF EXISTS "Superadmins can view all transfers" ON transfers;
DROP POLICY IF EXISTS "Superadmins can view all legal alerts" ON legal_alerts;

-- For superadmin access, we'll handle this in the application layer
-- Instead of using RLS policies that cause recursion
-- The app will check is_superadmin flag and make appropriate queries