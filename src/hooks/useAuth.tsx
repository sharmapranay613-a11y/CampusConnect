import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/index.js';
import { api } from '../services/api.js';

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
  logout: () => void;
  switchDemoUser: (role: 'alex' | 'bella') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('campusconnect_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('campusconnect_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { user: profile } = await api.auth.getProfile();
        setUser(profile);
      } catch (err) {
        console.warn('Could not restore user session:', err);
        localStorage.removeItem('campusconnect_token');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('campusconnect_token', res.token);
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
    localStorage.setItem('campusconnect_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('campusconnect_token');
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
