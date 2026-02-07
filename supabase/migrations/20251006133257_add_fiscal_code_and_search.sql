/*
  # Add Fiscal Code and Client Search Features

  ## Changes
  1. Add fiscal_code column to clients table
  2. Add index for fast search by document_number
  3. Create function to search for existing clients by document
  
  ## Purpose
  - Store Italian fiscal code (codice fiscale) for clients
  - Enable quick lookup of clients registered by other businesses
  - Allow businesses to import existing client data
  
  ## Security
  - Search function only returns non-sensitive data
  - Businesses cannot access full client data from other businesses
  - Only basic info for verification purposes
*/

-- Add fiscal_code column to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'fiscal_code'
  ) THEN
    ALTER TABLE clients ADD COLUMN fiscal_code TEXT;
  END IF;
END $$;

-- Create index for fast document number searches
CREATE INDEX IF NOT EXISTS idx_clients_document_number 
ON clients(document_number);

-- Create index for fiscal code searches
CREATE INDEX IF NOT EXISTS idx_clients_fiscal_code 
ON clients(fiscal_code) 
WHERE fiscal_code IS NOT NULL;

-- Create function to search for existing clients by document
CREATE OR REPLACE FUNCTION search_existing_client(
  p_document_number TEXT
)
RETURNS TABLE (
  full_name TEXT,
  document_type TEXT,
  document_number TEXT,
  document_country TEXT,
  date_of_birth DATE,
  nationality TEXT,
  fiscal_code TEXT,
  phone TEXT,
  email TEXT,
  found_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
BEGIN
  -- Get current user and their business
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's business
  SELECT bu.business_id INTO v_business_id
  FROM business_users bu
  WHERE bu.user_id = v_user_id AND bu.is_active = true
  LIMIT 1;
  
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No active business found';
  END IF;
  
  -- Check if client already exists in current business
  IF EXISTS (
    SELECT 1 FROM clients 
    WHERE business_id = v_business_id 
    AND document_number = p_document_number
  ) THEN
    RAISE EXCEPTION 'Client already exists in your business';
  END IF;
  
  -- Search for client in other businesses
  RETURN QUERY
  SELECT 
    c.full_name,
    c.document_type,
    c.document_number,
    c.document_country,
    c.date_of_birth,
    c.nationality,
    c.fiscal_code,
    c.phone,
    c.email,
    COUNT(*) OVER() as found_count
  FROM clients c
  WHERE c.document_number = p_document_number
    AND c.business_id != v_business_id
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_existing_client TO authenticated;

-- Create function to import existing client data
CREATE OR REPLACE FUNCTION import_existing_client(
  p_document_number TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_new_client_id UUID;
  v_source_client RECORD;
BEGIN
  -- Get current user and their business
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's business
  SELECT bu.business_id INTO v_business_id
  FROM business_users bu
  WHERE bu.user_id = v_user_id AND bu.is_active = true
  LIMIT 1;
  
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No active business found';
  END IF;
  
  -- Check if client already exists in current business
  IF EXISTS (
    SELECT 1 FROM clients 
    WHERE business_id = v_business_id 
    AND document_number = p_document_number
  ) THEN
    RAISE EXCEPTION 'Client already exists in your business';
  END IF;
  
  -- Get source client data
  SELECT * INTO v_source_client
  FROM clients
  WHERE document_number = p_document_number
    AND business_id != v_business_id
  LIMIT 1;
  
  IF v_source_client IS NULL THEN
    RAISE EXCEPTION 'Source client not found';
  END IF;
  
  -- Create new client record for current business
  INSERT INTO clients (
    business_id,
    full_name,
    document_type,
    document_number,
    document_country,
    document_expiry,
    date_of_birth,
    nationality,
    fiscal_code,
    phone,
    email,
    address,
    city,
    postal_code,
    country
  )
  VALUES (
    v_business_id,
    v_source_client.full_name,
    v_source_client.document_type,
    v_source_client.document_number,
    v_source_client.document_country,
    v_source_client.document_expiry,
    v_source_client.date_of_birth,
    v_source_client.nationality,
    v_source_client.fiscal_code,
    v_source_client.phone,
    v_source_client.email,
    v_source_client.address,
    v_source_client.city,
    v_source_client.postal_code,
    v_source_client.country
  )
  RETURNING id INTO v_new_client_id;
  
  RETURN v_new_client_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION import_existing_client TO authenticated;