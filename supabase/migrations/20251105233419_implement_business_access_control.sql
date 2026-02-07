/*
  # Implement Business Access Control

  1. Purpose
    - Block all access to inactive or blocked businesses at database level
    - Ensure only active businesses can perform any operations
    - SuperAdmins can always access everything
    - Normal users are blocked from inactive/blocked businesses

  2. Changes
    - Create helper function to check if business is accessible
    - Update ALL RLS policies to check business status
    - Block SELECT, INSERT, UPDATE operations for inactive/blocked businesses
    - Only 'active' and 'trial' statuses are allowed

  3. Security
    - Database-level enforcement (cannot be bypassed from frontend)
    - SuperAdmins bypass all restrictions
    - Normal users are completely blocked
*/

-- Create function to check if a business is accessible
CREATE OR REPLACE FUNCTION is_business_accessible(business_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  business_status text;
BEGIN
  -- Get the business status
  SELECT status INTO business_status
  FROM businesses
  WHERE id = business_id_param;
  
  -- Business is accessible if status is 'active' or 'trial'
  RETURN business_status IN ('active', 'trial');
END;
$$;

-- Create function to check if current user is superadmin
CREATE OR REPLACE FUNCTION is_current_user_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM business_users
    WHERE user_id = auth.uid()
    AND is_superadmin = true
    AND is_active = true
    LIMIT 1
  );
END;
$$;

-- Drop existing policies that we need to update
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

DROP POLICY IF EXISTS "Users can view own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can create transfers" ON transfers;
DROP POLICY IF EXISTS "Users can update own transfers" ON transfers;

DROP POLICY IF EXISTS "Users can view own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;

-- Recreate policies with business status checks for CLIENTS
CREATE POLICY "Users can view own clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

CREATE POLICY "Users can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

CREATE POLICY "Users can update own clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  )
  WITH CHECK (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

CREATE POLICY "Users can delete own clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

-- Recreate policies with business status checks for TRANSFERS
CREATE POLICY "Users can view own transfers"
  ON transfers
  FOR SELECT
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

CREATE POLICY "Users can create transfers"
  ON transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

CREATE POLICY "Users can update own transfers"
  ON transfers
  FOR UPDATE
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  )
  WITH CHECK (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

-- Recreate policies with business status checks for BUSINESSES
CREATE POLICY "Users can view own businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(id)
    )
  );

CREATE POLICY "Users can update own businesses"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(id)
    )
  )
  WITH CHECK (
    is_current_user_superadmin()
    OR (
      id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(id)
    )
  );

-- Recreate policies with business status checks for SUBSCRIPTIONS
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    is_current_user_superadmin()
    OR (
      business_id IN (
        SELECT business_id
        FROM business_users
        WHERE user_id = auth.uid()
        AND is_active = true
      )
      AND is_business_accessible(business_id)
    )
  );

-- Add index to improve performance
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(id, status) WHERE status IN ('active', 'trial');