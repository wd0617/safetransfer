import { useEffect, useState } from 'react';
import { X, User, CheckCircle, AlertTriangle, Clock, TrendingUp, History, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
type Client = {
  id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  nationality: string;
  birth_date?: string;
  date_of_birth?: string;
  phone?: string | null;
  email?: string | null;
  fiscal_code?: string | null;
  transfer_systems?: string[] | null;
};
type Transfer = {
  id: string;
  client_id: string;
  amount: number;
  destination_country: string;
  status: 'completed' | 'pending' | 'cancelled';
  transfer_date: string;
  commission_amount: number | null;
  commission_included: boolean | null;
  net_amount: number | null;
  transfer_system: string | null;
};

interface ClientEligibility {
  can_transfer: boolean;
  amount_used: number;
  amount_available: number;
  message: string;
  days_remaining: number;
}

interface ClientDetailsProps {
  client: Client;
  businessId: string;
  userId: string;
  language: Language;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

export function ClientDetails({ client, businessId, userId, language, onClose, onEdit }: ClientDetailsProps) {
  const { t } = useTranslation(language);
  const [eligibility, setEligibility] = useState<ClientEligibility | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadClientData();
  }, [client.id]);

  const loadClientData = async () => {
    try {
      const [eligibilityResult, transfersResult] = await Promise.all([
        (supabase.rpc as any)('check_transfer_eligibility_private', {
          p_document_number: client.document_number,
          p_checking_business_id: businessId,
          p_checked_by_user_id: userId,
          p_requested_amount: 0,
        }),
        supabase
          .from('transfers')
          .select('*')
          .eq('client_id', client.id)
          .order('transfer_date', { ascending: false })
          .limit(10),
      ]);

      if (eligibilityResult.error) throw eligibilityResult.error;
      if (transfersResult.error) throw transfersResult.error;

      const eligData = eligibilityResult.data;
      if (Array.isArray(eligData) && eligData.length > 0) {
        setEligibility(eligData[0] as ClientEligibility);
      }

      setTransfers((transfersResult.data || []) as Transfer[]);


    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };



  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString(language, { month: 'short' }).toUpperCase();
    const year = date.getFullYear();
    return { day, month, year };
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-8">
          <div className="text-center text-slate-600">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  const canTransfer = (eligibility?.amount_available ?? 0) > 0;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full my-8">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-2xl font-bold text-slate-900">{t('clients.clientDetails')}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          {eligibility && (
            <div
              className={`rounded-xl p-4 sm:p-6 border-2 ${eligibility.can_transfer
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
                }`}
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-shrink-0">
                  {eligibility.can_transfer ? (
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
                  )}
                </div>
                <div className="flex-grow w-full min-w-0">
                  <h3
                    className={`text-xl sm:text-2xl font-bold mb-2 break-words ${eligibility.can_transfer ? 'text-green-900' : 'text-red-900'
                      }`}
                  >
                    {eligibility.can_transfer
                      ? t('clientDetails.canSendMoney')
                      : 'ENVÍO BLOQUEADO TEMPORALMENTE'}
                  </h3>
                  <p
                    className={`text-sm mb-4 break-words font-semibold ${eligibility.can_transfer ? 'text-green-700' : 'text-red-700'
                      }`}
                  >
                    {eligibility.can_transfer ? (
                      <>
                        Este cliente puede enviar hasta €{eligibility.amount_available.toFixed(2)}.<br />
                        <span className="font-normal">Ha utilizado €{eligibility.amount_used.toFixed(2)} de su límite de €999 en los últimos 8 días.</span>
                      </>
                    ) : (
                      <>
                        Este cliente NO puede realizar transferencias.<br />
                        <span className="font-normal">
                          Ha alcanzado el límite máximo de €999 en los últimos 8 días.
                          {eligibility.days_remaining > 0 && (
                            <> Podrá volver a enviar dinero en {eligibility.days_remaining} {eligibility.days_remaining === 1 ? 'día' : 'días'}.</>
                          )}
                        </span>
                      </>
                    )}
                  </p>

                  {!eligibility.can_transfer && (
                    <div className="bg-white bg-opacity-70 rounded-lg px-4 py-3 mb-4 border-2 border-red-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-bold text-red-900 mb-1">
                            ⛔ TRANSFERENCIA BLOQUEADA
                          </div>
                          {eligibility.days_remaining > 0 ? (
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="w-4 h-4 text-red-600 flex-shrink-0" />
                              <span className="text-xs text-red-800">
                                <span className="font-semibold">Tiempo de espera:</span> {eligibility.days_remaining} {eligibility.days_remaining === 1 ? t('clientDetails.day') : t('clientDetails.days')}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-red-800 mt-1">
                              Debe esperar hasta que expire alguna transferencia anterior.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white bg-opacity-50 rounded-lg p-3 text-center">
                      <div className="text-xs font-medium text-slate-600 mb-1 break-words">
                        {t('privacy.weeklyLimit')}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-slate-900">€999</div>
                    </div>
                    <div className="bg-white bg-opacity-50 rounded-lg p-3 text-center">
                      <div className="text-xs font-medium text-slate-600 mb-1 break-words">
                        {t('privacy.amountUsed')}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-slate-900">
                        {formatAmount(eligibility.amount_used)}
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-50 rounded-lg p-3 text-center">
                      <div className="text-xs font-medium text-slate-600 mb-1 break-words">
                        {t('privacy.amountAvailable')}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-slate-900">
                        {formatAmount(eligibility.amount_available)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 bg-white bg-opacity-70 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>ℹ️ Nota:</strong> Los montos mostrados reflejan el cálculo neto real. Si la comisión fue incluida en una transferencia, solo cuenta el monto enviado al beneficiario. Si la comisión fue pagada aparte, cuenta el monto total.
                    </p>
                  </div>

                  {!canTransfer && (
                    <div className="mt-4 bg-white bg-opacity-50 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800 break-words">
                          <strong>{t('clientDetails.reasonTitle')}:</strong>{' '}
                          {t('clientDetails.reasonText')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {client.transfer_systems && client.transfer_systems.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-900">{t('clients.transferSystems')}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {client.transfer_systems.map((system: string) => (
                  <span
                    key={system}
                    className="inline-flex items-center px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-900 shadow-sm"
                  >
                    {t(`transferSystem.${system}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-bold text-slate-900">{t('clientDetails.personalInfo')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">{t('clients.fullName')}</div>
                <div className="font-medium text-slate-900">{client.full_name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">{t('clients.documentType')}</div>
                <div className="font-medium text-slate-900">
                  {t(`documentType.${client.document_type}`)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">{t('clients.documentNumber')}</div>
                <div className="font-mono font-medium text-slate-900">{client.document_number}</div>
              </div>
              {client.fiscal_code && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">{t('clients.fiscalCode')}</div>
                  <div className="font-mono font-medium text-slate-900">{client.fiscal_code}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500 mb-1">{t('clients.nationality')}</div>
                <div className="font-medium text-slate-900">{client.nationality}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">{t('clients.birthDate')}</div>
                <div className="font-medium text-slate-900">{formatDate(client.birth_date)}</div>
              </div>
              {client.phone && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">{t('clients.phone')}</div>
                  <div className="font-medium text-slate-900">{client.phone}</div>
                </div>
              )}
              {client.email && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">{t('clients.email')}</div>
                  <div className="font-medium text-slate-900">{client.email}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-bold text-slate-900">{t('clientDetails.recentTransfers')}</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {transfers.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  {t('clientDetails.noTransfers')}
                </div>
              ) : (
                transfers.map((transfer) => {
                  const dateInfo = formatDateShort(transfer.transfer_date);
                  return (
                    <div key={transfer.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-shrink-0">
                          <div className="flex flex-col items-center justify-center bg-blue-600 text-white rounded-lg px-3 py-2 min-w-[70px] shadow-sm">
                            <div className="text-2xl font-bold leading-none">{dateInfo.day}</div>
                            <div className="text-xs font-semibold mt-0.5 leading-none">{dateInfo.month}</div>
                            <div className="text-xs opacity-90 leading-none mt-0.5">{dateInfo.year}</div>
                          </div>
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-lg text-slate-900">
                                {formatAmount(transfer.amount)}
                              </div>
                              {transfer.commission_amount != null && transfer.commission_amount > 0 && (
                                <div className="text-xs text-slate-500 mt-1">
                                  Comisión: €{(transfer.commission_amount).toFixed(2)}{' '}
                                  {transfer.commission_included ? '(incluida)' : '(aparte)'}
                                  {' • '}
                                  <span className="font-medium text-blue-600">
                                    Neto: €{(transfer.net_amount ?? transfer.amount).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="text-sm text-slate-600">
                                {t('transfers.to')}: {transfer.destination_country}
                              </div>
                              {transfer.transfer_system && (
                                <div className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  {t(`transferSystem.${transfer.transfer_system}`)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${transfer.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : transfer.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {t(`transfers.status.${transfer.status}`)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })

              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t('common.close')}
          </button>
          <button
            onClick={() => onEdit(client)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  );
}
