/**
 * Test Utilities, Schema Validators, and Contract Evaluators
 * Dynamic Creative Profile & Link Hub E2E Test Suite
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '../../');

// ============================================================================
// 1. Contract Specifications & Enums
// ============================================================================

export const THEME_PRESETS = [
  'cyber-neon',
  'midnight-glow',
  'lofi-aesthetic',
  'clean-minimalist',
  'retro-vaporwave',
];

export const LAYOUT_STYLES = ['bento', 'stack', 'cards'];
export const CARD_STYLES = ['glassmorphism', 'neon-border', 'minimal-flat'];
export const PARTICLE_DENSITIES = ['off', 'low', 'medium', 'high'];
export const FAVORITE_CATEGORIES = ['tech', 'gaming', 'anime', 'music', 'hobbies'];

export const THEME_CSS_VARIABLES = [
  '--bg-base',
  '--bg-surface',
  '--accent-primary',
  '--accent-secondary',
  '--text-main',
  '--text-sub',
  '--border-glow',
  '--particle-color',
];

// ============================================================================
// 2. Data Validation Utilities (ProfileHubData Contract)
// ============================================================================

export function validateProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile must be an object'] };
  }
  if (typeof profile.name !== 'string' || profile.name.trim() === '') {
    errors.push('profile.name must be a non-empty string');
  }
  if (typeof profile.handle !== 'string' || !profile.handle.startsWith('@')) {
    errors.push('profile.handle must be a string starting with @');
  }
  if (typeof profile.bio !== 'string') {
    errors.push('profile.bio must be a string');
  }
  if (typeof profile.quote !== 'string') {
    errors.push('profile.quote must be a string');
  }
  if (typeof profile.avatarUrl !== 'string' || profile.avatarUrl.trim() === '') {
    errors.push('profile.avatarUrl must be a non-empty string');
  }
  return { valid: errors.length === 0, errors };
}

export function validateLink(link, index = 0) {
  const errors = [];
  if (!link || typeof link !== 'object') {
    return { valid: false, errors: [`Link[${index}] must be an object`] };
  }
  if (!link.id || typeof link.id !== 'string') {
    errors.push(`Link[${index}].id must be a string`);
  }
  if (typeof link.title !== 'string' || link.title.trim() === '') {
    errors.push(`Link[${index}].title must be a non-empty string`);
  }
  if (typeof link.url !== 'string' || link.url.trim() === '') {
    errors.push(`Link[${index}].url must be a non-empty string`);
  }
  if (typeof link.icon !== 'string') {
    errors.push(`Link[${index}].icon must be a string`);
  }
  if (typeof link.category !== 'string') {
    errors.push(`Link[${index}].category must be a string`);
  }
  if (typeof link.order !== 'number') {
    errors.push(`Link[${index}].order must be a number`);
  }
  if (typeof link.isActive !== 'boolean') {
    errors.push(`Link[${index}].isActive must be a boolean`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateFavorite(fav, index = 0) {
  const errors = [];
  if (!fav || typeof fav !== 'object') {
    return { valid: false, errors: [`Favorite[${index}] must be an object`] };
  }
  if (!fav.id || typeof fav.id !== 'string') {
    errors.push(`Favorite[${index}].id must be a string`);
  }
  if (!FAVORITE_CATEGORIES.includes(fav.category)) {
    errors.push(`Favorite[${index}].category '${fav.category}' must be one of: ${FAVORITE_CATEGORIES.join(', ')}`);
  }
  if (typeof fav.title !== 'string' || fav.title.trim() === '') {
    errors.push(`Favorite[${index}].title must be a non-empty string`);
  }
  if (typeof fav.order !== 'number') {
    errors.push(`Favorite[${index}].order must be a number`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateMusic(music) {
  const errors = [];
  if (!music || typeof music !== 'object') {
    return { valid: false, errors: ['Music must be an object'] };
  }
  if (typeof music.title !== 'string' || music.title.trim() === '') {
    errors.push('music.title must be a non-empty string');
  }
  if (typeof music.artist !== 'string' || music.artist.trim() === '') {
    errors.push('music.artist must be a non-empty string');
  }
  if (typeof music.audioUrl !== 'string' || music.audioUrl.trim() === '') {
    errors.push('music.audioUrl must be a non-empty string');
  }
  if (typeof music.spotifyUrl !== 'string') {
    errors.push('music.spotifyUrl must be a string');
  }
  if (typeof music.youtubeUrl !== 'string') {
    errors.push('music.youtubeUrl must be a string');
  }
  return { valid: errors.length === 0, errors };
}

export function validateSettings(settings) {
  const errors = [];
  if (!settings || typeof settings !== 'object') {
    return { valid: false, errors: ['Settings must be an object'] };
  }
  if (!THEME_PRESETS.includes(settings.themePreset)) {
    errors.push(`settings.themePreset '${settings.themePreset}' must be one of: ${THEME_PRESETS.join(', ')}`);
  }
  if (!LAYOUT_STYLES.includes(settings.layoutStyle)) {
    errors.push(`settings.layoutStyle '${settings.layoutStyle}' must be one of: ${LAYOUT_STYLES.join(', ')}`);
  }
  if (!CARD_STYLES.includes(settings.cardStyle)) {
    errors.push(`settings.cardStyle '${settings.cardStyle}' must be one of: ${CARD_STYLES.join(', ')}`);
  }
  if (!PARTICLE_DENSITIES.includes(settings.particleDensity)) {
    errors.push(`settings.particleDensity '${settings.particleDensity}' must be one of: ${PARTICLE_DENSITIES.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateProfileHubData(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data root must be an object'] };
  }

  const pRes = validateProfile(data.profile);
  if (!pRes.valid) errors.push(...pRes.errors);

  if (!Array.isArray(data.links)) {
    errors.push('data.links must be an array');
  } else {
    data.links.forEach((link, idx) => {
      const lRes = validateLink(link, idx);
      if (!lRes.valid) errors.push(...lRes.errors);
    });
  }

  if (!Array.isArray(data.favorites)) {
    errors.push('data.favorites must be an array');
  } else {
    data.favorites.forEach((fav, idx) => {
      const fRes = validateFavorite(fav, idx);
      if (!fRes.valid) errors.push(...fRes.errors);
    });
  }

  const mRes = validateMusic(data.music);
  if (!mRes.valid) errors.push(...mRes.errors);

  const sRes = validateSettings(data.settings);
  if (!sRes.valid) errors.push(...sRes.errors);

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// 3. Security, URL Sanitization & Boundary Handling
// ============================================================================

export function isSafeUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim().toLowerCase();
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const proto of dangerousProtocols) {
    if (trimmed.startsWith(proto)) return false;
  }
  return true;
}

export function normalizeUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed === '') return '';
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

// ============================================================================
// 4. In-Memory Mock Storage (LocalStorage Simulator)
// ============================================================================

export function createMockLocalStorage(options = {}) {
  const store = new Map();
  let quotaExceeded = !!options.quotaExceeded;
  let disabled = !!options.disabled;

  return {
    getItem(key) {
      if (disabled) throw new Error('SecurityError: LocalStorage is disabled');
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (disabled) throw new Error('SecurityError: LocalStorage is disabled');
      if (quotaExceeded) throw new Error('QuotaExceededError: DOM Exception 22');
      store.set(key, String(value));
    },
    removeItem(key) {
      if (disabled) throw new Error('SecurityError: LocalStorage is disabled');
      store.delete(key);
    },
    clear() {
      if (disabled) throw new Error('SecurityError: LocalStorage is disabled');
      store.clear();
    },
    get length() {
      return store.size;
    },
    key(n) {
      return Array.from(store.keys())[n] || null;
    },
    _setQuotaExceeded(val) {
      quotaExceeded = val;
    },
    _setDisabled(val) {
      disabled = val;
    },
    _dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

// ============================================================================
// 5. Mock DOM / Browser Environment
// ============================================================================

export function createMockDOM() {
  const attributes = new Map();
  const eventListeners = new Map();
  const cssVariables = new Map();

  const documentElement = {
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    style: {
      setProperty(name, value) {
        cssVariables.set(name, String(value));
      },
      getPropertyValue(name) {
        return cssVariables.get(name) || '';
      },
    },
  };

  const document = {
    documentElement,
    hidden: false,
    title: '',
    addEventListener(event, handler) {
      if (!eventListeners.has(event)) eventListeners.set(event, []);
      eventListeners.get(event).push(handler);
    },
    removeEventListener(event, handler) {
      if (!eventListeners.has(event)) return;
      const list = eventListeners.get(event).filter((h) => h !== handler);
      eventListeners.set(event, list);
    },
    dispatchEvent(event) {
      const list = eventListeners.get(event.type) || [];
      list.forEach((h) => h(event));
    },
  };

  const window = {
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 2,
    matchMedia(query) {
      return {
        matches: query.includes('reduce') ? false : true,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    },
    requestAnimationFrame(cb) {
      return setTimeout(() => cb(Date.now()), 16);
    },
    cancelAnimationFrame(id) {
      clearTimeout(id);
    },
    addEventListener: document.addEventListener.bind(document),
    removeEventListener: document.removeEventListener.bind(document),
    dispatchEvent: document.dispatchEvent.bind(document),
  };

  return { document, window, attributes, cssVariables, eventListeners };
}

// ============================================================================
// 6. File System & Static Inspection Helpers
// ============================================================================

export function fileExists(relPath) {
  const fullPath = path.resolve(PROJECT_ROOT, relPath);
  return fs.existsSync(fullPath);
}

export function readFileContent(relPath) {
  const fullPath = path.resolve(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

export function parseJsonFile(relPath) {
  const content = readFileContent(relPath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ============================================================================
// 7. Test Execution & Reporting Harness
// ============================================================================

export class TestHarness {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
    this.results = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`\n\x1b[1m\x1b[36m=== Running Suite: ${this.suiteName} ===\x1b[0m`);
    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const { name, fn } of this.tests) {
      const startTime = Date.now();
      try {
        await fn();
        const duration = Date.now() - startTime;
        console.log(`  \x1b[32m✔\x1b[0m ${name} \x1b[90m(${duration}ms)\x1b[0m`);
        passed++;
        this.results.push({ name, status: 'pass', duration });
      } catch (err) {
        const duration = Date.now() - startTime;
        console.log(`  \x1b[31m✖\x1b[0m ${name} \x1b[90m(${duration}ms)\x1b[0m`);
        console.log(`    \x1b[31mError: ${err.message}\x1b[0m`);
        if (err.stack && process.env.TEST_VERBOSE) {
          console.log(`    \x1b[90m${err.stack.split('\n').slice(1, 4).join('\n')}\x1b[0m`);
        }
        failed++;
        failures.push({ name, error: err.message });
        this.results.push({ name, status: 'fail', error: err.message, duration });
      }
    }

    console.log(
      `\x1b[1mSuite Summary: ${passed} passed, ${failed} failed (${this.tests.length} total)\x1b[0m\n`
    );
    return { suite: this.suiteName, passed, failed, total: this.tests.length, failures };
  }
}
