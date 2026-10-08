/**
 * src/lib/auth.js
 * Production-Grade Security & Authentication Engine
 * 
 * Features:
 * 1. Cryptographic SHA-256 Password Hashing via Web Crypto API.
 * 2. Brute-force & Rate Limiting Protection (Lockout after 5 failed attempts).
 * 3. Secure Owner Credential Store (Local Hash Storage + Supabase Cloud Auth).
 * 4. Production Mode Protection (Disable default demo accounts upon publishing).
 * 5. Full Backward Compatibility with E2E Test Suite Contracts.
 */

import { supabase, isSupabaseConfigured } from './supabase.js';

const STORAGE_KEY = 'profile_owner_auth_v2';
const LOCKOUT_KEY = 'profile_auth_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

/**
 * Computes SHA-256 hash of a string using Web Crypto API.
 * Fallback to lightweight deterministic hash in non-browser or test runner environments.
 * @param {string} text 
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashPassword(text) {
  if (!text || typeof text !== 'string') return '';
  
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Pure JS fallback for Node.js / test environments without crypto.subtle
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(16, '0');
}

/**
 * Retrieves current owner credentials configuration
 * @returns {Object} { username, passwordHash, isProduction, hasCustomAuth }
 */
export function getOwnerCredentials() {
  try {
    if (typeof localStorage === 'undefined') return { username: 'admin', hasCustomAuth: false, isProduction: false };
    
    // Check v2 secure storage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        username: parsed.username || 'admin',
        passwordHash: parsed.passwordHash || '',
        isProduction: Boolean(parsed.isProduction),
        hasCustomAuth: Boolean(parsed.passwordHash),
      };
    }

    // Check v1 legacy storage for migration
    const legacy = localStorage.getItem('profile_owner_auth');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      return {
        username: parsed.username || 'admin',
        password: parsed.password || '', // legacy plaintext
        isProduction: false,
        hasCustomAuth: Boolean(parsed.password),
      };
    }
  } catch {
    // Graceful fallback
  }

  return { username: 'admin', hasCustomAuth: false, isProduction: false };
}

/**
 * Saves or updates owner credentials with SHA-256 hashing
 * @param {string} username 
 * @param {string} plainPassword 
 * @param {boolean} isProduction 
 * @returns {Promise<boolean>}
 */
export async function setOwnerCredentials(username, plainPassword, isProduction = true) {
  try {
    if (typeof localStorage === 'undefined') return false;
    const cleanUser = (username || 'admin').trim();
    const hash = await hashPassword(plainPassword.trim());

    const payload = {
      username: cleanUser,
      passwordHash: hash,
      isProduction: Boolean(isProduction),
      updatedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Remove legacy plaintext if present
    localStorage.removeItem('profile_owner_auth');
    return true;
  } catch (err) {
    console.error('[auth] Failed to save owner credentials:', err);
    return false;
  }
}

/**
 * Resets owner credentials back to default demo state
 */
export function resetOwnerCredentials() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('profile_owner_auth');
    }
  } catch {
    // ignore
  }
}

/**
 * Checks current brute-force lockout status
 * @returns {{ isLocked: boolean, remainingSeconds: number, attemptsLeft: number }}
 */
export function getLockoutStatus() {
  try {
    if (typeof sessionStorage === 'undefined') {
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };

    const { attempts, lockedUntil } = JSON.parse(raw);
    const now = Date.now();

    if (lockedUntil && now < lockedUntil) {
      const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attemptsLeft: 0 };
    }

    if (lockedUntil && now >= lockedUntil) {
      // Lockout expired, reset attempts
      sessionStorage.removeItem(LOCKOUT_KEY);
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    const attemptsCount = attempts || 0;
    return {
      isLocked: false,
      remainingSeconds: 0,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - attemptsCount),
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
  }
}

/**
 * Records a failed login attempt and calculates lockout if threshold reached
 * @returns {{ isLocked: boolean, remainingSeconds: number, attemptsLeft: number }}
 */
export function recordFailedAttempt() {
  try {
    if (typeof sessionStorage === 'undefined') {
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
    }

    const current = getLockoutStatus();
    if (current.isLocked) return current;

    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    let attempts = 0;
    if (raw) {
      try {
        attempts = JSON.parse(raw).attempts || 0;
      } catch {
        attempts = 0;
      }
    }

    attempts += 1;

    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify({ attempts, lockedUntil }));
      return { isLocked: true, remainingSeconds: 60, attemptsLeft: 0 };
    }

    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify({ attempts, lockedUntil: null }));
    return {
      isLocked: false,
      remainingSeconds: 0,
      attemptsLeft: MAX_ATTEMPTS - attempts,
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_ATTEMPTS };
  }
}

/**
 * Clears failed login attempts on successful login
 */
export function clearLockout() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(LOCKOUT_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Validates credentials against custom hash or default demo
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
export async function verifyLocalCredentials(username, password) {
  const trimmedUser = (username || '').trim();
  const trimmedPass = (password || '').trim();

  if (!trimmedUser || !trimmedPass) {
    return { success: false, reason: 'Please enter both username and password.' };
  }

  const creds = getOwnerCredentials();

  // 1. If custom credentials exist in secure storage
  if (creds.hasCustomAuth && creds.passwordHash) {
    const inputHash = await hashPassword(trimmedPass);
    if (
      trimmedUser.toLowerCase() === creds.username.toLowerCase() &&
      inputHash === creds.passwordHash
    ) {
      clearLockout();
      return { success: true };
    }

    // In production mode with custom credentials, demo login is blocked
    if (creds.isProduction) {
      recordFailedAttempt();
      return { success: false, reason: 'Invalid username or password.' };
    }
  }

  // 2. Legacy plaintext match if migration pending
  if (creds.password && trimmedUser.toLowerCase() === creds.username.toLowerCase() && trimmedPass === creds.password) {
    clearLockout();
    return { success: true };
  }

  // 3. Default demo fallback (admin / admin123 / maiddress) unless production lock is enforced
  const isDefaultUser = trimmedUser.toLowerCase() === 'admin' || trimmedUser.toLowerCase() === 'owner' || trimmedUser.toLowerCase() === 'maiddress';
  const isDefaultPass = trimmedPass === 'admin123' || trimmedPass === 'admin' || trimmedPass === '1234';

  if (!creds.isProduction && isDefaultUser && isDefaultPass) {
    clearLockout();
    return { success: true };
  }

  recordFailedAttempt();
  return { success: false, reason: 'Invalid username or password.' };
}

/**
 * Sign in with Supabase Authentication (Cloud email & password)
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{ success: boolean, session?: Object, user?: Object, error?: string }>}
 */
export async function signInWithSupabase(email, password) {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      recordFailedAttempt();
      return { success: false, error: error.message };
    }

    if (data?.session || data?.user) {
      clearLockout();
      return { success: true, session: data.session, user: data.user };
    }

    recordFailedAttempt();
    return { success: false, error: 'No session returned from Supabase.' };
  } catch (err) {
    recordFailedAttempt();
    return { success: false, error: err.message || 'Supabase authentication failed.' };
  }
}
