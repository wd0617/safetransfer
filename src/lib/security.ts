import { supabase } from './supabase';

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
    await supabase.from('failed_login_attempts').insert({
      email,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      failure_reason: reason,
    });

    await checkForSuspiciousLoginActivity(email, context.ipAddress);
  } catch (error) {
    console.error('Error logging failed login attempt:', error);
  }
}

async function checkForSuspiciousLoginActivity(
  email: string,
  ipAddress?: string
): Promise<void> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: recentAttempts, error } = await supabase
    .from('failed_login_attempts')
    .select('*')
    .eq('email', email)
    .gte('attempt_time', fifteenMinutesAgo);

  if (error || !recentAttempts) return;

  if (recentAttempts.length >= 5) {
    await lockAccount(email, 'Multiple failed login attempts', 60);

    await createSecurityAlert({
      alert_type: 'multiple_failed_logins',
      severity: 'high',
      description: `Account ${email} locked after ${recentAttempts.length} failed login attempts`,
      ip_address: ipAddress,
      metadata: { email, attempt_count: recentAttempts.length },
    });
  }
}

async function lockAccount(
  email: string,
  reason: string,
  durationMinutes: number
): Promise<void> {
  const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

  const { data: userData } = await supabase.auth.admin.listUsers();
  const user = userData.users.find((u) => u.email === email);

  await supabase.from('account_lockouts').insert({
    user_id: user?.id || null,
    email,
    locked_until: lockedUntil.toISOString(),
    reason,
    is_active: true,
  });
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('account_lockouts')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .gte('locked_until', new Date().toISOString())
    .maybeSingle();

  return !error && data !== null;
}

export async function checkRateLimit(
  identifier: string,
  actionType: string
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const config = RATE_LIMITS[actionType];
  if (!config) return { allowed: true };

  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

  const { data, error } = await supabase
    .from('rate_limit_tracking')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .gte('window_end', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true };
  }

  if (!data) {
    const windowEnd = new Date(Date.now() + config.windowMinutes * 60 * 1000);
    await supabase.from('rate_limit_tracking').insert({
      identifier,
      action_type: actionType,
      count: 1,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      blocked: false,
    });
    return { allowed: true };
  }

  if (data.count >= config.maxAttempts) {
    await supabase
      .from('rate_limit_tracking')
      .update({ blocked: true })
      .eq('id', data.id);

    return {
      allowed: false,
      resetAt: new Date(data.window_end),
    };
  }

  await supabase
    .from('rate_limit_tracking')
    .update({ count: data.count + 1 })
    .eq('id', data.id);

  return { allowed: true };
}

interface SecurityAlertData {
  alert_type: string;
  severity: string;
  description: string;
  user_id?: string;
  business_id?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
}

export async function createSecurityAlert(
  alertData: SecurityAlertData
): Promise<void> {
  try {
    await supabase.from('security_alerts').insert({
      ...alertData,
      metadata: alertData.metadata || {},
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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await supabase.from('security_sessions').insert({
      user_id: userId,
      business_id: businessId,
      session_token: sessionToken,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      device_fingerprint: context.deviceFingerprint,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });
  } catch (error) {
    console.error('Error tracking session:', error);
  }
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  try {
    await supabase
      .from('security_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);
  } catch (error) {
    console.error('Error invalidating sessions:', error);
  }
}

export async function getActiveSessions(userId: string): Promise<any[]> {
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

  const amounts = recentTransfers.map((t) => parseFloat(t.amount));
  const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

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
