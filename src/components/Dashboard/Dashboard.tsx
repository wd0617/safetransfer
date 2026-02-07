import { useEffect, useState } from 'react';
import { Users, ArrowRightLeft, DollarSign, AlertCircle, FileWarning, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionStatusBadge } from '../Shared/SubscriptionStatusBadge';
import { calculateSubscriptionInfo } from '../../lib/subscriptionUtils';

interface DashboardProps {
  businessId: string;
  language: Language;
}

interface Stats {
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
}

export function Dashboard({ businessId, language }: DashboardProps) {
  const { t } = useTranslation(language);
  const { subscription, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const subscriptionInfo = calculateSubscriptionInfo(subscription, language);

  useEffect(() => {
    loadStats();
  }, [businessId]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_business_stats', {
        p_business_id: businessId,
      });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">{t('common.error')}</div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.totalClients'),
      value: stats.total_clients || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: t('dashboard.totalTransfers'),
      value: stats.total_transfers || 0,
      icon: ArrowRightLeft,
      color: 'bg-green-500',
    },
    {
      title: t('dashboard.totalAmount'),
      value: `€${(stats.total_amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
    {
      title: t('dashboard.clientsAtLimit'),
      value: stats.clients_at_limit || 0,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      title: t('dashboard.unreadAlerts'),
      value: stats.unread_alerts || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      title: t('dashboard.expiredDocuments'),
      value: stats.expired_documents || 0,
      icon: FileWarning,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('dashboard.title')}</h1>
          <p className="text-slate-600 mt-1">{t('dashboard.welcome')}</p>
        </div>
        {!isSuperAdmin && (
          <div className="flex-shrink-0">
            <SubscriptionStatusBadge subscriptionInfo={subscriptionInfo} />
          </div>
        )}
      </div>

      {!isSuperAdmin && subscriptionInfo.isRestricted && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Acceso Limitado</h3>
              <p className="text-sm text-red-800">
                Tu {subscriptionInfo.status.includes('trial') ? 'periodo de prueba ha terminado' : 'suscripción ha vencido'}.
                Algunas funcionalidades están limitadas hasta que renueves tu suscripción.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.today')}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{t('dashboard.totalTransfers')}</span>
              <span className="font-semibold text-slate-900">{stats.transfers_today || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{t('dashboard.totalAmount')}</span>
              <span className="font-semibold text-slate-900">
                €{(stats.amount_today || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.thisMonth')}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{t('dashboard.totalTransfers')}</span>
              <span className="font-semibold text-slate-900">{stats.transfers_this_month || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{t('dashboard.totalAmount')}</span>
              <span className="font-semibold text-slate-900">
                €{(stats.amount_this_month || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">{t('legal.italianLaw')}</h3>
            <p className="text-blue-800 text-sm">{t('legal.transferLimit')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
