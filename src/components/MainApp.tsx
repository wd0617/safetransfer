import { useState, useEffect } from 'react';
import { Sidebar } from './Layout/Sidebar';
import { Dashboard } from './Dashboard/Dashboard';
import { ClientList } from './Clients/ClientList';
import { ClientForm } from './Clients/ClientForm';
import { ClientDetails } from './Clients/ClientDetails';
import { TransferList } from './Transfers/TransferList';
import { TransferForm } from './Transfers/TransferForm';
import { AlertsList } from './Alerts/AlertsList';
import { Settings } from './Settings/Settings';
import { Reports } from './Reports/Reports';
import { SuperAdminPanel } from './SuperAdmin/SuperAdminPanel';
import { BlockedBusinessMessage } from './Shared/BlockedBusinessMessage';
import { SubscriptionNotification } from './Shared/SubscriptionNotification';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useBusinessColors } from '../hooks/useBusinessColors';
import { calculateSubscriptionInfo } from '../lib/subscriptionUtils';
import { Card, Skeleton } from './ui';
import { motion, AnimatePresence } from 'framer-motion';

type DocumentType = 'passport' | 'id_card' | 'residence_permit' | 'drivers_license';
type Client = {
  id: string;
  business_id: string;
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  document_country?: string;
  date_of_birth?: string;
  nationality: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string;
};

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function MainApp() {
  const { signOut, businessUser, business, user, subscription, isSuperAdmin, isBusinessBlocked, refreshUser } = useAuth();
  const { language, setLanguage, currentView, setCurrentView } = useApp();
  const [showClientForm, setShowClientForm] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showNotification, setShowNotification] = useState(true);

  const subscriptionInfo = calculateSubscriptionInfo(subscription, language);

  // Apply business custom colors
  useBusinessColors(business ? {
    primary_color: business.primary_color as string | undefined,
    secondary_color: business.secondary_color as string | undefined,
  } : undefined);

  useEffect(() => {
    if (import.meta.env.DEV) console.log('MainApp rendered', { businessUser: !!businessUser, business: !!business, user: !!user, subscription: !!subscription });
    if (import.meta.env.DEV) console.log('Subscription info:', subscriptionInfo);
  }, [businessUser, business, user, subscription, subscriptionInfo]);

  if (!businessUser || !business || !user) {
    if (import.meta.env.DEV) console.log('MainApp: Missing data', { businessUser: !!businessUser, business: !!business, user: !!user });
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <Card className="p-8 space-y-4 w-80">
          <div className="flex justify-center">
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
        </Card>
      </div>
    );
  }

  if (isBusinessBlocked && !isSuperAdmin) {
    return <BlockedBusinessMessage />;
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    refreshUser();
  };

  const renderContent = () => {
    if (currentView === 'superadmin' && isSuperAdmin) {
      return <SuperAdminPanel />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard key={refreshKey} businessId={business.id} language={language} />;

      case 'clients':
        return (
          <>
            <ClientList
              key={refreshKey}
              businessId={business.id}
              language={language}
              onSelectClient={(client) => {
                setSelectedClient({ ...client, business_id: business!.id, document_type: client.document_type as DocumentType });
                setShowClientDetails(true);
              }}
              onNewClient={() => {
                setSelectedClient(null);
                setShowClientForm(true);
              }}
            />
            <AnimatePresence>
              {showClientDetails && selectedClient && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ClientDetails
                    client={selectedClient}
                    businessId={business.id}
                    userId={user.id}
                    language={language}
                    onClose={() => {
                      setShowClientDetails(false);
                      setSelectedClient(null);
                    }}
                    onEdit={(client) => {
                      setShowClientDetails(false);
                      setSelectedClient({ ...client, business_id: business!.id, document_type: client.document_type as DocumentType });
                      setShowClientForm(true);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showClientForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ClientForm
                    businessId={business.id}
                    language={language}
                    client={selectedClient}
                    onClose={() => {
                      setShowClientForm(false);
                      setSelectedClient(null);
                    }}
                    onSaved={handleRefresh}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );

      case 'transfers':
        return (
          <>
            <TransferList
              key={refreshKey}
              businessId={business.id}
              language={language}
              onNewTransfer={() => setShowTransferForm(true)}
            />
            <AnimatePresence>
              {showTransferForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TransferForm
                    businessId={business.id}
                    userId={user.id}
                    language={language}
                    onClose={() => setShowTransferForm(false)}
                    onSaved={handleRefresh}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );

      case 'alerts':
        return <AlertsList key={refreshKey} businessId={business.id} language={language} />;

      case 'settings':
        return (
          <Settings
            key={refreshKey}
            business={business}
            businessUser={businessUser}
            language={language}
            onLanguageChange={setLanguage}
            onRefresh={handleRefresh}
          />
        );

      case 'reports':
        return <Reports businessId={business.id} language={language} />;

      case 'audit':
        return <Reports businessId={business.id} language={language} />;

      default:
        return <Dashboard key={refreshKey} businessId={business.id} language={language} />;
    }
  };

  return (
    <div className="flex h-screen bg-surface-secondary dark:bg-slate-900">
      {!isSuperAdmin && showNotification && (
        <SubscriptionNotification
          businessId={business.id}
          subscriptionInfo={subscriptionInfo}
          onClose={() => setShowNotification(false)}
          onRenew={() => {
            setCurrentView('settings');
            setShowNotification(false);
          }}
        />
      )}

      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        language={language}
        businessName={business.name}
        userRole={businessUser.role}
        isSuperAdmin={isSuperAdmin}
      />
      <div className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + refreshKey}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
