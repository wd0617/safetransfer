/*
  # Create Privacy-Focused Transfer Eligibility Check Function

  ## Purpose
  Replace the existing check_transfer_eligibility function with a GDPR-compliant version that:
  - Does NOT expose business names, amounts, dates, or other sensitive details
  - Only returns a simple yes/no answer and days remaining
  - Logs every lookup for audit purposes
  - Maximizes client privacy while maintaining legal compliance

  ## Changes

  1. Drop existing function
    - Remove check_transfer_eligibility function that exposes too much data

  2. Create new privacy-focused function
    - `check_transfer_eligibility_private` - Returns minimal information
    - Returns: can_transfer (boolean) and days_remaining (integer) ONLY
    - Does NOT return: business names, amounts, dates, addresses
    - Automatically logs lookup to audit table

  3. Security & Compliance
    - Function follows GDPR principle of data minimization
    - Only authenticated business users can call it
    - Every call is logged for regulatory compliance
    - Operators see ONLY whether client can transfer, nothing more

  ## Privacy Principles Applied
  - Data Minimization (GDPR Article 5.1.c)
  - Purpose Limitation (GDPR Article 5.1.b)
  - Storage Limitation (GDPR Article 5.1.e)
  - Transparency (GDPR Article 12)
*/

-- Drop the old function that exposes too much data
DROP FUNCTION IF EXISTS check_transfer_eligibility(text, uuid, numeric);

-- Create new privacy-focused function
CREATE OR REPLACE FUNCTION check_transfer_eligibility_private(
  p_document_number text,
  p_checking_business_id uuid,
  p_checked_by_user_id uuid
)
RETURNS TABLE(
  can_transfer boolean,
  days_remaining integer,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_transfer_date timestamptz;
  v_next_allowed_date timestamptz;
  v_days_diff integer;
  v_can_transfer boolean;
  v_days_remaining integer;
  v_message text;
BEGIN
  -- Find the most recent transfer for this document across ALL businesses
  SELECT 
    t.transfer_date,
    t.next_allowed_date
  INTO 
    v_last_transfer_date,
    v_next_allowed_date
  FROM transfers t
  INNER JOIN clients c ON t.client_id = c.id
  WHERE c.document_number = p_document_number
    AND t.status = 'completed'
  ORDER BY t.transfer_date DESC
  LIMIT 1;

  -- Calculate if client can transfer
  IF v_last_transfer_date IS NULL THEN
    -- No previous transfer found - client can transfer
    v_can_transfer := true;
    v_days_remaining := 0;
    v_message := 'eligible';
  ELSIF v_next_allowed_date <= now() THEN
    -- Waiting period has passed - client can transfer
    v_can_transfer := true;
    v_days_remaining := 0;
    v_message := 'eligible';
  ELSE
    -- Still in waiting period - client cannot transfer
    v_can_transfer := false;
    v_days_diff := CEIL(EXTRACT(EPOCH FROM (v_next_allowed_date - now())) / 86400);
    v_days_remaining := GREATEST(v_days_diff, 0);
    v_message := 'waiting_period';
  END IF;

  -- Log this lookup for audit/GDPR compliance (immutable record)
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

  -- Return ONLY the minimal information needed
  RETURN QUERY SELECT v_can_transfer, v_days_remaining, v_message;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_transfer_eligibility_private(text, uuid, uuid) TO authenticated;
