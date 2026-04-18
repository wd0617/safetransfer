import { useEffect, useState } from 'react';
import { Search, Plus, Eye, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
import { Button, Input, Card, SkeletonTable, EmptyState } from '../ui';
import { motion } from 'framer-motion';

type Client = {
  id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  nationality: string;
  phone?: string | null;
};

interface ClientListProps {
  businessId: string;
  language: Language;
  onSelectClient: (client: Client) => void;
  onNewClient: () => void;
}

export function ClientList({ businessId, language, onSelectClient, onNewClient }: ClientListProps) {
  const { t } = useTranslation(language);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, [businessId]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
        <SkeletonTable rows={6} columns={6} />
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
          {t('clients.title')}
        </motion.h1>
        <Button onClick={onNewClient} leftIcon={<Plus className="w-5 h-5" />}>
          {t('clients.addNew')}
        </Button>
      </div>

      <Input
        leftIcon={<Search className="w-5 h-5" />}
        placeholder={t('clients.search')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-secondary dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('clients.fullName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('clients.documentType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('clients.documentNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('clients.nationality')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('clients.phone')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title={searchTerm ? t('common.search') + '...' : t('clients.noClients') || 'Sin clientes'}
                      description={
                        searchTerm
                          ? 'No se encontraron clientes con ese término'
                          : 'Empieza agregando tu primer cliente'
                      }
                      actionLabel={!searchTerm ? t('clients.addNew') : undefined}
                      onAction={!searchTerm ? onNewClient : undefined}
                    />
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, index) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-surface-secondary dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => onSelectClient(client)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-white">{client.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {t(`documentType.${client.document_type}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-200">{client.document_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{client.nationality}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{client.phone || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClient(client);
                        }}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        {t('common.view')}
                      </button>
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
