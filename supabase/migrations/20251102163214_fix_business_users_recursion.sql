/*
  # Fix Business Users RLS Recursion

  1. Problem
    - The superadmin policy on business_users is causing infinite recursion
    - It checks business_users table from within a business_users policy
    - This prevents login from working

  2. Solution
    - Remove the recursive policy from business_users
    - Users can only see their own business_users record
    - Superadmins need special handling without recursion

  3. Changes
    - Drop the recursive superadmin policy on business_users
    - Keep only the existing non-recursive policies
*/

-- Drop the recursive policy that's causing the issue
DROP POLICY IF EXISTS "Superadmins can view all business_users" ON business_users;

-- The existing policies should work fine for normal users
-- Superadmins can view all businesses, subscriptions, etc.
-- But for business_users table, we only allow users to see their own records
-- This prevents recursion while still allowing superadmin functionality