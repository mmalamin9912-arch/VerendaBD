import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function cleanEnvUrl(raw?: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  // Strip all leading and trailing quotes, backslashes, spaces
  str = str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
  str = str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
  return str.replace(/\/+$/, '');
}

export function cleanEnvKey(raw?: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
  return str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
}

export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Support Vite, Vercel, Next, and standard Node environment variable naming
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const procEnv = (typeof process !== 'undefined' && process.env) || {};

const rawSupabaseUrl =
  metaEnv.VITE_SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  procEnv.NEXT_PUBLIC_SUPABASE_URL ||
  metaEnv.SUPABASE_URL ||
  procEnv.SUPABASE_URL ||
  '';

const rawSupabaseAnonKey =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  procEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  metaEnv.SUPABASE_ANON_KEY ||
  procEnv.SUPABASE_ANON_KEY ||
  metaEnv.SUPABASE_SERVICE_ROLE_KEY ||
  procEnv.SUPABASE_SERVICE_ROLE_KEY ||
  metaEnv.VITE_SUPABASE_KEY ||
  metaEnv.SUPABASE_KEY ||
  procEnv.VITE_SUPABASE_KEY ||
  procEnv.SUPABASE_KEY ||
  '';

export const supabaseUrl = cleanEnvUrl(rawSupabaseUrl);
export const supabaseAnonKey = cleanEnvKey(rawSupabaseAnonKey);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  isValidUrl(supabaseUrl)
);

// String placeholder fallbacks so a client instance is ALWAYS created.
// Without real credentials the client still exists (calls will simply fail at
// runtime with an explicit Supabase error instead of the client being null).
const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

const resolvedSupabaseUrl = isSupabaseConfigured ? supabaseUrl : FALLBACK_SUPABASE_URL;
const resolvedSupabaseAnonKey = isSupabaseConfigured ? supabaseAnonKey : FALLBACK_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(
  resolvedSupabaseUrl,
  resolvedSupabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Always returns a live client instance (never null).
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] No valid VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY found. ' +
    'A placeholder client was created — Supabase requests will fail until env vars are set.'
  );
}


