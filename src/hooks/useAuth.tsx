import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/index.js';
import { api } from '../services/api.js';
import { supabase } from '../lib/supabase.js';

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    full_name: string;
    email: string;
    department: string;
    year: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoUser: (role: 'alex' | 'bella') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('[CampusConnect] getSession warning on mobile:', sessionError.message);
        }
        if (session && isMounted) {
          setToken(session.access_token);
          try {
            const { user: profile } = await api.auth.getProfile(session.user);
            if (isMounted) setUser(profile);
          } catch (profileErr: any) {
            console.warn('[CampusConnect] Profile fetch fallback:', profileErr?.message);
            if (isMounted && session.user) {
              setUser({
                id: session.user.id,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
                email: session.user.email || '',
                department: session.user.user_metadata?.department || 'General',
                year: session.user.user_metadata?.year || 'Student',
                created_at: session.user.created_at || new Date().toISOString(),
              });
            }
          }
        }
      } catch (err: any) {
        console.warn('[CampusConnect] Session init notice:', err?.message || err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    const { data: authListener } = supabase?.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setToken(session.access_token);
        try {
          const { user: profile } = await api.auth.getProfile(session.user);
          if (isMounted) setUser(profile);
        } catch {
          if (isMounted) {
            setUser({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
              email: session.user.email || '',
              department: session.user.user_metadata?.department || 'General',
              year: session.user.user_metadata?.year || 'Student',
              created_at: session.user.created_at || new Date().toISOString(),
            });
          }
        }
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (data: {
    full_name: string;
    email: string;
    department: string;
    year: string;
    password: string;
  }) => {
    const res = await api.auth.register(data);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await api.auth.logout();
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (role: 'alex' | 'bella') => {
    if (role === 'alex') {
      await login('alex.rivera@campus.edu', 'password123');
    } else {
      await login('bella.chen@campus.edu', 'password123');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
