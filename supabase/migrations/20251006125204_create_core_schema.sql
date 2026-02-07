/*
  # Money Transfer SaaS - Core Database Schema

  ## Overview
  Complete database schema for multi-tenant SaaS managing money transfers with Italian legal compliance.

  ## 1. New Tables

  ### `businesses`
  Business/Money Transfer accounts (tenants)
  - `id` (uuid, primary key)
  - `name` (text) - Business name
  - `email` (text, unique) - Business contact email
  - `country` (text) - Operating country
  - `registration_number` (text) - Legal registration number
  - `logo_url` (text, nullable) - Custom logo
  - `primary_color` (text) - Brand color hex
  - `secondary_color` (text) - Secondary brand color
  - `subscription_status` (text) - active, suspended, cancelled
  - `subscription_expires_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `business_users`
  Users belonging to businesses with roles
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key) - Associated business
  - `user_id` (uuid, foreign key) - Auth user ID
  - `role` (text) - admin, operator
  - `full_name` (text)
  - `email` (text)
  - `language` (text) - es, en, it
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `clients`
  End customers making transfers
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key) - Business that registered client
  - `full_name` (text) - Client full name
  - `document_type` (text) - passport, id_card, residence_permit
  - `document_number` (text) - Unique document identifier
  - `document_country` (text) - Document issuing country
  - `document_expiry` (date, nullable)
  - `date_of_birth` (date)
  - `nationality` (text)
  - `phone` (text, nullable)
  - `email` (text, nullable)
  - `address` (text, nullable)
  - `city` (text, nullable)
  - `postal_code` (text, nullable)
  - `country` (text)
  - `document_front_url` (text, nullable) - Uploaded document image
  - `document_back_url` (text, nullable)
  - `notes` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `transfers`
  Individual money transfer transactions
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key) - Business processing transfer
  - `client_id` (uuid, foreign key) - Client making transfer
  - `amount` (numeric(10,2)) - Transfer amount in EUR
  - `currency` (text) - EUR (default)
  - `transfer_date` (timestamptz) - When transfer was made
  - `next_allowed_date` (timestamptz) - When client can transfer again (8 days later)
  - `destination_country` (text)
  - `recipient_name` (text)
  - `recipient_relationship` (text, nullable)
  - `purpose` (text, nullable) - family_support, business, etc
  - `status` (text) - completed, pending, cancelled
  - `notes` (text, nullable)
  - `created_by` (uuid, foreign key) - User who created transfer
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `transfer_validations`
  Cross-business transfer validation checks (for 999€/8 days rule)
  - `id` (uuid, primary key)
  - `client_document_number` (text) - Client identifier for cross-check
  - `checking_business_id` (uuid, foreign key) - Business performing check
  - `found_business_id` (uuid, foreign key, nullable) - Business where previous transfer found
  - `found_transfer_id` (uuid, foreign key, nullable) - Previous transfer found
  - `amount_found` (numeric(10,2), nullable) - Amount of previous transfer
  - `transfer_date_found` (timestamptz, nullable) - Date of previous transfer
  - `days_remaining` (integer, nullable) - Days until client can transfer again
  - `validation_result` (text) - allowed, blocked, warning
  - `checked_at` (timestamptz)

  ### `audit_logs`
  GDPR compliance - track all sensitive operations
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `action` (text) - create, read, update, delete, export
  - `entity_type` (text) - client, transfer, user, business
  - `entity_id` (uuid, nullable)
  - `old_values` (jsonb, nullable)
  - `new_values` (jsonb, nullable)
  - `ip_address` (text, nullable)
  - `user_agent` (text, nullable)
  - `created_at` (timestamptz)

  ### `legal_alerts`
  Automated legal compliance alerts
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key)
  - `client_id` (uuid, foreign key, nullable)
  - `transfer_id` (uuid, foreign key, nullable)
  - `alert_type` (text) - limit_exceeded, document_expired, suspicious_activity
  - `severity` (text) - info, warning, critical
  - `message` (text)
  - `is_read` (boolean)
  - `resolved_at` (timestamptz, nullable)
  - `resolved_by` (uuid, foreign key, nullable)
  - `created_at` (timestamptz)

  ## 2. Indexes
  Performance optimization for common queries

  ## 3. Security
  - Enable RLS on all tables
  - Policies ensure business isolation (users only access their business data)
  - Cross-business queries only for transfer validation (limited fields)
  - Audit logs for GDPR compliance

  ## 4. Important Notes
  - Multi-tenant architecture with complete data isolation per business
  - Legal limit: 999€ every 8 days per client (checked across all businesses)
  - Document numbers used for cross-business client identification
  - All timestamps in UTC
  - Amounts stored as numeric(10,2) for precision
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  country text NOT NULL DEFAULT 'IT',
  registration_number text,
  logo_url text,
  primary_color text DEFAULT '#2563eb',
  secondary_color text DEFAULT '#1e40af',
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  subscription_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Business users table
CREATE TABLE IF NOT EXISTS business_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  full_name text NOT NULL,
  email text NOT NULL,
  language text NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en', 'it')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('passport', 'id_card', 'residence_permit')),
  document_number text NOT NULL,
  document_country text NOT NULL,
  document_expiry date,
  date_of_birth date NOT NULL,
  nationality text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  postal_code text,
  country text NOT NULL,
  document_front_url text,
  document_back_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, document_number)
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR',
  transfer_date timestamptz NOT NULL DEFAULT now(),
  next_allowed_date timestamptz NOT NULL,
  destination_country text NOT NULL,
  recipient_name text NOT NULL,
  recipient_relationship text,
  purpose text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transfer validations table
CREATE TABLE IF NOT EXISTS transfer_validations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_document_number text NOT NULL,
  checking_business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  found_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  found_transfer_id uuid REFERENCES transfers(id) ON DELETE SET NULL,
  amount_found numeric(10,2),
  transfer_date_found timestamptz,
  days_remaining integer,
  validation_result text NOT NULL CHECK (validation_result IN ('allowed', 'blocked', 'warning')),
  checked_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'export', 'login')),
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'transfer', 'user', 'business', 'document')),
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Legal alerts table
CREATE TABLE IF NOT EXISTS legal_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  transfer_id uuid REFERENCES transfers(id) ON DELETE SET NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('limit_exceeded', 'document_expired', 'suspicious_activity', 'missing_data')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_users_business ON business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user ON business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_business ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_document ON clients(document_number);
CREATE INDEX IF NOT EXISTS idx_transfers_business ON transfers(business_id);
CREATE INDEX IF NOT EXISTS idx_transfers_client ON transfers(client_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_transfers_next_allowed ON transfers(next_allowed_date);
CREATE INDEX IF NOT EXISTS idx_validations_document ON transfer_validations(client_document_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_legal_alerts_business ON legal_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_legal_alerts_unread ON legal_alerts(business_id, is_read) WHERE is_read = false;

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses
CREATE POLICY "Users can view their own business"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for business_users
CREATE POLICY "Users can view colleagues in their business"
  ON business_users FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert users in their business"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users in their business"
  ON business_users FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON business_users FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for clients
CREATE POLICY "Users can view clients in their business"
  ON clients FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients in their business"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients in their business"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for transfers
CREATE POLICY "Users can view transfers in their business"
  ON transfers FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transfers in their business"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transfers in their business"
  ON transfers FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for transfer_validations
CREATE POLICY "Users can view validations for their business"
  ON transfer_validations FOR SELECT
  TO authenticated
  USING (
    checking_business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert validations for their business"
  ON transfer_validations FOR INSERT
  TO authenticated
  WITH CHECK (
    checking_business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs for their business"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for legal_alerts
CREATE POLICY "Users can view alerts for their business"
  ON legal_alerts FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update alerts in their business"
  ON legal_alerts FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert alerts"
  ON legal_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);