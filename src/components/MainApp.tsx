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
 
import { calculateSubscriptionInfo } from '../lib/subscriptionUtils';

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

  useEffect(() => {
    if (import.meta.env.DEV) console.log('MainApp rendered', { businessUser: !!businessUser, business: !!business, user: !!user, subscription: !!subscription });
    if (import.meta.env.DEV) console.log('Subscription info:', subscriptionInfo);
  }, [businessUser, business, user, subscription, subscriptionInfo]);

  if (!businessUser || !business || !user) {
    if (import.meta.env.DEV) console.log('MainApp: Missing data', { businessUser: !!businessUser, business: !!business, user: !!user });
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading user data...</div>
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
            {showClientDetails && selectedClient && (
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
            )}
            {showClientForm && (
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
            )}
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
            {showTransferForm && (
              <TransferForm
                businessId={business.id}
                userId={user.id}
                language={language}
                onClose={() => setShowTransferForm(false)}
                onSaved={handleRefresh}
              />
            )}
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
    <div className="flex h-screen bg-slate-50">
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
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">{renderContent()}</div>
      </div>
    </div>
  );
}
