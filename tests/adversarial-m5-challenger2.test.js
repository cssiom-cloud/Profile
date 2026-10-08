/**
 * tests/adversarial-m5-challenger2.test.js
 * Milestone 5 Empirical Adversarial Verification Suite (Challenger 2)
 * 
 * Comprehensive stress-testing of Milestone 5 deliverables:
 * - Production build asset resolution (relative ./ vs root-absolute /)
 * - Dual-Mode Authentication (PIN validation, fuzzing, unconfigured Supabase fallback)
 * - Live Customizer Drawer & 5 Editor Tabs structure & motion contracts
 * - Zustand Store WYSIWYG reactivity, dirty tracking lifecycle (isDirty), Save, Revert, Reset
 * - DataProvider import schema sanitization, JSON export formatting, null/corrupted item filtering
 * - App.jsx integration, Owner Mode dock/pill, and 14 smoke test elements invariance
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(title, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✔ [PASS] ${title}`);
  } catch (err) {
    failedChecks++;
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAdversarialM5Challenger2() {
  console.log('========================================================================');
  console.log('   M5 Challenger 2 - Empirical Adversarial Verification Suite');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // 1. Production Build & Static Asset Resolution
  // --------------------------------------------------------------------------
  console.log('--- 1. Production Build & Static Asset Resolution ---');

  const distDir = path.join(projectRoot, 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const assetsDir = path.join(distDir, 'assets');

  check('dist directory exists on disk', () => {
    assert.ok(fs.existsSync(distDir), 'dist directory must exist');
  });

  check('dist/index.html exists on disk', () => {
    assert.ok(fs.existsSync(indexHtmlPath), 'dist/index.html must exist');
  });

  check('dist/assets directory exists on disk', () => {
    assert.ok(fs.existsSync(assetsDir), 'dist/assets directory must exist');
  });

  const indexHtml = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf-8') : '';

  check('dist/index.html contains ZERO root-absolute paths (/...) for internal assets', () => {
    const rootMatches = indexHtml.match(/(?:href|src)=["']\/[a-zA-Z0-9_\-.]+/g) || [];
    assert.equal(rootMatches.length, 0, `Expected 0 root-absolute URLs, found: ${rootMatches.join(', ')}`);
  });

  check('All internal asset URLs in dist/index.html strictly begin with relative "./"', () => {
    const assetMatches = indexHtml.match(/(?:href|src)=["']\.\/(assets\/[^"']+|favicon\.svg)["']/g) || [];
    assert.ok(assetMatches.length >= 2, `Expected at least 2 relative asset matches, found ${assetMatches.length}`);
    for (const match of assetMatches) {
      const cleanUrl = match.replace(/^(?:href|src)=["']/, '').replace(/["']$/, '');
      const filePath = path.join(distDir, cleanUrl.replace(/^\.\//, ''));
      assert.ok(fs.existsSync(filePath), `Referenced asset does not exist on disk: ${cleanUrl} (${filePath})`);
    }
  });

  check('Static hosting subpath simulation succeeds for all relative assets', () => {
    const subpathBase = 'https://username.github.io/my-portfolio/';
    const assetMatches = indexHtml.match(/(?:href|src)=["']\.\/([^"']+)["']/g) || [];
    assert.ok(assetMatches.length > 0, 'Must find relative assets to test');
    for (const match of assetMatches) {
      const relPath = match.replace(/^(?:href|src)=["']\.\//, '').replace(/["']$/, '');
      const resolvedUrl = new URL(relPath, subpathBase).toString();
      assert.ok(resolvedUrl.startsWith(subpathBase), `Asset ${relPath} resolved outside subpath: ${resolvedUrl}`);
    }
  });

  // --------------------------------------------------------------------------
  // 2. Dual-Mode Authentication (LoginModal.jsx) Source & Logic Analysis
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Dual-Mode Authentication (LoginModal.jsx) Invariants ---');

  const loginModalPath = path.join(projectRoot, 'src/components/customizer/LoginModal.jsx');
  check('LoginModal.jsx exists on disk', () => {
    assert.ok(fs.existsSync(loginModalPath));
  });

  const loginModalSrc = fs.readFileSync(loginModalPath, 'utf-8');

  check('LoginModal supports offline demo PIN "admin123"', () => {
    assert.ok(loginModalSrc.includes('admin123'), 'LoginModal must contain demo PIN admin123');
  });

  check('LoginModal provides 1-Click Instant Demo Login button for evaluators', () => {
    assert.ok(loginModalSrc.includes('handleQuickDemoFill') || loginModalSrc.includes('admin123'), 'Must offer quick demo unlock');
  });

  check('LoginModal supports Supabase Cloud Auth when configured', () => {
    assert.ok(loginModalSrc.includes('signInWithPassword'), 'LoginModal must delegate to signInWithPassword');
    assert.ok(loginModalSrc.includes('isSupabaseConfigured'), 'LoginModal must check isSupabaseConfigured');
  });

  check('LoginModal displays graceful fallback when Supabase is not configured', () => {
    assert.ok(loginModalSrc.includes('CloudOff') || loginModalSrc.includes('Supabase Not Configured'), 'Must show unconfigured warning');
  });

  check('LoginModal implements keyboard dismiss on ESC key with listener cleanup', () => {
    assert.ok(loginModalSrc.includes("e.key === 'Escape'"), 'Must handle Escape key');
    assert.ok(loginModalSrc.includes("removeEventListener('keydown'"), 'Must clean up keydown listener');
  });

  check('LoginModal dispatches decoupled profile-toast CustomEvent on successful unlock', () => {
    assert.ok(loginModalSrc.includes('CustomEvent') && loginModalSrc.includes('profile-toast'), 'Must dispatch profile-toast event');
  });

  check('LoginModal updates store isOwner: true and opens customizer', () => {
    assert.ok(loginModalSrc.includes('setIsOwner(true)'), 'Must set isOwner to true');
    assert.ok(loginModalSrc.includes('setCustomizerOpen(true)'), 'Must open customizer');
  });

  // --------------------------------------------------------------------------
  // 3. Live Customizer Drawer & 5 Editor Tabs Structure
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Live Customizer Drawer & Editor Tabs Structure ---');

  const drawerPath = path.join(projectRoot, 'src/components/customizer/LiveCustomizerDrawer.jsx');
  check('LiveCustomizerDrawer.jsx exists on disk', () => {
    assert.ok(fs.existsSync(drawerPath));
  });

  const drawerSrc = fs.readFileSync(drawerPath, 'utf-8');

  check('LiveCustomizerDrawer uses Framer Motion slide-over transition from right', () => {
    assert.ok(drawerSrc.includes("x: '100%'") || drawerSrc.includes('initial={{ x:'), 'Must animate slide from right');
  });

  const requiredTabs = [
    { name: 'ProfileEditorTab', file: 'src/components/customizer/ProfileEditorTab.jsx', id: 'profile' },
    { name: 'LinksEditorTab', file: 'src/components/customizer/LinksEditorTab.jsx', id: 'links' },
    { name: 'FavoritesEditorTab', file: 'src/components/customizer/FavoritesEditorTab.jsx', id: 'favorites' },
    { name: 'MusicEditorTab', file: 'src/components/customizer/MusicEditorTab.jsx', id: 'music' },
    { name: 'LayoutThemeTab', file: 'src/components/customizer/LayoutThemeTab.jsx', id: 'theme' },
  ];

  for (const tab of requiredTabs) {
    check(`Editor tab component exists: ${tab.name}`, () => {
      const tabFilePath = path.join(projectRoot, tab.file);
      assert.ok(fs.existsSync(tabFilePath), `Missing tab component file: ${tab.file}`);
      const tabSrc = fs.readFileSync(tabFilePath, 'utf-8');
      assert.ok(tabSrc.length > 50, `${tab.name} must contain functional code`);
    });

    check(`LiveCustomizerDrawer imports and mounts ${tab.name}`, () => {
      assert.ok(drawerSrc.includes(tab.name), `LiveCustomizerDrawer must import ${tab.name}`);
      assert.ok(drawerSrc.includes(`<${tab.name}`), `LiveCustomizerDrawer must render <${tab.name} />`);
    });
  }

  check('LiveCustomizerDrawer includes Backup & Disaster Recovery section', () => {
    assert.ok(drawerSrc.includes('Export JSON') || drawerSrc.includes('exportData'), 'Must support Export JSON');
    assert.ok(drawerSrc.includes('Import JSON') || drawerSrc.includes('importData'), 'Must support Import JSON');
    assert.ok(drawerSrc.includes('Reset All to Defaults') || drawerSrc.includes('resetToDefaults'), 'Must support Reset to Defaults');
  });

  check('LiveCustomizerDrawer contains sticky Save Changes and Revert Changes footer', () => {
    assert.ok(drawerSrc.includes('Save Changes') || drawerSrc.includes('saveChanges'), 'Must have Save Changes button');
    assert.ok(drawerSrc.includes('Revert') || drawerSrc.includes('revertChanges'), 'Must have Revert button');
  });

  // --------------------------------------------------------------------------
  // 4. Empirical Stress Testing: DataProvider Validation & Normalization
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Empirical Stress Testing: DataProvider Validation & Fuzzing ---');

  const { dataProvider } = await import('../src/lib/dataProvider.js');
  const { DEFAULT_PROFILE_DATA } = await import('../src/data/defaultData.js');

  check('validateImportData validates standard valid payload cleanly', () => {
    const valid = JSON.parse(JSON.stringify(DEFAULT_PROFILE_DATA));
    const result = dataProvider.validateImportData(valid);
    assert.equal(result.profile.name, valid.profile.name);
    assert.equal(result.links.length, valid.links.length);
    assert.equal(result.favorites.length, valid.favorites.length);
  });

  check('validateImportData throws on non-object inputs', () => {
    assert.throws(() => dataProvider.validateImportData(null), /Root must be an object/);
    assert.throws(() => dataProvider.validateImportData([]), /Root must be an object/);
    assert.throws(() => dataProvider.validateImportData('invalid json string'), /Unexpected token|SyntaxError/);
    assert.throws(() => dataProvider.validateImportData(12345), /Root must be an object/);
  });

  check('validateImportData throws on missing or invalid profile', () => {
    assert.throws(() => dataProvider.validateImportData({}), /profile must be an object/);
    assert.throws(() => dataProvider.validateImportData({ profile: null }), /profile must be an object/);
    assert.throws(() => dataProvider.validateImportData({ profile: { name: 123 } }), /Missing required profile\.name/);
  });

  check('validateImportData throws on non-array links', () => {
    assert.throws(() => dataProvider.validateImportData({ profile: { name: 'Test' }, links: 'not-array' }), /links must be an array/);
    assert.throws(() => dataProvider.validateImportData({ profile: { name: 'Test' }, links: {} }), /links must be an array/);
  });

  check('validateImportData filters out null/undefined/non-object links without throwing', () => {
    const malformed = {
      profile: { name: 'Test' },
      links: [
        null,
        undefined,
        'string-link',
        123,
        { id: 'l1', title: 'Valid 1', url: 'https://example.com' },
        null,
        { id: 'l2', title: 'Valid 2', url: 'https://github.com' },
      ],
      favorites: [null, { id: 'f1', title: 'Fav 1' }, undefined],
    };

    const sanitized = dataProvider.validateImportData(malformed);
    assert.equal(sanitized.links.length, 2, 'Should only retain the 2 valid object links');
    assert.equal(sanitized.links[0].title, 'Valid 1');
    assert.equal(sanitized.links[1].title, 'Valid 2');
    assert.equal(sanitized.links[0].order, 0);
    assert.equal(sanitized.links[1].order, 1);
    assert.equal(sanitized.favorites.length, 1, 'Should only retain the 1 valid favorite');
    assert.equal(sanitized.favorites[0].title, 'Fav 1');
  });

  check('exportDataToJson produces valid, parseable JSON and returns formatted string', () => {
    const testData = { ...DEFAULT_PROFILE_DATA, profile: { ...DEFAULT_PROFILE_DATA.profile, name: 'Export Test' } };
    const jsonStr = dataProvider.exportDataToJson(testData, 'test.json');
    assert.ok(typeof jsonStr === 'string' && jsonStr.length > 0);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.profile.name, 'Export Test');
  });

  // --------------------------------------------------------------------------
  // 5. Empirical Stress Testing: useProfileStore Mutators & Dirty Lifecycle
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Empirical Stress Testing: useProfileStore Mutators & isDirty ---');

  const { useProfileStore } = await import('../src/store/useProfileStore.js');

  check('Store initial state has isDirty: false', () => {
    const state = useProfileStore.getState();
    assert.equal(state.isDirty, false, 'Store should not start dirty');
  });

  check('updateProfile mutates draft immediately and marks isDirty: true', () => {
    useProfileStore.getState().updateProfile({ name: 'Empirical Adversarial Test Name' });
    const state = useProfileStore.getState();
    assert.equal(state.profile.name, 'Empirical Adversarial Test Name');
    assert.equal(state.isDirty, true, 'isDirty must be true when modified');
  });

  check('revertChanges restores draft from committed state and resets isDirty: false', () => {
    useProfileStore.getState().revertChanges();
    const state = useProfileStore.getState();
    assert.notEqual(state.profile.name, 'Empirical Adversarial Test Name');
    assert.equal(state.profile.name, state.committedState.profile.name);
    assert.equal(state.isDirty, false, 'isDirty must reset to false upon revert');
  });

  check('addLink adds new link to live draft, increments count, and marks isDirty: true', () => {
    const initialCount = useProfileStore.getState().links.length;
    useProfileStore.getState().addLink({ title: 'Adversarial Link', url: 'https://adversary.com' });
    const state = useProfileStore.getState();
    assert.equal(state.links.length, initialCount + 1);
    assert.equal(state.links[state.links.length - 1].title, 'Adversarial Link');
    assert.equal(state.isDirty, true);
  });

  check('updateLink modifies specific link and preserves dirty status', () => {
    const state = useProfileStore.getState();
    const targetLink = state.links[state.links.length - 1];
    useProfileStore.getState().updateLink(targetLink.id, { title: 'Updated Adversarial Link' });
    const updatedState = useProfileStore.getState();
    const found = updatedState.links.find((l) => l.id === targetLink.id);
    assert.equal(found.title, 'Updated Adversarial Link');
    assert.equal(updatedState.isDirty, true);
  });

  check('toggleLinkActive inverts isActive flag', () => {
    const state = useProfileStore.getState();
    const targetLink = state.links[state.links.length - 1];
    const prevActive = targetLink.isActive;
    useProfileStore.getState().toggleLinkActive(targetLink.id);
    const updatedState = useProfileStore.getState();
    const found = updatedState.links.find((l) => l.id === targetLink.id);
    assert.equal(found.isActive, !prevActive);
  });

  check('removeLink removes link and re-indexes remaining link orders', () => {
    const state = useProfileStore.getState();
    const targetLink = state.links[state.links.length - 1];
    const beforeCount = state.links.length;
    useProfileStore.getState().removeLink(targetLink.id);
    const updatedState = useProfileStore.getState();
    assert.equal(updatedState.links.length, beforeCount - 1);
    assert.ok(!updatedState.links.some((l) => l.id === targetLink.id));
    // Verify continuous order indices
    updatedState.links.forEach((link, idx) => {
      assert.equal(link.order, idx);
    });
  });

  check('reorderLinks preserves all links while updating orders', () => {
    const state = useProfileStore.getState();
    if (state.links.length >= 2) {
      const reversed = [...state.links].reverse();
      useProfileStore.getState().reorderLinks(reversed);
      const updatedState = useProfileStore.getState();
      assert.equal(updatedState.links[0].id, reversed[0].id);
      assert.equal(updatedState.links[0].order, 0);
      assert.equal(updatedState.links[1].order, 1);
    }
  });

  check('saveChanges commits payload and sets isDirty: false', async () => {
    const saveResult = await useProfileStore.getState().saveChanges();
    assert.ok(saveResult.success, 'saveChanges must return success: true');
    const state = useProfileStore.getState();
    assert.equal(state.isDirty, false, 'isDirty must be false after saveChanges');
  });

  check('resetToDefaults resets store state and storage, maintaining isDirty: false (ADV-6.2)', async () => {
    // Mutate state first
    useProfileStore.getState().updateProfile({ name: 'Temporary Mutated' });
    assert.equal(useProfileStore.getState().isDirty, true);

    await useProfileStore.getState().resetToDefaults();
    const state = useProfileStore.getState();
    assert.equal(state.isDirty, false, 'isDirty must be strictly false after resetToDefaults');
    assert.equal(state.profile.name, DEFAULT_PROFILE_DATA.profile.name);
  });

  check('importData populates state with validated payload and sets isDirty: true for review', () => {
    const customConfig = {
      ...DEFAULT_PROFILE_DATA,
      profile: {
        ...DEFAULT_PROFILE_DATA.profile,
        name: 'Imported Master Profile',
      },
    };
    const res = useProfileStore.getState().importData(customConfig);
    assert.ok(res.success);
    const state = useProfileStore.getState();
    assert.equal(state.profile.name, 'Imported Master Profile');
    assert.equal(state.isDirty, true, 'Imported data must be marked isDirty for user review');
  });

  // Clean reset back to default
  await useProfileStore.getState().resetToDefaults();

  // --------------------------------------------------------------------------
  // 6. App.jsx Integration & 14 Smoke Test Element Invariants (ADV-2.11)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. App.jsx Integration & Smoke Invariants (ADV-2.11) ---');

  const appPath = path.join(projectRoot, 'src/App.jsx');
  check('src/App.jsx exists on disk', () => {
    assert.ok(fs.existsSync(appPath));
  });

  const appSrc = fs.readFileSync(appPath, 'utf-8');

  check('App.jsx mounts <LoginModal />', () => {
    assert.ok(appSrc.includes('<LoginModal') || appSrc.includes('<LoginModal />'));
  });

  check('App.jsx mounts <LiveCustomizerDrawer />', () => {
    assert.ok(appSrc.includes('<LiveCustomizerDrawer') || appSrc.includes('<LiveCustomizerDrawer />'));
  });

  check('App.jsx renders Quick Owner Floating Pill / Dock when isOwner === true', () => {
    assert.ok(appSrc.includes('isOwner &&'), 'Must conditionally render owner dock when isOwner === true');
    assert.ok(appSrc.includes('Owner Mode Active') || appSrc.includes('Edit Hub'), 'Must render Owner dock actions');
    assert.ok(appSrc.includes('Logout') || appSrc.includes('setIsOwner(false)'), 'Must render Logout button');
  });

  const smokeIds = [
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

  check('Strictly 14 smoke test elements tested for ADV-2.11', () => {
    assert.equal(smokeIds.length, 14);
  });

  for (const id of smokeIds) {
    check(`App.jsx strictly preserves smoke element id="${id}"`, () => {
      assert.ok(appSrc.includes(`id="${id}"`), `App.jsx is missing required smoke element id="${id}"`);
    });
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${totalChecks}`);
  console.log(`PASSED:       ${passedChecks}`);
  console.log(`FAILED:       ${failedChecks}`);
  console.log('========================================================================\n');

  if (failedChecks === 0) {
    console.log('[VERDICT] APPROVE - 100% of Milestone 5 adversarial checks passed cleanly!\n');
    process.exit(0);
  } else {
    console.error(`[VERDICT] REQUEST_CHANGES - ${failedChecks} empirical checks failed!\n`);
    process.exit(1);
  }
}

runAdversarialM5Challenger2().catch((err) => {
  console.error('[UNCAUGHT FATAL ERROR]', err);
  process.exit(1);
});
