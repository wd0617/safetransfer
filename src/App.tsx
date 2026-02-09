import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthForm } from './components/Auth/AuthForm';
import { ForcePasswordChange } from './components/Auth/ForcePasswordChange';
import { MainApp } from './components/MainApp';
import { useEffect } from 'react';

function AppContent() {
  const { user, businessUser, loading, mustChangePassword, signIn, signUp, refreshUser } = useAuth();
  const { language, setLanguage } = useApp();

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

  if (!user || !businessUser) {
    return (
      <AuthForm
        onSignIn={signIn}
        onSignUp={signUp}
        language={language}
        onLanguageChange={setLanguage}
      />
    );
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
