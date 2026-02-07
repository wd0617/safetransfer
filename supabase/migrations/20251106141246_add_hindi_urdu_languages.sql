/*
  # Add Hindi and Urdu Language Support

  1. Purpose
    - Extend language support to include Hindi (hi) and Urdu (ur)
    - Update the language check constraint on business_users table

  2. Changes
    - Drop existing language check constraint
    - Add new constraint allowing 'es', 'en', 'it', 'hi', 'ur'

  3. Notes
    - This enables users to select Hindi and Urdu in language preferences
    - All translations are already in place in the frontend
*/

-- Drop the existing constraint
ALTER TABLE business_users 
DROP CONSTRAINT IF EXISTS business_users_language_check;

-- Add new constraint with Hindi and Urdu support
ALTER TABLE business_users
ADD CONSTRAINT business_users_language_check 
CHECK (language IN ('es', 'en', 'it', 'hi', 'ur'));