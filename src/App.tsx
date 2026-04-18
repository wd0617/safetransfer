import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthForm } from './components/Auth/AuthForm';
import { ForcePasswordChange } from './components/Auth/ForcePasswordChange';
import { PendingApproval } from './components/Auth/PendingApproval';
import { MainApp } from './components/MainApp';
import { LandingPage } from './components/Landing/LandingPage';
import { useEffect, useState } from 'react';
import { Skeleton } from './components/ui';

function AppContent() {
  const { user, businessUser, loading, mustChangePassword, isPendingApproval, signIn, signUp, refreshUser } = useAuth();
  const { language, setLanguage } = useApp();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) console.log('App state:', { user: !!user, businessUser: !!businessUser, loading, mustChangePassword, isPendingApproval });
  }, [user, businessUser, loading, mustChangePassword, isPendingApproval]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-600 animate-pulse" />
          <div className="space-y-2 w-48">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !businessUser) {
    if (showAuth) {
      return (
        <AuthForm
          onSignIn={signIn}
          onSignUp={signUp}
          language={language}
          onLanguageChange={setLanguage}
          onBackToLanding={() => setShowAuth(false)}
        />
      );
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  if (isPendingApproval) {
    return <PendingApproval />;
  }

  if (mustChangePassword) {
    return <ForcePasswordChange onPasswordChanged={refreshUser} />;
  }

  return <MainApp />;
}

function App() {
  useEffect(() => {
    if (import.meta.env.DEV) console.log('App mounted');
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
