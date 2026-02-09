import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getSecurityContext,
  trackSession,
  logSensitiveDataAccess,
  createSecurityAlert,
} from '../lib/security';

export function useSecurity() {
  const { user, business } = useAuth();

  const securityContext = getSecurityContext();

  useEffect(() => {
    if (user && business) {
      const session = localStorage.getItem('supabase.auth.token');
      if (session) {
        trackSession(user.id, business.id, session, securityContext).catch(
          console.error
        );
      }
    }
  }, [user, business]);

  const logDataAccess = useCallback(
    async (
      action: 'view' | 'export' | 'modify' | 'delete',
      entityType: 'client' | 'transfer' | 'document' | 'user' | 'business_settings',
      entityId: string,
      accessReason?: string
    ) => {
      if (!user || !business) return;

      await logSensitiveDataAccess(
        user.id,
        business.id,
        action,
        entityType,
        entityId,
        securityContext,
        accessReason
      );
    },
    [user, business, securityContext]
  );

  const reportSuspiciousActivity = useCallback(
    async (description: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
      if (!user || !business) return;

      await createSecurityAlert({
        alert_type: 'suspicious_client_activity',
        severity,
        user_id: user.id,
        business_id: business.id,
        description,
        ip_address: securityContext.ipAddress,
        metadata: {
          user_agent: securityContext.userAgent,
          device_fingerprint: securityContext.deviceFingerprint,
        },
      });
    },
    [user, business, securityContext]
  );

  return {
    securityContext,
    logDataAccess,
    reportSuspiciousActivity,
  };
}
