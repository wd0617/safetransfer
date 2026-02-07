/*
  # Add Subscription and Payment Management Schema

  1. New Tables
    - `subscriptions`
      - Tracks subscription details for each business
      - Includes trial period, payment dates, and subscription status
    - `payments`
      - Records payment history for each business
      - Tracks payment amounts, dates, and status
    - `admin_notifications`
      - Stores notifications for superadmin (payment due, trial expiring, etc.)
    - `admin_messages`
      - Internal messaging system from admin to businesses

  2. Changes to Existing Tables
    - Add subscription-related fields to `businesses` table
    - Add status field for business activation/suspension

  3. Security
    - Enable RLS on all new tables
    - Only superadmins can manage subscriptions and payments
    - Businesses can view their own subscription and payment info
*/

-- Add subscription status to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'status'
  ) THEN
    ALTER TABLE businesses ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'blocked'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'blocked_reason'
  ) THEN
    ALTER TABLE businesses ADD COLUMN blocked_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'blocked_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN blocked_at timestamptz;
  END IF;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_type text DEFAULT 'standard' CHECK (plan_type IN ('trial', 'standard', 'premium')) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled')) NOT NULL,
  trial_start_date timestamptz,
  trial_end_date timestamptz,
  trial_months integer DEFAULT 0,
  is_trial boolean DEFAULT false,
  monthly_price decimal(10,2) DEFAULT 0.00,
  next_payment_date timestamptz,
  last_payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_date timestamptz DEFAULT now(),
  due_date timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) NOT NULL,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('payment_due', 'payment_overdue', 'trial_expiring', 'trial_expired', 'business_inactive', 'high_activity')),
  title text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')) NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create admin messages table (from admin to businesses)
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'info' CHECK (message_type IN ('info', 'warning', 'alert', 'notice')) NOT NULL,
  is_read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) NOT NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Superadmins can manage all subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

CREATE POLICY "Businesses can view own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.business_id = subscriptions.business_id
      AND business_users.is_active = true
    )
  );

-- RLS Policies for payments
CREATE POLICY "Superadmins can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

CREATE POLICY "Businesses can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.business_id = payments.business_id
      AND business_users.is_active = true
    )
  );

-- RLS Policies for admin notifications
CREATE POLICY "Superadmins can manage notifications"
  ON admin_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

-- RLS Policies for admin messages
CREATE POLICY "Superadmins can manage all messages"
  ON admin_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

CREATE POLICY "Businesses can view messages sent to them"
  ON admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.business_id = admin_messages.business_id
      AND business_users.is_active = true
    )
  );

-- RLS Policies for admin audit log
CREATE POLICY "Superadmins can view audit log"
  ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

CREATE POLICY "Superadmins can insert audit log"
  ON admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
      AND business_users.is_active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment_date ON subscriptions(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_business_id ON admin_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_messages_business_id ON admin_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_business_id ON admin_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);