import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch {}
  return fallback;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://eecxjagfnftigaxqvxig.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'sb_publishable_eBCPOO6hr5_N8oeHhAl1nA_SjHkltNJ');

export const isSupabaseClientConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
