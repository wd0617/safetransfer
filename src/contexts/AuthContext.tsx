import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  logFailedLoginAttempt,
  isAccountLocked,
  getSecurityContext,
  trackSession,
} from '../lib/security';

type BusinessUser = {
  id: string;
  business_id: string;
  user_id: string;
  role: 'admin' | 'operator';
  full_name: string;
  email: string;
  language?: 'es' | 'en' | 'it' | 'hi' | 'ur';
  is_active: boolean;
  is_superadmin?: boolean | null;
  must_change_password?: boolean | null;
};
type Business = {
  id: string;
  name: string;
  status?: 'active' | 'trial' | 'blocked' | 'inactive' | null;
  [key: string]: unknown;
};
type Subscription = {
  id: string;
  business_id: string;
  status?: 'active' | 'trial' | 'suspended' | 'cancelled' | null;
  is_trial?: boolean | null;
  trial_end_date?: string | null;
  next_payment_date?: string | null;
};

interface AuthContextType {
  user: User | null;
  businessUser: BusinessUser | null;
  business: Business | null;
  subscription: Subscription | null;
  isSuperAdmin: boolean;
  loading: boolean;
  isBusinessBlocked: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, businessName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessUser, setBusinessUser] = useState<BusinessUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isBusinessBlocked, setIsBusinessBlocked] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    try {
      if (import.meta.env.DEV) console.log('Loading user data for:', userId);
      const { data: buData, error: buError } = await supabase
        .from('business_users')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (import.meta.env.DEV) console.log('Business user data:', buData, 'Error:', buError);

      if (buError) throw buError;

      if (buData) {
        setBusinessUser(buData);
        setIsSuperAdmin(buData.is_superadmin || false);
        setMustChangePassword(buData.must_change_password || false);

        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', buData.business_id)
          .maybeSingle();

        if (import.meta.env.DEV) console.log('Business data:', bizData, 'Error:', bizError);

        if (bizError) throw bizError;
        setBusiness(bizData);

        if (bizData) {
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('business_id', bizData.id)
            .maybeSingle();

          if (import.meta.env.DEV) console.log('Subscription data:', subData, 'Error:', subError);

          if (subError) {
            console.error('Error loading subscription:', subError);
          }
          setSubscription(subData);

          if (!buData.is_superadmin) {
            const blocked = bizData.status !== 'active' && bizData.status !== 'trial';
            setIsBusinessBlocked(blocked);

            if (blocked) {
              if (import.meta.env.DEV) console.warn('Business is blocked or inactive:', bizData.status);
            }
          } else {
            setIsBusinessBlocked(false);
          }
        }
      } else {
        if (import.meta.env.DEV) console.warn('No business user found for user ID:', userId);
        setIsBusinessBlocked(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          await loadUserData(session.user.id);
        } catch (error) {
          console.error('Failed to load user data, signing out:', error);
          await supabase.auth.signOut();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Session error:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            await loadUserData(session.user.id);
          } catch (error) {
            console.error('Auth state change error:', error);
            await supabase.auth.signOut();
          }
        } else {
          setBusinessUser(null);
          setBusiness(null);
          setIsSuperAdmin(false);
          setIsBusinessBlocked(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const context = getSecurityContext();

    const locked = await isAccountLocked(email);
    if (locked) {
      throw new Error('Account is temporarily locked due to suspicious activity. Please contact support.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await logFailedLoginAttempt(email, context, error.message);
      throw error;
    }

    if (data.session && data.user) {
      const { data: businessUserData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (businessUserData) {
        await trackSession(
          data.user.id,
          businessUserData.business_id,
          data.session.access_token,
          context
        );
      }
    }
  };

  const signUp = async (email: string, password: string, fullName: string, businessName: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const { error: functionError } = await supabase
        .rpc('create_business_and_user', {
          p_business_name: businessName,
          p_business_email: email,
          p_full_name: fullName,
          p_user_email: email,
          p_language: 'es',
        });

      if (functionError) {
        console.error('Business creation error:', functionError);
        throw new Error(`Business creation failed: ${functionError.message}`);
      }

      if (authData.session) {
        await loadUserData(authData.user.id);
      }
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setBusinessUser(null);
    setBusiness(null);
    setSubscription(null);
    setIsSuperAdmin(false);
    setIsBusinessBlocked(false);
    setMustChangePassword(false);
  };

  const refreshUser = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, businessUser, business, subscription, isSuperAdmin, loading, isBusinessBlocked, mustChangePassword, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
