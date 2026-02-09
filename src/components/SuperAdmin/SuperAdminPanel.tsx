import { useState } from 'react';
import { Shield, LayoutDashboard, Building2, Bell, MessageSquare, History, Lock, Key } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { BusinessManagement } from './BusinessManagement';
import { BusinessDetailWrapper } from './BusinessDetailWrapper';
import { PaymentNotifications } from './PaymentNotifications';
import { Messaging } from './Messaging';
import { AuditLog } from './AuditLog';
import { SecurityMonitoring } from './SecurityMonitoring';
import { PasswordResetAssistance } from './PasswordResetAssistance';

type ActiveView = 'dashboard' | 'businesses' | 'notifications' | 'messages' | 'audit' | 'security' | 'password-reset';

export function SuperAdminPanel() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const renderContent = () => {
    console.log('=== [SuperAdminPanel] renderContent called');
    console.log('=== [SuperAdminPanel] activeView:', activeView);
    console.log('=== [SuperAdminPanel] selectedBusinessId:', selectedBusinessId);

    if (selectedBusinessId && activeView === 'businesses') {
      console.log('=== [SuperAdminPanel] Rendering BusinessDetailWrapper with ID:', selectedBusinessId);
      return (
        <BusinessDetailWrapper
          businessId={selectedBusinessId}
          onBack={() => {
            console.log('=== [SuperAdminPanel] onBack called, clearing selectedBusinessId');
            setSelectedBusinessId(null);
          }}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        console.log('=== [SuperAdminPanel] Rendering Dashboard');
        return <Dashboard />;
      case 'businesses':
        console.log('=== [SuperAdminPanel] Rendering BusinessManagement');
        return <BusinessManagement onSelectBusiness={(id) => {
          console.log('=== [SuperAdminPanel] onSelectBusiness called with ID:', id);
          setSelectedBusinessId(id);
        }} />;
      case 'notifications':
        console.log('=== [SuperAdminPanel] Rendering PaymentNotifications');
        return (
          <PaymentNotifications
            onNotificationClick={(businessId) => {
              console.log('=== [SuperAdminPanel] onNotificationClick called with ID:', businessId);
              setSelectedBusinessId(businessId);
              setActiveView('businesses');
            }}
          />
        );
      case 'messages':
        console.log('=== [SuperAdminPanel] Rendering Messaging');
        return <Messaging selectedBusinessId={selectedBusinessId || undefined} />;
      case 'audit':
        console.log('=== [SuperAdminPanel] Rendering AuditLog');
        return <AuditLog />;
      case 'security':
        console.log('=== [SuperAdminPanel] Rendering SecurityMonitoring');
        return <SecurityMonitoring />;
      case 'password-reset':
        console.log('=== [SuperAdminPanel] Rendering PasswordResetAssistance');
        return <PasswordResetAssistance />;
      default:
        console.log('=== [SuperAdminPanel] Rendering default Dashboard');
        return <Dashboard />;
    }
  };

  const menuItems: { id: ActiveView; icon: typeof LayoutDashboard; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'businesses', icon: Building2, label: 'Negocios' },
    { id: 'security', icon: Lock, label: 'Seguridad' },
    { id: 'password-reset', icon: Key, label: 'Recuperación de Contraseña' },
    { id: 'notifications', icon: Bell, label: 'Notificaciones' },
    { id: 'messages', icon: MessageSquare, label: 'Mensajes' },
    { id: 'audit', icon: History, label: 'Registro de Auditoría' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 rounded-lg">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panel SuperAdmin</h1>
              <p className="text-slate-300 text-sm mt-1">
                Acceso exclusivo para el propietario. Sistema privado y confidencial.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="flex overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id !== 'businesses') {
                      setSelectedBusinessId(null);
                    }
                  }}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${isActive
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
