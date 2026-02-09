import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Building2, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeBusinesses: number;
  trialBusinesses: number;
  upcomingPayments: number;
  overduePayments: number;
  revenueByMonth: { month: string; revenue: number }[];
  topBusinesses: { name: string; revenue: number }[];
  mostActiveBusinesses: { name: string; transferCount: number; lastActivity: string }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeBusinesses: 0,
    trialBusinesses: 0,
    upcomingPayments: 0,
    overduePayments: 0,
    revenueByMonth: [],
    topBusinesses: [],
    mostActiveBusinesses: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const [businesses, subscriptions, payments] = await Promise.all([
        supabase.from('businesses').select('id, name, status'),
        supabase.from('subscriptions').select('*'),
        supabase.from('payments').select('*'),
      ]);

      const activeBusinesses = businesses.data?.filter((b) => b.status === 'active').length || 0;
      const trialBusinesses = subscriptions.data?.filter((s) => s.is_trial && s.status === 'active').length || 0;

      const totalRevenue = payments.data?.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue =
        payments.data
          ?.filter((p) => {
            const paymentDate = new Date(p.payment_date);
            return (
              p.status === 'paid' &&
              paymentDate.getMonth() === currentMonth &&
              paymentDate.getFullYear() === currentYear
            );
          })
          .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const upcomingPayments =
        subscriptions.data?.filter(
          (s) => s.next_payment_date && new Date(s.next_payment_date) <= thirtyDaysFromNow && s.status === 'active'
        ).length || 0;

      const overduePayments =
        subscriptions.data?.filter(
          (s) => s.next_payment_date && new Date(s.next_payment_date) < new Date() && s.status === 'active'
        ).length || 0;

      const revenueByMonth = getRevenueByMonth(payments.data || []);
      const topBusinesses = await getTopBusinesses(payments.data || [], businesses.data || []);
      const mostActiveBusinesses = await getMostActiveBusinesses();

      setStats({
        totalRevenue,
        monthlyRevenue,
        activeBusinesses,
        trialBusinesses,
        upcomingPayments,
        overduePayments,
        revenueByMonth,
        topBusinesses,
        mostActiveBusinesses,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRevenueByMonth = (payments: any[]) => {
    const monthlyData: { [key: string]: number } = {};

    payments
      .filter((p) => p.status === 'paid')
      .forEach((payment) => {
        const date = new Date(payment.payment_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }

        monthlyData[monthKey] += Number(payment.amount);
      });

    return Object.entries(monthlyData)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);
  };

  const getTopBusinesses = async (payments: any[], businesses: any[]) => {
    const businessRevenue: { [key: string]: number } = {};

    payments
      .filter((p) => p.status === 'paid')
      .forEach((payment) => {
        if (!businessRevenue[payment.business_id]) {
          businessRevenue[payment.business_id] = 0;
        }
        businessRevenue[payment.business_id] += Number(payment.amount);
      });

    return Object.entries(businessRevenue)
      .map(([businessId, revenue]) => {
        const business = businesses.find((b) => b.id === businessId);
        return {
          name: business?.name || 'Unknown',
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getMostActiveBusinesses = async () => {
    try {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name, last_activity_at')
        .order('last_activity_at', { ascending: false })
        .limit(10);

      if (!businesses) return [];

      const businessesWithTransfers = await Promise.all(
        businesses.map(async (business) => {
          const { count } = await supabase
            .from('transfers')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', business.id);

          return {
            name: business.name,
            transferCount: count || 0,
            lastActivity: business.last_activity_at
              ? new Date(business.last_activity_at).toLocaleDateString()
              : 'Never',
          };
        })
      );

      return businessesWithTransfers
        .filter((b) => b.transferCount > 0)
        .sort((a, b) => b.transferCount - a.transferCount)
        .slice(0, 5);
    } catch (error) {
      console.error('Error getting most active businesses:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-600 mt-1">Resumen general de tu negocio SaaS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Ingresos Totales</p>
              <p className="text-3xl font-bold mt-1">€{stats.totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-emerald-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Ingresos Mensuales</p>
              <p className="text-3xl font-bold mt-1">€{stats.monthlyRevenue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Negocios Activos</p>
              <p className="text-3xl font-bold mt-1">{stats.activeBusinesses}</p>
            </div>
            <Building2 className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Negocios en Prueba</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.trialBusinesses}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Pagos Próximos</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.upcomingPayments}</p>
              <p className="text-xs text-slate-500 mt-1">Próximos 30 días</p>
            </div>
            <Calendar className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Pagos Vencidos</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.overduePayments}</p>
            </div>
            <Calendar className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Ingresos por Mes</h3>
          <div className="space-y-3">
            {stats.revenueByMonth.map((item) => (
              <div key={item.month} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.month}</span>
                <span className="font-semibold text-slate-900">€{item.revenue.toFixed(2)}</span>
              </div>
            ))}
            {stats.revenueByMonth.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Sin datos de ingresos</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Negocios por Ingresos</h3>
          <div className="space-y-3">
            {stats.topBusinesses.map((business, index) => (
              <div key={business.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{business.name}</p>
                </div>
                <span className="font-semibold text-slate-900">€{business.revenue.toFixed(2)}</span>
              </div>
            ))}
            {stats.topBusinesses.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Sin datos de negocios</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Negocios Más Activos</h3>
          <div className="space-y-3">
            {stats.mostActiveBusinesses.map((business, index) => (
              <div key={business.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-green-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{business.name}</p>
                  <p className="text-xs text-slate-600">Última: {business.lastActivity}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{business.transferCount}</span>
              </div>
            ))}
            {stats.mostActiveBusinesses.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Sin datos de actividad</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
