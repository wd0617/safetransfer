/*
  # Add SELECT policy for businesses table

  1. Changes
    - Add SELECT policy for businesses table to allow users to read their own business data
  
  2. Security
    - Users can only read businesses they are associated with through business_users table
*/

CREATE POLICY "Users can read own business"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = businesses.id
      AND business_users.user_id = auth.uid()
      AND business_users.is_active = true
    )
  );
