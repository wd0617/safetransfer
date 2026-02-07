/*
  # Simplify SuperAdmin Policies V2

  1. Problem
    - The is_superadmin() function may be causing RLS recursion or performance issues
    - BusinessDetail is showing blank screen

  2. Solution
    - Drop policies first, then the function
    - Use direct subquery in policies to avoid recursion
    - Add proper indexes for performance

  3. Changes
    - Drop existing superadmin policies first
    - Drop the function
    - Create new simplified policies with direct subqueries
*/

-- Drop existing superadmin policies first
DROP POLICY IF EXISTS "Superadmins can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Superadmins can manage all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Superadmins can manage all payments" ON payments;
DROP POLICY IF EXISTS "Superadmins can view all clients" ON clients;
DROP POLICY IF EXISTS "Superadmins can view all transfers" ON transfers;
DROP POLICY IF EXISTS "Superadmins can view all business users" ON business_users;

-- Now drop the function
DROP FUNCTION IF EXISTS is_superadmin(uuid);

-- Create new simplified policies for businesses
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
      LIMIT 1
    )
  );

CREATE POLICY "Superadmins can update all businesses"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  );

-- Create new simplified policies for subscriptions
CREATE POLICY "Superadmins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "Superadmins can insert subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "Superadmins can update subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  );

-- Create new simplified policies for payments
CREATE POLICY "Superadmins can view all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "Superadmins can insert payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "Superadmins can update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
  );

-- Create new simplified policies for clients
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
      LIMIT 1
    )
  );

-- Create new simplified policies for transfers
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
      LIMIT 1
    )
  );

-- Create new simplified policies for business_users
CREATE POLICY "Superadmins can view all business_users"
  ON business_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.user_id = auth.uid()
      AND bu.is_superadmin = true
      AND bu.is_active = true
      LIMIT 1
    )
  );

-- Add index to improve performance of superadmin checks
CREATE INDEX IF NOT EXISTS idx_business_users_superadmin 
ON business_users(user_id, is_superadmin, is_active) 
WHERE is_superadmin = true AND is_active = true;