import { useState, useEffect } from 'react';
import { Users, UserPlus, UserCheck, UserX, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';

interface ClientsReportProps {
  businessId: string;
  language: Language;
}

interface ClientsData {
  total_clients: number;
  new_clients: number;
  active_clients: number;
  inactive_clients: number;
  expired_documents: number;
  expiring_soon: number;
  clients_by_nationality: Record<string, number>;
}

export function ClientsReport({ businessId, language }: ClientsReportProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ClientsData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: reportData, error } = await supabase.rpc('get_clients_report', {
        p_business_id: businessId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) throw error;
      if (reportData && reportData.length > 0) {
        setData(reportData[0]);
      }
    } catch (error) {
      console.error('Error loading clients report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [businessId]);

  const nationalityData = data?.clients_by_nationality
    ? Object.entries(data.clients_by_nationality)
        .map(([nationality, count]) => ({ nationality, count: count as number }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t('reports.clientsReport')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('reports.from')}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('reports.to')}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={loadReport}
            disabled={loading}
            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('reports.generate')}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-700">{t('dashboard.totalClients')}</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{data.total_clients}</p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">{t('reports.newClients')}</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{data.new_clients}</p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">{t('reports.activeClients')}</p>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{data.active_clients}</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-5 h-5 text-slate-600" />
                <p className="text-sm text-slate-700">{t('reports.inactiveClients')}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.inactive_clients}</p>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700">{t('reports.expiredDocuments')}</p>
              </div>
              <p className="text-2xl font-bold text-red-900">{data.expired_documents}</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-700">{t('reports.expiringSoon')}</p>
              </div>
              <p className="text-2xl font-bold text-amber-900">{data.expiring_soon}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('reports.clientsByNationality')}</h3>
            {nationalityData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <div className="space-y-3">
                {nationalityData.map(({ nationality, count }) => {
                  const percentage = data.total_clients > 0 ? (count / data.total_clients) * 100 : 0;
                  return (
                    <div key={nationality}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">{nationality}</span>
                        <span className="text-sm text-slate-600">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(data.expired_documents > 0 || data.expiring_soon > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">{t('reports.documentWarning')}</h3>
                  <p className="text-sm text-amber-800">
                    {data.expired_documents > 0 &&
                      `${data.expired_documents} ${t('reports.documentsExpired')}. `}
                    {data.expiring_soon > 0 &&
                      `${data.expiring_soon} ${t('reports.documentsExpiringSoon')}.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div className="text-center py-12 text-slate-500">{t('reports.noData')}</div>
      )}
    </div>
  );
}
