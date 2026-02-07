/*
  # Add Business Contact Information and Auto-Trial

  1. New Fields
    - Add contact information fields to businesses table (phone, address, location, etc.)
    - Add activity tracking fields

  2. Changes
    - Create trigger to automatically create 1-month trial subscription for new businesses

  3. Security
    - Maintain existing RLS policies
*/

-- Add contact and location fields to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'address'
  ) THEN
    ALTER TABLE businesses ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'city'
  ) THEN
    ALTER TABLE businesses ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'country'
  ) THEN
    ALTER TABLE businesses ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE businesses ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create function to automatically create trial subscription for new businesses
CREATE OR REPLACE FUNCTION create_trial_subscription_for_new_business()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
    business_id,
    plan_type,
    status,
    is_trial,
    trial_start_date,
    trial_end_date,
    trial_months,
    monthly_price,
    next_payment_date
  ) VALUES (
    NEW.id,
    'trial',
    'active',
    true,
    NOW(),
    NOW() + INTERVAL '1 month',
    1,
    0,
    NOW() + INTERVAL '1 month'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create trial subscription
DROP TRIGGER IF EXISTS auto_create_trial_subscription ON businesses;
CREATE TRIGGER auto_create_trial_subscription
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription_for_new_business();

-- Create function to update business last activity
CREATE OR REPLACE FUNCTION update_business_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses
  SET last_activity_at = NOW()
  WHERE id = NEW.business_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to track business activity
DROP TRIGGER IF EXISTS update_activity_on_transfer ON transfers;
CREATE TRIGGER update_activity_on_transfer
  AFTER INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_business_last_activity();

DROP TRIGGER IF EXISTS update_activity_on_client ON clients;
CREATE TRIGGER update_activity_on_client
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_business_last_activity();