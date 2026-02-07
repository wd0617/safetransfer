/*
  # Fix Initial Signup Policies

  ## Problem
  New users can't signup because get_user_business_id() returns NULL for new users
  
  ## Solution
  1. Allow INSERT on businesses without business_id check
  2. Allow INSERT on business_users when user is creating their own record
  3. Keep security for existing users
*/

-- Drop the conflicting admin insert policy
DROP POLICY IF EXISTS "Admins can insert users" ON business_users;

-- Recreate with better logic that allows both new signup and admin adding users
CREATE POLICY "Users can create business_user records"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Either creating own record (signup)
    user_id = auth.uid()
    OR
    -- Or is admin adding user to their business
    (
      is_business_admin() AND 
      business_id = get_user_business_id()
    )
  );