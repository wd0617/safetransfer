import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';

type AdminNotification = Database['public']['Tables']['admin_notifications']['Row'];

interface PaymentNotificationsProps {
  onNotificationClick?: (businessId: string) => void;
}

export function PaymentNotifications({ onNotificationClick }: PaymentNotificationsProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    checkUpcomingPayments();
    checkExpiringTrials();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUpcomingPayments = async () => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*, businesses(name)')
        .eq('status', 'active')
        .not('is_trial', 'eq', true)
        .lte('next_payment_date', thirtyDaysFromNow.toISOString())
        .gte('next_payment_date', new Date().toISOString());

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          const daysUntil = Math.ceil(
            (new Date(sub.next_payment_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          const existingNotification = await supabase
            .from('admin_notifications')
            .select('id')
            .eq('business_id', sub.business_id)
            .eq('notification_type', 'payment_due')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingNotification.data) {
            await supabase.from('admin_notifications').insert({
              business_id: sub.business_id,
              notification_type: 'payment_due',
              title: 'Payment Due Soon',
              message: `Payment for ${(sub as any).businesses?.name} is due in ${daysUntil} days`,
              priority: daysUntil <= 7 ? 'high' : 'normal',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking upcoming payments:', error);
    }
  };

  const checkExpiringTrials = async () => {
    try {
      const fifteenDaysFromNow = new Date();
      fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*, businesses(name)')
        .eq('is_trial', true)
        .eq('status', 'active')
        .lte('trial_end_date', fifteenDaysFromNow.toISOString())
        .gte('trial_end_date', new Date().toISOString());

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          const daysUntil = Math.ceil(
            (new Date(sub.trial_end_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          const existingNotification = await supabase
            .from('admin_notifications')
            .select('id')
            .eq('business_id', sub.business_id)
            .eq('notification_type', 'trial_expiring')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingNotification.data) {
            await supabase.from('admin_notifications').insert({
              business_id: sub.business_id,
              notification_type: 'trial_expiring',
              title: 'Trial Expiring Soon',
              message: `Trial for ${(sub as any).businesses?.name} expires in ${daysUntil} days`,
              priority: daysUntil <= 3 ? 'urgent' : 'high',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking expiring trials:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('admin_notifications').delete().eq('id', id);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      normal: 'bg-slate-100 text-slate-800 border-slate-200',
      high: 'bg-amber-100 text-amber-800 border-amber-200',
      urgent: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[priority] || colors.normal;
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      payment_due: Clock,
      payment_overdue: AlertTriangle,
      trial_expiring: Clock,
      trial_expired: AlertTriangle,
      business_inactive: AlertTriangle,
      high_activity: Bell,
    };
    return icons[type] || Bell;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="text-slate-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <button
          onClick={() => {
            loadNotifications();
            checkUpcomingPayments();
            checkExpiringTrials();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.notification_type);

          return (
            <div
              key={notification.id}
              className={`bg-white rounded-lg border p-4 ${
                notification.is_read ? 'border-slate-200' : 'border-blue-300 bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        if (notification.business_id && onNotificationClick) {
                          onNotificationClick(notification.business_id);
                        }
                      }}
                    >
                      <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
