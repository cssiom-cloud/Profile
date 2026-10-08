/**
 * src/lib/supabase.js
 * Safe Supabase Client Initializer with Null-Client Fallback
 * Never throws at bundle time, build time, or runtime if credentials are absent.
 */
import { createClient } from '@supabase/supabase-js';

const rawUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
const rawAnonKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';

/**
 * Validates whether valid, usable Supabase credentials are configured in the environment.
 * Rejects undefined, empty, or default template placeholder strings.
 * @returns {boolean}
 */
export const isSupabaseConfigured = () => {
  if (typeof rawUrl !== 'string' || typeof rawAnonKey !== 'string') {
    return false;
  }

  const url = rawUrl.trim();
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
  ? createClient(rawUrl.trim(), rawAnonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
