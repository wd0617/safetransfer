/*
  # Add Superadmin Support

  1. Changes
    - Add `is_superadmin` column to `business_users` table
    - Default value is `false` for all existing and new users
    - Only superadmins can view all businesses and perform cross-business operations

  2. Security
    - No changes to RLS policies needed
    - Superadmin status is checked in the application layer
    - Regular users cannot modify this field (handled by application logic)
*/

-- Add is_superadmin column to business_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_users' AND column_name = 'is_superadmin'
  ) THEN
    ALTER TABLE business_users 
    ADD COLUMN is_superadmin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create an index for faster superadmin queries
CREATE INDEX IF NOT EXISTS idx_business_users_superadmin 
ON business_users(is_superadmin) 
WHERE is_superadmin = true;