/*
  # Add Days Remaining to Transfer Eligibility Check

  ## Overview
  Enhance the eligibility check function to return the number of days remaining
  until a blocked client can transfer again. This information should be visible
  to ALL businesses checking the client, not just the one that made the transfer.

  ## Changes
  1. Modify `check_transfer_eligibility_private` to return `days_remaining`
  2. Calculate based on the oldest transfer in the 8-day window
  3. Return 0 if client can transfer, or actual days if blocked

  ## Logic
  - Find oldest transfer in last 8 days
  - Calculate when that transfer expires (transfer_date + 8 days)
  - Return difference between expire date and now as days_remaining
*/

-- Drop existing function
DROP FUNCTION IF EXISTS check_transfer_eligibility_private(text, uuid, uuid, numeric);

-- Recreate with days_remaining field
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

  -- Check if new transfer would exceed limit
  IF (v_total_sent + p_requested_amount) <= v_max_limit THEN
    v_can_transfer := true;
    v_message := 'eligible';
    v_days_remaining := 0;
  ELSE
    v_can_transfer := false;
    v_message := 'limit_exceeded';
    
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
   Returns days_remaining: number of days until client can transfer again (0 if eligible).
   Visible to ALL businesses checking the client.
   Complies with Italian Decreto Legislativo 231/2007 and GDPR.';
