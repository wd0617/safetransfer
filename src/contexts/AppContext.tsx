import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '../lib/i18n';
import { supabase } from '../lib/supabase';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  checkBusinessAccess: (businessId: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');
  const [currentView, setCurrentView] = useState('dashboard');

  const checkBusinessAccess = async (businessId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('status')
        .eq('id', businessId)
        .maybeSingle();

      if (error) {
        console.error('Error checking business access:', error);
        return false;
      }

      if (!data) {
        console.error('Business not found:', businessId);
        return false;
      }

      const isAccessible = data.status === 'active' || data.status === 'trial';

      if (!isAccessible) {
        console.warn('Business is not accessible. Status:', data.status);
      }

      return isAccessible;
    } catch (error) {
      console.error('Exception checking business access:', error);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, currentView, setCurrentView, checkBusinessAccess }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
