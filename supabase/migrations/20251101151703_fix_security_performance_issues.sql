/*
  # Fix Security and Performance Issues

  ## Purpose
  Address security and performance issues:
  - Add missing indexes on foreign keys
  - Fix RLS policies to use (select auth.uid()) for performance
  - Remove duplicate indexes
  - Set secure search_path on functions

  ## Changes
  1. Add missing foreign key indexes
  2. Optimize RLS policies with (select auth.uid())
  3. Remove duplicate indexes
  4. Secure function search paths
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_client_lookup_audit_user_id ON client_lookup_audit(checked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_legal_alerts_client_id ON legal_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_legal_alerts_resolved_by ON legal_alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_legal_alerts_transfer_id ON legal_alerts(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_validations_checking_business ON transfer_validations(checking_business_id);
CREATE INDEX IF NOT EXISTS idx_transfer_validations_found_business ON transfer_validations(found_business_id);
CREATE INDEX IF NOT EXISTS idx_transfer_validations_found_transfer ON transfer_validations(found_transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created_by ON transfers(created_by);

-- Remove duplicate index
DROP INDEX IF EXISTS idx_clients_document;

-- Optimize RLS policies
DROP POLICY IF EXISTS businesses_select ON businesses;
CREATE POLICY "businesses_select" ON businesses FOR SELECT TO authenticated
  USING (id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS businesses_update ON businesses;
CREATE POLICY "businesses_update" ON businesses FOR UPDATE TO authenticated
  USING (id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS business_users_insert ON business_users;
CREATE POLICY "business_users_insert" ON business_users FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS business_users_select ON business_users;
CREATE POLICY "business_users_select" ON business_users FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS business_users_update ON business_users;
CREATE POLICY "business_users_update" ON business_users FOR UPDATE TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS clients_insert ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS clients_select ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS clients_update ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS clients_delete ON clients;
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS transfers_insert ON transfers;
CREATE POLICY "transfers_insert" ON transfers FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS transfers_select ON transfers;
CREATE POLICY "transfers_select" ON transfers FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS transfers_update ON transfers;
CREATE POLICY "transfers_update" ON transfers FOR UPDATE TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS transfer_validations_insert ON transfer_validations;
CREATE POLICY "transfer_validations_insert" ON transfer_validations FOR INSERT TO authenticated
  WITH CHECK (checking_business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS transfer_validations_select ON transfer_validations;
CREATE POLICY "transfer_validations_select" ON transfer_validations FOR SELECT TO authenticated
  USING (checking_business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS legal_alerts_insert ON legal_alerts;
CREATE POLICY "legal_alerts_insert" ON legal_alerts FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS legal_alerts_select ON legal_alerts;
CREATE POLICY "legal_alerts_select" ON legal_alerts FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS legal_alerts_update ON legal_alerts;
CREATE POLICY "legal_alerts_update" ON legal_alerts FOR UPDATE TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS legal_alerts_delete ON legal_alerts;
CREATE POLICY "legal_alerts_delete" ON legal_alerts FOR DELETE TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Business admins can view own audit logs" ON client_lookup_audit;
CREATE POLICY "Business admins can view own audit logs" ON client_lookup_audit FOR SELECT TO authenticated
  USING (checking_business_id IN (SELECT business_id FROM business_users WHERE user_id = (select auth.uid())));

-- Secure function search paths
CREATE OR REPLACE FUNCTION check_transfer_eligibility_private(
  p_document_number text, p_checking_business_id uuid, p_checked_by_user_id uuid
)
RETURNS TABLE(can_transfer boolean, days_remaining integer, message text) 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_last_transfer_date timestamptz; v_next_allowed_date timestamptz;
  v_days_diff integer; v_can_transfer boolean; v_days_remaining integer; v_message text;
BEGIN
  SELECT t.transfer_date, t.next_allowed_date INTO v_last_transfer_date, v_next_allowed_date
  FROM transfers t INNER JOIN clients c ON t.client_id = c.id
  WHERE c.document_number = p_document_number AND t.status = 'completed'
  ORDER BY t.transfer_date DESC LIMIT 1;

  IF v_last_transfer_date IS NULL THEN
    v_can_transfer := true; v_days_remaining := 0; v_message := 'eligible';
  ELSIF v_next_allowed_date <= now() THEN
    v_can_transfer := true; v_days_remaining := 0; v_message := 'eligible';
  ELSE
    v_can_transfer := false;
    v_days_diff := CEIL(EXTRACT(EPOCH FROM (v_next_allowed_date - now())) / 86400);
    v_days_remaining := GREATEST(v_days_diff, 0); v_message := 'waiting_period';
  END IF;

  INSERT INTO client_lookup_audit (checking_business_id, checked_by_user_id, client_document_number, lookup_timestamp, can_transfer, days_remaining)
  VALUES (p_checking_business_id, p_checked_by_user_id, p_document_number, now(), v_can_transfer, v_days_remaining);

  RETURN QUERY SELECT v_can_transfer, v_days_remaining, v_message;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_business_id(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_business_id uuid;
BEGIN
  SELECT bu.business_id INTO v_business_id FROM business_users bu WHERE bu.user_id = p_user_id LIMIT 1;
  RETURN v_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION is_business_admin(p_user_id uuid, p_business_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_is_admin boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM business_users bu WHERE bu.user_id = p_user_id AND bu.business_id = p_business_id AND bu.role = 'admin') INTO v_is_admin;
  RETURN v_is_admin;
END;
$$;
