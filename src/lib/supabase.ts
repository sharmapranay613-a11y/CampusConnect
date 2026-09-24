import { createClient } from '@supabase/supabase-js';

// Static environment variable access required by Vite compiler for production builds
const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://eecxjagfnftigaxqvxig.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_eBCPOO6hr5_N8oeHhAl1nA_SjHkltNJ';

export const isSupabaseClientConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Resilient storage adapter for mobile Safari & Chrome (handles private mode, cookie blocks & quotas)
const inMemoryStore: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn('[CampusConnect] Storage read error on mobile:', e);
    }
    return inMemoryStore[key] || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('[CampusConnect] Storage write error on mobile:', e);
    }
    inMemoryStore[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[CampusConnect] Storage remove error on mobile:', e);
    }
    delete inMemoryStore[key];
  },
};

export const supabase = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: safeStorage,
        storageKey: 'campusconnect-supabase-auth',
      },
    })
  : null;

