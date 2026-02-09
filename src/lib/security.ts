import { supabase } from './supabase';
import type { Json } from './database.types';

export interface SecurityContext {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  password_reset: { maxAttempts: 3, windowMinutes: 60 },
  transfer_create: { maxAttempts: 10, windowMinutes: 60 },
  client_export: { maxAttempts: 5, windowMinutes: 60 },
  sensitive_view: { maxAttempts: 50, windowMinutes: 60 },
};

export async function logFailedLoginAttempt(
  email: string,
  context: SecurityContext,
  reason: string
): Promise<void> {
  try {
    await supabase.rpc('log_failed_login_attempt', {
      p_email: email,
      p_ip: context.ipAddress ?? null,
      p_user_agent: context.userAgent ?? null,
      p_reason: reason,
    });
  } catch (error) {
    console.error('Error logging failed login attempt:', error);
  }
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_account_locked', {
    p_email: email,
  });
  if (error) {
    console.error('Error checking account lock:', error);
    return false;
  }
  return Boolean(data);
}

export async function checkRateLimit(
  identifier: string,
  actionType: string
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const config = RATE_LIMITS[actionType];
  if (!config) return { allowed: true };

  const { data, error } = await supabase.rpc('check_rate_limit_rpc', {
    p_identifier: identifier,
    p_action_type: actionType,
    p_window_minutes: config.windowMinutes,
    p_max_attempts: config.maxAttempts,
  });

  if (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true };
  }

  if (Array.isArray(data) && data.length > 0) {
    const res = data[0] as { allowed: boolean; reset_at: string | null };
    return { allowed: res.allowed, resetAt: res.reset_at ? new Date(res.reset_at) : undefined };
  }
  return { allowed: true };
}

interface SecurityAlertData {
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string | null;
  business_id?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createSecurityAlert(
  alertData: SecurityAlertData
): Promise<void> {
  try {
    await supabase.from('security_alerts').insert({
      alert_type: alertData.alert_type,
      severity: alertData.severity,
      description: alertData.description,
      user_id: alertData.user_id ?? null,
      business_id: alertData.business_id ?? null,
      ip_address: alertData.ip_address ?? null,
      metadata: (alertData.metadata || {}) as Json,
      resolved: false,
    });

    console.warn('🚨 Security Alert:', alertData.alert_type, '-', alertData.description);
  } catch (error) {
    console.error('Error creating security alert:', error);
  }
}

export async function logSensitiveDataAccess(
  userId: string,
  businessId: string,
  action: 'view' | 'export' | 'modify' | 'delete',
  entityType: 'client' | 'transfer' | 'document' | 'user' | 'business_settings',
  entityId: string,
  context: SecurityContext,
  accessReason?: string
): Promise<void> {
  try {
    await supabase.from('sensitive_data_access_log').insert({
      user_id: userId,
      business_id: businessId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: context.ipAddress,
      access_reason: accessReason,
      data_returned: true,
    });

    await checkForUnusualDataAccess(userId, businessId, action, entityType);
  } catch (error) {
    console.error('Error logging sensitive data access:', error);
  }
}

async function checkForUnusualDataAccess(
  userId: string,
  businessId: string,
  action: string,
  entityType: string
): Promise<void> {
  if (action !== 'export') return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentExports } = await supabase
    .from('sensitive_data_access_log')
    .select('*')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .eq('action', 'export')
    .gte('accessed_at', oneHourAgo);

  if (recentExports && recentExports.length >= 5) {
    await createSecurityAlert({
      alert_type: 'data_export',
      severity: 'high',
      user_id: userId,
      business_id: businessId,
      description: `User performed ${recentExports.length} data exports in the last hour`,
      metadata: {
        export_count: recentExports.length,
        entity_type: entityType,
      },
    });
  }
}

export async function trackSession(
  userId: string,
  businessId: string,
  sessionToken: string,
  context: SecurityContext
): Promise<void> {
  try {
    await supabase.rpc('track_session_rpc', {
      p_user_id: userId,
      p_business_id: businessId,
      p_session_token: sessionToken,
      p_ip: context.ipAddress ?? null,
      p_user_agent: context.userAgent ?? null,
      p_device_fingerprint: context.deviceFingerprint ?? null,
    });
  } catch (error) {
    console.error('Error tracking session:', error);
  }
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  try {
    await supabase.rpc('invalidate_user_sessions_rpc', { p_user_id: userId });
  } catch (error) {
    console.error('Error invalidating sessions:', error);
  }
}

export async function getActiveSessions(userId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('security_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())
    .order('last_activity_at', { ascending: false });

  if (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }

  return data || [];
}

export function generateDeviceFingerprint(): string {
  const nav = window.navigator;
  const screen = window.screen;

  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ].join('|');

  return btoa(fingerprint).substring(0, 32);
}

export function getSecurityContext(): SecurityContext {
  return {
    userAgent: window.navigator.userAgent,
    deviceFingerprint: generateDeviceFingerprint(),
  };
}

export async function detectUnusualTransferPattern(
  businessId: string,
  clientId: string,
  amount: number
): Promise<void> {
  const { data: recentTransfers } = await supabase
    .from('transfers')
    .select('amount, transfer_date')
    .eq('business_id', businessId)
    .eq('client_id', clientId)
    .order('transfer_date', { ascending: false })
    .limit(10);

  if (!recentTransfers || recentTransfers.length < 3) return;

  const amounts = recentTransfers.map((t: { amount: number | string }) => Number(t.amount));
  const avgAmount = amounts.reduce((sum: number, amt: number) => sum + amt, 0) / amounts.length;

  if (amount > avgAmount * 3) {
    await createSecurityAlert({
      alert_type: 'unusual_transfer_pattern',
      severity: 'medium',
      business_id: businessId,
      description: `Transfer amount (€${amount}) is 3x higher than average (€${avgAmount.toFixed(2)}) for this client`,
      metadata: {
        client_id: clientId,
        current_amount: amount,
        average_amount: avgAmount,
      },
    });
  }
}

export async function validateBusinessAccess(
  userId: string,
  businessId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('business_users')
    .select('*')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .maybeSingle();

  return data !== null;
}

export async function validateRole(
  userId: string,
  requiredRole: 'admin' | 'operator'
): Promise<boolean> {
  const { data } = await supabase
    .from('business_users')
    .select('role, is_superadmin')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return false;

  if (data.is_superadmin) return true;

  if (requiredRole === 'admin') {
    return data.role === 'admin';
  }

  return data.role === 'admin' || data.role === 'operator';
}
