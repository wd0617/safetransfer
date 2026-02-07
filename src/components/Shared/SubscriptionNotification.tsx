import { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { SubscriptionInfo, markNotificationAsShown, shouldShowNotificationToday } from '../../lib/subscriptionUtils';

interface SubscriptionNotificationProps {
  businessId: string;
  subscriptionInfo: SubscriptionInfo;
  onClose: () => void;
  onRenew?: () => void;
}

export function SubscriptionNotification({
  businessId,
  subscriptionInfo,
  onClose,
  onRenew,
}: SubscriptionNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('=== [SubscriptionNotification] Effect triggered');
    console.log('=== [SubscriptionNotification] shouldShowNotification:', subscriptionInfo.shouldShowNotification);
    console.log('=== [SubscriptionNotification] businessId:', businessId);

    if (subscriptionInfo.shouldShowNotification && shouldShowNotificationToday(businessId, subscriptionInfo)) {
      console.log('=== [SubscriptionNotification] Showing notification');
      setIsVisible(true);
      markNotificationAsShown(businessId);
    }
  }, [businessId, subscriptionInfo]);

  const handleClose = () => {
    console.log('=== [SubscriptionNotification] Closing notification');
    setIsVisible(false);
    onClose();
  };

  const handleRenew = () => {
    console.log('=== [SubscriptionNotification] Renew clicked');
    if (onRenew) {
      onRenew();
    }
    handleClose();
  };

  if (!isVisible || !subscriptionInfo.notificationMessage) {
    return null;
  }

  const isExpired = subscriptionInfo.status === 'trial_expired' || subscriptionInfo.status === 'expired';
  const isExpiringSoon = subscriptionInfo.status === 'trial_expiring_soon' || subscriptionInfo.status === 'expiring_soon';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-scale-in">
        <div className={`p-6 rounded-t-lg ${isExpired ? 'bg-red-50 border-b-4 border-red-500' : 'bg-amber-50 border-b-4 border-amber-500'}`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
              {isExpired ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${isExpired ? 'text-red-900' : 'text-amber-900'}`}>
                {isExpired ? '¡Atención Requerida!' : '¡Aviso Importante!'}
              </h3>
              <p className={`text-sm ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
                {subscriptionInfo.notificationMessage}
              </p>
            </div>
            <button
              onClick={handleClose}
              className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                isExpired
                  ? 'hover:bg-red-100 text-red-600'
                  : 'hover:bg-amber-100 text-amber-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Estado Actual:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${subscriptionInfo.statusColor}`}>
                {subscriptionInfo.statusMessage}
              </span>
            </div>

            {subscriptionInfo.daysRemaining !== null && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Días Restantes:</span>
                <span className={`text-2xl font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-green-600'}`}>
                  {subscriptionInfo.daysRemaining > 0 ? subscriptionInfo.daysRemaining : 0}
                </span>
              </div>
            )}

            {subscriptionInfo.endDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {isExpired ? 'Venció el:' : 'Vence el:'}
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {subscriptionInfo.endDate.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {onRenew && (
              <button
                onClick={handleRenew}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  isExpired
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                {isExpired ? 'Renovar Ahora' : 'Renovar Suscripción'}
              </button>
            )}

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {isExpired ? 'Renovar Más Tarde' : 'Recordar Más Tarde'}
            </button>
          </div>

          {isExpired && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">
                <strong>Nota:</strong> Algunas funcionalidades pueden estar limitadas hasta que renueves tu suscripción.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
