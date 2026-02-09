import { translations, Language } from './i18n';

type Subscription = {
  id: string;
  business_id: string;
  plan?: string | null;
  status?: 'active' | 'trial' | 'suspended' | 'cancelled' | null;
  current_period_end?: string | null;
  is_trial?: boolean | null;
  trial_end_date?: string | null;
  next_payment_date?: string | null;
};

export type SubscriptionStatus =
  | 'trial_active'
  | 'trial_expiring_soon'
  | 'trial_expired'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'no_subscription';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  daysRemaining: number | null;
  statusMessage: string;
  statusColor: string;
  shouldShowNotification: boolean;
  notificationMessage: string | null;
  isRestricted: boolean;
  endDate: Date | null;
}

export function calculateSubscriptionInfo(subscription: Subscription | null, language: Language = 'es'): SubscriptionInfo {
  const t = (key: string, params?: Record<string, string | number>) => {
    let text = (translations[language] as Record<string, string>)[key] || key;
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, String(value));
      });
    }
    return text;
  };
  if (import.meta.env.DEV) console.log('=== [subscriptionUtils] calculateSubscriptionInfo called with:', subscription);

  if (!subscription) {
    return {
      status: 'no_subscription',
      daysRemaining: null,
      statusMessage: t('subscription.noSubscription'),
      statusColor: 'text-gray-600 bg-gray-100',
      shouldShowNotification: false,
      notificationMessage: null,
      isRestricted: true,
      endDate: null,
    };
  }

  const now = new Date();
  let endDate: Date | null = null;
  let daysRemaining: number | null = null;
  let status: SubscriptionStatus;
  let statusMessage: string;
  let statusColor: string;
  let shouldShowNotification = false;
  let notificationMessage: string | null = null;
  let isRestricted = false;

  // Check if it's a trial subscription
  if (subscription.is_trial && subscription.trial_end_date) {
    endDate = new Date(subscription.trial_end_date);
    const diffTime = endDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (import.meta.env.DEV) console.log('=== [subscriptionUtils] Trial subscription - Days remaining:', daysRemaining);

    if (daysRemaining <= 0) {
      // Trial expired
      status = 'trial_expired';
      statusMessage = t('subscription.trialExpired');
      statusColor = 'text-red-600 bg-red-100';
      isRestricted = true;
      notificationMessage = t('subscription.trialExpiredMessage');
      shouldShowNotification = true;
    } else if (daysRemaining <= 3) {
      // Trial expiring soon (1, 2, or 3 days)
      status = 'trial_expiring_soon';
      const dayWord = daysRemaining === 1 ? t('subscription.day') : t('subscription.days');
      statusMessage = `${t('subscription.trial')}: ${daysRemaining} ${dayWord} ${t('subscription.remaining')}`;
      statusColor = 'text-amber-600 bg-amber-100';
      shouldShowNotification = true;
      notificationMessage = t('subscription.trialExpiringSoonMessage', { days: daysRemaining, dayWord });
    } else {
      // Trial active
      status = 'trial_active';
      statusMessage = `${t('subscription.inTrialPeriod')} (${daysRemaining} ${t('subscription.days')})`;
      statusColor = 'text-blue-600 bg-blue-100';
    }
  } else if (subscription.next_payment_date) {
    // Regular subscription
    endDate = new Date(subscription.next_payment_date);
    const diffTime = endDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (import.meta.env.DEV) console.log('=== [subscriptionUtils] Regular subscription - Days remaining:', daysRemaining);

    if (daysRemaining <= 0) {
      // Subscription expired
      status = 'expired';
      statusMessage = t('subscription.expired');
      statusColor = 'text-red-600 bg-red-100';
      isRestricted = true;
      notificationMessage = t('subscription.expiredMessage');
      shouldShowNotification = true;
    } else if (daysRemaining <= 3) {
      // Subscription expiring soon
      status = 'expiring_soon';
      const dayWord = daysRemaining === 1 ? t('subscription.day') : t('subscription.days');
      statusMessage = `${t('subscription.subscription')}: ${daysRemaining} ${dayWord} ${t('subscription.remaining')}`;
      statusColor = 'text-amber-600 bg-amber-100';
      shouldShowNotification = true;
      notificationMessage = t('subscription.expiringSoonMessage', { days: daysRemaining, dayWord });
    } else {
      // Subscription active
      status = 'active';
      statusMessage = `${t('subscription.active')} (${daysRemaining} ${t('subscription.days')})`;
      statusColor = 'text-green-600 bg-green-100';
    }
  } else {
    // Subscription exists but no dates set
    status = 'active';
    statusMessage = t('subscription.active');
    statusColor = 'text-green-600 bg-green-100';
  }

  if (import.meta.env.DEV) console.log('=== [subscriptionUtils] Calculated status:', {
    status,
    daysRemaining,
    shouldShowNotification,
    isRestricted,
  });

  return {
    status,
    daysRemaining,
    statusMessage,
    statusColor,
    shouldShowNotification,
    notificationMessage,
    isRestricted,
    endDate,
  };
}

export function shouldShowNotificationToday(
  businessId: string,
  subscriptionInfo: SubscriptionInfo
): boolean {
  if (!subscriptionInfo.shouldShowNotification) {
    return false;
  }

  const storageKey = `notification_shown_${businessId}`;
  const lastShown = localStorage.getItem(storageKey);

  if (!lastShown) {
    return true;
  }

  const lastShownDate = new Date(lastShown);
  const now = new Date();

  // Check if it's a different day
  const isDifferentDay =
    lastShownDate.getDate() !== now.getDate() ||
    lastShownDate.getMonth() !== now.getMonth() ||
    lastShownDate.getFullYear() !== now.getFullYear();

  if (import.meta.env.DEV) console.log('=== [subscriptionUtils] shouldShowNotificationToday:', {
    businessId,
    lastShown,
    isDifferentDay,
  });

  return isDifferentDay;
}

export function markNotificationAsShown(businessId: string): void {
  const storageKey = `notification_shown_${businessId}`;
  localStorage.setItem(storageKey, new Date().toISOString());
  if (import.meta.env.DEV) console.log('=== [subscriptionUtils] Notification marked as shown for business:', businessId);
}

export function getStatusIcon(status: SubscriptionStatus): string {
  switch (status) {
    case 'trial_active':
    case 'active':
      return '✓';
    case 'trial_expiring_soon':
    case 'expiring_soon':
      return '⚠';
    case 'trial_expired':
    case 'expired':
      return '✕';
    case 'no_subscription':
      return '○';
    default:
      return '?';
  }
}

export function getStatusDisplayText(status: SubscriptionStatus): string {
  switch (status) {
    case 'trial_active':
      return 'En Periodo de Prueba';
    case 'trial_expiring_soon':
      return 'Prueba Por Vencer';
    case 'trial_expired':
      return 'Prueba Terminada';
    case 'active':
      return 'Suscripción Activa';
    case 'expiring_soon':
      return 'Suscripción Por Vencer';
    case 'expired':
      return 'Suscripción Vencida';
    case 'no_subscription':
      return 'Sin Suscripción';
    default:
      return 'Estado Desconocido';
  }
}
