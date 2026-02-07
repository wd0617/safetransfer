/*
  # Fix SuperAdmin Business Access

  1. Problem
    - BusinessDetail shows blank screen for SuperAdmins
    - Duplicate/conflicting RLS policies on businesses table
    - Function is_current_user_superadmin() may be causing recursion

  2. Solution
    - Drop duplicate policies
    - Simplify to use direct subqueries without functions
    - Ensure SuperAdmins can always view all businesses

  3. Changes
    - Remove conflicting policies
    - Create single clear policy for SuperAdmins
    - Create single clear policy for regular users
*/

-- Drop all existing policies on businesses
DROP POLICY IF EXISTS "Superadmins can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Superadmins can update all businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can read own business" ON businesses;

-- Create simplified policy for viewing businesses (SELECT)
-- SuperAdmins can see ALL businesses regardless of status
-- Regular users can only see their own business if it's active/trial
CREATE POLICY "View businesses policy"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    -- SuperAdmin check (direct subquery, no function)
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
    OR
    -- Regular user check (must be their business AND it must be accessible)
    (
      id IN (
        SELECT business_id FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND status IN ('active', 'trial')
    )
  );

-- Create simplified policy for updating businesses (UPDATE)
-- Only SuperAdmins can update ANY business
-- Regular users can only update their own business if it's active/trial
CREATE POLICY "Update businesses policy"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    -- SuperAdmin check
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
    OR
    -- Regular user check
    (
      id IN (
        SELECT business_id FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND status IN ('active', 'trial')
    )
  )
  WITH CHECK (
    -- SuperAdmin check
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
      LIMIT 1
    )
    OR
    -- Regular user check
    (
      id IN (
        SELECT business_id FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND status IN ('active', 'trial')
    )
  );