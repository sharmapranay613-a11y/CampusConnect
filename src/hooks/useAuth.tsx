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
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setToken(session.access_token);
          const { user: profile } = await api.auth.getProfile();
          if (isMounted) setUser(profile);
        }
      } catch (err) {
        console.warn('Session check notice:', err);
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
          const { user: profile } = await api.auth.getProfile();
          if (isMounted) setUser(profile);
        } catch {
          // Ignore
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
