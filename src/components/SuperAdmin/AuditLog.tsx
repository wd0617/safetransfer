import { useState, useEffect } from 'react';
import { History, Filter, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';

type AuditLog = Database['public']['Tables']['admin_audit_log']['Row'];

interface AuditLogWithBusiness extends AuditLog {
  business_name?: string;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7');

  useEffect(() => {
    loadLogs();
  }, [dateFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateFilter));

      let query = supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFilter !== 'all') {
        query = query.gte('created_at', daysAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const logsWithBusinesses = await Promise.all(
          data.map(async (log) => {
            if (log.business_id) {
              const { data: business } = await supabase
                .from('businesses')
                .select('name')
                .eq('id', log.business_id)
                .maybeSingle();

              return {
                ...log,
                business_name: business?.name,
              };
            }
            return log;
          })
        );

        setLogs(logsWithBusinesses);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter === 'all') return true;
    return log.action_type === actionFilter;
  });

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      business_status_change: 'bg-amber-100 text-amber-800',
      trial_granted: 'bg-blue-100 text-blue-800',
      payment_date_changed: 'bg-purple-100 text-purple-800',
      payment_registered: 'bg-green-100 text-green-800',
      message_sent: 'bg-slate-100 text-slate-800',
    };
    return colors[actionType] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading audit log...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
        <p className="text-slate-600 mt-1">Complete history of administrative actions</p>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="business_status_change">Status Changes</option>
            <option value="trial_granted">Trials Granted</option>
            <option value="payment_date_changed">Payment Changes</option>
            <option value="payment_registered">Payments Registered</option>
            <option value="message_sent">Messages Sent</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="divide-y divide-slate-200">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(
                            log.action_type
                          )}`}
                        >
                          {log.action_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {log.business_name && (
                          <span className="text-sm text-slate-600">
                            Business: <span className="font-medium">{log.business_name}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-900 mt-2 font-medium">{log.action_description}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.entity_type && (
                    <p className="text-xs text-slate-600">
                      Entity: <span className="font-medium">{log.entity_type}</span>
                    </p>
                  )}
                  {log.new_values && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                        View details
                      </summary>
                      <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No audit logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
