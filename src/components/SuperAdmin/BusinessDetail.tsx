import { useState, useEffect } from 'react';
import { ArrowLeft, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
type Business = {
  id: string;
  name: string;
  email: string;
  status?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  transfer_limit?: number | null;
  created_at: string | null;
  city?: string | null;
  country?: string | null;
};
type Subscription = {
  id: string;
  business_id: string;
  plan_type?: string | null;
  status: 'active' | 'trial' | 'suspended' | 'cancelled' | null;
  is_trial?: boolean | null;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  next_payment_date?: string | null;
  monthly_price?: number | null;
};
type Payment = {
  id: string;
  business_id: string;
  subscription_id: string | null;
  amount: number;
  payment_date: string;
  due_date: string | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
};
type BusinessUser = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'operator';
  is_superadmin?: boolean | null;
  is_active?: boolean;
};

interface BusinessDetailProps {
  businessId: string;
  onBack: () => void;
}

interface BusinessStats {
  clientCount: number;
  transferCount: number;
  userCount: number;
  recentActivity: string | null;
}

export function BusinessDetail({ businessId, onBack }: BusinessDetailProps) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [stats, setStats] = useState<BusinessStats>({ clientCount: 0, transferCount: 0, userCount: 0, recentActivity: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'subscription' | 'payments' | 'users'>('info');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    console.log('=== [BusinessDetail] useEffect triggered with businessId:', businessId);
    if (businessId) {
      loadBusinessDetail();
    } else {
      console.error('=== [BusinessDetail] useEffect: businessId is falsy!');
      setError('Error: No se proporcionó un ID de negocio.');
      setLoading(false);
    }
  }, [businessId]);

  const loadBusinessDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== [BusinessDetail] Loading business detail for ID:', businessId);
      console.log('=== [BusinessDetail] BusinessId type:', typeof businessId);
      console.log('=== [BusinessDetail] BusinessId value:', businessId);

      if (!businessId) {
        console.error('=== [BusinessDetail] ERROR: businessId is null or undefined!');
        setError('Error: No se proporcionó un ID de negocio válido.');
        setLoading(false);
        return;
      }

      const bizResult = await supabase.from('businesses').select('*').eq('id', businessId).single();
      console.log('=== [BusinessDetail] Business query result:', { data: bizResult.data, error: bizResult.error, status: bizResult.status, statusText: bizResult.statusText });

      if (bizResult.error) {
        console.error('=== Error loading business:', bizResult.error);
        const errorMsg = `Error al cargar negocio: ${bizResult.error.message}. Detalles: ${JSON.stringify(bizResult.error)}`;
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (!bizResult.data) {
        console.error('=== No business data returned');
        setError('No se encontró el negocio con el ID proporcionado.');
        setLoading(false);
        return;
      }

      console.log('=== [BusinessDetail] Business data loaded successfully:', bizResult.data);
      setBusiness(bizResult.data);

      console.log('=== [BusinessDetail] Loading additional data (subscription, payments, users, stats)...');
      const [subResult, payResult, usersResult, clientsResult, transfersResult] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('business_id', businessId).maybeSingle(),
        supabase.from('payments').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('business_users').select('*').eq('business_id', businessId),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('transfers').select('id, created_at', { count: 'exact' }).eq('business_id', businessId).order('created_at', { ascending: false }).limit(1),
      ]);

      console.log('=== [BusinessDetail] Subscription result:', subResult);
      console.log('=== [BusinessDetail] Payments result:', payResult);
      console.log('=== [BusinessDetail] Users result:', usersResult);
      console.log('=== [BusinessDetail] Clients count:', clientsResult);
      console.log('=== [BusinessDetail] Transfers result:', transfersResult);

      if (subResult.error) {
        console.warn('=== [BusinessDetail] Error loading subscription (non-critical):', subResult.error);
      }
      if (payResult.error) {
        console.warn('=== [BusinessDetail] Error loading payments (non-critical):', payResult.error);
      }
      if (usersResult.error) {
        console.warn('=== [BusinessDetail] Error loading users (non-critical):', usersResult.error);
      }
      if (clientsResult.error) {
        console.warn('=== [BusinessDetail] Error loading clients count (non-critical):', clientsResult.error);
      }
      if (transfersResult.error) {
        console.warn('=== [BusinessDetail] Error loading transfers (non-critical):', transfersResult.error);
      }

      setSubscription(subResult.data || null);
      setPayments(payResult.data || []);
      setUsers(usersResult.data || []);
      setStats({
        clientCount: clientsResult.count || 0,
        transferCount: transfersResult.count || 0,
        userCount: (usersResult.data || []).length,
        recentActivity: (transfersResult.data && transfersResult.data.length > 0) ? transfersResult.data[0].created_at : null,
      });
      console.log('=== [BusinessDetail] All data loaded successfully');
    } catch (error) {
      console.error('=== Exception in loadBusinessDetail:', error);
      setError(`Error inesperado: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateSubscription = async () => {
    if (!business) {
      alert('Error: No se encontró información del negocio.');
      return;
    }

    const trialMonths = prompt('Ingrese los meses de prueba (1-3):');
    if (!trialMonths) return;

    if (isNaN(Number(trialMonths))) {
      alert('Por favor, ingresa un número válido de meses.');
      return;
    }

    const months = Math.min(Math.max(1, Number(trialMonths)), 3);

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      const subData = {
        business_id: businessId,
        plan_type: 'trial',
        status: 'active' as const,
        is_trial: true,
        trial_start_date: startDate.toISOString(),
        trial_end_date: endDate.toISOString(),
        trial_months: months,
        monthly_price: 0,
      };

      let result;
      if (subscription) {
        result = await supabase.from('subscriptions').update(subData).eq('id', subscription.id).select();
      } else {
        result = await supabase.from('subscriptions').insert(subData).select();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      await supabase.from('admin_audit_log').insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        business_id: businessId,
        action_type: 'trial_granted',
        action_description: `Granted ${months} months trial`,
        entity_type: 'subscription',
        entity_id: businessId,
      });

      setSuccessMessage(`Suscripción de prueba ${subscription ? 'actualizada' : 'creada'} correctamente: ${months} meses.`);
      setTimeout(() => setSuccessMessage(null), 5000);

      await loadBusinessDetail();
      alert(`✓ Suscripción ${subscription ? 'actualizada' : 'creada'} correctamente\n\nMeses de prueba: ${months}`);
    } catch (error) {
      console.error('Error creating trial:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`No se pudo ${subscription ? 'actualizar' : 'crear'} la suscripción.\n\nError: ${errorMsg}`);
    }
  };

  const updateNextPaymentDate = async () => {
    if (!subscription) {
      alert('Error: No se encontró una suscripción para este negocio.');
      return;
    }

    const newDate = prompt('Ingrese nueva fecha de pago (YYYY-MM-DD):');
    if (!newDate) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      alert('Por favor, ingresa una fecha válida en formato YYYY-MM-DD (ejemplo: 2025-12-31).');
      return;
    }

    try {
      const dateObj = new Date(newDate);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Fecha inválida');
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({ next_payment_date: dateObj.toISOString() })
        .eq('id', subscription.id);

      if (error) {
        throw new Error(error.message);
      }

      await supabase.from('admin_audit_log').insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        business_id: businessId,
        action_type: 'payment_date_changed',
        action_description: `Changed next payment date to ${newDate}`,
        entity_type: 'subscription',
        entity_id: subscription.id,
      });

      setSuccessMessage(`Fecha de próximo pago actualizada a ${newDate}.`);
      setTimeout(() => setSuccessMessage(null), 5000);

      await loadBusinessDetail();
      alert(`✓ Fecha de próximo pago actualizada correctamente\n\nNueva fecha: ${newDate}`);
    } catch (error) {
      console.error('Error updating payment date:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`No se pudo actualizar la fecha de pago.\n\nError: ${errorMsg}`);
    }
  };

  const registerPayment = async () => {
    console.log('=== [BusinessDetail] registerPayment called');
    console.log('=== [BusinessDetail] Subscription:', subscription);
    console.log('=== [BusinessDetail] Business ID:', businessId);

    if (!subscription) {
      console.error('=== [BusinessDetail] ERROR: No subscription found');
      alert('Error: No se encontró una suscripción para este negocio. Por favor, crea una suscripción primero.');
      return;
    }

    if (processingPayment) {
      console.warn('=== [BusinessDetail] Payment already being processed');
      return;
    }

    const amount = prompt('Ingrese el monto del pago (€):');
    console.log('=== [BusinessDetail] Amount entered:', amount);

    if (!amount) {
      console.warn('=== [BusinessDetail] User cancelled or entered empty amount');
      return;
    }

    if (amount.trim() === '') {
      alert('Por favor, completa todos los campos antes de registrar el pago.');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error('=== [BusinessDetail] Invalid amount:', amount);
      alert('Por favor, ingresa un monto válido mayor a 0.');
      return;
    }

    const confirmMsg = `¿Confirmas registrar un pago de €${numAmount.toFixed(2)} para ${business?.name}?`;
    if (!confirm(confirmMsg)) {
      console.log('=== [BusinessDetail] User cancelled payment confirmation');
      return;
    }

    try {
      setProcessingPayment(true);
      setSuccessMessage(null);
      console.log('=== [BusinessDetail] Starting payment registration...');

      const currentUser = await supabase.auth.getUser();
      console.log('=== [BusinessDetail] Current user:', currentUser.data.user?.id);

      if (!currentUser.data.user) {
        throw new Error('No se pudo obtener el usuario actual');
      }

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const paymentData = {
        business_id: businessId,
        subscription_id: subscription.id,
        amount: numAmount,
        payment_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        status: 'paid' as const,
      };

      console.log('=== [BusinessDetail] Inserting payment:', paymentData);

      const { data: paymentResult, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select();

      if (paymentError) {
        console.error('=== [BusinessDetail] Payment insert error:', paymentError);
        throw new Error(`Error al insertar pago: ${paymentError.message}`);
      }

      console.log('=== [BusinessDetail] Payment inserted successfully:', paymentResult);

      const subscriptionUpdate = {
        last_payment_date: new Date().toISOString(),
        next_payment_date: nextMonth.toISOString(),
      };

      console.log('=== [BusinessDetail] Updating subscription:', subscriptionUpdate);

      const { error: subUpdateError } = await supabase
        .from('subscriptions')
        .update(subscriptionUpdate)
        .eq('id', subscription.id);

      if (subUpdateError) {
        console.error('=== [BusinessDetail] Subscription update error:', subUpdateError);
        throw new Error(`Error al actualizar suscripción: ${subUpdateError.message}`);
      }

      console.log('=== [BusinessDetail] Subscription updated successfully');

      const auditData = {
        admin_user_id: currentUser.data.user.id,
        business_id: businessId,
        action_type: 'payment_registered',
        action_description: `Registered payment of €${numAmount.toFixed(2)}`,
        entity_type: 'payment',
        entity_id: paymentResult?.[0]?.id || businessId,
      };

      console.log('=== [BusinessDetail] Inserting audit log:', auditData);

      const { error: auditError } = await supabase.from('admin_audit_log').insert(auditData);

      if (auditError) {
        console.warn('=== [BusinessDetail] Audit log error (non-critical):', auditError);
      }

      console.log('=== [BusinessDetail] Payment registration complete, reloading data...');
      setSuccessMessage(`Pago de €${numAmount.toFixed(2)} registrado correctamente.`);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

      await loadBusinessDetail();
      console.log('=== [BusinessDetail] Data reloaded successfully');

      alert(`✓ Pago registrado correctamente\n\nMonto: €${numAmount.toFixed(2)}\nNegocio: ${business?.name}\nFecha: ${new Date().toLocaleDateString()}`);

    } catch (error) {
      console.error('=== [BusinessDetail] Error registering payment:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`No se pudo registrar el pago.\n\nError: ${errorMsg}\n\nIntenta de nuevo o verifica la información.`);
    } finally {
      setProcessingPayment(false);
      console.log('=== [BusinessDetail] registerPayment finished');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Cargando Detalles del Negocio</h2>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-blue-900 font-medium">Cargando información del negocio...</p>
          </div>
          <p className="text-sm text-blue-700 text-center mt-3">Esto puede tomar unos segundos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Error al Cargar Detalles</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">No se pudo cargar la información del negocio</h3>
          <p className="text-red-800 mb-4">{error}</p>
          <div className="bg-white border border-red-200 rounded p-4">
            <p className="text-sm font-medium text-slate-900 mb-2">Información de depuración:</p>
            <p className="text-xs text-slate-600 mb-1"><strong>Business ID:</strong> {businessId}</p>
            <p className="text-xs text-slate-600"><strong>Consola del navegador:</strong> Abre las herramientas de desarrollo (F12) y revisa la consola para más detalles</p>
          </div>
          <button
            onClick={loadBusinessDetail}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar Carga
          </button>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Negocio No Encontrado</h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="text-amber-900 mb-2">No hay datos para mostrar de este negocio.</p>
          <p className="text-sm text-amber-800">ID del negocio: {businessId}</p>
        </div>
      </div>
    );
  }

  const isBusinessBlocked = business.status !== 'active' && business.status !== 'trial';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{business.name}</h2>
            {isBusinessBlocked && (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                BLOQUEADO/INACTIVO
              </span>
            )}
          </div>
          <p className="text-slate-600">{business.email}</p>
          {isBusinessBlocked && (
            <p className="text-sm text-red-600 mt-1 font-medium">
              ⚠️ Este negocio no puede operar actualmente. Estado: {business.status}
            </p>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded animate-pulse">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {isBusinessBlocked && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">
                Negocio Deshabilitado
              </h3>
              <p className="text-sm text-red-800">
                Los usuarios de este negocio no pueden acceder ni realizar operaciones.
                Solo el SuperAdmin puede ver esta información y restaurar el acceso.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 font-medium ${activeTab === 'info'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-6 py-3 font-medium ${activeTab === 'subscription'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Suscripción
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 font-medium ${activeTab === 'payments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Pagos
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Usuarios
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Información General</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-600">Nombre del Negocio</p>
                      <p className="font-medium text-slate-900">{business.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Email</p>
                      <p className="font-medium text-slate-900">{business.email}</p>
                    </div>
                    {business.contact_name && (
                      <div>
                        <p className="text-xs text-slate-600">Persona de Contacto</p>
                        <p className="font-medium text-slate-900">{business.contact_name}</p>
                      </div>
                    )}
                    {business.phone && (
                      <div>
                        <p className="text-xs text-slate-600">Teléfono</p>
                        <p className="font-medium text-slate-900">{business.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Estado y Configuración</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-600">Estado del Servicio</p>
                      <p className="font-medium text-slate-900 capitalize">{business.status || 'active'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Límite de Transferencia</p>
                      <p className="font-medium text-slate-900">€{business.transfer_limit?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Fecha de Creación</p>
                      <p className="font-medium text-slate-900">
                        {business.created_at ? new Date(business.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                    {business.city && (
                      <div>
                        <p className="text-xs text-slate-600">Ubicación</p>
                        <p className="font-medium text-slate-900">
                          {business.city}{business.country ? `, ${business.country}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Estadísticas de Actividad
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.clientCount}</p>
                    <p className="text-xs text-slate-600">Clientes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.transferCount}</p>
                    <p className="text-xs text-slate-600">Transferencias</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.userCount}</p>
                    <p className="text-xs text-slate-600">Usuarios</p>
                  </div>
                </div>
                {stats.recentActivity && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-600">Última Actividad</p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(stats.recentActivity).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {subscription ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Tipo de Plan</p>
                      <p className="font-medium text-slate-900 capitalize">{subscription.plan_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Status</p>
                      <p className="font-medium text-slate-900 capitalize">{subscription.status}</p>
                    </div>
                    {subscription.is_trial && (
                      <>
                        <div>
                          <p className="text-sm text-slate-600">Inicio de Prueba</p>
                          <p className="font-medium text-slate-900">
                            {subscription.trial_start_date
                              ? new Date(subscription.trial_start_date).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Fin de Prueba</p>
                          <p className="font-medium text-slate-900">
                            {subscription.trial_end_date
                              ? new Date(subscription.trial_end_date).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-slate-600">Próximo Pago</p>
                      <p className="font-medium text-slate-900">
                        {subscription.next_payment_date
                          ? new Date(subscription.next_payment_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Precio Mensual</p>
                      <p className="font-medium text-slate-900">€{subscription.monthly_price}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={createOrUpdateSubscription}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Actualizar Prueba
                    </button>
                    <button
                      onClick={updateNextPaymentDate}
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Cambiar Fecha de Pago
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-4">No se encontró suscripción</p>
                  <button
                    onClick={createOrUpdateSubscription}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Crear Suscripción de Prueba
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              {processingPayment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p className="text-blue-900 font-medium">Procesando pago, por favor espera...</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={registerPayment}
                  disabled={processingPayment}
                  className={`px-4 py-2 rounded-lg transition-colors ${processingPayment
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  {processingPayment ? 'Procesando...' : 'Registrar Pago'}
                </button>
              </div>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">€{payment.amount}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${payment.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-center text-slate-600 py-8">No hay pagos registrados</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuarios Asociados al Negocio
              </h3>
              {users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        <p className="text-xs text-slate-500 mt-1 capitalize">
                          Rol: {user.role} {user.is_superadmin && '(SuperAdmin)'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600">No hay usuarios asociados a este negocio</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
