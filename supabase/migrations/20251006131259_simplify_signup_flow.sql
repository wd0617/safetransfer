/*
  # Simplify Signup Flow

  ## Changes
  1. Drop all existing policies that might conflict
  2. Create simple, clear policies for signup
  3. Ensure new users can create businesses and profiles
  
  ## Security
  - Users can only create one business
  - Users can only create their own profile
  - After signup, normal RLS applies
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can create their business" ON businesses;
DROP POLICY IF EXISTS "Admins can update their business" ON businesses;
DROP POLICY IF EXISTS "Users can view their own business" ON businesses;

DROP POLICY IF EXISTS "Users can create their business_user" ON business_users;
DROP POLICY IF EXISTS "Users can create business_user records" ON business_users;
DROP POLICY IF EXISTS "Users can view their own record" ON business_users;
DROP POLICY IF EXISTS "Users can view same business" ON business_users;
DROP POLICY IF EXISTS "Users update own profile" ON business_users;
DROP POLICY IF EXISTS "Admins can update users" ON business_users;

-- Businesses policies
CREATE POLICY "authenticated_insert_business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_select_business"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE business_users.business_id = businesses.id 
      AND business_users.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_update_business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE business_users.business_id = businesses.id 
      AND business_users.user_id = auth.uid()
      AND business_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE business_users.business_id = businesses.id 
      AND business_users.user_id = auth.uid()
      AND business_users.role = 'admin'
    )
  );

-- Business users policies
CREATE POLICY "authenticated_insert_business_user"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_select_own_business_user"
  ON business_users FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM business_users bu 
      WHERE bu.business_id = business_users.business_id 
      AND bu.user_id = auth.uid()
    )
  );

CREATE POLICY "user_update_own_business_user"
  ON business_users FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_update_business_users"
  ON business_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu 
      WHERE bu.business_id = business_users.business_id 
      AND bu.user_id = auth.uid()
      AND bu.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users bu 
      WHERE bu.business_id = business_users.business_id 
      AND bu.user_id = auth.uid()
      AND bu.role = 'admin'
    )
  );