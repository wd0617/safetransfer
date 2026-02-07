/*
  # Fix Transfer Eligibility Logic for Blocked State

  ## Overview
  Correct the eligibility check to properly handle when client has reached
  the exact limit (€999). The system should mark client as BLOCKED when
  they have used the full €999, not allow them to transfer €0.

  ## Problem
  Current logic: IF (999 + 0) <= 999 THEN can_transfer = TRUE
  This incorrectly shows "PUEDE ENVIAR" when client is at limit.

  ## Solution
  Check if amount_available > 0 before checking new amount.
  If available = 0, client is BLOCKED regardless of requested amount.

  ## Logic
  1. If amount_available = 0 → BLOCKED (can_transfer = false)
  2. If amount_available > 0 AND (used + requested) <= 999 → CAN TRANSFER
  3. If (used + requested) > 999 → BLOCKED

  ## Important
  This ensures universal behavior across ALL businesses:
  - Client with €999 used = BLOCKED, shows "ENVÍO BLOQUEADO"
  - Client with <€999 used = can transfer remaining amount
*/

-- Drop existing function
DROP FUNCTION IF EXISTS check_transfer_eligibility_private(text, uuid, uuid, numeric);

-- Recreate with corrected logic
CREATE OR REPLACE FUNCTION check_transfer_eligibility_private(
  p_document_number text,
  p_checking_business_id uuid,
  p_checked_by_user_id uuid,
  p_requested_amount numeric
)
RETURNS TABLE(
  can_transfer boolean,
  amount_used numeric,
  amount_available numeric,
  message text,
  days_remaining integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_total_sent numeric;
  v_amount_available numeric;
  v_can_transfer boolean;
  v_message text;
  v_days_remaining integer;
  v_oldest_transfer_date timestamptz;
  v_reset_date timestamptz;
  v_max_limit constant numeric := 999;
  v_period_days constant integer := 8;
BEGIN
  -- Calculate total amount sent in the last 8 days
  SELECT COALESCE(SUM(t.amount), 0),
         MIN(t.transfer_date)
  INTO v_total_sent,
       v_oldest_transfer_date
  FROM transfers t
  INNER JOIN clients c ON t.client_id = c.id
  WHERE c.document_number = p_document_number
    AND t.status = 'completed'
    AND t.transfer_date >= (now() - (v_period_days || ' days')::interval);

  -- Calculate available amount
  v_amount_available := v_max_limit - v_total_sent;

  -- CORRECTED LOGIC: Check if client is blocked
  -- Client is blocked if:
  -- 1. No amount available (used >= 999), OR
  -- 2. Requested amount would exceed limit
  IF v_amount_available <= 0 THEN
    -- Client has used full limit, BLOCKED
    v_can_transfer := false;
    v_message := 'limit_exceeded';
  ELSIF (v_total_sent + p_requested_amount) <= v_max_limit THEN
    -- Client has available amount and new transfer fits
    v_can_transfer := true;
    v_message := 'eligible';
  ELSE
    -- New transfer would exceed limit
    v_can_transfer := false;
    v_message := 'limit_exceeded';
  END IF;

  -- Calculate days remaining if blocked
  IF v_can_transfer THEN
    v_days_remaining := 0;
  ELSE
    -- Calculate days remaining until oldest transfer expires
    IF v_oldest_transfer_date IS NOT NULL THEN
      v_reset_date := v_oldest_transfer_date + (v_period_days || ' days')::interval;
      v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_reset_date - now())) / 86400);
      
      -- Ensure days_remaining is never negative
      IF v_days_remaining < 0 THEN
        v_days_remaining := 0;
      END IF;
    ELSE
      v_days_remaining := 0;
    END IF;
  END IF;

  -- Log this lookup for audit/GDPR compliance
  INSERT INTO client_lookup_audit (
    checking_business_id,
    checked_by_user_id,
    client_document_number,
    lookup_timestamp,
    can_transfer,
    days_remaining
  ) VALUES (
    p_checking_business_id,
    p_checked_by_user_id,
    p_document_number,
    now(),
    v_can_transfer,
    v_days_remaining
  );

  -- Return privacy-compliant information with days_remaining
  RETURN QUERY SELECT 
    v_can_transfer,
    v_total_sent,
    GREATEST(v_amount_available, 0),
    v_message,
    v_days_remaining;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_transfer_eligibility_private(text, uuid, uuid, numeric) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_transfer_eligibility_private IS 
  'Privacy-compliant function to check if client can transfer with days remaining info.
   Calculates cumulative amount sent in last 8 days and compares against 999€ limit.
   Client is BLOCKED if amount_available <= 0 (used >= 999).
   Returns days_remaining: number of days until client can transfer again (0 if eligible).
   Visible to ALL businesses checking the client.
   Complies with Italian Decreto Legislativo 231/2007 and GDPR.';
