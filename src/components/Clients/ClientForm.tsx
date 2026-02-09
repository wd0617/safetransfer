import { useState, useEffect } from 'react';
import { X, Save, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation, Language } from '../../lib/i18n';
import { CountrySelect } from '../Shared/CountrySelect';
import { useFormValidation } from '../../hooks/useFormValidation';
import { clientService } from '../../lib/clientService';

type DocumentType = 'passport' | 'id_card' | 'residence_permit' | 'drivers_license';

type Client = {
  id: string;
  business_id: string;
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  document_country: string;
  document_expiry?: string | null;
  date_of_birth: string;
  nationality: string;
  fiscal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country: string;
  notes?: string | null;
  transfer_systems?: string[] | null;
};
type ClientInsert = Partial<Client> & {
  business_id: string;
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  document_country: string;
  date_of_birth: string;
  nationality: string;
  country: string;
};

interface ClientFormProps {
  businessId: string;
  language: Language;
  client?: Partial<Client> | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ClientForm({ businessId, language, client, onClose, onSaved }: ClientFormProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchingClient, setSearchingClient] = useState(false);
  const [existingClient, setExistingClient] = useState<any>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  // Inicializar validación de formularios
  const { validateClient } = useFormValidation({ language });

  const [formData, setFormData] = useState<Partial<ClientInsert>>({
    business_id: businessId,
    full_name: client?.full_name || '',
    document_type: (client?.document_type as DocumentType) || 'id_card',
    document_number: client?.document_number || '',
    document_country: client?.document_country || 'IT',
    document_expiry: client?.document_expiry || '',
    date_of_birth: client?.date_of_birth || '',
    nationality: client?.nationality || 'Italia',
    fiscal_code: client?.fiscal_code || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    city: client?.city || '',
    postal_code: client?.postal_code || '',
    country: client?.country || 'IT',
    notes: client?.notes || '',
    transfer_systems: client?.transfer_systems || [],
  });

  const transferSystems = [
    'western_union',
    'ria',
    'moneygram',
    'monty',
    'mondial_bony',
    'itransfer',
  ];

  const toggleTransferSystem = (system: string) => {
    const current = formData.transfer_systems || [];
    const updated = current.includes(system)
      ? current.filter((s) => s !== system)
      : [...current, system];
    setFormData({ ...formData, transfer_systems: updated });
  };

  const searchExistingClient = async (documentNumber: string) => {
    if (!documentNumber || documentNumber.length < 5 || client) return;

    setSearchingClient(true);
    setExistingClient(null);
    setError('');

    const result = await clientService.searchExisting(documentNumber);

    if (result.error) {
      if (result.error === 'CLIENT_ALREADY_EXISTS') {
        setError(t('clients.alreadyExists') || 'Client already exists in your business');
      }
    } else if (result.data && result.data.length > 0) {
      setExistingClient(result.data[0]);
      setShowImportConfirm(true);
    }

    setSearchingClient(false);
  };

  const importExistingClient = async () => {
    if (!existingClient) return;

    setFormData({
      ...formData,
      full_name: existingClient.full_name,
      document_type: existingClient.document_type,
      document_number: existingClient.document_number,
      document_country: existingClient.document_country,
      date_of_birth: existingClient.date_of_birth,
      nationality: existingClient.nationality,
      fiscal_code: existingClient.fiscal_code || '',
      phone: existingClient.phone || '',
      email: existingClient.email || '',
    });

    setShowImportConfirm(false);
    setExistingClient(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.document_number && formData.document_number.length >= 5) {
        searchExistingClient(formData.document_number);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.document_number]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar formulario antes de enviar
    const validation = validateClient(formData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError || 'Por favor, corrige los errores del formulario');
      return;
    }

    setLoading(true);

    // Usar el servicio para crear o actualizar (sanitización automática)
    const result = client
      ? await clientService.update((client as Client).id, formData)
      : await clientService.create(formData as ClientInsert);

    if (result.error) {
      setError(result.error);
    } else {
      onSaved();
      onClose();
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {client ? t('clients.edit') : t('clients.addNew')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {showImportConfirm && existingClient && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {t('clients.existingClientFound') || 'Cliente existente encontrado'}
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  <strong>{existingClient.full_name}</strong><br />
                  {t('clients.dateOfBirth')}: {existingClient.date_of_birth}<br />
                  {t('clients.nationality')}: {existingClient.nationality}
                  {existingClient.fiscal_code && (
                    <><br />{t('clients.fiscalCode')}: {existingClient.fiscal_code}</>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={importExistingClient}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('clients.importData') || 'Importar datos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportConfirm(false);
                      setExistingClient(null);
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.fullName')} *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.documentType')} *
              </label>
              <select
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value as DocumentType })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="id_card">{t('documentType.id_card')}</option>
                <option value="passport">{t('documentType.passport')}</option>
                <option value="residence_permit">{t('documentType.residence_permit')}</option>
                <option value="drivers_license">{t('documentType.drivers_license')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.documentNumber')} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value.toUpperCase() })}
                  required
                  disabled={!!client}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono disabled:bg-slate-100"
                />
                {searchingClient && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Search className="w-4 h-4 text-blue-500 animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.documentCountry')} *
              </label>
              <input
                type="text"
                value={formData.document_country}
                onChange={(e) => setFormData({ ...formData, document_country: e.target.value.toUpperCase() })}
                required
                maxLength={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.documentExpiry')}
              </label>
              <input
                type="date"
                value={formData.document_expiry || ''}
                onChange={(e) => setFormData({ ...formData, document_expiry: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.dateOfBirth')} *
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <CountrySelect
                value={formData.nationality || ''}
                onChange={(value) => setFormData({ ...formData, nationality: value })}
                label={t('clients.nationality')}
                required
                placeholder="Buscar o seleccionar nacionalidad..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.fiscalCode')}
              </label>
              <input
                type="text"
                value={formData.fiscal_code || ''}
                onChange={(e) => setFormData({ ...formData, fiscal_code: e.target.value.toUpperCase() })}
                maxLength={16}
                placeholder="RSSMRA85M01H501Z"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.phone')}
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.email')}
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.address')}
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.city')}
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.postalCode')}
              </label>
              <input
                type="text"
                value={formData.postal_code || ''}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                {t('clients.transferSystems')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {transferSystems.map((system) => (
                  <label
                    key={system}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.transfer_systems?.includes(system)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.transfer_systems?.includes(system) || false}
                      onChange={() => toggleTransferSystem(system)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {t(`transferSystem.${system}`)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.notes')}
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
