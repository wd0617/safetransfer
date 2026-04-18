import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  FileText,
  AlertCircle,
  Settings,
  LogOut,
  Shield,
  Crown,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useTranslation, Language } from '../../lib/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  language: Language;
  businessName: string;
  userRole: 'admin' | 'operator';
  isSuperAdmin?: boolean;
}

export function Sidebar({
  currentView,
  onViewChange,
  onLogout,
  language,
  businessName,
  userRole,
  isSuperAdmin = false,
}: SidebarProps) {
  const { t } = useTranslation(language);
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleViewChange = (view: string) => {
    onViewChange(view);
    setMobileOpen(false);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">SafeTransfer</h1>
            <p className="text-sm text-slate-400 mt-1 truncate max-w-[180px]">{businessName}</p>
          </div>
          {isSuperAdmin && (
            <div className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-400 font-semibold">
              SA
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-spring ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              style={isActive ? {
                backgroundColor: 'var(--business-primary, #2563eb)',
                boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--business-primary, #2563eb) 25%, transparent)',
              } : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
          title={`Tema: ${theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}`}
        >
          <ThemeIcon className="w-5 h-5" />
          <span className="font-medium text-sm">
            {theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}
          </span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">{t('auth.logout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white hover:bg-slate-800 !p-2"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="text-lg font-bold text-white">SafeTransfer</h1>
        </div>
        {isSuperAdmin && (
          <div className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-400 font-semibold">
            SA
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 bg-slate-900 text-white h-screen flex-col flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 flex flex-col"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h1 className="text-lg font-bold text-white">SafeTransfer</h1>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
