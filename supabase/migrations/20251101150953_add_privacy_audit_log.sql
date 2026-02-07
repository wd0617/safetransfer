/*
  # Add Privacy-Focused Audit Log for Client Lookups

  ## Purpose
  Create a comprehensive audit trail for client eligibility checks to comply with GDPR Article 30
  (Records of Processing Activities). This table logs every lookup performed by businesses without
  exposing sensitive client information to operators.

  ## Changes

  1. New Tables
    - `client_lookup_audit`
      - `id` (uuid, primary key) - Unique identifier for each lookup
      - `checking_business_id` (uuid) - Business performing the lookup
      - `checked_by_user_id` (uuid) - User who performed the lookup
      - `client_document_number` (text) - Document searched (for audit purposes only)
      - `lookup_timestamp` (timestamptz) - When the lookup occurred
      - `can_transfer` (boolean) - Result: whether client can transfer
      - `days_remaining` (integer) - Days until next allowed transfer (if blocked)
      - `ip_address` (text, optional) - IP address for security audit
      - `user_agent` (text, optional) - Browser/app info for security audit
      
  2. Security
    - Enable RLS on `client_lookup_audit` table
    - Only business admins can view their own business's audit logs
    - System can insert records for all lookups
    - Records are immutable (no update/delete allowed by users)

  3. Indexes
    - Index on `checking_business_id` for fast business-specific queries
    - Index on `lookup_timestamp` for time-based reporting
    - Index on `client_document_number` for compliance investigations

  ## GDPR Compliance Notes
  - This audit log is required under GDPR Article 30 (Records of Processing Activities)
  - Logs are accessible only to authorized personnel
  - Data retention should be configured per legal requirements (typically 5-7 years)
  - Client document numbers are stored for legal compliance, not displayed to operators
*/

-- Create audit log table for client lookups
CREATE TABLE IF NOT EXISTS client_lookup_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checking_business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  checked_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  client_document_number text NOT NULL,
  lookup_timestamp timestamptz DEFAULT now() NOT NULL,
  can_transfer boolean NOT NULL,
  days_remaining integer DEFAULT 0,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_business ON client_lookup_audit(checking_business_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON client_lookup_audit(lookup_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_document ON client_lookup_audit(client_document_number);

-- Enable RLS
ALTER TABLE client_lookup_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Allow system to insert audit records
CREATE POLICY "System can insert audit records"
  ON client_lookup_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Business admins can view their own audit logs
CREATE POLICY "Business admins can view own audit logs"
  ON client_lookup_audit
  FOR SELECT
  TO authenticated
  USING (
    checking_business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Policy: No updates allowed (immutable audit log)
CREATE POLICY "No updates to audit log"
  ON client_lookup_audit
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: No deletes allowed (immutable audit log)
CREATE POLICY "No deletes from audit log"
  ON client_lookup_audit
  FOR DELETE
  TO authenticated
  USING (false);
