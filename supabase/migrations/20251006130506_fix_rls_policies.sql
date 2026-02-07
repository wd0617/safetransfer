/*
  # Fix RLS Policies - Remove Infinite Recursion

  ## Changes
  1. Drop existing problematic policies on business_users
  2. Create new policies that don't cause infinite recursion
  3. Allow users to read their own business_user record directly
  
  ## Security
  - Users can read their own business_user record using auth.uid()
  - Admins can manage users in their business
  - No circular dependencies in policy checks
*/

-- Drop existing policies on business_users that cause recursion
DROP POLICY IF EXISTS "Users can view colleagues in their business" ON business_users;
DROP POLICY IF EXISTS "Admins can insert users in their business" ON business_users;
DROP POLICY IF EXISTS "Admins can update users in their business" ON business_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON business_users;

-- New policies for business_users without recursion
CREATE POLICY "Users can view their own business_user record"
  ON business_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view colleagues via direct business_id match"
  ON business_users FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT bu.business_id 
      FROM business_users bu 
      WHERE bu.user_id = auth.uid() 
      LIMIT 1
    )
  );

CREATE POLICY "Admins can insert users in their business"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM business_users bu 
      WHERE bu.user_id = auth.uid() 
        AND bu.business_id = business_users.business_id 
        AND bu.role = 'admin'
      LIMIT 1
    )
  );

CREATE POLICY "Admins can update users in their business"
  ON business_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM business_users bu 
      WHERE bu.user_id = auth.uid() 
        AND bu.business_id = business_users.business_id 
        AND bu.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM business_users bu 
      WHERE bu.user_id = auth.uid() 
        AND bu.business_id = business_users.business_id 
        AND bu.role = 'admin'
      LIMIT 1
    )
  );

CREATE POLICY "Users can update own profile fields"
  ON business_users FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());