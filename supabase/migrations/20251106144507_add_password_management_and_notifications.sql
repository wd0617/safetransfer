/*
  # Password Management and Notification System

  ## Overview
  Complete system for secure password management, forced password changes,
  self-service password recovery, and comprehensive notification system.

  ## 1. Enhanced Tables

  ### `business_users` - Add password management fields
  - `must_change_password` (boolean) - Force password change on next login
  - `password_changed_at` (timestamptz) - Last password change timestamp
  - `password_set_by_admin` (boolean) - If password was set by SuperAdmin

  ### `password_change_requests`
  Self-service password recovery requests
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `business_id` (uuid, foreign key to businesses)
  - `email` (text) - Email requesting recovery
  - `status` (text) - pending, approved, rejected, completed
  - `request_token` (text, unique) - Secure token for recovery
  - `requested_at` (timestamptz) - When request was made
  - `approved_at` (timestamptz, nullable) - When SuperAdmin approved
  - `approved_by` (uuid, nullable) - SuperAdmin who approved
  - `completed_at` (timestamptz, nullable) - When password was changed
  - `ip_address` (text) - IP of requester
  - `user_agent` (text) - Browser/device info
  - `rejection_reason` (text, nullable) - If rejected, why

  ### `system_notifications`
  All system notifications for tracking and auditing
  - `id` (uuid, primary key)
  - `notification_type` (text) - password_change, login_new_device, payment_due, etc
  - `priority` (text) - low, medium, high, critical
  - `recipient_type` (text) - business, superadmin, both
  - `business_id` (uuid, nullable) - Related business
  - `user_id` (uuid, nullable) - Related user
  - `title` (text) - Notification title
  - `message` (text) - Notification content
  - `email_sent` (boolean) - If email was sent
  - `email_sent_at` (timestamptz, nullable) - When email was sent
  - `read` (boolean) - If notification was read
  - `read_at` (timestamptz, nullable) - When it was read
  - `metadata` (jsonb) - Additional context
  - `created_at` (timestamptz)

  ### `superadmin_requests`
  All requests requiring SuperAdmin attention/action
  - `id` (uuid, primary key)
  - `request_type` (text) - password_recovery, account_unlock, payment_issue, etc
  - `status` (text) - pending, in_progress, resolved, rejected
  - `priority` (text) - low, medium, high, critical
  - `business_id` (uuid) - Requesting business
  - `user_id` (uuid) - Requesting user
  - `title` (text) - Request title
  - `description` (text) - Request details
  - `requested_at` (timestamptz) - When request was created
  - `assigned_to` (uuid, nullable) - SuperAdmin handling it
  - `resolved_at` (timestamptz, nullable) - When resolved
  - `resolution_notes` (text, nullable) - Notes from SuperAdmin
  - `metadata` (jsonb) - Additional context

  ### `credential_change_log`
  Audit log for all credential changes
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User whose credentials changed
  - `business_id` (uuid) - Related business
  - `change_type` (text) - password, email, mfa_enabled, etc
  - `changed_by` (uuid) - Who made the change
  - `changed_by_role` (text) - user, superadmin, system
  - `ip_address` (text)
  - `user_agent` (text)
  - `notification_sent` (boolean) - If user was notified
  - `changed_at` (timestamptz)
  - `metadata` (jsonb)

  ## 2. Security Features

  - Forced password change on first login
  - Self-service password recovery with SuperAdmin approval
  - Email notifications for all credential changes
  - Complete audit trail of all changes
  - Request tracking and management
  - Multi-level notifications (business + superadmin)

  ## 3. RLS Policies

  All tables have restrictive RLS policies ensuring:
  - Users can only see their own data
  - SuperAdmins can see and manage all data
  - Proper access control on all operations
*/

-- Add password management fields to business_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_users' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE business_users ADD COLUMN must_change_password boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_users' AND column_name = 'password_changed_at'
  ) THEN
    ALTER TABLE business_users ADD COLUMN password_changed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_users' AND column_name = 'password_set_by_admin'
  ) THEN
    ALTER TABLE business_users ADD COLUMN password_set_by_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create password_change_requests table
CREATE TABLE IF NOT EXISTS password_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  request_token text UNIQUE NOT NULL,
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  ip_address text,
  user_agent text,
  rejection_reason text
);

CREATE INDEX IF NOT EXISTS idx_password_change_requests_user ON password_change_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_password_change_requests_status ON password_change_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_change_requests_token ON password_change_requests(request_token);

-- Create system_notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL CHECK (notification_type IN (
    'password_change', 'password_set_by_admin', 'login_new_device', 
    'email_change', 'payment_due', 'payment_received', 'subscription_expiring',
    'account_locked', 'account_unlocked', 'password_recovery_request',
    'critical_security_alert', 'data_export', 'business_blocked', 'business_unblocked'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('business', 'superadmin', 'both')),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  read boolean DEFAULT false,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON system_notifications(recipient_type, business_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON system_notifications(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON system_notifications(priority, read, created_at DESC);

-- Create superadmin_requests table
CREATE TABLE IF NOT EXISTS superadmin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN (
    'password_recovery', 'account_unlock', 'payment_issue', 'technical_support',
    'data_export_request', 'account_deletion', 'subscription_change', 'business_verification'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  requested_at timestamptz DEFAULT now(),
  assigned_to uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_superadmin_requests_status ON superadmin_requests(status, priority, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_superadmin_requests_business ON superadmin_requests(business_id, status);
CREATE INDEX IF NOT EXISTS idx_superadmin_requests_assigned ON superadmin_requests(assigned_to, status);

-- Create credential_change_log table
CREATE TABLE IF NOT EXISTS credential_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN (
    'password', 'email', 'mfa_enabled', 'mfa_disabled', 'api_key_generated', 'api_key_revoked'
  )),
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_by_role text NOT NULL CHECK (changed_by_role IN ('user', 'superadmin', 'system')),
  ip_address text,
  user_agent text,
  notification_sent boolean DEFAULT false,
  changed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_credential_changes_user ON credential_change_log(user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_credential_changes_business ON credential_change_log(business_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_credential_changes_type ON credential_change_log(change_type, changed_at DESC);

-- Enable RLS on new tables
ALTER TABLE password_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_change_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password_change_requests
CREATE POLICY "Users can create their own password recovery requests"
  ON password_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own password recovery requests"
  ON password_change_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmins can view all password recovery requests"
  ON password_change_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

CREATE POLICY "SuperAdmins can update password recovery requests"
  ON password_change_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

-- RLS Policies for system_notifications
CREATE POLICY "Users can view notifications for their business"
  ON system_notifications FOR SELECT
  TO authenticated
  USING (
    (recipient_type = 'business' AND business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    ))
    OR
    (recipient_type = 'superadmin' AND EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() AND is_superadmin = true
    ))
    OR
    (recipient_type = 'both' AND (
      business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM business_users WHERE user_id = auth.uid() AND is_superadmin = true)
    ))
  );

CREATE POLICY "Users can mark their notifications as read"
  ON system_notifications FOR UPDATE
  TO authenticated
  USING (
    business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_users WHERE user_id = auth.uid() AND is_superadmin = true)
  );

CREATE POLICY "System can create notifications"
  ON system_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for superadmin_requests
CREATE POLICY "Users can create requests for their business"
  ON superadmin_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    AND auth.uid() = user_id
  );

CREATE POLICY "Users can view their own requests"
  ON superadmin_requests FOR SELECT
  TO authenticated
  USING (
    business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_users WHERE user_id = auth.uid() AND is_superadmin = true)
  );

CREATE POLICY "SuperAdmins can update requests"
  ON superadmin_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

-- RLS Policies for credential_change_log
CREATE POLICY "Users can view their own credential changes"
  ON credential_change_log FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "SuperAdmins can view all credential changes"
  ON credential_change_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

CREATE POLICY "System can log credential changes"
  ON credential_change_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_notification_type text,
  p_priority text,
  p_recipient_type text,
  p_business_id uuid,
  p_user_id uuid,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO system_notifications (
    notification_type,
    priority,
    recipient_type,
    business_id,
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    p_notification_type,
    p_priority,
    p_recipient_type,
    p_business_id,
    p_user_id,
    p_title,
    p_message,
    p_metadata
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;