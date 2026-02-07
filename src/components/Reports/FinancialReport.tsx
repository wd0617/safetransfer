import { useState, useEffect } from 'react';
import { Download, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';

interface FinancialReportProps {
  businessId: string;
  language: Language;
}

interface FinancialData {
  period: string;
  total_transfers: number;
  total_amount: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  currency: string;
  destination_country: string;
  country_transfers: number;
  country_amount: number;
}

export function FinancialReport({ businessId, language }: FinancialReportProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinancialData[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: reportData, error } = await supabase.rpc('get_financial_report', {
        p_business_id: businessId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) throw error;
      setData(reportData || []);
    } catch (error) {
      console.error('Error loading financial report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [businessId]);

  const exportToCSV = () => {
    const headers = [
      t('reports.period'),
      t('reports.totalTransfers'),
      t('reports.totalAmount'),
      t('reports.averageAmount'),
      t('reports.minAmount'),
      t('reports.maxAmount'),
      t('transfers.currency'),
      t('transfers.destinationCountry'),
    ];

    const rows = data.map((d) => [
      d.period,
      d.total_transfers,
      d.total_amount,
      d.avg_amount,
      d.min_amount,
      d.max_amount,
      d.currency,
      d.destination_country,
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalRevenue = data.reduce((sum, d) => sum + Number(d.total_amount), 0);
  const totalTransfers = data.reduce((sum, d) => sum + Number(d.total_transfers), 0);
  const avgTransfer = totalTransfers > 0 ? totalRevenue / totalTransfers : 0;

  const groupedByCountry = data.reduce((acc, item) => {
    const existing = acc.find((a) => a.country === item.destination_country);
    if (existing) {
      existing.transfers += Number(item.country_transfers);
      existing.amount += Number(item.country_amount);
    } else {
      acc.push({
        country: item.destination_country,
        transfers: Number(item.country_transfers),
        amount: Number(item.country_amount),
      });
    }
    return acc;
  }, [] as { country: string; transfers: number; amount: number }[]);

  groupedByCountry.sort((a, b) => b.amount - a.amount);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t('reports.financialReport')}</h2>
        <button
          onClick={exportToCSV}
          disabled={data.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {t('reports.exportCSV')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
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
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700">{t('reports.totalRevenue')}</p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            €{totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">{t('dashboard.totalTransfers')}</p>
          <p className="text-2xl font-bold text-blue-900">{totalTransfers}</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 mb-2">{t('reports.averageAmount')}</p>
          <p className="text-2xl font-bold text-amber-900">
            €{avgTransfer.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('reports.byDestination')}</h3>
          <div className="space-y-3">
            {groupedByCountry.slice(0, 10).map((item) => (
              <div key={item.country} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{item.country}</p>
                  <p className="text-sm text-slate-600">
                    {item.transfers} {t('reports.transfers')}
                  </p>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  €{item.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('reports.byPeriod')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.period')}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    {t('reports.totalTransfers')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    {t('reports.totalAmount')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    {t('reports.averageAmount')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.minAmount')}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('reports.maxAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      {loading ? t('common.loading') : t('reports.noData')}
                    </td>
                  </tr>
                ) : (
                  data.slice(0, 12).map((item, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{item.period}</td>
                      <td className="py-3 px-4 text-sm text-slate-900">{item.total_transfers}</td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        €{Number(item.total_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        €{Number(item.avg_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        €{Number(item.min_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        €{Number(item.max_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
