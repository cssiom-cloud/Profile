/**
 * src/lib/supabase.js
 * Safe Supabase Client Initializer with Null-Client Fallback
 * Never throws at bundle time, build time, or runtime if credentials are absent.
 */
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const rawUrl = getEnvVar('VITE_SUPABASE_URL');
const rawAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

/**
 * Normalizes Supabase URL, auto-filling https:// and .supabase.co if only project ref ID was provided
 * @param {string} url
 * @returns {string}
 */
export const normalizeSupabaseUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    if (!clean.includes('.')) {
      clean = `https://${clean}.supabase.co`;
    } else {
      clean = `https://${clean}`;
    }
  }
  return clean;
};

/**
 * Validates whether valid, usable Supabase credentials are configured in the environment.
 * Rejects undefined, empty, or default template placeholder strings.
 * @returns {boolean}
 */
export const isSupabaseConfigured = () => {
  if (typeof rawUrl !== 'string' || typeof rawAnonKey !== 'string') {
    return false;
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = rawAnonKey.trim();

  if (!url || !anonKey) {
    return false;
  }

  // Check for placeholder strings
  const isPlaceholderUrl =
    url.includes('YOUR_SUPABASE_URL') ||
    url.includes('your-project-id.supabase.co') ||
    url === 'https://example.supabase.co';

  const isPlaceholderKey =
    anonKey.includes('YOUR_SUPABASE_ANON_KEY') ||
    anonKey.includes('your-anon-key');

  if (isPlaceholderUrl || isPlaceholderKey) {
    return false;
  }

  // Must be a valid HTTP or HTTPS URL
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Safe Supabase client instance.
 * Returns null client when unconfigured so caller logic never crashes.
 */
export const supabase = isSupabaseConfigured()
  ? createClient(normalizeSupabaseUrl(rawUrl), rawAnonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
