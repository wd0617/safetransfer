import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthForm } from './components/Auth/AuthForm';
import { ForcePasswordChange } from './components/Auth/ForcePasswordChange';
import { MainApp } from './components/MainApp';
import { LandingPage } from './components/Landing/LandingPage';
import { useEffect, useState } from 'react';

function AppContent() {
  const { user, businessUser, loading, mustChangePassword, signIn, signUp, refreshUser } = useAuth();
  const { language, setLanguage } = useApp();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) console.log('App state:', { user: !!user, businessUser: !!businessUser, loading, mustChangePassword });
  }, [user, businessUser, loading, mustChangePassword]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-xl">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated, show landing or auth form
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
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
