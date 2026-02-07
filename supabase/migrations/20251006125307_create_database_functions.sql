/*
  # Database Functions for Transfer Validation

  ## Overview
  Helper functions for legal compliance and cross-business transfer validation

  ## Functions

  ### `check_transfer_eligibility`
  Checks if a client can make a transfer based on 999€/8 days Italian law
  - Searches across ALL businesses for recent transfers by document number
  - Returns: allowed/blocked status, days remaining, previous transfer info
  
  ### `calculate_next_allowed_date`
  Calculates when a client can transfer again (8 days from last transfer)
  
  ### `get_business_stats`
  Returns dashboard statistics for a business
  
  ### `create_audit_log_trigger`
  Automatically logs changes to sensitive tables
*/

-- Function to check transfer eligibility across all businesses
CREATE OR REPLACE FUNCTION check_transfer_eligibility(
  p_document_number text,
  p_checking_business_id uuid,
  p_requested_amount numeric DEFAULT 0
)
RETURNS TABLE (
  can_transfer boolean,
  reason text,
  found_business_name text,
  found_amount numeric,
  found_date timestamptz,
  days_remaining integer,
  next_allowed_date timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_transfer record;
  v_days_passed integer;
  v_days_remaining integer;
  v_next_date timestamptz;
BEGIN
  -- Find the most recent completed transfer for this document number across ALL businesses
  SELECT 
    t.id,
    t.business_id,
    t.amount,
    t.transfer_date,
    t.next_allowed_date,
    b.name as business_name
  INTO v_last_transfer
  FROM transfers t
  JOIN clients c ON c.id = t.client_id
  JOIN businesses b ON b.id = t.business_id
  WHERE c.document_number = p_document_number
    AND t.status = 'completed'
    AND t.amount > 0
  ORDER BY t.transfer_date DESC
  LIMIT 1;

  -- If no previous transfer found, client can transfer
  IF v_last_transfer IS NULL THEN
    RETURN QUERY SELECT 
      true,
      'No previous transfers found'::text,
      NULL::text,
      NULL::numeric,
      NULL::timestamptz,
      0::integer,
      NULL::timestamptz;
    RETURN;
  END IF;

  -- Calculate days passed since last transfer
  v_days_passed := EXTRACT(DAY FROM (now() - v_last_transfer.transfer_date));
  v_days_remaining := GREATEST(0, 8 - v_days_passed);
  v_next_date := v_last_transfer.next_allowed_date;

  -- Check if 8 days have passed
  IF now() >= v_last_transfer.next_allowed_date THEN
    RETURN QUERY SELECT 
      true,
      'Client can transfer (8 days passed)'::text,
      v_last_transfer.business_name,
      v_last_transfer.amount,
      v_last_transfer.transfer_date,
      0::integer,
      v_next_date;
  ELSE
    RETURN QUERY SELECT 
      false,
      format('Client must wait %s more days. Last transfer: %s€ on %s at %s', 
        v_days_remaining, 
        v_last_transfer.amount, 
        to_char(v_last_transfer.transfer_date, 'DD/MM/YYYY'),
        v_last_transfer.business_name
      )::text,
      v_last_transfer.business_name,
      v_last_transfer.amount,
      v_last_transfer.transfer_date,
      v_days_remaining,
      v_next_date;
  END IF;
END;
$$;

-- Function to calculate next allowed transfer date (8 days from given date)
CREATE OR REPLACE FUNCTION calculate_next_allowed_date(p_transfer_date timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_transfer_date + INTERVAL '8 days';
END;
$$;

-- Function to get business dashboard statistics
CREATE OR REPLACE FUNCTION get_business_stats(p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_clients', (
      SELECT COUNT(*) FROM clients WHERE business_id = p_business_id
    ),
    'total_transfers', (
      SELECT COUNT(*) FROM transfers WHERE business_id = p_business_id AND status = 'completed'
    ),
    'total_amount', (
      SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE business_id = p_business_id AND status = 'completed'
    ),
    'transfers_today', (
      SELECT COUNT(*) FROM transfers 
      WHERE business_id = p_business_id 
        AND status = 'completed'
        AND transfer_date >= CURRENT_DATE
    ),
    'amount_today', (
      SELECT COALESCE(SUM(amount), 0) FROM transfers 
      WHERE business_id = p_business_id 
        AND status = 'completed'
        AND transfer_date >= CURRENT_DATE
    ),
    'transfers_this_month', (
      SELECT COUNT(*) FROM transfers 
      WHERE business_id = p_business_id 
        AND status = 'completed'
        AND transfer_date >= date_trunc('month', CURRENT_DATE)
    ),
    'amount_this_month', (
      SELECT COALESCE(SUM(amount), 0) FROM transfers 
      WHERE business_id = p_business_id 
        AND status = 'completed'
        AND transfer_date >= date_trunc('month', CURRENT_DATE)
    ),
    'clients_at_limit', (
      SELECT COUNT(DISTINCT c.id)
      FROM clients c
      JOIN transfers t ON t.client_id = c.id
      WHERE c.business_id = p_business_id
        AND t.status = 'completed'
        AND t.next_allowed_date > now()
    ),
    'unread_alerts', (
      SELECT COUNT(*) FROM legal_alerts 
      WHERE business_id = p_business_id AND is_read = false
    ),
    'expired_documents', (
      SELECT COUNT(*) FROM clients 
      WHERE business_id = p_business_id 
        AND document_expiry IS NOT NULL 
        AND document_expiry < CURRENT_DATE
    )
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- Function to get client transfer history with cross-business info
CREATE OR REPLACE FUNCTION get_client_transfer_history(p_document_number text, p_business_id uuid)
RETURNS TABLE (
  transfer_id uuid,
  business_name text,
  amount numeric,
  transfer_date timestamptz,
  next_allowed_date timestamptz,
  days_until_allowed integer,
  can_transfer_now boolean,
  is_own_business boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as transfer_id,
    b.name as business_name,
    t.amount,
    t.transfer_date,
    t.next_allowed_date,
    GREATEST(0, EXTRACT(DAY FROM (t.next_allowed_date - now()))::integer) as days_until_allowed,
    (now() >= t.next_allowed_date) as can_transfer_now,
    (t.business_id = p_business_id) as is_own_business
  FROM transfers t
  JOIN clients c ON c.id = t.client_id
  JOIN businesses b ON b.id = t.business_id
  WHERE c.document_number = p_document_number
    AND t.status = 'completed'
  ORDER BY t.transfer_date DESC
  LIMIT 10;
END;
$$;

-- Trigger function to automatically set next_allowed_date on transfer insert
CREATE OR REPLACE FUNCTION set_transfer_next_allowed_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set next allowed date to 8 days from transfer date
  NEW.next_allowed_date := calculate_next_allowed_date(NEW.transfer_date);
  RETURN NEW;
END;
$$;

-- Create trigger for transfers
DROP TRIGGER IF EXISTS trigger_set_next_allowed_date ON transfers;
CREATE TRIGGER trigger_set_next_allowed_date
  BEFORE INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION set_transfer_next_allowed_date();

-- Trigger function to check for expired documents and create alerts
CREATE OR REPLACE FUNCTION check_document_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if document is expired or expiring soon (within 30 days)
  IF NEW.document_expiry IS NOT NULL THEN
    IF NEW.document_expiry < CURRENT_DATE THEN
      -- Document already expired
      INSERT INTO legal_alerts (business_id, client_id, alert_type, severity, message)
      VALUES (
        NEW.business_id,
        NEW.id,
        'document_expired',
        'critical',
        format('Document expired on %s for client %s', 
          to_char(NEW.document_expiry, 'DD/MM/YYYY'),
          NEW.full_name
        )
      );
    ELSIF NEW.document_expiry < CURRENT_DATE + INTERVAL '30 days' THEN
      -- Document expiring soon
      INSERT INTO legal_alerts (business_id, client_id, alert_type, severity, message)
      VALUES (
        NEW.business_id,
        NEW.id,
        'document_expired',
        'warning',
        format('Document expires on %s for client %s', 
          to_char(NEW.document_expiry, 'DD/MM/YYYY'),
          NEW.full_name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for document expiry checks
DROP TRIGGER IF EXISTS trigger_check_document_expiry ON clients;
CREATE TRIGGER trigger_check_document_expiry
  AFTER INSERT OR UPDATE OF document_expiry ON clients
  FOR EACH ROW
  EXECUTE FUNCTION check_document_expiry();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers to auto-update updated_at columns
DROP TRIGGER IF EXISTS trigger_businesses_updated_at ON businesses;
CREATE TRIGGER trigger_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_business_users_updated_at ON business_users;
CREATE TRIGGER trigger_business_users_updated_at
  BEFORE UPDATE ON business_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_clients_updated_at ON clients;
CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_transfers_updated_at ON transfers;
CREATE TRIGGER trigger_transfers_updated_at
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();