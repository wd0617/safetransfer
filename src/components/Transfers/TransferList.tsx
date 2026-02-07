import { useEffect, useState } from 'react';
import { Plus, Calendar, DollarSign, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
import { Database } from '../../lib/database.types';

type Transfer = Database['public']['Tables']['transfers']['Row'] & {
  clients?: { full_name: string; document_number: string; id: string };
};

type ClientEligibility = {
  can_transfer: boolean;
  amount_available: number;
  amount_used: number;
  days_until_available: number;
};

interface TransferListProps {
  businessId: string;
  language: Language;
  onNewTransfer: () => void;
}

export function TransferList({ businessId, language, onNewTransfer }: TransferListProps) {
  const { t } = useTranslation(language);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, ClientEligibility>>({});

  useEffect(() => {
    loadTransfers();
  }, [businessId]);

  const checkClientEligibility = async (clientId: string): Promise<ClientEligibility | null> => {
    try {
      const { data, error } = await supabase.rpc('check_transfer_eligibility', {
        p_client_id: clientId,
        p_amount: 0,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return null;
    }
  };

  const loadTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*, clients(full_name, document_number)')
        .eq('business_id', businessId)
        .order('transfer_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransfers(data || []);

      // Load eligibility for unique clients
      const uniqueClientIds = [...new Set((data || []).map(t => t.clients?.id).filter(Boolean))] as string[];
      const eligibilityData: Record<string, ClientEligibility> = {};

      await Promise.all(
        uniqueClientIds.map(async (clientId) => {
          const eligibility = await checkClientEligibility(clientId);
          if (eligibility) {
            eligibilityData[clientId] = eligibility;
          }
        })
      );

      setEligibilityMap(eligibilityData);
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">{t('common.loading')}</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">{t('transfers.title')}</h1>
        <button
          onClick={onNewTransfer}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('transfers.newTransfer')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('common.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('clients.fullName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('transfers.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('transfers.destinationCountry')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('transfers.transferSystem')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('transfers.recipientName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('transfers.nextAllowedDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado del Límite
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    {t('transfers.newTransfer')}
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-900">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(transfer.transfer_date).toLocaleDateString(
                          language === 'it' ? 'it-IT' : language === 'en' ? 'en-US' : 'es-ES'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{transfer.clients?.full_name}</div>
                      <div className="text-sm text-slate-500 font-mono">
                        {transfer.clients?.document_number}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <DollarSign className="w-4 h-4 text-slate-400" />€
                        {transfer.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </div>
                      {(transfer as any).commission_amount > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          Com: €{((transfer as any).commission_amount || 0).toFixed(2)}{' '}
 {(transfer as any).commission_included ? '(incluida)' : '(aparte)'}
                          <br />
                          <span className="font-medium text-blue-600">
                            Neto: €{((transfer as any).net_amount || transfer.amount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{transfer.destination_country}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(transfer as any).transfer_system ? (
                        <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                          <CreditCard className="w-4 h-4" />
                          {t(`transferSystem.${(transfer as any).transfer_system}`)}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{transfer.recipient_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          transfer.status
                        )}`}
                      >
                        {t(`transfers.${transfer.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">
                        {new Date(transfer.next_allowed_date).toLocaleDateString(
                          language === 'it' ? 'it-IT' : language === 'en' ? 'en-US' : 'es-ES'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const clientId = transfer.clients?.id;
                        if (!clientId) return <span className="text-xs text-slate-400">-</span>;

                        const eligibility = eligibilityMap[clientId];
                        if (!eligibility) return <span className="text-xs text-slate-400">-</span>;

                        const canSend = eligibility.amount_available > 0;

                        if (canSend) {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3" />
                                Puede enviar
                              </span>
                              <span className="text-xs text-slate-500">
                                €{eligibility.amount_available.toFixed(2)}
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                Límite alcanzado
                              </span>
                              {eligibility.days_until_available > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                                  <Clock className="w-3 h-3" />
                                  {eligibility.days_until_available} {eligibility.days_until_available === 1 ? 'día' : 'días'}
                                </span>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
