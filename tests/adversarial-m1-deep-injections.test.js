/**
 * tests/adversarial-m1-deep-injections.test.js
 * Empirical Challenger Boundary Injections Suite for Milestone 1
 * Targets: src/lib/dataProvider.js, src/store/useProfileStore.js, src/data/defaultData.js
 *
 * Boundary Injections:
 * - Group A: Corrupted cache formats, schema drift, partial/invalid JSON objects
 * - Group B: Rapid concurrent async saves & race conditions
 * - Group C: Storage exceptions (QuotaExceededError, SecurityError/disabled storage)
 * - Group D: Array mutations with null, undefined, primitives, and non-object values
 * - Group E: Prototype pollution, malformed imports, and state reference isolation
 */

import assert from 'node:assert/strict';
import {
  TestHarness,
  createMockLocalStorage,
  createMockDOM,
} from './helpers/test-utils.js';

// Setup Mock DOM and Storage before importing stores
const mockDOM = createMockDOM();
mockDOM.document.createElement = () => ({ href: '', download: '', click: () => {} });
mockDOM.document.body = { appendChild: () => {}, removeChild: () => {} };
global.document = mockDOM.document;
global.window = mockDOM.window;
if (!global.URL) global.URL = {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:mock';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

// Setup mutable in-memory LocalStorage
let activeMockStorage = createMockLocalStorage();
global.localStorage = {
  getItem: (key) => activeMockStorage.getItem(key),
  setItem: (key, val) => activeMockStorage.setItem(key, val),
  removeItem: (key) => activeMockStorage.removeItem(key),
  clear: () => activeMockStorage.clear(),
};

// Dynamically import dataProvider, store, and defaults
const { DEFAULT_PROFILE_DATA } = await import('../src/data/defaultData.js');
const { dataProvider, LOCAL_STORAGE_KEY } = await import('../src/lib/dataProvider.js');
const { useProfileStore } = await import('../src/store/useProfileStore.js');

export function createDeepInjectionsSuite() {
  const harness = new TestHarness('M1 Empirical Deep Boundary Injections Suite');

  // =========================================================================
  // GROUP A: Corrupted Cache Formats & Schema Drift
  // =========================================================================

  harness.test('BINJ-A.1: LocalStorage with empty JSON object ({}) self-heals to valid defaults', async () => {
    activeMockStorage.clear();
    activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({}));

    const result = await dataProvider.fetchData();
    assert.ok(result, 'Result must exist');
    assert.equal(result.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Empty object must fallback to default profile');
    assert.ok(Array.isArray(result.links), 'links must be an array');
    assert.ok(Array.isArray(result.favorites), 'favorites must be an array');
    assert.ok(result.music, 'music must exist');
    assert.ok(result.settings, 'settings must exist');
  });

  harness.test('BINJ-A.2: Corrupted profile types (number, boolean, null, array) in cache payload', async () => {
    const invalidProfileTypes = [12345, true, null, ['Alex'], false];

    for (const badProfile of invalidProfileTypes) {
      activeMockStorage.clear();
      activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ profile: badProfile }));

      const result = await dataProvider.fetchData();
      assert.ok(result && typeof result.profile === 'object' && result.profile !== null);
      assert.equal(result.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    }
  });

  harness.test('BINJ-A.3: Profile object with invalid name type (null, number, object)', async () => {
    const badNames = [null, 999, {}, false];

    for (const badName of badNames) {
      activeMockStorage.clear();
      activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ profile: { name: badName } }));

      const result = await dataProvider.fetchData();
      assert.ok(result && typeof result.profile === 'object');
      assert.equal(result.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    }
  });

  harness.test('BINJ-A.4: Cache with corrupted links/favorites (strings, numbers, null instead of arrays)', async () => {
    activeMockStorage.clear();
    activeMockStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        profile: { name: 'Valid User' },
        links: 'not-an-array',
        favorites: 12345,
      })
    );

    const result = await dataProvider.fetchData();
    assert.equal(result.profile.name, 'Valid User');
    assert.ok(Array.isArray(result.links), 'links must normalize to array');
    assert.ok(Array.isArray(result.favorites), 'favorites must normalize to array');
  });

  harness.test('BINJ-A.5: Cache with corrupted music and settings (strings, null instead of objects)', async () => {
    activeMockStorage.clear();
    activeMockStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        profile: { name: 'Valid User' },
        music: 'not-an-object',
        settings: null,
      })
    );

    const result = await dataProvider.fetchData();
    assert.ok(result.music && typeof result.music === 'object');
    assert.equal(result.music.title, DEFAULT_PROFILE_DATA.music.title);
    assert.ok(result.settings && typeof result.settings === 'object');
    assert.equal(result.settings.themePreset, DEFAULT_PROFILE_DATA.settings.themePreset);
  });

  harness.test('BINJ-A.6: Cache array with heterogeneous toxic items ([null, undefined, 42, "string", true, [], {}])', async () => {
    activeMockStorage.clear();
    const toxicItems = [null, undefined, 42, 'string', true, [], { title: 'Valid Link', url: 'https://test.com' }];
    activeMockStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        profile: { name: 'Toxic Array Test' },
        links: toxicItems,
        favorites: toxicItems,
      })
    );

    // Fetch and hydrate
    await useProfileStore.getState().loadInitialData();
    const state = useProfileStore.getState();

    // Store mutators should operate without throwing
    assert.doesNotThrow(() => {
      useProfileStore.getState().addLink({ title: 'New Safe Link' });
    });
    assert.doesNotThrow(() => {
      useProfileStore.getState().removeLink('non-existent');
    });
    assert.doesNotThrow(() => {
      useProfileStore.getState().toggleLinkActive('non-existent');
    });
    assert.doesNotThrow(() => {
      useProfileStore.getState().addFavorite({ title: 'New Safe Fav' });
    });
    assert.doesNotThrow(() => {
      useProfileStore.getState().removeFavorite('non-existent');
    });

    // Save should succeed and sanitize toxic items from cache
    const saveRes = await useProfileStore.getState().saveChanges();
    assert.equal(saveRes.success, true);

    const cached = JSON.parse(activeMockStorage.getItem(LOCAL_STORAGE_KEY));
    for (const link of cached.links) {
      assert.ok(link !== null && typeof link === 'object' && !Array.isArray(link));
    }
  });

  harness.test('BINJ-A.7: Cache raw string variations: empty string, whitespace, truncated JSON', async () => {
    const rawStrings = ['', '   \t\n  ', '{"profile": {', 'undefined', '<!-- HTML Error -->'];

    for (const raw of rawStrings) {
      activeMockStorage.clear();
      activeMockStorage.setItem(LOCAL_STORAGE_KEY, raw);

      const result = await dataProvider.fetchData();
      assert.ok(result, `fetchData must not crash for raw string "${raw}"`);
      assert.equal(result.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    }
  });

  // =========================================================================
  // GROUP B: Rapid Concurrent Async Saves & Race Conditions
  // =========================================================================

  harness.test('BINJ-B.1: Multiple concurrent saveChanges() calls with interleaved edits', async () => {
    await useProfileStore.getState().resetToDefaults();

    // Edit 1
    useProfileStore.getState().updateProfile({ name: 'Edit Alpha' });
    const save1 = useProfileStore.getState().saveChanges();

    // Rapid Edit 2 before save1 finishes
    useProfileStore.getState().updateProfile({ name: 'Edit Beta' });
    const save2 = useProfileStore.getState().saveChanges();

    // Rapid Edit 3 before save2 finishes
    useProfileStore.getState().updateProfile({ name: 'Edit Gamma' });
    const save3 = useProfileStore.getState().saveChanges();

    const results = await Promise.all([save1, save2, save3]);
    for (const r of results) {
      assert.equal(r.success, true);
    }

    const state = useProfileStore.getState();
    assert.equal(state.profile.name, 'Edit Gamma');
    assert.equal(state.committedState.profile.name, 'Edit Gamma');
    assert.equal(state.isDirty, false, 'Store should be clean after all pending saves complete');
  });

  harness.test('BINJ-B.2: Concurrent in-flight save with subsequent uncommitted edit preserves dirty=true', async () => {
    await useProfileStore.getState().resetToDefaults();

    // Slow down save with mock delay
    const origSave = dataProvider.saveData;
    let delayResolve;
    const delayPromise = new Promise((res) => { delayResolve = res; });

    dataProvider.saveData = async (data) => {
      await delayPromise;
      return origSave.call(dataProvider, data);
    };

    try {
      useProfileStore.getState().updateProfile({ name: 'Committed Version' });
      const inFlightSave = useProfileStore.getState().saveChanges();

      // Mutation happens while save is awaiting
      useProfileStore.getState().updateProfile({ name: 'Uncommitted Additional Version' });

      // Let save complete
      delayResolve();
      const res = await inFlightSave;
      assert.equal(res.success, true);

      // Verify that final state is still dirty because draft !== committed
      const finalState = useProfileStore.getState();
      assert.equal(finalState.profile.name, 'Uncommitted Additional Version');
      assert.equal(finalState.committedState.profile.name, 'Committed Version');
      assert.equal(finalState.isDirty, true, 'isDirty must remain true because subsequent edit was not in the saved snapshot');
    } finally {
      dataProvider.saveData = origSave;
    }
  });

  harness.test('BINJ-B.3: Concurrent save and revertChanges does not clobber reverted clean state', async () => {
    await useProfileStore.getState().resetToDefaults();

    const origSave = dataProvider.saveData;
    let delayResolve;
    const delayPromise = new Promise((res) => { delayResolve = res; });

    dataProvider.saveData = async (data) => {
      await delayPromise;
      return origSave.call(dataProvider, data);
    };

    try {
      useProfileStore.getState().updateProfile({ name: 'Edit to Revert' });
      const inFlightSave = useProfileStore.getState().saveChanges();

      // User hits Revert while save is in flight
      useProfileStore.getState().revertChanges();
      assert.equal(useProfileStore.getState().profile.name, DEFAULT_PROFILE_DATA.profile.name);

      delayResolve();
      await inFlightSave;

      // Because the saved snapshot was 'Edit to Revert', but draft was reverted to default:
      // The draft differs from committed snapshot, so computeIsDirty(draft, committed) correctly reflects reality
      const afterState = useProfileStore.getState();
      assert.equal(afterState.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    } finally {
      dataProvider.saveData = origSave;
    }
  });

  // =========================================================================
  // GROUP C: Storage Exceptions (QuotaExceededError, SecurityError/Disabled)
  // =========================================================================

  harness.test('BINJ-C.1: QuotaExceededError during saveData returns explicit failure structure', async () => {
    activeMockStorage._setQuotaExceeded(true);
    try {
      const res = await dataProvider.saveData(DEFAULT_PROFILE_DATA);
      assert.equal(res.success, false, 'saveData must return success: false on quota error');
      assert.equal(res.source, 'local');
      assert.ok(typeof res.error === 'string' && res.error.includes('QuotaExceededError'));
    } finally {
      activeMockStorage._setQuotaExceeded(false);
    }
  });

  harness.test('BINJ-C.2: QuotaExceededError during useProfileStore.saveChanges maintains draft and dirty=true', async () => {
    await useProfileStore.getState().resetToDefaults();
    useProfileStore.getState().updateProfile({ name: 'Unsaved Due to Quota' });

    activeMockStorage._setQuotaExceeded(true);
    try {
      const res = await useProfileStore.getState().saveChanges();
      assert.equal(res.success, false);
      const state = useProfileStore.getState();
      assert.equal(state.saveStatus, 'error');
      assert.equal(state.isDirty, true, 'isDirty must stay true');
      assert.equal(state.profile.name, 'Unsaved Due to Quota', 'Draft must be preserved');
      assert.equal(state.committedState.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Committed state must not change');
    } finally {
      activeMockStorage._setQuotaExceeded(false);
    }
  });

  harness.test('BINJ-C.3: Recovery after QuotaExceededError succeeds and clears dirty state', async () => {
    await useProfileStore.getState().resetToDefaults();
    useProfileStore.getState().updateProfile({ name: 'Recoverable Edit' });

    // Step 1: Quota error
    activeMockStorage._setQuotaExceeded(true);
    const failRes = await useProfileStore.getState().saveChanges();
    assert.equal(failRes.success, false);
    assert.equal(useProfileStore.getState().isDirty, true);

    // Step 2: Quota resolved
    activeMockStorage._setQuotaExceeded(false);
    const successRes = await useProfileStore.getState().saveChanges();
    assert.equal(successRes.success, true);
    assert.equal(useProfileStore.getState().isDirty, false);
    assert.equal(useProfileStore.getState().committedState.profile.name, 'Recoverable Edit');
  });

  harness.test('BINJ-C.4: Disabled LocalStorage (SecurityError) during fetchData falls back gracefully', async () => {
    activeMockStorage._setDisabled(true);
    try {
      const data = await dataProvider.fetchData();
      assert.ok(data);
      assert.equal(data.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    } finally {
      activeMockStorage._setDisabled(false);
    }
  });

  harness.test('BINJ-C.5: Disabled LocalStorage (SecurityError) during resetData does not crash', async () => {
    activeMockStorage._setDisabled(true);
    try {
      const reset = await dataProvider.resetData();
      assert.ok(reset);
      assert.equal(reset.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    } finally {
      activeMockStorage._setDisabled(false);
    }
  });

  // =========================================================================
  // GROUP D: Array Mutations with Null/Undefined/Pathological Inputs
  // =========================================================================

  harness.test('BINJ-D.1: Links mutators with null, undefined, primitive, and empty arguments', async () => {
    await useProfileStore.getState().resetToDefaults();

    // addLink
    assert.doesNotThrow(() => useProfileStore.getState().addLink(null));
    assert.doesNotThrow(() => useProfileStore.getState().addLink(undefined));
    assert.doesNotThrow(() => useProfileStore.getState().addLink('invalid'));
    assert.doesNotThrow(() => useProfileStore.getState().addLink(123));
    assert.doesNotThrow(() => useProfileStore.getState().addLink([]));

    // updateLink
    assert.doesNotThrow(() => useProfileStore.getState().updateLink(null, null));
    assert.doesNotThrow(() => useProfileStore.getState().updateLink(undefined, undefined));
    assert.doesNotThrow(() => useProfileStore.getState().updateLink('non-existent-id', null));
    assert.doesNotThrow(() => useProfileStore.getState().updateLink('non-existent-id', 'bad'));

    // removeLink
    assert.doesNotThrow(() => useProfileStore.getState().removeLink(null));
    assert.doesNotThrow(() => useProfileStore.getState().removeLink(undefined));
    assert.doesNotThrow(() => useProfileStore.getState().removeLink(12345));

    // toggleLinkActive
    assert.doesNotThrow(() => useProfileStore.getState().toggleLinkActive(null));
    assert.doesNotThrow(() => useProfileStore.getState().toggleLinkActive(undefined));

    // reorderLinks
    assert.doesNotThrow(() => useProfileStore.getState().reorderLinks(null));
    assert.doesNotThrow(() => useProfileStore.getState().reorderLinks(undefined));
    assert.doesNotThrow(() => useProfileStore.getState().reorderLinks([null, undefined, 42, 'str', {}]));
    assert.doesNotThrow(() => useProfileStore.getState().reorderLinks([]));

    const finalLinks = useProfileStore.getState().links;
    assert.ok(Array.isArray(finalLinks));
    for (const l of finalLinks) {
      assert.ok(l !== null && typeof l === 'object');
    }
  });

  harness.test('BINJ-D.2: Favorites mutators with null, undefined, primitive, and empty arguments', async () => {
    await useProfileStore.getState().resetToDefaults();

    // addFavorite
    assert.doesNotThrow(() => useProfileStore.getState().addFavorite(null));
    assert.doesNotThrow(() => useProfileStore.getState().addFavorite(undefined));
    assert.doesNotThrow(() => useProfileStore.getState().addFavorite('bad'));

    // updateFavorite
    assert.doesNotThrow(() => useProfileStore.getState().updateFavorite(null, null));
    assert.doesNotThrow(() => useProfileStore.getState().updateFavorite('no-id', null));

    // removeFavorite
    assert.doesNotThrow(() => useProfileStore.getState().removeFavorite(null));
    assert.doesNotThrow(() => useProfileStore.getState().removeFavorite(undefined));

    // reorderFavorites
    assert.doesNotThrow(() => useProfileStore.getState().reorderFavorites(null));
    assert.doesNotThrow(() => useProfileStore.getState().reorderFavorites([null, undefined]));

    const finalFavs = useProfileStore.getState().favorites;
    assert.ok(Array.isArray(finalFavs));
    for (const f of finalFavs) {
      assert.ok(f !== null && typeof f === 'object');
    }
  });

  harness.test('BINJ-D.3: Top-level section mutators with null/undefined arguments', async () => {
    await useProfileStore.getState().resetToDefaults();

    assert.doesNotThrow(() => useProfileStore.getState().updateProfile(null));
    assert.doesNotThrow(() => useProfileStore.getState().updateProfile(undefined));
    assert.doesNotThrow(() => useProfileStore.getState().updateProfile('string'));

    assert.doesNotThrow(() => useProfileStore.getState().updateMusic(null));
    assert.doesNotThrow(() => useProfileStore.getState().updateMusic(undefined));

    assert.doesNotThrow(() => useProfileStore.getState().updateSettings(null));
    assert.doesNotThrow(() => useProfileStore.getState().updateSettings(undefined));

    assert.doesNotThrow(() => useProfileStore.getState().setThemePreset(null));
    assert.doesNotThrow(() => useProfileStore.getState().setThemePreset(undefined));
  });

  // =========================================================================
  // GROUP E: Import Sanitization & Prototype Pollution Resistance
  // =========================================================================

  harness.test('BINJ-E.1: Prototype pollution resistance during importData', () => {
    const maliciousPayload = JSON.stringify({
      __proto__: { polluted: true },
      profile: {
        name: 'Attacker',
        __proto__: { injected: true },
      },
      links: [],
    });

    const parsed = JSON.parse(maliciousPayload);
    const sanitized = dataProvider.validateImportData(parsed);

    assert.equal(sanitized.profile.name, 'Attacker');
    assert.equal({}.polluted, undefined, 'Object prototype must not be polluted');
    assert.equal({}.injected, undefined, 'Object prototype must not be polluted');
  });

  harness.test('BINJ-E.2: importData rejects payloads with missing profile or non-array links', () => {
    const invalidImportCases = [
      {},
      { profile: null, links: [] },
      { profile: { name: 123 }, links: [] },
      { profile: { name: 'Valid' }, links: null },
      { profile: { name: 'Valid' }, links: 'string' },
      { profile: { name: 'Valid' }, links: [], favorites: 'invalid' },
    ];

    for (const bad of invalidImportCases) {
      assert.throws(() => {
        dataProvider.validateImportData(bad);
      });
      const storeRes = useProfileStore.getState().importData(bad);
      assert.equal(storeRes.success, false);
      assert.ok(storeRes.error);
    }
  });

  harness.test('BINJ-E.3: importData filters out null/undefined/primitive elements from links and favorites', () => {
    const input = {
      profile: { name: 'Sanitized Import User' },
      links: [null, undefined, 42, 'invalid', { id: 'l1', title: 'Link 1', url: 'https://', icon: 'Globe', category: 'social' }],
      favorites: [null, 999, { id: 'f1', category: 'tech', title: 'Fav 1' }],
    };

    const validated = dataProvider.validateImportData(input);
    assert.equal(validated.links.length, 1);
    assert.equal(validated.links[0].title, 'Link 1');
    assert.equal(validated.links[0].order, 0);

    assert.equal(validated.favorites.length, 1);
    assert.equal(validated.favorites[0].title, 'Fav 1');
    assert.equal(validated.favorites[0].order, 0);
  });

  harness.test('BINJ-E.4: State reference isolation: mutating draft after save does not affect committedState', async () => {
    await useProfileStore.getState().resetToDefaults();

    useProfileStore.getState().updateProfile({ name: 'Initial Committed' });
    await useProfileStore.getState().saveChanges();

    // Directly mutate a nested object property on the draft
    useProfileStore.getState().profile.name = 'Direct Draft Mutation';
    useProfileStore.getState().links[0].title = 'Direct Link Mutation';

    // committedState must retain original values
    const committed = useProfileStore.getState().committedState;
    assert.equal(committed.profile.name, 'Initial Committed');
    assert.notEqual(committed.links[0].title, 'Direct Link Mutation');
  });

  // =========================================================================
  // GROUP F: Extreme Pathological Edge Cases
  // =========================================================================

  harness.test('BINJ-F.1: Circular reference passed to dataProvider.saveData returns failure without crash', async () => {
    const circularObj = { profile: { name: 'Circular Test' } };
    circularObj.profile.self = circularObj;

    const res = await dataProvider.saveData(circularObj);
    assert.equal(res.success, false, 'Circular data must not report success');
    assert.ok(res.error, 'Must provide an error explanation');
  });

  harness.test('BINJ-F.2: Circular reference during useProfileStore.saveChanges reports error cleanly', async () => {
    await useProfileStore.getState().resetToDefaults();
    const state = useProfileStore.getState();
    state.profile.self = state.profile; // introduce circularity

    try {
      const res = await useProfileStore.getState().saveChanges();
      assert.equal(res.success, false);
      assert.equal(useProfileStore.getState().saveStatus, 'error');
    } finally {
      delete state.profile.self;
    }
  });

  harness.test('BINJ-F.3: High-concurrency burst (50 parallel async saves) with continuous mutations', async () => {
    await useProfileStore.getState().resetToDefaults();

    const savePromises = [];
    for (let i = 0; i < 50; i++) {
      useProfileStore.getState().updateProfile({ name: `Burst Name ${i}` });
      savePromises.push(useProfileStore.getState().saveChanges());
    }

    const results = await Promise.all(savePromises);
    for (const r of results) {
      assert.equal(r.success, true);
    }

    const finalState = useProfileStore.getState();
    assert.equal(finalState.profile.name, 'Burst Name 499'.replace('499', '49'));
    assert.equal(finalState.isDirty, false, 'After all concurrent saves finish, store should be clean');
  });

  harness.test('BINJ-F.4: Cache holding "null", "NaN", "Infinity", "[object Object]" strings falls back safely', async () => {
    const weirdStrings = ['null', 'NaN', 'Infinity', '[object Object]'];

    for (const str of weirdStrings) {
      activeMockStorage.clear();
      activeMockStorage.setItem(LOCAL_STORAGE_KEY, str);

      const res = await dataProvider.fetchData();
      assert.ok(res, `fetchData must succeed for weird string "${str}"`);
      assert.equal(res.profile.name, DEFAULT_PROFILE_DATA.profile.name);
    }
  });

  harness.test('BINJ-F.5: Reordering links with empty or malformed array preserves stability', async () => {
    await useProfileStore.getState().resetToDefaults();

    // Reorder with mixed objects without id or missing fields
    useProfileStore.getState().reorderLinks([
      { title: 'No ID Link' },
      null,
      { id: 'custom-id', title: 'Custom' },
    ]);

    const links = useProfileStore.getState().links;
    assert.equal(links.length, 2);
    assert.equal(links[0].order, 0);
    assert.equal(links[1].order, 1);
    assert.equal(links[1].id, 'custom-id');
  });

  return harness;
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('adversarial-m1-deep-injections.test.js')) {
  const suite = createDeepInjectionsSuite();
  const result = await suite.run();
  if (result.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
