/*
  # Create Report Functions

  ## Changes
  1. Create functions for generating various reports
  2. Use existing audit_logs table structure
  
  ## Functions
  - get_transfers_report: Detailed transfer listing with filters
  - get_compliance_report: Legal compliance tracking
  - get_financial_report: Financial summary by period and country
  - get_clients_report: Client statistics and document status
  - get_audit_log: Paginated audit log access
*/

-- Function to log audit events (using existing column names)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_business_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    business_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  )
  VALUES (
    p_business_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;

-- Function to get transfers report
CREATE OR REPLACE FUNCTION get_transfers_report(
  p_business_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  transfer_date DATE,
  client_name TEXT,
  client_document TEXT,
  amount NUMERIC,
  currency TEXT,
  destination_country TEXT,
  recipient_name TEXT,
  purpose TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.transfer_date,
    c.full_name as client_name,
    c.document_number as client_document,
    t.amount,
    t.currency,
    t.destination_country,
    t.recipient_name,
    t.purpose,
    t.status,
    t.created_at
  FROM transfers t
  JOIN clients c ON c.id = t.client_id
  WHERE t.business_id = p_business_id
    AND (p_start_date IS NULL OR t.transfer_date >= p_start_date)
    AND (p_end_date IS NULL OR t.transfer_date <= p_end_date)
    AND (p_client_id IS NULL OR t.client_id = p_client_id)
    AND (p_status IS NULL OR t.status = p_status)
  ORDER BY t.transfer_date DESC, t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_transfers_report TO authenticated;

-- Function to get compliance report
CREATE OR REPLACE FUNCTION get_compliance_report(
  p_business_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  document_number TEXT,
  nationality TEXT,
  total_transfers BIGINT,
  total_amount NUMERIC,
  last_transfer_date DATE,
  days_since_last_transfer INTEGER,
  can_transfer_on DATE,
  status TEXT,
  risk_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH client_transfers AS (
    SELECT 
      c.id,
      c.full_name,
      c.document_number,
      c.nationality,
      COUNT(t.id) as transfer_count,
      COALESCE(SUM(t.amount), 0) as total_amt,
      MAX(t.transfer_date) as last_transfer,
      MAX(t.transfer_date) + INTERVAL '8 days' as next_allowed
    FROM clients c
    LEFT JOIN transfers t ON t.client_id = c.id 
      AND t.status = 'completed'
      AND (p_start_date IS NULL OR t.transfer_date >= p_start_date)
      AND (p_end_date IS NULL OR t.transfer_date <= p_end_date)
    WHERE c.business_id = p_business_id
    GROUP BY c.id, c.full_name, c.document_number, c.nationality
  )
  SELECT 
    ct.id,
    ct.full_name,
    ct.document_number,
    ct.nationality,
    ct.transfer_count,
    ct.total_amt,
    ct.last_transfer,
    CASE 
      WHEN ct.last_transfer IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (CURRENT_DATE - ct.last_transfer))::INTEGER
    END,
    ct.next_allowed::DATE,
    CASE 
      WHEN ct.last_transfer IS NULL THEN 'no_transfers'
      WHEN CURRENT_DATE >= ct.next_allowed THEN 'can_transfer'
      ELSE 'waiting_period'
    END,
    CASE 
      WHEN ct.total_amt >= 999 AND CURRENT_DATE < ct.next_allowed THEN 'high'
      WHEN ct.total_amt >= 700 THEN 'medium'
      ELSE 'low'
    END
  FROM client_transfers ct
  ORDER BY ct.total_amt DESC, ct.last_transfer DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_compliance_report TO authenticated;

-- Function to get financial summary report
CREATE OR REPLACE FUNCTION get_financial_report(
  p_business_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  period TEXT,
  total_transfers BIGINT,
  total_amount NUMERIC,
  avg_amount NUMERIC,
  min_amount NUMERIC,
  max_amount NUMERIC,
  currency TEXT,
  destination_country TEXT,
  country_transfers BIGINT,
  country_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(t.transfer_date, 'YYYY-MM') as period,
    COUNT(t.id) as total_transfers,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount,
    MIN(t.amount) as min_amount,
    MAX(t.amount) as max_amount,
    t.currency,
    t.destination_country,
    COUNT(t.id) as country_transfers,
    SUM(t.amount) as country_amount
  FROM transfers t
  WHERE t.business_id = p_business_id
    AND t.status = 'completed'
    AND (p_start_date IS NULL OR t.transfer_date >= p_start_date)
    AND (p_end_date IS NULL OR t.transfer_date <= p_end_date)
  GROUP BY TO_CHAR(t.transfer_date, 'YYYY-MM'), t.currency, t.destination_country
  ORDER BY period DESC, total_amount DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_financial_report TO authenticated;

-- Function to get clients report
CREATE OR REPLACE FUNCTION get_clients_report(
  p_business_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_clients BIGINT,
  new_clients BIGINT,
  active_clients BIGINT,
  inactive_clients BIGINT,
  expired_documents BIGINT,
  expiring_soon BIGINT,
  clients_by_nationality JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_new BIGINT;
  v_active BIGINT;
  v_inactive BIGINT;
  v_expired BIGINT;
  v_expiring BIGINT;
  v_nationalities JSONB;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM clients
  WHERE business_id = p_business_id;
  
  SELECT COUNT(*) INTO v_new
  FROM clients
  WHERE business_id = p_business_id
    AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR created_at::DATE <= p_end_date);
  
  SELECT COUNT(DISTINCT client_id) INTO v_active
  FROM transfers
  WHERE business_id = p_business_id
    AND status = 'completed';
  
  v_inactive := v_total - COALESCE(v_active, 0);
  
  SELECT COUNT(*) INTO v_expired
  FROM clients
  WHERE business_id = p_business_id
    AND document_expiry IS NOT NULL
    AND document_expiry < CURRENT_DATE;
  
  SELECT COUNT(*) INTO v_expiring
  FROM clients
  WHERE business_id = p_business_id
    AND document_expiry IS NOT NULL
    AND document_expiry >= CURRENT_DATE
    AND document_expiry <= CURRENT_DATE + INTERVAL '30 days';
  
  SELECT jsonb_object_agg(nationality, client_count)
  INTO v_nationalities
  FROM (
    SELECT nationality, COUNT(*) as client_count
    FROM clients
    WHERE business_id = p_business_id
    GROUP BY nationality
    ORDER BY client_count DESC
  ) sub;
  
  RETURN QUERY SELECT v_total, v_new, v_active, v_inactive, v_expired, v_expiring, v_nationalities;
END;
$$;

GRANT EXECUTE ON FUNCTION get_clients_report TO authenticated;

-- Function to get audit log with pagination
CREATE OR REPLACE FUNCTION get_audit_log(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    au.email as user_email,
    al.action,
    al.entity_type,
    al.entity_id,
    al.old_values,
    al.new_values,
    al.created_at,
    COUNT(*) OVER() as total_count
  FROM audit_logs al
  LEFT JOIN auth.users au ON au.id = al.user_id
  WHERE al.business_id = p_business_id
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_audit_log TO authenticated;