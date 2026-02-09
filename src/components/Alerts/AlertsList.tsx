import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
type Alert = {
  id: string;
  business_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_read: boolean;
  created_at: string | null;
};

interface AlertsListProps {
  businessId: string;
  language: Language;
}

export function AlertsList({ businessId, language }: AlertsListProps) {
  const { t } = useTranslation(language);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, [businessId, filter]);

  const loadAlerts = async () => {
    try {
      let query = supabase
        .from('legal_alerts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('legal_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      loadAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">{t('alerts.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            {t('alerts.unread')}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            {t('alerts.all')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600">
              {filter === 'unread' ? 'No unread alerts' : 'No alerts'}
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getSeverityColor(
                alert.severity
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">
                        {t(`alerts.${alert.alert_type}`)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${alert.severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : alert.severity === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                          }`}
                      >
                        {t(`alerts.${alert.severity}`)}
                      </span>
                    </div>
                    <p className="text-slate-700 mb-2">{alert.message}</p>
                    <div className="text-xs text-slate-500">
                      {alert.created_at ? new Date(alert.created_at).toLocaleString(
                        language === 'it' ? 'it-IT' : language === 'en' ? 'en-US' : 'es-ES'
                      ) : ''}
                    </div>
                  </div>
                </div>
                {!alert.is_read && (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                  >
                    {t('alerts.markAsRead')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
