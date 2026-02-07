import { useState, useEffect } from 'react';
import { Building2, Search, Filter, Eye, Ban, CheckCircle, XCircle, Clock, AlertTriangle, Power } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';

type Business = Database['public']['Tables']['businesses']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];

interface BusinessWithSubscription extends Business {
  subscription?: Subscription;
  user_count: number;
  transfer_count: number;
  client_count: number;
  days_until_payment: number | null;
}

interface BusinessManagementProps {
  onSelectBusiness: (businessId: string) => void;
}

export function BusinessManagement({ onSelectBusiness }: BusinessManagementProps) {
  const [businesses, setBusinesses] = useState<BusinessWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);

      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .order('name');

      if (bizError) throw bizError;

      if (bizData) {
        const businessesWithData = await Promise.all(
          bizData.map(async (business) => {
            const [subscription, users, transfers, clients] = await Promise.all([
              supabase
                .from('subscriptions')
                .select('*')
                .eq('business_id', business.id)
                .maybeSingle(),
              supabase
                .from('business_users')
                .select('id', { count: 'exact', head: true })
                .eq('business_id', business.id)
                .eq('is_active', true),
              supabase
                .from('transfers')
                .select('id', { count: 'exact', head: true })
                .eq('business_id', business.id),
              supabase
                .from('clients')
                .select('id', { count: 'exact', head: true })
                .eq('business_id', business.id),
            ]);

            let days_until_payment = null;
            if (subscription.data?.next_payment_date) {
              const daysUntil = Math.ceil(
                (new Date(subscription.data.next_payment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              days_until_payment = daysUntil;
            }

            return {
              ...business,
              subscription: subscription.data || undefined,
              user_count: users.count || 0,
              transfer_count: transfers.count || 0,
              client_count: clients.count || 0,
              days_until_payment,
            };
          })
        );

        setBusinesses(businessesWithData);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBusinessStatus = async (businessId: string, currentStatus: string) => {
    try {
      console.log('Toggling status for business:', businessId, 'Current status:', currentStatus);

      const newStatus = (currentStatus === 'active' || currentStatus === 'trial') ? 'inactive' : 'active';
      console.log('New status will be:', newStatus);

      setBusinesses(prevBusinesses =>
        prevBusinesses.map(b =>
          b.id === businessId ? { ...b, status: newStatus } : b
        )
      );

      const { error, data } = await supabase
        .from('businesses')
        .update({ status: newStatus })
        .eq('id', businessId)
        .select();

      if (error) {
        console.error('Error updating business status:', error);
        alert(`Error: ${error.message}`);
        setBusinesses(prevBusinesses =>
          prevBusinesses.map(b =>
            b.id === businessId ? { ...b, status: currentStatus } : b
          )
        );
        return;
      }

      console.log('Status updated successfully:', data);

      await supabase.from('admin_audit_log').insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        business_id: businessId,
        action_type: 'business_status_change',
        action_description: `Changed business status from ${currentStatus} to ${newStatus}`,
        entity_type: 'business',
        entity_id: businessId,
        new_values: { status: newStatus },
      });
    } catch (error) {
      console.error('Error toggling business status:', error);
      alert('Error toggling business status');
      setBusinesses(prevBusinesses =>
        prevBusinesses.map(b =>
          b.id === businessId ? { ...b, status: currentStatus } : b
        )
      );
    }
  };

  const updateBusinessStatus = async (businessId: string, status: string, reason?: string) => {
    try {
      const updates: any = { status };

      if (status === 'blocked' || status === 'suspended') {
        updates.blocked_reason = reason;
        updates.blocked_at = new Date().toISOString();
      } else {
        updates.blocked_reason = null;
        updates.blocked_at = null;
      }

      const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId);

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        business_id: businessId,
        action_type: 'business_status_change',
        action_description: `Changed business status to ${status}`,
        entity_type: 'business',
        entity_id: businessId,
        new_values: { status, reason },
      });

      loadBusinesses();
    } catch (error) {
      console.error('Error updating business status:', error);
    }
  };

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || business.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, label: 'Inactive' },
      suspended: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Suspended' },
      blocked: { color: 'bg-red-100 text-red-800 border-red-200', icon: Ban, label: 'Blocked' },
    };

    const badge = badges[status] || badges.active;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getTrialBadge = (subscription?: Subscription) => {
    if (!subscription?.is_trial) return null;

    const daysLeft = subscription.trial_end_date
      ? Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        <Clock className="w-3 h-3" />
        Trial: {daysLeft}d left
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading businesses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Negocios</h2>
          <p className="text-slate-600 mt-1">Administrar todos los negocios y suscripciones</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar negocios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
            <option value="blocked">Bloqueado</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Negocio</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contacto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Suscripción</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vence Pago</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actividad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Servicio</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredBusinesses.map((business) => (
              <tr key={business.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-slate-900">{business.name}</div>
                    <div className="text-xs text-slate-600">{business.email}</div>
                    {business.city && (
                      <div className="text-xs text-slate-500 mt-1">
                        {business.city}{business.country ? `, ${business.country}` : ''}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    {business.contact_name && (
                      <div className="text-sm text-slate-900">{business.contact_name}</div>
                    )}
                    {business.phone && (
                      <div className="text-xs text-slate-600">{business.phone}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getTrialBadge(business.subscription)}
                  {!business.subscription?.is_trial && business.subscription && (
                    <span className="text-sm text-slate-900 capitalize">{business.subscription.plan_type}</span>
                  )}
                  {!business.subscription && (
                    <span className="text-sm text-slate-500">Sin suscripción</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {business.days_until_payment !== null ? (
                    <div className={`text-sm font-medium ${
                      business.days_until_payment <= 0
                        ? 'text-red-600'
                        : business.days_until_payment <= 7
                        ? 'text-amber-600'
                        : 'text-slate-900'
                    }`}>
                      {business.days_until_payment <= 0 ? (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Vencido
                        </span>
                      ) : (
                        `${business.days_until_payment} days`
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs">
                    <div className="text-slate-900">{business.transfer_count} transferencias</div>
                    <div className="text-slate-600">{business.client_count} clientes</div>
                    {business.last_activity_at && (
                      <div className="text-slate-500 mt-1">
                        Última: {new Date(business.last_activity_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleBusinessStatus(business.id, business.status || 'active')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      (business.status === 'active' || business.status === 'trial') ? 'bg-green-600' : 'bg-slate-300'
                    }`}
                    title={(business.status === 'active' || business.status === 'trial') ? 'Servicio Activo' : 'Servicio Inactivo'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        (business.status === 'active' || business.status === 'trial') ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onSelectBusiness(business.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver Detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {business.status !== 'blocked' && (
                      <button
                        onClick={() => {
                          const reason = prompt('Ingrese el motivo del bloqueo:');
                          if (reason) updateBusinessStatus(business.id, 'blocked', reason);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Bloquear Negocio"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    {business.status === 'blocked' && (
                      <button
                        onClick={() => updateBusinessStatus(business.id, 'active')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Activar Negocio"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No se encontraron negocios</p>
          </div>
        )}
      </div>
    </div>
  );
}
