/*
  # Add Signup Function

  ## Problem
  RLS policies block business creation during signup because business_users 
  doesn't exist yet when we try to create the business.
  
  ## Solution
  Create a database function that runs with SECURITY DEFINER to bypass RLS
  and handle the entire signup process atomically.
  
  ## Changes
  1. Create a function to handle business + business_user creation
  2. Function runs with elevated privileges to bypass RLS
  3. Frontend will call this function instead of direct inserts
  
  ## Security
  - Function validates user is authenticated
  - Function ensures user can only create records for themselves
  - All operations are atomic (all succeed or all fail)
*/

-- Drop function if it exists
DROP FUNCTION IF EXISTS create_business_and_user;

-- Create the signup function that bypasses RLS
CREATE OR REPLACE FUNCTION create_business_and_user(
  p_business_name TEXT,
  p_business_email TEXT,
  p_full_name TEXT,
  p_user_email TEXT,
  p_language TEXT DEFAULT 'es'
)
RETURNS TABLE (
  business_id UUID,
  business_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_business_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user already has a business
  IF EXISTS (SELECT 1 FROM business_users WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'User already has a business';
  END IF;
  
  -- Create business
  INSERT INTO businesses (name, email, country)
  VALUES (p_business_name, p_business_email, 'IT')
  RETURNING id INTO v_business_id;
  
  -- Create business user
  INSERT INTO business_users (
    business_id,
    user_id,
    role,
    full_name,
    email,
    language
  )
  VALUES (
    v_business_id,
    v_user_id,
    'admin',
    p_full_name,
    p_user_email,
    p_language
  )
  RETURNING id INTO v_business_user_id;
  
  -- Return the IDs
  RETURN QUERY SELECT v_business_id, v_business_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_business_and_user TO authenticated;