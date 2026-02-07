import { useState, useEffect } from 'react';
import { History, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';

interface AuditLogProps {
  businessId: string;
  language: Language;
}

interface AuditEntry {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
  total_count: number;
}

export function AuditLog({ businessId, language }: AuditLogProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const pageSize = 50;

  const loadAuditLog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_audit_log', {
        p_business_id: businessId,
        p_action: actionFilter || null,
        p_entity_type: entityFilter || null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setEntries(data);
        setTotalCount(data[0].total_count);
      } else {
        setEntries([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLog();
  }, [businessId, page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'it' ? 'it-IT' : language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-100 text-green-700';
    if (action.includes('update')) return 'bg-blue-100 text-blue-700';
    if (action.includes('delete')) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'client':
        return 'bg-purple-100 text-purple-700';
      case 'transfer':
        return 'bg-emerald-100 text-emerald-700';
      case 'alert':
        return 'bg-amber-100 text-amber-700';
      case 'user':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">{t('reports.auditLog')}</h2>
        </div>
        <div className="text-sm text-slate-600">
          {t('reports.totalEntries')}: {totalCount.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Filter className="w-4 h-4 inline mr-1" />
            {t('reports.actionType')}
          </label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('alerts.all')}</option>
            <option value="client_created">{t('reports.clientCreated')}</option>
            <option value="client_updated">{t('reports.clientUpdated')}</option>
            <option value="transfer_created">{t('reports.transferCreated')}</option>
            <option value="transfer_completed">{t('reports.transferCompleted')}</option>
            <option value="alert_created">{t('reports.alertCreated')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Filter className="w-4 h-4 inline mr-1" />
            {t('reports.entityType')}
          </label>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('alerts.all')}</option>
            <option value="client">{t('nav.clients')}</option>
            <option value="transfer">{t('nav.transfers')}</option>
            <option value="alert">{t('nav.alerts')}</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setPage(0);
              loadAuditLog();
            }}
            disabled={loading}
            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('common.filter')}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          {t('reports.auditLogDescription')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.timestamp')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.user')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.action')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.entity')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.details')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  {loading ? t('common.loading') : t('reports.noData')}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-900">{formatDate(entry.created_at)}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{entry.user_email || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getEntityColor(entry.entity_type)}`}>
                      {entry.entity_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {entry.entity_id && (
                      <span className="font-mono text-xs">{entry.entity_id.substring(0, 8)}...</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('reports.previous')}
          </button>

          <div className="text-sm text-slate-600">
            {t('reports.page')} {page + 1} {t('reports.of')} {totalPages}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1 || loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('reports.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
