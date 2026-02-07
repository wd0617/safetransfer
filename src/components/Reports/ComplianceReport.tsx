import { useState, useEffect } from 'react';
import { Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';

interface ComplianceReportProps {
  businessId: string;
  language: Language;
}

interface ComplianceData {
  client_id: string;
  client_name: string;
  document_number: string;
  nationality: string;
  total_transfers: number;
  total_amount: number;
  last_transfer_date: string | null;
  days_since_last_transfer: number | null;
  can_transfer_on: string | null;
  status: string;
  risk_level: string;
}

export function ComplianceReport({ businessId, language }: ComplianceReportProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComplianceData[]>([]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: reportData, error } = await supabase.rpc('get_compliance_report', {
        p_business_id: businessId,
      });

      if (error) throw error;
      setData(reportData || []);
    } catch (error) {
      console.error('Error loading compliance report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [businessId]);

  const exportToCSV = () => {
    const headers = [
      t('clients.fullName'),
      t('clients.documentNumber'),
      t('clients.nationality'),
      t('reports.totalTransfers'),
      t('reports.totalAmount'),
      t('reports.lastTransferDate'),
      t('reports.nextAllowedDate'),
      t('common.status'),
      t('reports.riskLevel'),
    ];

    const rows = data.map((d) => [
      d.client_name,
      d.document_number,
      d.nationality,
      d.total_transfers,
      d.total_amount,
      d.last_transfer_date || '-',
      d.can_transfer_on || '-',
      d.status,
      d.risk_level,
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const highRiskClients = data.filter((d) => d.risk_level === 'high').length;
  const mediumRiskClients = data.filter((d) => d.risk_level === 'medium').length;
  const canTransferNow = data.filter((d) => d.status === 'can_transfer' || d.status === 'no_transfers').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t('reports.complianceReport')}</h2>
        <button
          onClick={exportToCSV}
          disabled={data.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {t('reports.exportCSV')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{t('reports.highRisk')}</p>
          </div>
          <p className="text-2xl font-bold text-red-900">{highRiskClients}</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-700">{t('reports.mediumRisk')}</p>
          </div>
          <p className="text-2xl font-bold text-amber-900">{mediumRiskClients}</p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700">{t('reports.canTransferNow')}</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{canTransferNow}</p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">{t('reports.totalClients')}</p>
          <p className="text-2xl font-bold text-blue-900">{data.length}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>{t('legal.italianLaw')}:</strong> {t('legal.transferLimit')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('clients.fullName')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('clients.nationality')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                {t('reports.totalTransfers')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.totalAmount')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                {t('reports.lastTransferDate')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                {t('reports.nextAllowedDate')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.riskLevel')}</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  {loading ? t('common.loading') : t('reports.noData')}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.client_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{item.client_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{item.nationality}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{item.total_transfers}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    €{Number(item.total_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{item.last_transfer_date || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{item.can_transfer_on || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        item.risk_level === 'high'
                          ? 'bg-red-100 text-red-700'
                          : item.risk_level === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {t(`reports.risk_${item.risk_level}`)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
