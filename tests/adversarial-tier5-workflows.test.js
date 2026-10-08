/**
 * tests/adversarial-tier5-workflows.test.js
 * Empirical Adversarial Challenger Test Suite: Tier 5 Workflows & Production Resilience
 *
 * Verification Scope:
 * 1. Storage Resilience & Recovery:
 *    - Disabled storage / SecurityError
 *    - Storage QuotaExceededError handling & failure reporting
 *    - Corrupted / malformed JSON storage recovery
 *    - Schema normalization & fallback to defaultData.js
 *    - Partial cache deep-merge and null-element pruning
 *
 * 2. Disaster Recovery & Data Portability:
 *    - JSON export / import round-trip fidelity
 *    - Prototype pollution attack payload immunity
 *    - Strict rejection of malformed JSON syntax & invalid roots
 *    - Missing required fields validation
 *    - Null / non-object link & favorite array element filtering
 *    - High-volume payload stress
 *
 * 3. Theme Engine Resilience & DOM Switching:
 *    - Full CSS variable completeness across all 5 themes
 *    - Synchronous zero-reload data-theme DOM attribute updating
 *    - Rapid sequential switching performance (500 cycles < 50ms)
 *    - Theme attribute restoration on revertChanges & resetToDefaults
 *
 * 4. Static Hosting Contract & Asset Resolution:
 *    - vite.config.js base: './' verification
 *    - dist/index.html strictly relative URLs (./assets/..., ./favicon.svg)
 *    - ZERO root-absolute paths (/assets/..., /favicon.svg)
 *    - Non-empty bundle assets verification
 *
 * 5. Smoke Test Backward Compatibility:
 *    - 14 Milestone 1 smoke DOM IDs verification in src/App.jsx
 *    - handleDensityChange function integrity and store linkage
 *    - handleTestMutation & console error interceptor verification
 *
 * 6. GitHub Actions CI/CD Deployment Workflow:
 *    - Trigger events, branches, permissions, and concurrency
 *    - Modern official Pages actions and artifact path (./dist)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TestHarness,
  createMockLocalStorage,
  createMockDOM,
  THEME_PRESETS,
  THEME_CSS_VARIABLES,
  validateProfileHubData,
} from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ============================================================================
// Environment Mock Setup
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
global.URL.createObjectURL = (blob) => `blob:mock-tier5-${Math.random().toString(36).slice(2)}`;
global.URL.revokeObjectURL = () => {};
global.Blob = class MockBlob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};

let activeMockStorage = createMockLocalStorage();
global.localStorage = {
  getItem: (key) => activeMockStorage.getItem(key),
  setItem: (key, val) => activeMockStorage.setItem(key, val),
  removeItem: (key) => activeMockStorage.removeItem(key),
  clear: () => activeMockStorage.clear(),
};

// Import application modules under test
const { DEFAULT_PROFILE_DATA } = await import('../src/data/defaultData.js');
const { dataProvider, LOCAL_STORAGE_KEY } = await import('../src/lib/dataProvider.js');
const { useProfileStore } = await import('../src/store/useProfileStore.js');

// Read source files for static contract analysis
const appSource = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf-8');
const indexCssSource = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
const viteConfigSource = fs.readFileSync(path.join(rootDir, 'vite.config.js'), 'utf-8');
const deployWorkflowSource = fs.readFileSync(path.join(rootDir, '.github/workflows/deploy.yml'), 'utf-8');

export function createAdversarialTier5Suite() {
  const harness = new TestHarness('Tier 5 Adversarial Workflows & Production Resilience');

  const resetCleanState = async () => {
    activeMockStorage.clear();
    activeMockStorage._setDisabled(false);
    activeMockStorage._setQuotaExceeded(false);
    await useProfileStore.getState().resetToDefaults();
  };

  // =========================================================================
  // SUITE 1: Storage Resilience & Recovery
  // =========================================================================

  harness.test('T5.1.1: Storage disabled (SecurityError) handling across dataProvider & store', async () => {
    await resetCleanState();

    try {
      // Disable storage to throw SecurityError
      activeMockStorage._setDisabled(true);

      // 1. fetchData() must gracefully fall back to DEFAULT_PROFILE_DATA without throwing
      let fetchedData;
      try {
        fetchedData = await dataProvider.fetchData();
      } catch (err) {
        assert.fail(`fetchData threw when localStorage disabled: ${err.message}`);
      }
      assert.ok(fetchedData && fetchedData.profile, 'fetchData must return valid profile structure');
      assert.equal(fetchedData.profile.name, DEFAULT_PROFILE_DATA.profile.name);

      // 2. saveData() must return success: false with clear error message, not crash
      const saveResult = await dataProvider.saveData(DEFAULT_PROFILE_DATA);
      assert.equal(saveResult.success, false, 'saveData must report success: false when storage disabled');
      assert.equal(saveResult.source, 'local');
      assert.ok(saveResult.error && saveResult.error.includes('disabled'), 'Must report disabled error');

      // 3. store.saveChanges() must reflect error saveStatus
      useProfileStore.getState().updateProfile({ name: 'Disabled Storage Edit' });
      const storeSaveResult = await useProfileStore.getState().saveChanges();
      assert.equal(storeSaveResult.success, false);
      assert.equal(useProfileStore.getState().saveStatus, 'error');

      // 4. resetData() must return seed data without throwing
      let resetData;
      try {
        resetData = await dataProvider.resetData();
      } catch (err) {
        assert.fail(`resetData threw when localStorage disabled: ${err.message}`);
      }
      assert.ok(resetData && resetData.profile);
      assert.equal(resetData.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    } finally {
      // Re-enable storage unconditionally
      activeMockStorage._setDisabled(false);
    }
  });

  harness.test('T5.1.2: Storage QuotaExceededError handling & failure reporting', async () => {
    await resetCleanState();

    try {
      // Configure storage to throw QuotaExceededError
      activeMockStorage._setQuotaExceeded(true);

      const saveResult = await dataProvider.saveData(DEFAULT_PROFILE_DATA);
      assert.equal(saveResult.success, false, 'saveData must fail when quota exceeded');
      assert.equal(saveResult.source, 'local');
      assert.ok(saveResult.error && saveResult.error.includes('QuotaExceededError'));

      // Verify store handles QuotaExceededError gracefully
      useProfileStore.getState().updateProfile({ quote: 'Quota Exceeded Test Quote' });
      const storeSaveResult = await useProfileStore.getState().saveChanges();
      assert.equal(storeSaveResult.success, false);
      assert.equal(useProfileStore.getState().saveStatus, 'error');
    } finally {
      activeMockStorage._setQuotaExceeded(false);
    }
  });

  harness.test('T5.1.3: Corrupted JSON strings in LocalStorage recovery to default seed', async () => {
    await resetCleanState();

    const corruptPayloads = [
      '{ corrupted json syntax ...',
      '<html><body>502 Bad Gateway</body></html>',
      'undefined',
      '{"profile": {"name": ',
      'null',
      'true',
      '42',
      '[{"id": "link1"}]',
    ];

    for (const badPayload of corruptPayloads) {
      activeMockStorage.setItem(LOCAL_STORAGE_KEY, badPayload);
      const recovered = await dataProvider.fetchData();

      assert.ok(recovered && typeof recovered === 'object', 'Must return an object');
      assert.equal(recovered.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Must recover default profile name');
      assert.ok(Array.isArray(recovered.links), 'Links must be an array');
      assert.equal(recovered.links.length, DEFAULT_PROFILE_DATA.links.length, 'Must recover default links');
      assert.ok(Array.isArray(recovered.favorites), 'Favorites must be an array');
      assert.equal(recovered.settings.themePreset, DEFAULT_PROFILE_DATA.settings.themePreset);
    }
  });

  harness.test('T5.1.4: Partial storage cache deep-merge and normalization', async () => {
    await resetCleanState();

    // Cache containing only profile string and custom links
    const partialCache = {
      profile: 'Solo Developer Name',
      links: [
        { id: 'custom-1', title: 'Custom Portal', url: 'https://portal.dev', order: 0, isActive: true },
      ],
    };
    activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(partialCache));

    const loaded = await dataProvider.fetchData();

    // Profile must be normalized into object with default fields populated
    assert.equal(loaded.profile.name, 'Solo Developer Name');
    assert.equal(loaded.profile.handle, DEFAULT_PROFILE_DATA.profile.handle);
    assert.equal(loaded.profile.bio, DEFAULT_PROFILE_DATA.profile.bio);

    // Links must preserve the custom links
    assert.equal(loaded.links.length, 1);
    assert.equal(loaded.links[0].title, 'Custom Portal');

    // Missing sections (favorites, music, settings) must be populated from seed
    assert.equal(loaded.favorites.length, DEFAULT_PROFILE_DATA.favorites.length);
    assert.equal(loaded.music.title, DEFAULT_PROFILE_DATA.music.title);
    assert.equal(loaded.settings.themePreset, DEFAULT_PROFILE_DATA.settings.themePreset);
  });

  harness.test('T5.1.5: Sanitization of null elements stored in LocalStorage cache', async () => {
    await resetCleanState();

    const cacheWithNulls = {
      profile: { name: 'Resilient Developer' },
      links: [
        null,
        { id: 'link-ok', title: 'Valid Link', url: 'https://valid.com' },
        undefined,
        'corrupted-string-link',
      ],
      favorites: [
        null,
        { id: 'fav-ok', title: 'Valid Fav', category: 'tech' },
      ],
    };
    activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cacheWithNulls));

    // Save should sanitize and clean before persisting
    const saved = await dataProvider.saveData(cacheWithNulls);
    assert.equal(saved.success, true);

    const reloaded = JSON.parse(activeMockStorage.getItem(LOCAL_STORAGE_KEY));
    assert.equal(reloaded.links.length, 1, 'Null/non-object links must be removed');
    assert.equal(reloaded.links[0].title, 'Valid Link');
    assert.equal(reloaded.favorites.length, 1, 'Null/non-object favorites must be removed');
    assert.equal(reloaded.favorites[0].title, 'Valid Fav');
  });

  // =========================================================================
  // SUITE 2: Disaster Recovery & Data Portability
  // =========================================================================

  harness.test('T5.2.1: JSON export and import round-trip fidelity', async () => {
    await resetCleanState();

    // 1. Mutate store with unique test data
    useProfileStore.getState().updateProfile({
      name: 'Round-Trip Voyager',
      handle: '@voyager',
      bio: 'Deep space data portability specialist.',
      quote: '"Information is physical."',
    });
    useProfileStore.getState().addLink({
      title: 'Voyager Beacon',
      url: 'https://voyager.space',
      category: 'project',
    });
    useProfileStore.getState().addFavorite({
      title: 'Cosmos Science',
      category: 'tech',
      badge: 'Gold Record',
    });
    useProfileStore.getState().setThemePreset('retro-vaporwave');

    // 2. Export to JSON
    const exportedJson = useProfileStore.getState().exportData('voyager-backup.json');
    assert.ok(typeof exportedJson === 'string');

    // Validate exported schema structure
    const parsedBackup = JSON.parse(exportedJson);
    const validationRes = validateProfileHubData(parsedBackup);
    assert.equal(validationRes.valid, true, `Exported JSON must satisfy contract: ${validationRes.errors.join(', ')}`);

    // 3. Reset store to defaults (simulating data loss disaster)
    await useProfileStore.getState().resetToDefaults();
    assert.equal(useProfileStore.getState().profile.name, DEFAULT_PROFILE_DATA.profile.name);

    // 4. Import backup JSON back into store
    const importRes = useProfileStore.getState().importData(exportedJson);
    assert.equal(importRes.success, true, 'Import of valid backup must succeed');

    // 5. Assert 100% round-trip fidelity
    const restored = useProfileStore.getState();
    assert.equal(restored.profile.name, 'Round-Trip Voyager');
    assert.equal(restored.profile.handle, '@voyager');
    assert.equal(restored.profile.bio, 'Deep space data portability specialist.');
    assert.equal(restored.profile.quote, '"Information is physical."');
    assert.ok(restored.links.some((l) => l.title === 'Voyager Beacon'));
    assert.ok(restored.favorites.some((f) => f.title === 'Cosmos Science'));
    assert.equal(restored.settings.themePreset, 'retro-vaporwave');
    assert.equal(document.documentElement.getAttribute('data-theme'), 'retro-vaporwave');
  });

  harness.test('T5.2.2: Prototype pollution attack payload immunity in importData', () => {
    const maliciousPayload = JSON.parse(
      '{"__proto__": {"polluted": true, "isAdmin": true}, "constructor": {"prototype": {"hacked": true}}, "profile": {"name": "Victim User"}, "links": []}'
    );

    const importRes = useProfileStore.getState().importData(maliciousPayload);
    assert.equal(importRes.success, true);

    // Verify global Object prototype was not contaminated
    assert.equal(({}).polluted, undefined, 'Object.prototype.polluted must be undefined');
    assert.equal(({}).isAdmin, undefined, 'Object.prototype.isAdmin must be undefined');
    assert.equal(({}).hacked, undefined, 'Object.prototype.hacked must be undefined');
  });

  harness.test('T5.2.3: Import defense against malformed JSON and invalid root types', () => {
    const invalidRoots = [
      '{ invalid syntax',
      'null',
      '12345',
      'true',
      '"simple-string"',
      '[{"profile": "bad"}]',
      { notProfile: {} },
      { profile: null },
      { profile: 'just-a-string' },
    ];

    for (const bad of invalidRoots) {
      assert.throws(
        () => dataProvider.validateImportData(bad),
        /SyntaxError|Invalid JSON/,
        `validateImportData must throw on invalid input: ${JSON.stringify(bad)}`
      );

      const importResult = useProfileStore.getState().importData(bad);
      assert.equal(importResult.success, false, 'importData must return false on invalid root');
      assert.ok(importResult.error, 'Must provide descriptive error');
    }
  });

  harness.test('T5.2.4: Import defense against missing required fields (profile.name, links array)', () => {
    const missingFieldsCases = [
      { payload: { profile: {} }, errorMatch: /Missing required profile.name/ },
      { payload: { profile: { name: 12345 } }, errorMatch: /Missing required profile.name/ },
      { payload: { profile: { name: 'Valid' }, links: 'not-array' }, errorMatch: /links must be an array/ },
      { payload: { profile: { name: 'Valid' }, links: [], favorites: {} }, errorMatch: /favorites must be an array/ },
    ];

    for (const { payload, errorMatch } of missingFieldsCases) {
      assert.throws(
        () => dataProvider.validateImportData(payload),
        errorMatch,
        `Must throw matching ${errorMatch}`
      );
    }
  });

  harness.test('T5.2.5: Sanitization of corrupted & null elements in links and favorites arrays', () => {
    const dirtyImportPayload = {
      profile: { name: 'Sanitization Tester' },
      links: [
        null,
        undefined,
        42,
        'plain-string',
        { title: 'Keeper Link 1', url: 'https://keeper1.com' },
        null,
        { title: 'Keeper Link 2', url: 'https://keeper2.com', order: 88 },
        ['nested-array'],
      ],
      favorites: [
        null,
        { title: 'Keeper Fav 1', category: 'gaming' },
        true,
        { title: 'Keeper Fav 2', category: 'tech', order: 12 },
        null,
      ],
    };

    const sanitized = dataProvider.validateImportData(dirtyImportPayload);

    // Links must retain only the 2 valid objects
    assert.equal(sanitized.links.length, 2);
    assert.equal(sanitized.links[0].title, 'Keeper Link 1');
    assert.equal(sanitized.links[0].order, 0, 'Auto-assigned index 0');
    assert.equal(sanitized.links[1].title, 'Keeper Link 2');
    assert.equal(sanitized.links[1].order, 88, 'Preserved explicit order');

    // Favorites must retain only the 2 valid objects
    assert.equal(sanitized.favorites.length, 2);
    assert.equal(sanitized.favorites[0].title, 'Keeper Fav 1');
    assert.equal(sanitized.favorites[1].title, 'Keeper Fav 2');
  });

  // =========================================================================
  // SUITE 3: Theme Engine Resilience & DOM Switching
  // =========================================================================

  harness.test('T5.3.1: CSS variable completeness across all 5 themes in src/index.css', () => {
    const allPresets = [
      'cyber-neon',
      'midnight-glow',
      'lofi-aesthetic',
      'clean-minimalist',
      'retro-vaporwave',
    ];

    for (const preset of allPresets) {
      // Find theme selector in CSS
      const themeSelectorRegex = new RegExp(`\\[data-theme=['"]?${preset}['"]?\\]\\s*\\{([^}]+)\\}`, 'm');
      const match = indexCssSource.match(themeSelectorRegex);

      assert.ok(match, `Theme preset [data-theme='${preset}'] must be defined in src/index.css`);
      const cssBody = match[1];

      // Check all 8 required interface contract variables
      for (const cssVar of THEME_CSS_VARIABLES) {
        assert.ok(
          cssBody.includes(`${cssVar}:`),
          `Theme [data-theme='${preset}'] must define CSS variable '${cssVar}'`
        );
      }

      // Check hover background variable
      assert.ok(
        cssBody.includes('--bg-surface-hover:'),
        `Theme [data-theme='${preset}'] must define '--bg-surface-hover'`
      );
    }
  });

  harness.test('T5.3.2: Synchronous zero-reload data-theme DOM attribute updating', async () => {
    await resetCleanState();

    const testThemes = ['midnight-glow', 'lofi-aesthetic', 'clean-minimalist', 'retro-vaporwave', 'cyber-neon'];

    for (const theme of testThemes) {
      useProfileStore.getState().setThemePreset(theme);

      // Verify DOM attribute updated synchronously
      const currentDomTheme = document.documentElement.getAttribute('data-theme');
      assert.equal(currentDomTheme, theme, `DOM data-theme attribute must be synchronously updated to '${theme}'`);

      // Verify store draft updated
      assert.equal(useProfileStore.getState().settings.themePreset, theme);
    }
  });

  harness.test('T5.3.3: High-frequency live theme switching performance (500 switches < 50ms)', () => {
    const presets = ['cyber-neon', 'midnight-glow', 'lofi-aesthetic', 'clean-minimalist', 'retro-vaporwave'];
    const startTime = Date.now();

    for (let i = 0; i < 500; i++) {
      const preset = presets[i % presets.length];
      useProfileStore.getState().setThemePreset(preset);
    }

    const duration = Date.now() - startTime;
    assert.ok(duration < 50, `500 theme switches must execute in <50ms (took ${duration}ms)`);
    assert.equal(document.documentElement.getAttribute('data-theme'), presets[499 % presets.length]);
  });

  harness.test('T5.3.4: Revert and Reset theme DOM synchronization', async () => {
    await resetCleanState();

    const initialTheme = useProfileStore.getState().committedState.settings.themePreset;
    assert.equal(initialTheme, 'cyber-neon');

    // 1. Mutate theme to lofi-aesthetic
    useProfileStore.getState().setThemePreset('lofi-aesthetic');
    assert.equal(document.documentElement.getAttribute('data-theme'), 'lofi-aesthetic');
    assert.equal(useProfileStore.getState().isDirty, true);

    // 2. Revert changes -> DOM data-theme must restore to committed 'cyber-neon'
    useProfileStore.getState().revertChanges();
    assert.equal(document.documentElement.getAttribute('data-theme'), 'cyber-neon');
    assert.equal(useProfileStore.getState().isDirty, false);

    // 3. Mutate theme and commit to storage
    useProfileStore.getState().setThemePreset('retro-vaporwave');
    await useProfileStore.getState().saveChanges();
    assert.equal(document.documentElement.getAttribute('data-theme'), 'retro-vaporwave');

    // 4. Reset to defaults -> DOM data-theme must restore to default seed 'cyber-neon'
    await useProfileStore.getState().resetToDefaults();
    assert.equal(document.documentElement.getAttribute('data-theme'), 'cyber-neon');
  });

  // =========================================================================
  // SUITE 4: Static Hosting Contract & Asset Resolution
  // =========================================================================

  harness.test('T5.4.1: vite.config.js static hosting configuration contract', () => {
    assert.ok(
      viteConfigSource.includes("base: './'"),
      "vite.config.js must explicitly specify base: './' for GitHub Pages subfolder hosting"
    );
    assert.ok(
      viteConfigSource.includes("outDir: 'dist'"),
      "vite.config.js must specify outDir: 'dist'"
    );
    assert.ok(
      viteConfigSource.includes("assetsDir: 'assets'"),
      "vite.config.js must specify assetsDir: 'assets'"
    );
  });

  harness.test('T5.4.2: Production dist/index.html strictly relative paths verification', () => {
    const distIndexPath = path.join(rootDir, 'dist/index.html');
    assert.ok(fs.existsSync(distIndexPath), 'dist/index.html must exist from production build');

    const distHtml = fs.readFileSync(distIndexPath, 'utf-8');

    // 1. Verify relative script tags
    const scriptSrcMatches = [...distHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/g)];
    assert.ok(scriptSrcMatches.length > 0, 'dist/index.html must contain bundled script tags');
    for (const match of scriptSrcMatches) {
      const src = match[1];
      assert.ok(
        src.startsWith('./assets/') || src.startsWith('./'),
        `Script src "${src}" must be strictly relative (start with ./)`
      );
      assert.ok(!src.startsWith('/assets/'), `Script src "${src}" must NOT be root-absolute`);
    }

    // 2. Verify relative stylesheet link tags
    const linkHrefMatches = [...distHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)];
    assert.ok(linkHrefMatches.length > 0, 'dist/index.html must contain bundled stylesheet link tags');
    for (const match of linkHrefMatches) {
      const href = match[1];
      assert.ok(
        href.startsWith('./assets/') || href.startsWith('./'),
        `Stylesheet href "${href}" must be strictly relative (start with ./)`
      );
      assert.ok(!href.startsWith('/assets/'), `Stylesheet href "${href}" must NOT be root-absolute`);
    }

    // 3. Verify favicon relative path
    const faviconMatch = distHtml.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/);
    assert.ok(faviconMatch, 'dist/index.html must contain favicon link');
    assert.equal(faviconMatch[1], './favicon.svg', 'Favicon must use strictly relative href ./favicon.svg');

    // 4. Assert ZERO root-absolute paths in href and src attributes
    const rootAbsoluteHrefOrSrc = distHtml.match(/(?:src|href)=["']\/(?:assets|favicon|src)[^"']*["']/g);
    assert.equal(
      rootAbsoluteHrefOrSrc,
      null,
      `Found forbidden root-absolute asset paths in dist/index.html: ${JSON.stringify(rootAbsoluteHrefOrSrc)}`
    );
  });

  harness.test('T5.4.3: Production bundle assets exist and are non-empty', () => {
    const distAssetsDir = path.join(rootDir, 'dist/assets');
    assert.ok(fs.existsSync(distAssetsDir), 'dist/assets directory must exist');

    const assetFiles = fs.readdirSync(distAssetsDir);
    assert.ok(assetFiles.length >= 2, 'dist/assets must contain at least one JS and one CSS bundle');

    const jsBundle = assetFiles.find((f) => f.endsWith('.js'));
    const cssBundle = assetFiles.find((f) => f.endsWith('.css'));

    assert.ok(jsBundle, 'dist/assets must contain a .js bundle');
    assert.ok(cssBundle, 'dist/assets must contain a .css bundle');

    const jsStat = fs.statSync(path.join(distAssetsDir, jsBundle));
    const cssStat = fs.statSync(path.join(distAssetsDir, cssBundle));

    assert.ok(jsStat.size > 100000, `JS bundle size (${jsStat.size} bytes) must be substantial`);
    assert.ok(cssStat.size > 5000, `CSS bundle size (${cssStat.size} bytes) must be substantial`);
  });

  // =========================================================================
  // SUITE 5: Smoke Test Backward Compatibility
  // =========================================================================

  harness.test('T5.5.1: All 14 Milestone 1 smoke DOM element IDs preserved in src/App.jsx', () => {
    const requiredSmokeIds = [
      'smoke-loading',
      'm1-smoke-container',
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

    for (const id of requiredSmokeIds) {
      assert.ok(
        appSource.includes(`id="${id}"`),
        `src/App.jsx must contain smoke test element id="${id}"`
      );
    }
  });

  harness.test('T5.5.2: handleDensityChange function integrity in src/App.jsx', () => {
    assert.ok(
      appSource.includes('const handleDensityChange = (density) => {'),
      'src/App.jsx must define handleDensityChange'
    );
    assert.ok(
      appSource.includes('updateSettings({ particleDensity: density })'),
      'handleDensityChange must invoke updateSettings with particleDensity'
    );
  });

  harness.test('T5.5.3: handleTestMutation & dirty tracking in src/App.jsx', () => {
    assert.ok(
      appSource.includes('const handleTestMutation = () => {'),
      'src/App.jsx must define handleTestMutation'
    );
    assert.ok(
      appSource.includes("setMutateTestResult('MUTATED')"),
      "handleTestMutation must set mutateTestResult to 'MUTATED'"
    );
    assert.ok(
      appSource.includes('updateProfile({ quote:'),
      'handleTestMutation must update profile quote to trigger isDirty'
    );
  });

  harness.test('T5.5.4: Console error interceptor for #smoke-console-errors in src/App.jsx', () => {
    assert.ok(
      appSource.includes('console.error = (...args) => {'),
      'src/App.jsx must hook console.error for smoke error tracking'
    );
    assert.ok(
      appSource.includes('setConsoleErrorCount((prev) => prev + 1)'),
      'console.error hook must increment consoleErrorCount'
    );
  });

  // =========================================================================
  // SUITE 6: GitHub Actions CI/CD Deployment Workflow
  // =========================================================================

  harness.test('T5.6.1: Deployment workflow triggers on main push and workflow_dispatch', () => {
    assert.ok(
      deployWorkflowSource.includes('name: Deploy to GitHub Pages'),
      'Workflow name must be "Deploy to GitHub Pages"'
    );
    assert.ok(
      deployWorkflowSource.includes('branches:') && deployWorkflowSource.includes('- main'),
      'Workflow must trigger on push to main branch'
    );
    assert.ok(
      deployWorkflowSource.includes('workflow_dispatch:'),
      'Workflow must support manual trigger via workflow_dispatch'
    );
  });

  harness.test('T5.6.2: Deployment workflow permissions and concurrency settings', () => {
    assert.ok(
      deployWorkflowSource.includes('contents: read'),
      'Permissions must include contents: read'
    );
    assert.ok(
      deployWorkflowSource.includes('pages: write'),
      'Permissions must include pages: write'
    );
    assert.ok(
      deployWorkflowSource.includes('id-token: write'),
      'Permissions must include id-token: write'
    );
    assert.ok(
      deployWorkflowSource.includes("group: 'pages'"),
      "Concurrency group must be 'pages'"
    );
    assert.ok(
      deployWorkflowSource.includes('cancel-in-progress: false'),
      'cancel-in-progress must be false for Pages deployment'
    );
  });

  harness.test('T5.6.3: Build & Deploy steps use official GitHub Pages actions', () => {
    assert.ok(
      deployWorkflowSource.includes('actions/checkout@v4'),
      'Must use official actions/checkout@v4'
    );
    assert.ok(
      deployWorkflowSource.includes('actions/setup-node@v4'),
      'Must use official actions/setup-node@v4'
    );
    assert.ok(
      deployWorkflowSource.includes('node-version: 20'),
      'Must use Node 20 LTS'
    );
    assert.ok(
      deployWorkflowSource.includes('run: npm run build'),
      'Build step must execute npm run build'
    );
    assert.ok(
      deployWorkflowSource.includes('actions/upload-pages-artifact@v3'),
      'Must use actions/upload-pages-artifact@v3'
    );
    assert.ok(
      deployWorkflowSource.includes('path: ./dist'),
      'Artifact upload path must be ./dist'
    );
    assert.ok(
      deployWorkflowSource.includes('actions/deploy-pages@v4'),
      'Must use actions/deploy-pages@v4'
    );
    assert.ok(
      deployWorkflowSource.includes('name: github-pages'),
      'Deployment environment must be github-pages'
    );
  });

  return harness;
}

// Direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const harness = createAdversarialTier5Suite();
  const summary = await harness.run();
  if (summary.failed > 0) {
    console.error(`\x1b[31m[FAILED] Tier 5 Workflows Suite had ${summary.failed} failures.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[PASS] Tier 5 Workflows Suite passed: 100% (${summary.passed}/${summary.total}) tests passed.\x1b[0m`);
    process.exit(0);
  }
}
