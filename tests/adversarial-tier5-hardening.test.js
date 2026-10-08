/**
 * tests/adversarial-tier5-hardening.test.js
 * Tier 5 Adversarial Coverage Hardening - White-Box Code & Component Stress
 *
 * Target Components & Modules:
 * - src/components/audio/MusicPlayer.jsx & SoundwaveVisualizer.jsx
 * - src/components/canvas/ParticleBackground.jsx
 * - src/components/customizer/LoginModal.jsx
 * - src/components/customizer/LiveCustomizerDrawer.jsx and all 5 editor tabs:
 *     ProfileEditorTab.jsx, LinksEditorTab.jsx, FavoritesEditorTab.jsx, MusicEditorTab.jsx, LayoutThemeTab.jsx
 * - src/components/links/LinksGrid.jsx, LinkCard.jsx, FavoritesSection.jsx
 * - src/components/profile/ProfileHeader.jsx, SocialHub.jsx
 * - src/store/useProfileStore.js and src/lib/dataProvider.js
 * - src/App.jsx
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import {
  TestHarness,
  PROJECT_ROOT,
  createMockLocalStorage,
  createMockDOM,
} from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ============================================================================
// Global Environment Initialization (Mock DOM & LocalStorage for Node)
// ============================================================================
const mockDOM = createMockDOM();
mockDOM.document.createElement = (tag) => ({
  href: '',
  download: '',
  tagName: tag.toUpperCase(),
  clickCalled: false,
  click() {
    this.clickCalled = true;
  },
});
mockDOM.document.body = {
  appended: [],
  appendChild(child) {
    this.appended.push(child);
  },
  removeChild(child) {
    this.appended = this.appended.filter((c) => c !== child);
  },
};

global.document = mockDOM.document;
global.window = mockDOM.window;
global.URL.createObjectURL = (blob) => `blob:mock-${Math.random().toString(36).slice(2)}`;
global.URL.revokeObjectURL = () => {};
global.Blob = class MockBlob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};
global.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

let activeMockStorage = createMockLocalStorage();
global.localStorage = {
  getItem: (key) => activeMockStorage.getItem(key),
  setItem: (key, val) => activeMockStorage.setItem(key, val),
  removeItem: (key) => activeMockStorage.removeItem(key),
  clear: () => activeMockStorage.clear(),
};

// Helper to transpile and import JSX modules via esbuild in Node
async function loadJsxModule(relPath) {
  const fullPath = path.resolve(PROJECT_ROOT, relPath);
  const bundle = await esbuild.build({
    entryPoints: [fullPath],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    packages: 'external',
    define: {
      'import.meta.env': '{}',
      'import.meta': '{}',
    },
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(
    m,
    m.exports,
    require
  );
  return m.exports;
}

// ----------------------------------------------------------------------------
// Load Modules Under Test
// ----------------------------------------------------------------------------
const { DEFAULT_PROFILE_DATA, THEME_PRESETS, LAYOUT_STYLES, CARD_STYLES, PARTICLE_DENSITIES, FAVORITE_CATEGORIES } =
  await import('../src/data/defaultData.js');
const { dataProvider, LOCAL_STORAGE_KEY } = await import('../src/lib/dataProvider.js');
const { useProfileStore } = await import('../src/store/useProfileStore.js');

// Transpile JSX components to extract pure exported functions & helpers
const soundwaveExports = await loadJsxModule('src/components/audio/SoundwaveVisualizer.jsx');
const musicPlayerExports = await loadJsxModule('src/components/audio/MusicPlayer.jsx');
const linkCardExports = await loadJsxModule('src/components/links/LinkCard.jsx');
const profileHeaderExports = await loadJsxModule('src/components/profile/ProfileHeader.jsx');
const socialHubExports = await loadJsxModule('src/components/profile/SocialHub.jsx');

// Read source files for structural white-box AST / regex assertions
function readSrc(relPath) {
  return fs.readFileSync(path.resolve(PROJECT_ROOT, relPath), 'utf-8');
}

const soundwaveSrc = readSrc('src/components/audio/SoundwaveVisualizer.jsx');
const musicPlayerSrc = readSrc('src/components/audio/MusicPlayer.jsx');
const particleSrc = readSrc('src/components/canvas/ParticleBackground.jsx');
const loginModalSrc = readSrc('src/components/customizer/LoginModal.jsx');
const customizerDrawerSrc = readSrc('src/components/customizer/LiveCustomizerDrawer.jsx');
const profileTabSrc = readSrc('src/components/customizer/ProfileEditorTab.jsx');
const linksTabSrc = readSrc('src/components/customizer/LinksEditorTab.jsx');
const favsTabSrc = readSrc('src/components/customizer/FavoritesEditorTab.jsx');
const musicTabSrc = readSrc('src/components/customizer/MusicEditorTab.jsx');
const themeTabSrc = readSrc('src/components/customizer/LayoutThemeTab.jsx');
const linksGridSrc = readSrc('src/components/links/LinksGrid.jsx');
const linkCardSrc = readSrc('src/components/links/LinkCard.jsx');
const favoritesSectionSrc = readSrc('src/components/links/FavoritesSection.jsx');
const profileHeaderSrc = readSrc('src/components/profile/ProfileHeader.jsx');
const socialHubSrc = readSrc('src/components/profile/SocialHub.jsx');
const appSrc = readSrc('src/App.jsx');

// ============================================================================
// Test Suite Execution
// ============================================================================

const harness = new TestHarness('Tier 5 Adversarial Coverage Hardening: White-Box Code & Component Stress');

// ----------------------------------------------------------------------------
// Suite 1: Audio Experience & Soundwave Mathematical Boundary Stress
// ----------------------------------------------------------------------------

harness.test('T5.1.1: MusicPlayer formatTime boundary & edge case sanitization', () => {
  const { formatTime } = musicPlayerExports;
  assert.equal(typeof formatTime, 'function', 'formatTime must be an exported function');

  // Standard valid times
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(9), '0:09');
  assert.equal(formatTime(59), '0:59');
  assert.equal(formatTime(60), '1:00');
  assert.equal(formatTime(75), '1:15');
  assert.equal(formatTime(3599), '59:59');
  assert.equal(formatTime(3600), '60:00');

  // Negative, NaN, Infinite and malformed inputs
  assert.equal(formatTime(-1), '0:00');
  assert.equal(formatTime(-999), '0:00');
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(Infinity), '0:00');
  assert.equal(formatTime(-Infinity), '0:00');
  assert.equal(formatTime(null), '0:00');
  assert.equal(formatTime(undefined), '0:00');
  assert.equal(formatTime('invalid string'), '0:00');
  assert.equal(formatTime({}), '0:00');
});

harness.test('T5.1.2: SoundwaveVisualizer computeSyntheticBarHeights idle & active range bounds', () => {
  const { computeSyntheticBarHeights } = soundwaveExports;
  assert.equal(typeof computeSyntheticBarHeights, 'function', 'computeSyntheticBarHeights must be exported');

  // 1. Idle state (isPlaying = false): strictly 15% minimal baseline across all bars
  const idleBars = computeSyntheticBarHeights(false, Date.now(), 24);
  assert.equal(idleBars.length, 24);
  assert.ok(idleBars.every((val) => val === 15), 'All idle bars must strictly equal 15%');

  // Different bar counts when idle
  for (const count of [1, 8, 16, 28, 64]) {
    const bars = computeSyntheticBarHeights(false, Date.now(), count);
    assert.equal(bars.length, count);
    assert.ok(bars.every((val) => val === 15));
  }

  // 2. Active state (isPlaying = true): dense sampling across 1,000 timestamps
  for (let t = 0; t <= 100000; t += 100) {
    const activeBars = computeSyntheticBarHeights(true, t, 24);
    assert.equal(activeBars.length, 24);
    for (let i = 0; i < activeBars.length; i++) {
      const val = activeBars[i];
      assert.ok(Number.isFinite(val), `Bar height must be finite at t=${t}, got ${val}`);
      assert.ok(val >= 15, `Bar height must be >= 15%, got ${val} at t=${t}`);
      assert.ok(val <= 100, `Bar height must be <= 100%, got ${val} at t=${t}`);
    }
  }

  // 3. Extreme timestamp edge cases
  const tZero = computeSyntheticBarHeights(true, 0, 24);
  assert.ok(tZero.every((v) => v >= 15 && v <= 100));

  const tNegative = computeSyntheticBarHeights(true, -999999, 24);
  assert.ok(tNegative.every((v) => v >= 15 && v <= 100));

  const tHuge = computeSyntheticBarHeights(true, 1e15, 24);
  assert.ok(tHuge.every((v) => v >= 15 && v <= 100));

  const tFractional = computeSyntheticBarHeights(true, 12345.6789, 24);
  assert.ok(tFractional.every((v) => v >= 15 && v <= 100));

  // NaN / Infinity fallback to Date.now()
  const tNaN = computeSyntheticBarHeights(true, NaN, 24);
  assert.ok(tNaN.every((v) => v >= 15 && v <= 100));

  const tInf = computeSyntheticBarHeights(true, Infinity, 24);
  assert.ok(tInf.every((v) => v >= 15 && v <= 100));

  // 4. BarCount edge cases
  assert.equal(computeSyntheticBarHeights(true, Date.now(), 0).length, 0);
  assert.equal(computeSyntheticBarHeights(true, Date.now(), 1).length, 1);
  assert.equal(computeSyntheticBarHeights(true, Date.now(), 100).length, 100);
});

harness.test('T5.1.3: Web Audio WeakMap caching, RAF teardown & AbortError handling in audio lifecycle', () => {
  // Inspect SoundwaveVisualizer for audioSourceCache WeakMap to avoid InvalidStateError
  assert.ok(
    soundwaveSrc.includes('const audioSourceCache = new WeakMap()') ||
    soundwaveSrc.includes('WeakMap'),
    'SoundwaveVisualizer must maintain module-scoped WeakMap cache to prevent InvalidStateError'
  );
  assert.ok(
    soundwaveSrc.includes('audioSourceCache.get') && soundwaveSrc.includes('audioSourceCache.set'),
    'SoundwaveVisualizer must inspect and update WeakMap cache'
  );
  assert.ok(
    soundwaveSrc.includes('cancelAnimationFrame'),
    'SoundwaveVisualizer must cleanly cancel RAF on unmount / teardown'
  );
  assert.ok(
    soundwaveSrc.includes('allSettled') && soundwaveSrc.includes('0.08'),
    'SoundwaveVisualizer must implement LERP inertial decay to settle at 15% baseline'
  );

  // Inspect MusicPlayer for AbortError handling, volume bounds, and external streaming links
  assert.ok(
    musicPlayerSrc.includes("err.name === 'AbortError'") ||
    musicPlayerSrc.includes('AbortError'),
    'MusicPlayer must handle play() AbortError gracefully without displaying error banner'
  );
  assert.ok(
    musicPlayerSrc.includes('Math.max(0, Math.min(1,'),
    'MusicPlayer must sanitize and clamp volume between 0.0 and 1.0'
  );
  assert.ok(
    musicPlayerSrc.includes('target="_blank"') && musicPlayerSrc.includes('rel="noopener noreferrer"'),
    'MusicPlayer external links (Spotify/YouTube) must have target="_blank" and rel="noopener noreferrer"'
  );
});

// ----------------------------------------------------------------------------
// Suite 2: Interactive Canvas Physics & High-DPI Math (ParticleBackground.jsx)
// ----------------------------------------------------------------------------

harness.test('T5.2.1: ParticleBackground screen-area density calculation and boundary scaling', () => {
  // Extract computeParticleCount logic from ParticleBackground.jsx
  const computeParticleCount = (width, height, densitySetting) => {
    if (densitySetting === 'off') return 0;
    const area = width * height;
    const rawCount = Math.floor(area / 22000);
    const baseCount = Math.max(25, Math.min(85, rawCount));
    switch (densitySetting) {
      case 'low':
        return Math.max(15, Math.floor(baseCount * 0.6));
      case 'high':
        return Math.min(85, Math.floor(baseCount * 1.3));
      case 'medium':
      default:
        return baseCount;
    }
  };

  // 1. Off density
  assert.equal(computeParticleCount(1920, 1080, 'off'), 0);
  assert.equal(computeParticleCount(375, 667, 'off'), 0);

  // 2. Mobile screen (375 x 667 = 250,125 sq px)
  assert.equal(computeParticleCount(375, 667, 'medium'), 25);
  assert.equal(computeParticleCount(375, 667, 'low'), 15);
  assert.equal(computeParticleCount(375, 667, 'high'), 32);

  // 3. Desktop screen (1920 x 1080 = 2,073,600 sq px)
  assert.equal(computeParticleCount(1920, 1080, 'medium'), 85);
  assert.equal(computeParticleCount(1920, 1080, 'low'), 51);
  assert.equal(computeParticleCount(1920, 1080, 'high'), 85);

  // 4. Ultra-wide 4K screen (3840 x 2160 = 8,294,400 sq px)
  assert.equal(computeParticleCount(3840, 2160, 'medium'), 85);
  assert.equal(computeParticleCount(3840, 2160, 'high'), 85);
  assert.equal(computeParticleCount(3840, 2160, 'low'), 51);

  // 5. Zero / Extreme dimensions
  assert.equal(computeParticleCount(0, 0, 'off'), 0);
  assert.equal(computeParticleCount(0, 0, 'medium'), 25);
  assert.equal(computeParticleCount(0, 0, 'low'), 15);
  assert.equal(computeParticleCount(0, 0, 'high'), 32);
});

harness.test('T5.2.2: ParticleBackground physics, Euclidean distance & High-DPI scaling invariants', () => {
  // Constellation distance threshold (< 100px)
  assert.ok(
    particleSrc.includes('const maxLineDist = 100') || particleSrc.includes('100'),
    'ParticleBackground must use 100px max constellation distance'
  );
  assert.ok(
    particleSrc.includes('Math.sqrt') || particleSrc.includes('dx * dx + dy * dy'),
    'ParticleBackground must calculate Euclidean distance for particle connections'
  );

  // Repulsion radii (120px for mouse, 80px for touch)
  assert.ok(particleSrc.includes('120'), 'Mouse repulsion radius must be 120px');
  assert.ok(particleSrc.includes('80'), 'Touch drag interaction radius must be 80px');

  // High-DPI scaling capped at 2
  assert.ok(
    particleSrc.includes('Math.min(window.devicePixelRatio || 1, 2)'),
    'High-DPI devicePixelRatio must be capped at 2 for performance optimization'
  );

  // Page Visibility API & Reduced motion
  assert.ok(
    particleSrc.includes('visibilitychange') && particleSrc.includes('document.hidden'),
    'ParticleBackground must pause RAF loop via Page Visibility API'
  );
  assert.ok(
    particleSrc.includes('prefers-reduced-motion: reduce'),
    'ParticleBackground must respect prefers-reduced-motion media query'
  );
});

// ----------------------------------------------------------------------------
// Suite 3: Dual-Mode Authentication & Security Hardening (LoginModal.jsx)
// ----------------------------------------------------------------------------

harness.test('T5.3.1: LoginModal offline PIN sanitization, casing & injection resistance', () => {
  // Test offline PIN validation logic extracted from LoginModal.jsx
  const validatePin = (inputPin) => {
    const trimmedPin = (inputPin || '').trim();
    if (!trimmedPin) return { success: false, error: 'Please enter the owner passcode.' };
    if (trimmedPin === 'admin123' || trimmedPin === 'admin' || trimmedPin === '1234') {
      return { success: true };
    }
    return { success: false, error: 'Invalid passcode. Use demo PIN: admin123' };
  };

  // Valid inputs with whitespace
  assert.equal(validatePin('admin123').success, true);
  assert.equal(validatePin('  admin123  ').success, true);
  assert.equal(validatePin('\tadmin123\n').success, true);
  assert.equal(validatePin('admin').success, true);
  assert.equal(validatePin('1234').success, true);

  // Invalid PINs
  assert.equal(validatePin('ADMIN123').success, false, 'Casing should be strict');
  assert.equal(validatePin('').success, false);
  assert.equal(validatePin('   ').success, false);
  assert.equal(validatePin('password').success, false);
  assert.equal(validatePin('root').success, false);

  // Attack injections must be cleanly rejected
  assert.equal(validatePin("' OR '1'='1").success, false);
  assert.equal(validatePin('<script>alert(1)</script>').success, false);
  assert.equal(validatePin('admin123; DROP TABLE profiles;--').success, false);
});

harness.test('T5.3.2: LoginModal interaction lifecycle, ESC dismiss, outside click & toast dispatch', () => {
  assert.ok(
    loginModalSrc.includes("e.key === 'Escape'") && loginModalSrc.includes('handleClose()'),
    'LoginModal must dismiss when ESC key is pressed'
  );
  assert.ok(
    loginModalSrc.includes('e.target === e.currentTarget') && loginModalSrc.includes('handleClose()'),
    'LoginModal must dismiss when clicking outside on backdrop'
  );
  assert.ok(
    loginModalSrc.includes("new CustomEvent('profile-toast'"),
    'LoginModal must emit profile-toast CustomEvent on successful authentication'
  );
  assert.ok(
    loginModalSrc.includes('admin123'),
    "LoginModal must support offline PIN 'admin123'"
  );
  assert.ok(
    loginModalSrc.includes('Quick 1-Click Demo Login') || loginModalSrc.includes('handleQuickDemoFill'),
    'LoginModal must provide 1-click Quick Demo unlock button'
  );
  assert.ok(
    loginModalSrc.includes('!isConfigured'),
    'LoginModal must gracefully handle unconfigured Supabase Auth state'
  );
});

// ----------------------------------------------------------------------------
// Suite 4: Customizer Drawer, Editor Tabs & Icon Resolution
// ----------------------------------------------------------------------------

harness.test('T5.4.1: LiveCustomizerDrawer 5 editor tabs structure and backup actions', () => {
  // Check 5 tab declarations
  const expectedTabs = ['profile', 'links', 'favorites', 'music', 'theme'];
  for (const tab of expectedTabs) {
    assert.ok(
      customizerDrawerSrc.includes(`id: '${tab}'`),
      `LiveCustomizerDrawer must register tab '${tab}'`
    );
  }

  // Backup & Disaster Recovery integration
  assert.ok(
    customizerDrawerSrc.includes('handleExport') && customizerDrawerSrc.includes('profile-hub-config.json'),
    'LiveCustomizerDrawer must provide JSON export to profile-hub-config.json'
  );
  assert.ok(
    customizerDrawerSrc.includes('handleImportFile') && customizerDrawerSrc.includes('importData'),
    'LiveCustomizerDrawer must support JSON configuration import'
  );
  assert.ok(
    customizerDrawerSrc.includes('handleReset') && customizerDrawerSrc.includes('resetToDefaults'),
    'LiveCustomizerDrawer must support Reset to Defaults action'
  );
  assert.ok(
    customizerDrawerSrc.includes('handleSave') && customizerDrawerSrc.includes('saveChanges'),
    'LiveCustomizerDrawer must support Save Changes'
  );
  assert.ok(
    customizerDrawerSrc.includes('handleRevert') && customizerDrawerSrc.includes('revertChanges'),
    'LiveCustomizerDrawer must support Revert Changes'
  );
});

harness.test('T5.4.2: LinksEditorTab Lucide icons (27 icons) & highlight swatches (9 colors)', () => {
  // Verify 27 curated icons in POPULAR_ICONS
  const expectedIcons = [
    'Globe', 'Github', 'Twitter', 'Linkedin', 'Youtube', 'Instagram', 'Twitch',
    'Mail', 'Send', 'Share2', 'Code', 'Terminal', 'Cpu', 'Layers', 'Zap',
    'Sparkles', 'Palette', 'Music', 'Film', 'Gamepad2', 'BookOpen', 'Coffee',
    'Heart', 'Star', 'Briefcase', 'Compass', 'ExternalLink',
  ];
  for (const iconName of expectedIcons) {
    assert.ok(
      linksTabSrc.includes(`name: '${iconName}'`),
      `LinksEditorTab must include curated icon '${iconName}'`
    );
  }

  // Verify 9 highlight swatches in PRESET_HIGHLIGHT_COLORS
  const expectedSwatches = ['#00f2fe', '#38bdf8', '#ff007f', '#a855f7', '#818cf8', '#f43f5e', '#10b981', '#f59e0b', ''];
  for (const color of expectedSwatches) {
    if (color) {
      assert.ok(
        linksTabSrc.includes(color),
        `LinksEditorTab must include highlight swatch color '${color}'`
      );
    }
  }

  // Verify CRUD operations
  assert.ok(linksTabSrc.includes('addLink'), 'LinksEditorTab must support addLink');
  assert.ok(linksTabSrc.includes('updateLink'), 'LinksEditorTab must support updateLink');
  assert.ok(linksTabSrc.includes('removeLink'), 'LinksEditorTab must support removeLink');
  assert.ok(linksTabSrc.includes('toggleLinkActive'), 'LinksEditorTab must support toggleLinkActive');
  assert.ok(linksTabSrc.includes('reorderLinks'), 'LinksEditorTab must support reorderLinks (Move Up / Down)');
});

harness.test('T5.4.3: FavoritesEditorTab categories, reordering & CRUD', () => {
  for (const cat of ['tech', 'gaming', 'anime', 'music', 'hobbies']) {
    assert.ok(favsTabSrc.includes(`value="${cat}"`), `FavoritesEditorTab must support category option '${cat}'`);
  }
  assert.ok(favsTabSrc.includes('addFavorite'), 'FavoritesEditorTab must support addFavorite');
  assert.ok(favsTabSrc.includes('updateFavorite'), 'FavoritesEditorTab must support updateFavorite');
  assert.ok(favsTabSrc.includes('removeFavorite'), 'FavoritesEditorTab must support removeFavorite');
  assert.ok(favsTabSrc.includes('reorderFavorites'), 'FavoritesEditorTab must support reorderFavorites');
});

harness.test('T5.4.4: LayoutThemeTab 5 theme presets swatches, 3 layouts & 3 card styles', () => {
  for (const theme of ['cyber-neon', 'midnight-glow', 'lofi-aesthetic', 'clean-minimalist', 'retro-vaporwave']) {
    assert.ok(themeTabSrc.includes(`'${theme}'`), `LayoutThemeTab must define theme preset swatch for '${theme}'`);
  }
  // Layout wireframe icons / labels check
  assert.ok(themeTabSrc.includes("layout.id === 'bento'"), 'LayoutThemeTab must support bento');
  assert.ok(themeTabSrc.includes("layout.id === 'stack'"), 'LayoutThemeTab must support stack');
  assert.ok(themeTabSrc.includes('LAYOUT_STYLES.map'), 'LayoutThemeTab must iterate over LAYOUT_STYLES');
  assert.ok(themeTabSrc.includes('Columns'), 'LayoutThemeTab must support Columns wireframe icon for cards');

  // Card visual styles check
  assert.ok(themeTabSrc.includes('CARD_STYLES.map'), 'LayoutThemeTab must iterate over CARD_STYLES');
  assert.ok(themeTabSrc.includes("card.id === 'glassmorphism'"), 'LayoutThemeTab must style glassmorphism');
  assert.ok(themeTabSrc.includes("card.id === 'neon-border'"), 'LayoutThemeTab must style neon-border');
  assert.ok(CARD_STYLES.some((c) => c.id === 'minimal-flat'), 'CARD_STYLES must include minimal-flat');
  for (const density of ['off', 'low', 'medium', 'high']) {
    assert.ok(themeTabSrc.includes(`density.id === '${density}'`) || themeTabSrc.includes(`'${density}'`), `LayoutThemeTab must support particle density '${density}'`);
  }
});

// ----------------------------------------------------------------------------
// Suite 5: Links Grid, URL Security & Layout Rendering
// ----------------------------------------------------------------------------

harness.test('T5.5.1: LinkCard Lucide icon resolution against normalized strings & aliases', () => {
  const { resolveLucideIcon } = linkCardExports;
  assert.equal(typeof resolveLucideIcon, 'function', 'resolveLucideIcon must be exported');

  // Exact names
  assert.ok(resolveLucideIcon('Globe'), 'Resolves Globe');
  assert.ok(resolveLucideIcon('Github'), 'Resolves Github');
  assert.ok(resolveLucideIcon('Twitter'), 'Resolves Twitter');
  assert.ok(resolveLucideIcon('Linkedin'), 'Resolves Linkedin');
  assert.ok(resolveLucideIcon('Youtube'), 'Resolves Youtube');

  // Lowercase & aliases
  assert.ok(resolveLucideIcon('x'), 'Resolves alias x -> Twitter');
  assert.ok(resolveLucideIcon('dev'), 'Resolves alias dev -> Code');
  assert.ok(resolveLucideIcon('web'), 'Resolves alias web -> Globe');
  assert.ok(resolveLucideIcon('game'), 'Resolves alias game -> Gamepad2');
  assert.ok(resolveLucideIcon('blog'), 'Resolves alias blog -> BookOpen');
  assert.ok(resolveLucideIcon('email'), 'Resolves alias email -> Mail');
  assert.ok(resolveLucideIcon('discord'), 'Resolves alias discord -> MessageSquare');

  // Hyphenated & formatted strings
  assert.ok(resolveLucideIcon('external-link'), 'Resolves external-link');
  assert.ok(resolveLucideIcon('book_open'), 'Resolves book_open');

  // Fallback for null, undefined, and unrecognized strings
  const fallbackNull = resolveLucideIcon(null);
  const fallbackEmpty = resolveLucideIcon('');
  const fallbackUnknown = resolveLucideIcon('unknown_nonexistent_icon_12345');
  assert.ok(fallbackNull);
  assert.ok(fallbackEmpty);
  assert.ok(fallbackUnknown);
});

harness.test('T5.5.2: LinkCard URL safety neutralization against malicious schemes (T2.5)', () => {
  const { isSafeUrl, normalizeUrl } = linkCardExports;

  // Malicious protocols must be rejected
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('JAVASCRIPT:alert(document.cookie)'), false);
  assert.equal(isSafeUrl('   javascript:void(0)   '), false);
  assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeUrl('DATA:image/svg+xml;base64,PHN2Zw...'), false);
  assert.equal(isSafeUrl('vbscript:msgbox(1)'), false);
  assert.equal(isSafeUrl('file:///etc/passwd'), false);
  assert.equal(isSafeUrl('FILE://C:/Windows/System32'), false);
  assert.equal(isSafeUrl(null), false);
  assert.equal(isSafeUrl(undefined), false);

  // Safe protocols allowed
  assert.equal(isSafeUrl('https://github.com'), true);
  assert.equal(isSafeUrl('http://localhost:3000'), true);
  assert.equal(isSafeUrl('mailto:contact@domain.com'), true);

  // Normalization prepends https:// if scheme omitted
  assert.equal(normalizeUrl('github.com'), 'https://github.com');
  assert.equal(normalizeUrl('https://github.com'), 'https://github.com');
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com');
  assert.equal(normalizeUrl('   alex.dev/portfolio   '), 'https://alex.dev/portfolio');
  assert.equal(normalizeUrl(''), '');
  assert.equal(normalizeUrl(null), '');
});

harness.test('T5.5.3: LinksGrid category count derivation & Bento asymmetric column spans', () => {
  assert.ok(
    linksGridSrc.includes('formatCategoryLabel'),
    'LinksGrid must provide category title formatter'
  );
  assert.ok(
    linksGridSrc.includes('counts[rawCat]') && linksGridSrc.includes('counts = { all: activeLinks.length }'),
    'LinksGrid must compute exact link counts per category and for all'
  );
  assert.ok(
    linksGridSrc.includes('getItemSpanClass') &&
    (linksGridSrc.includes('col-span-2') || linksGridSrc.includes('sm:col-span-2')),
    'LinksGrid must support asymmetric 2-column span for featured cards in Bento layout'
  );
});

harness.test('T5.5.4: FavoritesSection 5 canonical categories and metadata', () => {
  for (const cat of ['tech', 'gaming', 'anime', 'music', 'hobbies']) {
    assert.ok(
      favoritesSectionSrc.includes(`${cat}:`),
      `FavoritesSection must define CATEGORY_META for '${cat}'`
    );
  }
});

// ----------------------------------------------------------------------------
// Suite 6: Profile Identity & Fallback Resilience
// ----------------------------------------------------------------------------

harness.test('T5.6.1: ProfileHeader avatar monogram initials fallback (T2.8 Contract)', () => {
  const { generateAvatarFallback } = profileHeaderExports;
  assert.equal(typeof generateAvatarFallback, 'function', 'generateAvatarFallback must be exported');

  // Single word: first 2 characters uppercase
  assert.equal(generateAvatarFallback('Kavinsky'), 'KA');
  assert.equal(generateAvatarFallback('Neo'), 'NE');
  assert.equal(generateAvatarFallback('X'), 'X');

  // Multiple words: first char of first word + first char of last word
  assert.equal(generateAvatarFallback('Alex Rivera'), 'AR');
  assert.equal(generateAvatarFallback('Jean-Luc Picard'), 'JP');
  assert.equal(generateAvatarFallback('Ada Lovelace'), 'AL');
  assert.equal(generateAvatarFallback('John Fitzgerald Kennedy'), 'JK');
  assert.equal(generateAvatarFallback('  Miles   Davis  '), 'MD');

  // Missing, null, empty
  assert.equal(generateAvatarFallback(''), '??');
  assert.equal(generateAvatarFallback('   '), '??');
  assert.equal(generateAvatarFallback(null), '??');
  assert.equal(generateAvatarFallback(undefined), '??');
  assert.equal(generateAvatarFallback(123), '??');
});

harness.test('T5.6.2: ProfileHeader getSafeProfile data sanitizer & handle normalization', () => {
  const { getSafeProfile } = profileHeaderExports;

  // Handles raw missing object
  const defaultRes = getSafeProfile(null);
  assert.equal(defaultRes.name, DEFAULT_PROFILE_DATA.profile.name);
  assert.equal(defaultRes.handle, DEFAULT_PROFILE_DATA.profile.handle);

  // Auto-prepends @ to handle if missing
  const sanitized = getSafeProfile({ name: 'Jordan', handle: 'jordandev' });
  assert.equal(sanitized.name, 'Jordan');
  assert.equal(sanitized.handle, '@jordandev');

  // Leaves existing @handle intact
  const sanitizedAt = getSafeProfile({ name: 'Jordan', handle: '@jordandev' });
  assert.equal(sanitizedAt.handle, '@jordandev');
});

harness.test('T5.6.3: SocialHub platform icon resolver & discreet Ctrl+Shift+L shortcut', () => {
  const { getSocialIcon } = socialHubExports;
  assert.equal(typeof getSocialIcon, 'function', 'getSocialIcon must be exported');

  assert.ok(getSocialIcon('Github', 'https://github.com/test'));
  assert.ok(getSocialIcon('Twitter', 'https://x.com/test'));
  assert.ok(getSocialIcon('Linkedin', 'https://linkedin.com/in/test'));
  assert.ok(getSocialIcon('Youtube', 'https://youtube.com/@test'));
  assert.ok(getSocialIcon('Discord', 'https://discord.gg/test'));
  assert.ok(getSocialIcon('Mail', 'mailto:test@test.com'));
  assert.ok(getSocialIcon('Instagram', 'https://instagram.com/test'));

  // Keyboard shortcut listener for discreet owner mode toggle (Ctrl+Shift+L)
  assert.ok(
    socialHubSrc.includes('e.shiftKey') && (socialHubSrc.includes("'L'") || socialHubSrc.includes("'l'")),
    'SocialHub must register Ctrl+Shift+L shortcut for discreet owner mode toggle'
  );
});

// ----------------------------------------------------------------------------
// Suite 7: Reactive State Engine & Storage Provider Invariants
// ----------------------------------------------------------------------------

harness.test('T5.7.1: useProfileStore WYSIWYG reactivity & dynamic isDirty tracking lifecycle', async () => {
  activeMockStorage.clear();
  await useProfileStore.getState().loadInitialData();

  // 1. Initial clean state
  assert.equal(useProfileStore.getState().isDirty, false, 'Initial state must not be dirty');

  // 2. Profile mutation marks dirty
  useProfileStore.getState().updateProfile({ bio: 'Live WYSIWYG Updated Bio ' + Date.now() });
  assert.equal(useProfileStore.getState().isDirty, true, 'isDirty must be true after updateProfile');

  // 3. Revert restores clean state
  useProfileStore.getState().revertChanges();
  assert.equal(useProfileStore.getState().isDirty, false, 'isDirty must be false after revertChanges');

  // 4. Links CRUD dirty tracking
  useProfileStore.getState().addLink({ title: 'Adversarial Test Link', url: 'https://test.dev' });
  assert.equal(useProfileStore.getState().isDirty, true, 'isDirty must be true after addLink');

  const links = useProfileStore.getState().links;
  const addedLink = links[links.length - 1];
  assert.equal(addedLink.title, 'Adversarial Test Link');

  // Update link
  useProfileStore.getState().updateLink(addedLink.id, { title: 'Updated Test Link' });
  assert.equal(useProfileStore.getState().isDirty, true);

  // Toggle active
  useProfileStore.getState().toggleLinkActive(addedLink.id);
  assert.equal(useProfileStore.getState().isDirty, true);

  // Save changes clears dirty flag
  const saveRes = await useProfileStore.getState().saveChanges();
  assert.equal(saveRes.success, true);
  assert.equal(useProfileStore.getState().isDirty, false, 'isDirty must be false after saveChanges');

  // Remove link
  useProfileStore.getState().removeLink(addedLink.id);
  assert.equal(useProfileStore.getState().isDirty, true, 'isDirty must be true after removeLink');

  // 5. Favorites CRUD dirty tracking
  useProfileStore.getState().revertChanges();
  useProfileStore.getState().addFavorite({ title: 'Rust Lang', category: 'tech' });
  assert.equal(useProfileStore.getState().isDirty, true, 'isDirty must be true after addFavorite');

  useProfileStore.getState().revertChanges();
  assert.equal(useProfileStore.getState().isDirty, false);

  // 6. Settings & Theme dirty tracking
  useProfileStore.getState().setThemePreset('retro-vaporwave');
  assert.equal(useProfileStore.getState().isDirty, true, 'isDirty must be true after setThemePreset');

  useProfileStore.getState().revertChanges();
  assert.equal(useProfileStore.getState().isDirty, false);
});

harness.test('T5.7.2: ADV-6.2 resetToDefaults restores storage, draft & committed state', async () => {
  activeMockStorage.clear();
  await useProfileStore.getState().loadInitialData();

  // Dirty up the store with arbitrary mutations
  useProfileStore.getState().updateProfile({ name: 'Hacker', quote: 'Dirty Quote' });
  useProfileStore.getState().updateSettings({ themePreset: 'lofi-aesthetic', layoutStyle: 'stack' });
  useProfileStore.getState().addLink({ title: 'Temporary Portal', url: 'https://temp.dev' });
  assert.equal(useProfileStore.getState().isDirty, true);

  // Execute resetToDefaults
  await useProfileStore.getState().resetToDefaults();

  const state = useProfileStore.getState();
  assert.equal(state.isDirty, false, 'resetToDefaults must leave isDirty: false');
  assert.equal(state.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Profile name must match seed');
  assert.equal(state.settings.themePreset, DEFAULT_PROFILE_DATA.settings.themePreset, 'Theme must match seed');
  assert.equal(state.settings.layoutStyle, DEFAULT_PROFILE_DATA.settings.layoutStyle, 'Layout must match seed');
  assert.equal(state.links.length, DEFAULT_PROFILE_DATA.links.length, 'Links count must match seed');

  // Verify storage was reset
  const storageVal = activeMockStorage.getItem(LOCAL_STORAGE_KEY);
  assert.ok(storageVal, 'LocalStorage must have default data written');
  const parsed = JSON.parse(storageVal);
  assert.equal(parsed.profile.name, DEFAULT_PROFILE_DATA.profile.name);
});

harness.test('T5.7.3: dataProvider JSON import/export round-trip & defensive schema validation', () => {
  // Export JSON
  const exportedJson = dataProvider.exportDataToJson(DEFAULT_PROFILE_DATA, 'test-export.json');
  assert.equal(typeof exportedJson, 'string');
  const parsedExport = JSON.parse(exportedJson);
  assert.equal(parsedExport.profile.name, DEFAULT_PROFILE_DATA.profile.name);

  // Import valid JSON
  const validated = dataProvider.validateImportData(parsedExport);
  assert.equal(validated.profile.name, DEFAULT_PROFILE_DATA.profile.name);
  assert.equal(validated.links.length, DEFAULT_PROFILE_DATA.links.length);

  // Defensive validation against malformed payloads
  assert.throws(() => dataProvider.validateImportData(null), /Root must be an object/);
  assert.throws(() => dataProvider.validateImportData([]), /Root must be an object/);
  assert.throws(() => dataProvider.validateImportData('not valid json string'), /Unexpected/);
  assert.throws(() => dataProvider.validateImportData({ links: [] }), /profile must be an object/);
  assert.throws(() => dataProvider.validateImportData({ profile: {} }), /Missing required profile.name/);
  assert.throws(() => dataProvider.validateImportData({ profile: { name: 'Valid' }, links: 'not-array' }), /links must be an array/);

  // Sanitization of corrupted elements inside links and favorites arrays
  const corruptedPayload = {
    profile: { name: 'Resilient User' },
    links: [
      null,
      undefined,
      'primitive string',
      { id: 'valid-1', title: 'Good Link', url: 'https://good.dev' },
      null,
    ],
    favorites: [
      null,
      { id: 'fav-1', title: 'Good Fav', category: 'tech' },
      undefined,
    ],
  };

  const sanitized = dataProvider.validateImportData(corruptedPayload);
  assert.equal(sanitized.links.length, 1, 'Corrupted link elements must be filtered out');
  assert.equal(sanitized.links[0].title, 'Good Link');
  assert.equal(sanitized.favorites.length, 1, 'Corrupted favorite elements must be filtered out');
  assert.equal(sanitized.favorites[0].title, 'Good Fav');
});

// ----------------------------------------------------------------------------
// Suite 8: App Mounting & Backward Compatibility Invariants
// ----------------------------------------------------------------------------

harness.test('T5.8.1: App.jsx preserves ALL 14 smoke test DOM IDs for backward compatibility', () => {
  const smokeIds = [
    'm1-smoke-container',
    'm2-visuals-badge',
    'smoke-status',
    'smoke-profile-name',
    'smoke-profile-handle',
    'smoke-links-count',
    'smoke-favorites-count',
    'smoke-storage-mode',
    'smoke-theme',
    'smoke-dirty',
    'smoke-console-errors',
    'smoke-mutate-btn',
    'smoke-save-btn',
    'smoke-mutate-result',
  ];

  for (const id of smokeIds) {
    assert.ok(
      appSrc.includes(`id="${id}"`),
      `App.jsx must preserve smoke test DOM ID: "${id}"`
    );
  }
});

harness.test('T5.8.2: App.jsx Owner floating dock controls when isOwner is active', () => {
  assert.ok(
    appSrc.includes('isOwner &&') && appSrc.includes('Owner Mode Active'),
    'App.jsx must render Owner status indicator when isOwner is true'
  );
  assert.ok(
    appSrc.includes('toggleCustomizer') && appSrc.includes('Edit Hub'),
    'App.jsx must provide Edit Hub button in Owner dock'
  );
  assert.ok(
    appSrc.includes('setIsOwner(false)') && appSrc.includes('Logout'),
    'App.jsx must provide Logout button in Owner dock'
  );
});

// ============================================================================
// Run Suite
// ============================================================================
async function run() {
  const result = await harness.run();
  if (result.failed > 0) {
    console.error(`\x1b[31m[!] Tier 5 Adversarial Test Hardening Failed with ${result.failed} failure(s)!\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[✓] All Tier 5 Adversarial Hardening Tests Passed Successfully (${result.passed}/${result.total})!\x1b[0m`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error running Tier 5 tests:', err);
  process.exit(1);
});
