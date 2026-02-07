/*
  # Fix Transfer Eligibility Logic - Cumulative 999€ Limit

  ## Problem
  Current system blocks clients completely for 8 days after ANY transfer.
  This is INCORRECT per Italian law.

  ## Correct Italian Law (Decreto Legislativo 231/2007)
  - Maximum 999€ per client in ANY 8-day period
  - Multiple transfers are ALLOWED as long as the total doesn't exceed 999€
  - Block only when sum of recent transfers + new amount > 999€

  ## Solution
  Replace the eligibility function to:
  1. Calculate SUM of all transfers in last 8 days for the client
  2. Check if (sum + requested_amount) <= 999€
  3. Allow transfer if within limit
  4. Block only if it would exceed 999€
  5. Show remaining available amount

  ## Privacy Compliance
  - Still respects GDPR (no business names, dates, or detailed info exposed)
  - Only returns: can_transfer (boolean), amount_used, amount_available
  - Logs every lookup for audit

  ## Example Scenarios
  - Day 1: Client sends 300€ → ALLOWED (300/999 used)
  - Day 3: Client sends 400€ → ALLOWED (700/999 used)
  - Day 5: Client wants 500€ → BLOCKED (would be 1200€ total)
  - Day 5: Client sends 299€ → ALLOWED (999/999 used)
  - Day 9: First 300€ expires, client can send up to 300€ again
*/

-- Drop old function
DROP FUNCTION IF EXISTS check_transfer_eligibility_private(text, uuid, uuid);

-- Create new cumulative limit function
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
  message text
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
  v_max_limit constant numeric := 999;
  v_period_days constant integer := 8;
BEGIN
  -- Calculate total amount sent in the last 8 days
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_total_sent
  FROM transfers t
  INNER JOIN clients c ON t.client_id = c.id
  WHERE c.document_number = p_document_number
    AND t.status = 'completed'
    AND t.transfer_date >= (now() - (v_period_days || ' days')::interval);

  -- Calculate available amount
  v_amount_available := v_max_limit - v_total_sent;

  -- Check if new transfer would exceed limit
  IF (v_total_sent + p_requested_amount) <= v_max_limit THEN
    v_can_transfer := true;
    v_message := 'eligible';
  ELSE
    v_can_transfer := false;
    v_message := 'limit_exceeded';
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
    CASE WHEN v_can_transfer THEN 0 ELSE v_period_days END
  );

  -- Return minimal privacy-compliant information
  RETURN QUERY SELECT 
    v_can_transfer,
    v_total_sent,
    GREATEST(v_amount_available, 0),
    v_message;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_transfer_eligibility_private(text, uuid, uuid, numeric) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_transfer_eligibility_private IS 
  'Privacy-compliant function to check if client can transfer. 
   Calculates cumulative amount sent in last 8 days and compares against 999€ limit.
   Returns only essential information (no business names, dates, or personal details).
   Complies with Italian Decreto Legislativo 231/2007 and GDPR.';
