import { useState, useEffect } from 'react';
import { Download, Calendar, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';

interface TransfersReportProps {
  businessId: string;
  language: Language;
}

interface TransferData {
  id: string;
  transfer_date: string;
  client_name: string;
  client_document: string;
  amount: number;
  currency: string;
  destination_country: string;
  recipient_name: string;
  purpose: string;
  status: string;
  created_at: string;
}

export function TransfersReport({ businessId, language }: TransfersReportProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_transfers_report', {
        p_business_id: businessId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_status: statusFilter || null,
      });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error loading transfers report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [businessId]);

  const exportToCSV = () => {
    const headers = [
      t('common.date'),
      t('clients.fullName'),
      t('clients.documentNumber'),
      t('transfers.amount'),
      t('transfers.currency'),
      t('transfers.destinationCountry'),
      t('transfers.recipientName'),
      t('transfers.purpose'),
      t('common.status'),
    ];

    const rows = transfers.map((t) => [
      t.transfer_date,
      t.client_name,
      t.client_document,
      t.amount,
      t.currency,
      t.destination_country,
      t.recipient_name,
      t.purpose,
      t.status,
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transfers_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalAmount = transfers.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t('reports.transfersReport')}</h2>
        <button
          onClick={exportToCSV}
          disabled={transfers.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {t('reports.exportCSV')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('reports.from')}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('reports.to')}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Filter className="w-4 h-4 inline mr-1" />
            {t('common.status')}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('alerts.all')}</option>
            <option value="completed">{t('transfers.completed')}</option>
            <option value="pending">{t('transfers.pending')}</option>
            <option value="cancelled">{t('transfers.cancelled')}</option>
          </select>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-1">{t('dashboard.totalTransfers')}</p>
          <p className="text-2xl font-bold text-blue-900">{transfers.length}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 mb-1">{t('dashboard.totalAmount')}</p>
          <p className="text-2xl font-bold text-green-900">
            €{totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 mb-1">{t('reports.averageAmount')}</p>
          <p className="text-2xl font-bold text-amber-900">
            €{transfers.length > 0 ? (totalAmount / transfers.length).toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('common.date')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('clients.fullName')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('transfers.amount')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                {t('transfers.destinationCountry')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('transfers.recipientName')}</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  {loading ? t('common.loading') : t('reports.noData')}
                </td>
              </tr>
            ) : (
              transfers.map((transfer) => (
                <tr key={transfer.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-900">{transfer.transfer_date}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{transfer.client_name}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    €{Number(transfer.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{transfer.destination_country}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{transfer.recipient_name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        transfer.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : transfer.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t(`transfers.${transfer.status}`)}
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
