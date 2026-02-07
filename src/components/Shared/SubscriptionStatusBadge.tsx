import { Clock, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { SubscriptionInfo } from '../../lib/subscriptionUtils';

interface SubscriptionStatusBadgeProps {
  subscriptionInfo: SubscriptionInfo;
  showDetails?: boolean;
}

export function SubscriptionStatusBadge({
  subscriptionInfo,
  showDetails = false,
}: SubscriptionStatusBadgeProps) {
  const getIcon = () => {
    switch (subscriptionInfo.status) {
      case 'trial_active':
      case 'active':
        return <CheckCircle className="w-5 h-5" />;
      case 'trial_expiring_soon':
      case 'expiring_soon':
        return <AlertTriangle className="w-5 h-5" />;
      case 'trial_expired':
      case 'expired':
        return <XCircle className="w-5 h-5" />;
      case 'no_subscription':
        return <HelpCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (!showDetails) {
    // Compact badge version
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${subscriptionInfo.statusColor}`}>
        {getIcon()}
        <span>{subscriptionInfo.statusMessage}</span>
      </div>
    );
  }

  // Detailed card version
  return (
    <div className={`border-2 rounded-lg p-4 ${subscriptionInfo.statusColor.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 bg-')}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={subscriptionInfo.statusColor.split(' ')[0]}>
          {getIcon()}
        </div>
        <div>
          <h3 className={`font-semibold ${subscriptionInfo.statusColor.split(' ')[0]}`}>
            {subscriptionInfo.statusMessage}
          </h3>
          {subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining > 0 && (
            <p className="text-xs text-slate-600 mt-0.5">
              {subscriptionInfo.daysRemaining} {subscriptionInfo.daysRemaining === 1 ? 'día' : 'días'} restantes
            </p>
          )}
        </div>
      </div>

      {subscriptionInfo.endDate && (
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Fecha de {subscriptionInfo.status.includes('expired') ? 'vencimiento' : 'renovación'}:</span>
            <span className="font-medium text-slate-900">
              {subscriptionInfo.endDate.toLocaleDateString('es-ES')}
            </span>
          </div>
        </div>
      )}

      {subscriptionInfo.isRestricted && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-xs font-medium text-red-700">
            ⚠️ Funcionalidades limitadas
          </p>
        </div>
      )}
    </div>
  );
}
