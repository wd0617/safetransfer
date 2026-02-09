export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ─── Row Types ──────────────────────────────────────────────────────────────

export type BusinessRow = {
  id: string;
  name: string;
  email: string;
  country: string | null;
  registration_number: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled' | null;
  subscription_expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  status: 'active' | 'trial' | 'blocked' | 'inactive' | null;
  last_activity_at: string | null;
  blocked_reason: string | null;
  blocked_at: string | null;
};

export type BusinessUserRow = {
  id: string;
  business_id: string;
  user_id: string;
  role: 'admin' | 'operator';
  full_name: string;
  email: string;
  language: 'es' | 'en' | 'it' | 'hi' | 'ur';
  is_active: boolean;
  is_superadmin?: boolean | null;
  must_change_password?: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SubscriptionRow = {
  id: string;
  business_id: string;
  plan: string | null;
  plan_type: string | null;
  status: 'active' | 'trial' | 'suspended' | 'cancelled' | null;
  current_period_end: string | null;
  is_trial: boolean | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_months: number | null;
  next_payment_date: string | null;
  last_payment_date: string | null;
  monthly_price: number | null;
  amount: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ClientRow = {
  id: string;
  business_id: string;
  full_name: string;
  document_type: 'passport' | 'id_card' | 'residence_permit' | 'drivers_license';
  document_number: string;
  document_country: string;
  document_expiry: string | null;
  date_of_birth: string;
  nationality: string;
  fiscal_code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  document_front_url: string | null;
  document_back_url: string | null;
  notes: string | null;
  transfer_systems: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TransferRow = {
  id: string;
  business_id: string;
  client_id: string;
  amount: number;
  currency: string;
  transfer_date: string;
  next_allowed_date: string;
  destination_country: string;
  recipient_name: string;
  recipient_relationship: string | null;
  purpose: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  document_number: string | null;
  transfer_system: string | null;
  commission_amount: number | null;
  commission_included: boolean | null;
  net_amount: number | null;
};

export type CredentialChangeLogRow = {
  id: string;
  user_id: string;
  business_id: string;
  change_type: 'password' | 'email' | 'role';
  changed_by: string;
  changed_by_role: 'user' | 'superadmin';
  ip_address: string | null;
  user_agent: string | null;
  notification_sent: boolean | null;
  metadata: Json | null;
  created_at: string | null;
};

export type PasswordChangeRequestRow = {
  id: string;
  user_id: string;
  business_id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  request_token: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

export type SuperadminRequestRow = {
  id: string;
  request_type: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  business_id: string;
  user_id: string;
  title: string;
  description: string | null;
  metadata: Json | null;
  created_at: string | null;
};

export type SecurityAlertRow = {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id: string | null;
  business_id: string | null;
  ip_address: string | null;
  metadata: Json | null;
  resolved: boolean | null;
  created_at: string | null;
};

export type SensitiveDataAccessLogRow = {
  id: string;
  user_id: string;
  business_id: string;
  action: 'view' | 'export' | 'modify' | 'delete';
  entity_type: 'client' | 'transfer' | 'document' | 'user' | 'business_settings';
  entity_id: string;
  ip_address: string | null;
  access_reason: string | null;
  data_returned: boolean | null;
  accessed_at: string | null;
};

export type SecuritySessionRow = {
  id: string;
  user_id: string;
  business_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  is_active: boolean | null;
  created_at: string | null;
  expires_at: string | null;
  last_activity_at: string | null;
};

export type FailedLoginAttemptRow = {
  id: string;
  email: string;
  attempt_time: string;
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  created_at: string | null;
};

export type AccountLockoutRow = {
  id: string;
  email: string;
  locked_at: string;
  locked_until: string;
  reason: string | null;
  is_active: boolean;
  created_at: string | null;
};

export type AdminNotificationRow = {
  id: string;
  business_id: string;
  notification_type: string;
  title: string;
  message: string;
  priority: 'normal' | 'high' | 'urgent';
  is_read: boolean | null;
  created_at: string | null;
};

export type AdminMessageRow = {
  id: string;
  subject: string;
  message: string;
  message_type: string;
  sender_id: string | null;
  business_id: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

export type AdminAuditLogRow = {
  id: string;
  admin_user_id: string | null;
  business_id: string | null;
  action_type: string;
  action_description: string;
  entity_type: string;
  entity_id: string | null;
  new_values: Json | null;
  ip_address: string | null;
  created_at: string | null;
};

export type PaymentRow = {
  id: string;
  business_id: string;
  subscription_id: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_date: string;
  due_date: string | null;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string | null;
};

export type LegalAlertRow = {
  id: string;
  business_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_read: boolean;
  created_at: string | null;
};

// ─── Database Interface ─────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: BusinessRow;
        Insert: Partial<BusinessRow> & {
          name: string;
          email: string;
        };
        Update: Partial<BusinessRow>;
        Relationships: [];
      };
      business_users: {
        Row: BusinessUserRow;
        Insert: Partial<BusinessUserRow> & {
          business_id: string;
          user_id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<BusinessUserRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: Partial<SubscriptionRow> & {
          business_id: string;
        };
        Update: Partial<SubscriptionRow>;
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ];
      };
      clients: {
        Row: ClientRow;
        Insert: Partial<ClientRow> & {
          business_id: string;
          full_name: string;
          document_type: ClientRow['document_type'];
          document_number: string;
          document_country: string;
          date_of_birth: string;
          nationality: string;
          country: string;
        };
        Update: Partial<ClientRow>;
        Relationships: [];
      };
      transfers: {
        Row: TransferRow;
        Insert: Partial<TransferRow> & {
          business_id: string;
          client_id: string;
          amount: number;
          destination_country: string;
          recipient_name: string;
          status?: TransferRow['status'];
        };
        Update: Partial<TransferRow>;
        Relationships: [];
      };
      credential_change_log: {
        Row: CredentialChangeLogRow;
        Insert: Partial<CredentialChangeLogRow> & {
          user_id: string;
          business_id: string;
          change_type: 'password' | 'email' | 'role';
          changed_by: string;
          changed_by_role: 'user' | 'superadmin';
        };
        Update: Partial<CredentialChangeLogRow>;
        Relationships: [];
      };
      password_change_requests: {
        Row: PasswordChangeRequestRow;
        Insert: Partial<PasswordChangeRequestRow> & {
          user_id: string;
          business_id: string;
          email: string;
          status: 'pending' | 'approved' | 'rejected';
          request_token: string;
        };
        Update: Partial<PasswordChangeRequestRow>;
        Relationships: [];
      };
      superadmin_requests: {
        Row: SuperadminRequestRow;
        Insert: Partial<SuperadminRequestRow> & {
          request_type: string;
          status: 'pending' | 'approved' | 'rejected';
          priority: 'low' | 'medium' | 'high';
          business_id: string;
          user_id: string;
          title: string;
        };
        Update: Partial<SuperadminRequestRow>;
        Relationships: [];
      };
      security_alerts: {
        Row: SecurityAlertRow;
        Insert: Partial<SecurityAlertRow> & {
          alert_type: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
        };
        Update: Partial<SecurityAlertRow>;
        Relationships: [];
      };
      sensitive_data_access_log: {
        Row: SensitiveDataAccessLogRow;
        Insert: Partial<SensitiveDataAccessLogRow> & {
          user_id: string;
          business_id: string;
          action: 'view' | 'export' | 'modify' | 'delete';
          entity_type: 'client' | 'transfer' | 'document' | 'user' | 'business_settings';
          entity_id: string;
        };
        Update: Partial<SensitiveDataAccessLogRow>;
        Relationships: [];
      };
      security_sessions: {
        Row: SecuritySessionRow;
        Insert: Partial<SecuritySessionRow> & {
          user_id: string;
          business_id: string;
          session_token: string;
        };
        Update: Partial<SecuritySessionRow>;
        Relationships: [];
      };
      failed_login_attempts: {
        Row: FailedLoginAttemptRow;
        Insert: Partial<FailedLoginAttemptRow> & {
          email: string;
        };
        Update: Partial<FailedLoginAttemptRow>;
        Relationships: [];
      };
      account_lockouts: {
        Row: AccountLockoutRow;
        Insert: Partial<AccountLockoutRow> & {
          email: string;
          locked_until: string;
        };
        Update: Partial<AccountLockoutRow>;
        Relationships: [];
      };
      admin_notifications: {
        Row: AdminNotificationRow;
        Insert: Partial<AdminNotificationRow> & {
          business_id: string;
          notification_type: string;
          title: string;
          message: string;
        };
        Update: Partial<AdminNotificationRow>;
        Relationships: [];
      };
      admin_messages: {
        Row: AdminMessageRow;
        Insert: Partial<AdminMessageRow> & {
          subject: string;
          message: string;
          message_type: string;
        };
        Update: Partial<AdminMessageRow>;
        Relationships: [];
      };
      admin_audit_log: {
        Row: AdminAuditLogRow;
        Insert: Partial<AdminAuditLogRow> & {
          action_type: string;
          action_description: string;
          entity_type: string;
        };
        Update: Partial<AdminAuditLogRow>;
        Relationships: [];
      };
      payments: {
        Row: PaymentRow;
        Insert: Partial<PaymentRow> & {
          business_id: string;
          amount: number;
          status: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_date: string;
        };
        Update: Partial<PaymentRow>;
        Relationships: [];
      };
      legal_alerts: {
        Row: LegalAlertRow;
        Insert: Partial<LegalAlertRow> & {
          business_id: string;
          alert_type: string;
          severity: 'info' | 'warning' | 'critical';
          message: string;
        };
        Update: Partial<LegalAlertRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_business_and_user: {
        Args: {
          p_business_name: string;
          p_business_email: string;
          p_full_name: string;
          p_user_email: string;
          p_language: string;
        };
        Returns: unknown;
      };
      create_notification: {
        Args: {
          p_notification_type: string;
          p_priority: 'low' | 'medium' | 'high';
          p_recipient_type: 'both' | 'superadmin' | 'business';
          p_business_id: string;
          p_user_id: string;
          p_title: string;
          p_message: string;
          p_metadata: Json;
        };
        Returns: unknown;
      };
      check_transfer_eligibility_private: {
        Args: {
          p_document_number: string;
          p_checking_business_id: string;
          p_checked_by_user_id: string;
          p_requested_amount: number;
        };
        Returns: Array<{
          can_transfer: boolean;
          amount_used: number;
          amount_available: number;
          message: string;
          days_remaining: number;
          days_until_available?: number | null;
        }>;
      };
      log_failed_login_attempt: {
        Args: {
          p_email: string;
          p_ip: string | null;
          p_user_agent: string | null;
          p_reason: string;
        };
        Returns: void;
      };
      lock_account_by_email: {
        Args: {
          p_email: string;
          p_reason: string;
          p_duration_minutes: number;
        };
        Returns: void;
      };
      is_account_locked: {
        Args: { p_email: string };
        Returns: boolean;
      };
      track_session_rpc: {
        Args: {
          p_user_id: string;
          p_business_id: string;
          p_session_token: string;
          p_ip: string | null;
          p_user_agent: string | null;
          p_device_fingerprint: string | null;
        };
        Returns: void;
      };
      invalidate_user_sessions_rpc: {
        Args: { p_user_id: string };
        Returns: void;
      };
      check_rate_limit_rpc: {
        Args: {
          p_identifier: string;
          p_action_type: string;
          p_window_minutes: number;
          p_max_attempts: number;
        };
        Returns: Array<{ allowed: boolean; reset_at: string | null }>;
      };
      get_business_stats: {
        Args: { p_business_id: string };
        Returns: {
          total_clients: number;
          total_transfers: number;
          total_amount: number;
          transfers_today: number;
          amount_today: number;
          transfers_this_month: number;
          amount_this_month: number;
          clients_at_limit: number;
          unread_alerts: number;
          expired_documents: number;
        };
      };
      search_existing_client: {
        Args: { p_document_number: string };
        Returns: Array<{
          id: string;
          full_name: string;
          document_type: string;
          document_number: string;
          document_country: string;
          date_of_birth: string;
          nationality: string | null;
          fiscal_code: string | null;
          phone: string | null;
          email: string | null;
        }>;
      };
      get_audit_log: {
        Args: {
          p_business_id: string;
          p_action: string | null;
          p_entity_type: string | null;
          p_limit: number;
          p_offset: number;
        };
        Returns: Array<{
          id: string;
          user_email: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          created_at: string;
          total_count: number;
        }>;
      };
      get_clients_report: {
        Args: {
          p_business_id: string;
          p_start_date: string | null;
          p_end_date: string | null;
        };
        Returns: Array<{
          total_clients: number;
          new_clients: number;
          active_clients: number;
          inactive_clients: number;
          expired_documents: number;
          expiring_soon: number;
          clients_by_nationality: Record<string, number>;
        }>;
      };
      get_compliance_report: {
        Args: {
          p_business_id: string;
        };
        Returns: Array<{
          client_id: string;
          client_name: string;
          document_number: string;
          nationality: string;
          total_transfers: number;
          total_amount: number;
          last_transfer_date: string | null;
          days_since_last_transfer: number | null;
          can_transfer_on: string | null;
          status: string;
          risk_level: string;
        }>;
      };
      get_financial_report: {
        Args: {
          p_business_id: string;
          p_start_date: string | null;
          p_end_date: string | null;
        };
        Returns: Array<{
          period: string;
          total_transfers: number;
          total_amount: number;
          avg_amount: number;
          min_amount: number;
          max_amount: number;
          currency: string;
          destination_country: string;
          country_transfers: number;
          country_amount: number;
        }>;
      };
      get_transfers_report: {
        Args: {
          p_business_id: string;
          p_start_date: string | null;
          p_end_date: string | null;
          p_status: string | null;
        };
        Returns: Array<{
          id: string;
          transfer_date: string;
          client_name: string;
          client_document: string;
          amount: number;
          currency: string;
          destination_country: string;
          recipient_name: string;
          purpose: string;
          status: string;
          created_at: string;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
