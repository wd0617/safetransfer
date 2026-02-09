import { useState, useEffect } from 'react';
import { X, Save, CheckCircle, AlertTriangle, Search, Info, TrendingUp, Clock } from 'lucide-react';
import { useTranslation, Language } from '../../lib/i18n';
import { CountrySelect } from '../Shared/CountrySelect';
import { useFormValidation } from '../../hooks/useFormValidation';
import { clientService } from '../../lib/clientService';
import { transferService, type EligibilityResult } from '../../lib/transferService';

type Client = {
  id: string;
  full_name: string;
  document_type: string;
  document_number: string;
};
type TransferInsert = {
  business_id: string;
  client_id: string;
  amount: number;
  currency?: string;
  destination_country: string;
  recipient_name: string;
  recipient_relationship?: string;
  purpose?: string;
  notes?: string;
  status: 'completed' | 'pending' | 'cancelled';
  created_by?: string;
  transfer_system?: string;
  commission_amount?: number;
  commission_included?: boolean;
};



interface TransferFormProps {
  businessId: string;
  userId: string;
  language: Language;
  onClose: () => void;
  onSaved: () => void;
}

export function TransferForm({ businessId, userId, language, onClose, onSaved }: TransferFormProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Inicializar validación de formularios
  const { validateTransfer } = useFormValidation({ language });

  const [formData, setFormData] = useState<Partial<Omit<TransferInsert, 'next_allowed_date'>>>({
    business_id: businessId,
    amount: 0,
    currency: 'EUR',
    destination_country: '',
    recipient_name: '',
    recipient_relationship: '',
    purpose: '',
    notes: '',
    status: 'completed',
    created_by: userId,
    transfer_system: '',
    commission_amount: 0,
    commission_included: false,
  });

  const transferSystems = [
    'western_union',
    'ria',
    'moneygram',
    'monty',
    'mondial_bony',
    'itransfer',
  ];

  useEffect(() => {
    loadClients();
  }, [businessId]);

  const loadClients = async () => {
    const result = await clientService.getByBusiness(businessId);
    if (result.data) {
      setClients(result.data);
    } else if (result.error) {
      console.error('Error loading clients:', result.error);
    }
  };

  const checkEligibility = async (client: Client, amount: number) => {
    setCheckingEligibility(true);
    setEligibility(null);
    setError('');

    const result = await transferService.checkEligibility(
      client.document_number,
      businessId,
      userId,
      amount || 0
    );

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setEligibility(result.data);
    }

    setCheckingEligibility(false);
  };

  const handleClientSelect = async (client: Client) => {
    setSelectedClient(client);
    setFormData({ ...formData, client_id: client.id });
    await checkEligibility(client, formData.amount || 0);
  };

  const handleAmountChange = (amount: number) => {
    setFormData({ ...formData, amount });
    if (selectedClient) {
      checkEligibility(selectedClient, amount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar formulario antes de enviar
    const validation = validateTransfer(formData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError || 'Por favor, corrige los errores del formulario');
      return;
    }

    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    if (!eligibility) {
      setError('Debes verificar la elegibilidad del cliente primero');
      return;
    }

    // Usar el servicio para validar el monto
    const amountValidation = transferService.validateAmount(
      formData.amount || 0,
      eligibility.amount_used
    );

    if (!amountValidation.isValid) {
      setError(amountValidation.error || 'Invalid amount');
      return;
    }

    setError('');
    setLoading(true);

    // Usar el servicio para crear la transferencia (sanitización automática)
    const payload: Omit<TransferInsert, 'next_allowed_date'> = {
      business_id: formData.business_id || businessId,
      client_id: selectedClient.id,
      amount: Number(formData.amount) || 0,
      currency: formData.currency || 'EUR',
      destination_country: formData.destination_country || '',
      recipient_name: formData.recipient_name || '',
      recipient_relationship: formData.recipient_relationship,
      purpose: formData.purpose,
      notes: formData.notes,
      status: formData.status ?? 'completed',
      created_by: formData.created_by || userId,
      transfer_system: formData.transfer_system,
      commission_amount: formData.commission_amount,
      commission_included: formData.commission_included,
    };
    const result = await transferService.create(payload);

    if (result.error) {
      setError(result.error);
    } else {
      onSaved();
      onClose();
    }

    setLoading(false);
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{t('transfers.newTransfer')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              {t('legal.privacyNotice')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!selectedClient ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('transfers.selectClient')} *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('clients.search')}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-300 rounded-lg">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-200 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-slate-900">{client.full_name}</div>
                    <div className="text-sm text-slate-600">
                      {t(`documentType.${client.document_type}`)}: {client.document_number}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{selectedClient.full_name}</div>
                    <div className="text-sm text-slate-600">
                      {t(`documentType.${selectedClient.document_type}`)}: {selectedClient.document_number}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setEligibility(null);
                      const { client_id: _old, ...rest } = formData;
                      setFormData({ ...rest });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t('common.edit')}
                  </button>
                </div>
              </div>

              {checkingEligibility ? (
                <div className="text-center py-4 text-slate-600">{t('common.loading')}</div>
              ) : eligibility ? (
                <div>
                  <div
                    className={`rounded-lg p-6 border-2 ${eligibility.can_transfer
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-3 mb-4">
                      {eligibility.can_transfer ? (
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-12 h-12 text-red-600" />
                      )}
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold mb-2 ${eligibility.can_transfer ? 'text-green-900' : 'text-red-900'
                          }`}
                      >
                        {eligibility.can_transfer
                          ? t('privacy.canSend')
                          : 'ENVÍO BLOQUEADO TEMPORALMENTE'}
                      </div>
                      <p className={`text-sm mt-2 font-semibold ${eligibility.can_transfer ? 'text-green-700' : 'text-red-700'}`}>
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
                                <> El cliente podrá volver a enviar dinero en {eligibility.days_remaining} {eligibility.days_remaining === 1 ? 'día' : 'días'}.</>
                              )}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-xs text-blue-600 font-medium mb-1">
                        {t('privacy.weeklyLimit')}
                      </div>
                      <div className="text-2xl font-bold text-blue-900">€999</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <div className="text-xs text-amber-600 font-medium mb-1">
                        {t('privacy.amountUsed')}
                      </div>
                      <div className="text-2xl font-bold text-amber-900">
                        €{eligibility.amount_used.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-xs text-green-600 font-medium mb-1">
                        {t('privacy.amountAvailable')}
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        €{eligibility.amount_available.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {!eligibility.can_transfer && (
                    <div className="mt-4 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-900">
                          <p className="font-bold text-base mb-2">⛔ TRANSFERENCIA NO PERMITIDA</p>
                          <p className="mb-2">
                            El cliente ha alcanzado el límite máximo permitido por la ley italiana (Decreto Legislativo 231/2007).
                          </p>
                          {eligibility.days_remaining > 0 ? (
                            <>
                              <div className="flex items-center gap-2 mt-3 p-3 bg-white rounded border border-red-200">
                                <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold">Tiempo de espera: {eligibility.days_remaining} {eligibility.days_remaining === 1 ? 'día' : 'días'}</p>
                                  <p className="text-xs text-red-700 mt-1">El límite se reiniciará cuando expire la transferencia más antigua del período actual.</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="font-semibold mt-2">El cliente debe esperar hasta que expire alguna de sus transferencias anteriores.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <div className="font-semibold mb-1">{t('legal.italianLaw')}</div>
                      <div>{t('legal.transferLimit')}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('transfers.amount')} (EUR) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.amount !== undefined && formData.amount !== null && formData.amount !== 0 ? formData.amount : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          if (value === '' || value === '.') {
                            setFormData({ ...formData, amount: undefined });
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue <= 999) {
                              handleAmountChange(numValue);
                            }
                          }
                        }}
                        required
                        disabled={Boolean(eligibility && !eligibility.can_transfer && eligibility.amount_available <= 0)}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      {eligibility && formData.amount && formData.amount > 0 && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <TrendingUp
                            className={`w-5 h-5 ${eligibility.can_transfer ? 'text-green-500' : 'text-red-500'
                              }`}
                          />
                        </div>
                      )}
                    </div>
                    {eligibility && formData.amount && formData.amount > 0 && (
                      <div className="mt-1 text-xs text-slate-600">
                        {eligibility.can_transfer ? (
                          <span className="text-green-600 font-medium">
                            ✓ Dentro del límite (€{(eligibility.amount_used + (formData.amount || 0)).toFixed(2)}/€999)
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium">
                            ✗ Excede el límite - Cliente bloqueado por {eligibility.days_remaining} {eligibility.days_remaining === 1 ? 'día' : 'días'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 border-2 border-blue-100 rounded-lg p-4 bg-blue-50">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Información de Comisión
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Monto de Comisión (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.commission_amount || 0}
                          onChange={(e) => setFormData({ ...formData, commission_amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          ¿Cómo se pagó la comisión?
                        </label>
                        <select
                          value={formData.commission_included ? 'included' : 'separate'}
                          onChange={(e) => setFormData({
                            ...formData,
                            commission_included: e.target.value === 'included'
                          })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="separate">Pagada aparte (fuera del monto)</option>
                          <option value="included">Incluida en el monto total</option>
                        </select>
                      </div>
                    </div>

                    {formData.amount && formData.amount > 0 && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Monto total:</span>
                            <span className="font-semibold">€{formData.amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Comisión:</span>
                            <span className="font-semibold">€{(formData.commission_amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-2">
                            <span className="text-slate-700 font-medium">
                              {formData.commission_included
                                ? 'Monto neto enviado (sin comisión):'
                                : 'Monto que cuenta para límite:'}
                            </span>
                            <span className="font-bold text-blue-600">
                              €{(formData.commission_included
                                ? formData.amount - (formData.commission_amount || 0)
                                : formData.amount
                              ).toFixed(2)}
                            </span>
                          </div>
                          {eligibility && (
                            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                              <span className="text-slate-700 font-medium">Restante para esta semana:</span>
                              <span className={`font-bold ${eligibility.amount_available - (formData.commission_included
                                ? formData.amount - (formData.commission_amount || 0)
                                : formData.amount) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                                }`}>
                                €{Math.max(0, eligibility.amount_available - (formData.commission_included
                                  ? formData.amount - (formData.commission_amount || 0)
                                  : formData.amount)).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-blue-700 mt-3 italic">
                          {formData.commission_included
                            ? '✓ La comisión está incluida: solo el monto neto cuenta para el límite de 999€'
                            : '✓ La comisión fue pagada aparte: el monto total cuenta para el límite de 999€'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <CountrySelect
                      value={formData.destination_country || ''}
                      onChange={(value) => setFormData({ ...formData, destination_country: value })}
                      label={t('transfers.destinationCountry')}
                      required
                      placeholder="Buscar o seleccionar país de destino..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('transfers.transferSystem')} *
                    </label>
                    <select
                      value={formData.transfer_system}
                      onChange={(e) => setFormData({ ...formData, transfer_system: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('transfers.selectSystem')}</option>
                      {transferSystems.map((system) => (
                        <option key={system} value={system}>
                          {t(`transferSystem.${system}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('transfers.recipientName')} *
                    </label>
                    <input
                      type="text"
                      value={formData.recipient_name}
                      onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('transfers.recipientRelationship')}
                    </label>
                    <input
                      type="text"
                      value={formData.recipient_relationship || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, recipient_relationship: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('transfers.purpose')}
                    </label>
                    <input
                      type="text"
                      value={formData.purpose || ''}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('transfers.notes')}
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            </div>
          )}

          {selectedClient && eligibility?.can_transfer && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !formData.amount || formData.amount <= 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? t('common.loading') : t('transfers.process')}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
