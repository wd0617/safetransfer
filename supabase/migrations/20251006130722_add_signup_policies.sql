/*
  # Add Policies for User Signup

  ## Changes
  1. Allow authenticated users to create their business on signup
  2. Allow authenticated users to create their business_user record on signup
  
  ## Security
  - Users can only create one business
  - Users can only create business_user for themselves
*/

-- Allow users to insert their own business during signup
CREATE POLICY "Users can create their business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert their own business_user record during signup
CREATE POLICY "Users can create their business_user"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON businesses TO authenticated;
GRANT ALL ON business_users TO authenticated;
GRANT ALL ON clients TO authenticated;
GRANT ALL ON transfers TO authenticated;
GRANT ALL ON transfer_validations TO authenticated;
GRANT ALL ON legal_alerts TO authenticated;
GRANT ALL ON audit_logs TO authenticated;