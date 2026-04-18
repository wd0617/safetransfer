import { useEffect, useState } from 'react';
import { Users, ArrowRightLeft, DollarSign, AlertCircle, FileWarning, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionStatusBadge } from '../Shared/SubscriptionStatusBadge';
import { calculateSubscriptionInfo } from '../../lib/subscriptionUtils';
import { Card, SkeletonCard, EmptyState } from '../ui';
import { motion } from 'framer-motion';

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
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <SkeletonCard className="h-10 w-64" />
          <SkeletonCard className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('common.error')}
        description="No se pudieron cargar las estadísticas. Inténtalo de nuevo."
      />
    );
  }

  const statCards = [
    {
      title: t('dashboard.totalClients'),
      value: stats.total_clients || 0,
      icon: Users,
      color: 'bg-brand-500',
      lightColor: 'bg-brand-50 text-brand-600',
    },
    {
      title: t('dashboard.totalTransfers'),
      value: stats.total_transfers || 0,
      icon: ArrowRightLeft,
      color: 'bg-success-500',
      lightColor: 'bg-success-50 text-success-600',
    },
    {
      title: t('dashboard.totalAmount'),
      value: `€${(stats.total_amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: t('dashboard.clientsAtLimit'),
      value: stats.clients_at_limit || 0,
      icon: AlertCircle,
      color: 'bg-warning-500',
      lightColor: 'bg-warning-50 text-warning-600',
    },
    {
      title: t('dashboard.unreadAlerts'),
      value: stats.unread_alerts || 0,
      icon: AlertCircle,
      color: 'bg-danger-500',
      lightColor: 'bg-danger-50 text-danger-600',
    },
    {
      title: t('dashboard.expiredDocuments'),
      value: stats.expired_documents || 0,
      icon: FileWarning,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{t('dashboard.welcome')}</p>
        </motion.div>
        {!isSuperAdmin && (
          <div className="flex-shrink-0">
            <SubscriptionStatusBadge subscriptionInfo={subscriptionInfo} />
          </div>
        )}
      </div>

      {!isSuperAdmin && subscriptionInfo.isRestricted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-danger-50 dark:bg-danger-900/20 border-l-4 border-danger-500 p-4 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-danger-900 dark:text-danger-200 mb-1">Acceso Limitado</h3>
              <p className="text-sm text-danger-800 dark:text-danger-300">
                Tu {subscriptionInfo.status.includes('trial') ? 'periodo de prueba ha terminado' : 'suscripción ha vencido'}.
                Algunas funcionalidades están limitadas hasta que renueves tu suscripción.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card variant="stat">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className={`${card.lightColor} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.today')}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.totalTransfers')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats.transfers_today || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.totalAmount')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  €{(stats.amount_today || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-success-50 dark:bg-success-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.thisMonth')}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.totalTransfers')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats.transfers_this_month || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.totalAmount')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  €{(stats.amount_this_month || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-2xl p-6"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-brand-100 dark:bg-brand-800/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-brand-600 dark:text-brand-400 mt-0.5" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-900 dark:text-brand-200 mb-1">{t('legal.italianLaw')}</h3>
            <p className="text-brand-800 dark:text-brand-300 text-sm">{t('legal.transferLimit')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
