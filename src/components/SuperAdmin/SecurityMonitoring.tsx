import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Lock, Eye, Activity, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  created_at: string;
  resolved: boolean;
  business_id?: string;
  user_id?: string;
  metadata: any;
}

interface FailedLogin {
  email: string;
  attempt_time: string;
  ip_address: string;
  failure_reason: string;
}

interface AccountLockout {
  email: string;
  locked_at: string;
  locked_until: string;
  reason: string;
  is_active: boolean;
}

export function SecurityMonitoring() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [lockouts, setLockouts] = useState<AccountLockout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'logins' | 'lockouts'>('alerts');

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [alertsData, loginsData, lockoutsData] = await Promise.all([
        supabase
          .from('security_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('failed_login_attempts')
          .select('*')
          .order('attempt_time', { ascending: false })
          .limit(50),
        supabase
          .from('account_lockouts')
          .select('*')
          .eq('is_active', true)
          .order('locked_at', { ascending: false }),
      ]);

      if (alertsData.data) setAlerts(alertsData.data);
      if (loginsData.data) setFailedLogins(loginsData.data);
      if (lockoutsData.data) setLockouts(lockoutsData.data);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await supabase
        .from('security_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const unlockAccount = async (lockoutId: string) => {
    try {
      await supabase
        .from('account_lockouts')
        .update({ is_active: false })
        .eq('id', lockoutId);

      setLockouts(lockouts.filter((l) => l.id !== lockoutId));
    } catch (error) {
      console.error('Error unlocking account:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'multiple_failed_logins':
      case 'suspicious_login':
        return <Lock className="w-5 h-5" />;
      case 'data_export':
        return <Eye className="w-5 h-5" />;
      case 'unusual_api_activity':
        return <Activity className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Cargando datos de seguridad...</div>
      </div>
    );
  }

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === 'critical');
  const highAlerts = unresolvedAlerts.filter((a) => a.severity === 'high');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Monitoreo de Seguridad</h2>
            <p className="text-sm text-slate-600">Alertas y eventos de seguridad del sistema</p>
          </div>
        </div>
        <button
          onClick={loadSecurityData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold text-red-900">Alertas Críticas</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{criticalAlerts.length}</p>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <h3 className="font-semibold text-orange-900">Alertas Altas</h3>
          </div>
          <p className="text-3xl font-bold text-orange-600">{highAlerts.length}</p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-6 h-6 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Cuentas Bloqueadas</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{lockouts.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-1">
            {[
              { key: 'alerts', label: 'Alertas de Seguridad', count: unresolvedAlerts.length },
              { key: 'logins', label: 'Intentos Fallidos', count: failedLogins.length },
              { key: 'lockouts', label: 'Bloqueos Activos', count: lockouts.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.key ? 'bg-white text-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {unresolvedAlerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay alertas pendientes</p>
                </div>
              ) : (
                unresolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border-2 rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getAlertIcon(alert.alert_type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">
                              {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white">
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{alert.description}</p>
                          <p className="text-xs opacity-75">
                            {new Date(alert.created_at).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="px-3 py-1 bg-white hover:bg-opacity-80 rounded font-medium text-sm transition-colors"
                      >
                        Resolver
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'logins' && (
            <div className="space-y-3">
              {failedLogins.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay intentos fallidos recientes</p>
                </div>
              ) : (
                failedLogins.map((login, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{login.email}</p>
                        <p className="text-sm text-slate-600 mt-1">IP: {login.ip_address}</p>
                        <p className="text-sm text-slate-600">Razón: {login.failure_reason}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(login.attempt_time).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'lockouts' && (
            <div className="space-y-3">
              {lockouts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay cuentas bloqueadas</p>
                </div>
              ) : (
                lockouts.map((lockout: any) => (
                  <div key={lockout.id} className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-red-900">{lockout.email}</p>
                        <p className="text-sm text-red-700 mt-1">{lockout.reason}</p>
                        <p className="text-xs text-red-600 mt-2">
                          Bloqueado hasta: {new Date(lockout.locked_until).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <button
                        onClick={() => unlockAccount(lockout.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm transition-colors"
                      >
                        Desbloquear
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
