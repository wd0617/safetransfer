import { useEffect, useState } from 'react';
import { Plus, Calendar, DollarSign, CreditCard, AlertTriangle, CheckCircle, Clock, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
import { Button, Card, SkeletonTable, EmptyState, Badge } from '../ui';
import { motion } from 'framer-motion';

type Transfer = {
  id: string;
  amount: number;
  destination_country: string;
  recipient_name: string;
  status: 'completed' | 'pending' | 'cancelled';
  transfer_date: string;
  next_allowed_date: string;
  commission_amount: number | null;
  commission_included: boolean | null;
  net_amount: number | null;
  transfer_system: string | null;
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

  const checkClientEligibility = async (documentNumber: string): Promise<ClientEligibility | null> => {
    try {
      const { data, error } = await (supabase.rpc as any)('check_transfer_eligibility_private', {
        p_document_number: documentNumber,
        p_checking_business_id: businessId,
        p_checked_by_user_id: '',
        p_requested_amount: 0,
      });

      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        return data[0] as ClientEligibility;
      }
      return null;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return null;
    }
  };

  const loadTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*, clients(full_name, document_number, id)')
        .eq('business_id', businessId)
        .order('transfer_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransfers((data || []) as unknown as Transfer[]);

      const clientMap = new Map<string, string>();
      ((data || []) as any[]).forEach((t) => {
        if (t.clients?.id && t.clients?.document_number) {
          clientMap.set(t.clients.id, t.clients.document_number);
        }
      });
      const uniqueClientIds = [...clientMap.keys()];
      const eligibilityData: Record<string, ClientEligibility> = {};

      await Promise.all(
        uniqueClientIds.map(async (clientId) => {
          const docNumber = clientMap.get(clientId);
          if (!docNumber) return;
          const eligibility = await checkClientEligibility(docNumber);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">{t(`transfers.${status}`)}</Badge>;
      case 'pending':
        return <Badge variant="warning">{t(`transfers.${status}`)}</Badge>;
      case 'cancelled':
        return <Badge variant="danger">{t(`transfers.${status}`)}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
        <SkeletonTable rows={6} columns={9} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold text-slate-900 dark:text-white"
        >
          {t('transfers.title')}
        </motion.h1>
        <Button onClick={onNewTransfer} leftIcon={<Plus className="w-5 h-5" />}>
          {t('transfers.newTransfer')}
        </Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-secondary dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('common.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('clients.fullName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('transfers.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('transfers.destinationCountry')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('transfers.transferSystem')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('transfers.recipientName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('transfers.nextAllowedDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Estado del Límite
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={ArrowRightLeft}
                      title={t('transfers.noTransfers') || 'Sin transferencias'}
                      description="Empieza registrando tu primera transferencia"
                      actionLabel={t('transfers.newTransfer')}
                      onAction={onNewTransfer}
                    />
                  </td>
                </tr>
              ) : (
                transfers.map((transfer, index) => (
                  <motion.tr
                    key={transfer.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-surface-secondary dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(transfer.transfer_date).toLocaleDateString(
                          language === 'it' ? 'it-IT' : language === 'en' ? 'en-US' : 'es-ES'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-white">{transfer.clients?.full_name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                        {transfer.clients?.document_number}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                        <DollarSign className="w-4 h-4 text-slate-400" />€
                        {transfer.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </div>
                      {transfer.commission_amount != null && transfer.commission_amount > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Com: €{transfer.commission_amount.toFixed(2)}{' '}
                          {transfer.commission_included ? '(incluida)' : '(aparte)'}
                          <br />
                          <span className="font-medium text-brand-600 dark:text-brand-400">
                            Neto: €{(transfer.net_amount ?? transfer.amount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{transfer.destination_country}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transfer.transfer_system ? (
                        <div className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 font-medium">
                          <CreditCard className="w-4 h-4" />
                          {t(`transferSystem.${transfer.transfer_system}`)}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{transfer.recipient_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
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
                              <Badge variant="success" size="sm">
                                <CheckCircle className="w-3 h-3" />
                                Puede enviar
                              </Badge>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                €{eligibility.amount_available.toFixed(2)}
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex flex-col gap-1">
                              <Badge variant="danger" size="sm">
                                <AlertTriangle className="w-3 h-3" />
                                Límite alcanzado
                              </Badge>
                              {eligibility.days_until_available > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-danger-600 font-medium">
                                  <Clock className="w-3 h-3" />
                                  {eligibility.days_until_available} {eligibility.days_until_available === 1 ? 'día' : 'días'}
                                </span>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
