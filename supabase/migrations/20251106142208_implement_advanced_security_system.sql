/*
  # Advanced Security System Implementation

  ## Overview
  Comprehensive security enhancement including session tracking, failed login attempts,
  rate limiting, enhanced audit logging, and fraud detection.

  ## 1. New Tables

  ### `security_sessions`
  Track active user sessions with device information
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `business_id` (uuid, foreign key to businesses)
  - `session_token` (text, unique) - Supabase session token
  - `ip_address` (text) - IP address of session
  - `user_agent` (text) - Browser/device information
  - `device_fingerprint` (text) - Unique device identifier
  - `last_activity_at` (timestamptz) - Last activity timestamp
  - `expires_at` (timestamptz) - Session expiration
  - `is_active` (boolean) - Session status
  - `created_at` (timestamptz)

  ### `failed_login_attempts`
  Track failed authentication attempts for security monitoring
  - `id` (uuid, primary key)
  - `email` (text) - Attempted login email
  - `ip_address` (text) - IP address of attempt
  - `user_agent` (text) - Browser/device information
  - `attempt_time` (timestamptz) - When attempt occurred
  - `failure_reason` (text) - Why authentication failed

  ### `account_lockouts`
  Track accounts locked due to suspicious activity
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users, nullable)
  - `email` (text) - Locked account email
  - `locked_at` (timestamptz) - When account was locked
  - `locked_until` (timestamptz) - When lock expires
  - `reason` (text) - Reason for lockout
  - `unlock_token` (text, unique, nullable) - Token for manual unlock
  - `is_active` (boolean) - Lock status

  ### `rate_limit_tracking`
  Track API calls for rate limiting sensitive operations
  - `id` (uuid, primary key)
  - `identifier` (text) - IP address or user_id
  - `action_type` (text) - Type of action (login, transfer, export, etc)
  - `count` (integer) - Number of attempts
  - `window_start` (timestamptz) - Start of rate limit window
  - `window_end` (timestamptz) - End of rate limit window
  - `blocked` (boolean) - If rate limit exceeded

  ### `password_reset_requests`
  Track password reset requests with security measures
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `business_id` (uuid, foreign key to businesses)
  - `email` (text) - Email requesting reset
  - `reset_token` (text, unique) - Secure reset token
  - `ip_address` (text) - IP address of request
  - `requested_at` (timestamptz) - When reset was requested
  - `expires_at` (timestamptz) - Token expiration
  - `used_at` (timestamptz, nullable) - When token was used
  - `is_used` (boolean) - If token has been used
  - `assisted_by_superadmin` (boolean) - If SuperAdmin helped with reset
  - `superadmin_id` (uuid, nullable) - SuperAdmin who assisted

  ### `security_alerts`
  Track security events and anomalies
  - `id` (uuid, primary key)
  - `alert_type` (text) - Type of alert (suspicious_login, unusual_transfer, etc)
  - `severity` (text) - low, medium, high, critical
  - `user_id` (uuid, nullable)
  - `business_id` (uuid, nullable)
  - `ip_address` (text, nullable)
  - `description` (text) - Alert details
  - `metadata` (jsonb) - Additional context
  - `resolved` (boolean) - If alert was addressed
  - `resolved_at` (timestamptz, nullable)
  - `resolved_by` (uuid, nullable)
  - `created_at` (timestamptz)

  ### `sensitive_data_access_log`
  Enhanced audit log for sensitive data access (GDPR compliance)
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `business_id` (uuid, foreign key to businesses)
  - `action` (text) - view, export, modify, delete
  - `entity_type` (text) - client, transfer, document
  - `entity_id` (uuid) - ID of accessed entity
  - `ip_address` (text) - IP address of access
  - `access_reason` (text, nullable) - Justification for access
  - `data_returned` (boolean) - If data was successfully returned
  - `accessed_at` (timestamptz)

  ## 2. Security Enhancements

  - Session tracking with device fingerprinting
  - Failed login attempt monitoring with automatic lockout
  - Rate limiting for sensitive operations
  - Comprehensive audit trail
  - Password reset with SuperAdmin assistance
  - Real-time security alerts
  - Sensitive data access logging
*/

-- Create security_sessions table
CREATE TABLE IF NOT EXISTS security_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  last_activity_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_sessions_user_id ON security_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_sessions_business_id ON security_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_security_sessions_active ON security_sessions(is_active, expires_at);

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  attempt_time timestamptz DEFAULT now(),
  failure_reason text
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address, attempt_time DESC);

-- Create account_lockouts table
CREATE TABLE IF NOT EXISTS account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  locked_at timestamptz DEFAULT now(),
  locked_until timestamptz NOT NULL,
  reason text NOT NULL,
  unlock_token text UNIQUE,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(email, is_active);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_token ON account_lockouts(unlock_token);

-- Create rate_limit_tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  window_end timestamptz NOT NULL,
  blocked boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_tracking(identifier, action_type, window_end);

-- Create password_reset_requests table
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email text NOT NULL,
  reset_token text UNIQUE NOT NULL,
  ip_address text,
  requested_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  is_used boolean DEFAULT false,
  assisted_by_superadmin boolean DEFAULT false,
  superadmin_id uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_requests(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_requests(user_id, is_used);

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'suspicious_login', 'multiple_failed_logins', 'unusual_transfer_pattern',
    'unusual_location', 'account_locked', 'data_export', 'privilege_escalation',
    'unusual_api_activity', 'suspicious_client_activity'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  ip_address text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_business ON security_alerts(business_id, created_at DESC);

-- Create sensitive_data_access_log table
CREATE TABLE IF NOT EXISTS sensitive_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view', 'export', 'modify', 'delete')),
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'transfer', 'document', 'user', 'business_settings')),
  entity_id uuid NOT NULL,
  ip_address text,
  access_reason text,
  data_returned boolean DEFAULT true,
  accessed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensitive_access_user ON sensitive_data_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_business ON sensitive_data_access_log(business_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_entity ON sensitive_data_access_log(entity_type, entity_id, accessed_at DESC);

-- Enable RLS on all new tables
ALTER TABLE security_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_sessions
CREATE POLICY "Users can view their own sessions"
  ON security_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmins can view all sessions"
  ON security_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

-- RLS Policies for failed_login_attempts
CREATE POLICY "Only SuperAdmins can view failed login attempts"
  ON failed_login_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

-- RLS Policies for account_lockouts
CREATE POLICY "SuperAdmins can view all lockouts"
  ON account_lockouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

CREATE POLICY "SuperAdmins can manage lockouts"
  ON account_lockouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

-- RLS Policies for password_reset_requests
CREATE POLICY "Users can view their own reset requests"
  ON password_reset_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmins can view all reset requests"
  ON password_reset_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

CREATE POLICY "SuperAdmins can create assisted reset requests"
  ON password_reset_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

-- RLS Policies for security_alerts
CREATE POLICY "SuperAdmins can view all security alerts"
  ON security_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

CREATE POLICY "System can create security alerts"
  ON security_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "SuperAdmins can update security alerts"
  ON security_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

-- RLS Policies for sensitive_data_access_log
CREATE POLICY "Users can view their own access logs"
  ON sensitive_data_access_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmins can view all access logs"
  ON sensitive_data_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.is_superadmin = true
    )
  );

CREATE POLICY "System can log sensitive data access"
  ON sensitive_data_access_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);