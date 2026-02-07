import { LayoutDashboard, Users, ArrowRightLeft, FileText, AlertCircle, Settings, LogOut, Shield, Crown } from 'lucide-react';
import { useTranslation, Language } from '../../lib/i18n';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  language: Language;
  businessName: string;
  userRole: 'admin' | 'operator';
  isSuperAdmin?: boolean;
}

export function Sidebar({ currentView, onViewChange, onLogout, language, businessName, userRole, isSuperAdmin = false }: SidebarProps) {
  const { t } = useTranslation(language);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { id: 'clients', icon: Users, label: t('nav.clients') },
    { id: 'transfers', icon: ArrowRightLeft, label: t('nav.transfers') },
    { id: 'reports', icon: FileText, label: t('nav.reports') },
    { id: 'alerts', icon: AlertCircle, label: t('nav.alerts') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ];

  if (userRole === 'admin') {
    menuItems.splice(5, 0, { id: 'audit', icon: Shield, label: t('nav.audit') });
  }

  if (isSuperAdmin) {
    menuItems.unshift({ id: 'superadmin', icon: Crown, label: 'SuperAdmin' });
  }

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">SafeTransfer</h1>
        <p className="text-sm text-slate-400 mt-1">{businessName}</p>
        {isSuperAdmin && (
          <div className="mt-2 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 font-semibold">
            SUPERADMIN
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t('auth.logout')}</span>
        </button>
      </div>
    </div>
  );
}
