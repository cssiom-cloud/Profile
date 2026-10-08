/**
 * tests/adversarial-m1-stress.test.js
 * Empirical Adversarial Challenger Test Suite for Milestone 1
 * Targets: src/lib/dataProvider.js, src/store/useProfileStore.js, src/data/defaultData.js
 *
 * Attack Vectors:
 * 1. Corrupted cache payloads & malformed JSON in LocalStorage
 * 2. Missing keys & incomplete cache objects (schema drift)
 * 3. Silent data loss during LocalStorage failure (QuotaExceededError)
 * 4. Dirty tracking consistency during rapid mutations & reversion
 * 5. Concurrent mutation race conditions during asynchronous saveChanges
 * 6. Extreme object boundaries (payload sizes, null link elements, special chars)
 * 7. Reset and Revert action guarantees
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

export function createAdversarialM1Suite() {
  const harness = new TestHarness('M1 Empirical Adversarial Stress Suite');

  // =========================================================================
  // VECTOR 1: Corrupted Cache Payloads & Malformed JSON
  // =========================================================================

  harness.test('ADV-1.1: Corrupted non-object JSON roots in LocalStorage (null, number, array, boolean)', async () => {
    const corruptPrimitives = ['null', '12345', 'true', '"a bare string"', '[1, 2, 3]'];

    for (const corrupt of corruptPrimitives) {
      activeMockStorage.clear();
      activeMockStorage.setItem(LOCAL_STORAGE_KEY, corrupt);

      const result = await dataProvider.fetchData();
      assert.ok(result, `fetchData must not return null/undefined for input ${corrupt}`);
      assert.equal(result.profile.name, DEFAULT_PROFILE_DATA.profile.name, `Input ${corrupt} must fall back to default seed`);
      assert.ok(Array.isArray(result.links), `Links must be an array for ${corrupt}`);
      assert.ok(result.settings, `Settings must exist for ${corrupt}`);
    }
  });

  harness.test('ADV-1.2: Cache payload with string profile instead of object ({ profile: "Alex", links: [] })', async () => {
    activeMockStorage.clear();
    // Incomplete payload where profile is a string
    activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ profile: 'Alex Rivera', links: [] }));

    const result = await dataProvider.fetchData();
    // If dataProvider accepted profile as string, profile is not a proper object
    assert.equal(typeof result.profile, 'object', 'Profile must be an object');
    assert.notEqual(result.profile, null, 'Profile must not be null');
    assert.ok(result.profile.name, 'Profile must have a valid name');
  });

  harness.test('ADV-1.3: Partial cache missing favorites, music, and settings ({ profile, links } only)', async () => {
    activeMockStorage.clear();
    // Cache has valid profile and links, but favorites, music, settings are completely absent
    const partialPayload = {
      profile: { name: 'Partial Alex', handle: '@partial' },
      links: [],
    };
    activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(partialPayload));

    // Test dataProvider.fetchData()
    const loaded = await dataProvider.fetchData();

    // Verify whether required top-level sections exist
    assert.ok(loaded.favorites !== undefined, 'loaded.favorites must not be undefined');
    assert.ok(Array.isArray(loaded.favorites), 'loaded.favorites must be an array');
    assert.ok(loaded.music !== undefined, 'loaded.music must not be undefined');
    assert.ok(loaded.settings !== undefined, 'loaded.settings must not be undefined');
    assert.ok(loaded.settings.themePreset !== undefined, 'loaded.settings.themePreset must not be undefined');

    // Test store hydration with this partial cache
    await useProfileStore.getState().loadInitialData();
    const storeState = useProfileStore.getState();
    assert.equal(storeState.profile.name, 'Partial Alex');
    assert.ok(Array.isArray(storeState.favorites), 'Store favorites must be an array');
    assert.ok(storeState.settings?.themePreset, 'Store settings themePreset must exist');
  });

  harness.test('ADV-1.4: Cache with null link/favorite elements ([null]) and store CRUD resilience', async () => {
    activeMockStorage.clear();
    const payloadWithNulls = {
      profile: { name: 'Null Elements Test', handle: '@nulltest' },
      links: [null],
      favorites: [null],
      music: DEFAULT_PROFILE_DATA.music,
      settings: DEFAULT_PROFILE_DATA.settings,
    };
    activeMockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payloadWithNulls));

    // Hydrate store
    await useProfileStore.getState().loadInitialData();

    // Now test store CRUD mutators on null items - these should NOT crash with TypeError
    assert.doesNotThrow(() => {
      useProfileStore.getState().removeLink('some-id');
    }, 'removeLink must not crash when links contain null elements');

    assert.doesNotThrow(() => {
      useProfileStore.getState().updateLink('some-id', { title: 'Safe' });
    }, 'updateLink must not crash when links contain null elements');

    assert.doesNotThrow(() => {
      useProfileStore.getState().toggleLinkActive('some-id');
    }, 'toggleLinkActive must not crash when links contain null elements');

    assert.doesNotThrow(() => {
      useProfileStore.getState().removeFavorite('some-id');
    }, 'removeFavorite must not crash when favorites contain null elements');

    assert.doesNotThrow(() => {
      useProfileStore.getState().updateFavorite('some-id', { title: 'Safe' });
    }, 'updateFavorite must not crash when favorites contain null elements');
  });

  // =========================================================================
  // VECTOR 2: Silent Data Loss during LocalStorage Failure
  // =========================================================================

  harness.test('ADV-2.1: LocalStorage QuotaExceededError must NOT be reported as success: true', async () => {
    // Reset store to known state
    await useProfileStore.getState().resetToDefaults();
    useProfileStore.getState().updateProfile({ name: 'Quota Overflow Edit' });

    // Enable QuotaExceededError in mock storage
    activeMockStorage._setQuotaExceeded(true);

    try {
      const state = useProfileStore.getState();
      const payload = {
        profile: state.profile,
        links: state.links,
        favorites: state.favorites,
        music: state.music,
        settings: state.settings,
      };

      const result = await dataProvider.saveData(payload);

      // If localStorage threw QuotaExceededError, result.success MUST NOT be true!
      // Reporting success: true when storage failed is a silent data loss bug!
      assert.equal(
        result.success,
        false,
        'dataProvider.saveData must report success: false when localStorage throws QuotaExceededError'
      );
    } finally {
      activeMockStorage._setQuotaExceeded(false);
    }
  });

  harness.test('ADV-2.2: store.saveChanges() must reflect save failure when storage fails', async () => {
    await useProfileStore.getState().resetToDefaults();
    useProfileStore.getState().updateProfile({ name: 'Unsaved Edit Due to Storage Quota' });
    assert.equal(useProfileStore.getState().isDirty, true, 'Store must be dirty before save');

    // Simulate quota exceeded
    activeMockStorage._setQuotaExceeded(true);

    try {
      const saveResult = await useProfileStore.getState().saveChanges();
      const afterState = useProfileStore.getState();

      // If storage threw an error, saveChanges must report success: false
      // and must NOT clear isDirty to false (otherwise user thinks changes are saved)
      assert.equal(saveResult.success, false, 'saveChanges must report success: false on storage failure');
      assert.equal(afterState.saveStatus, 'error', 'saveStatus must be "error"');
      assert.equal(afterState.isDirty, true, 'isDirty must remain true when save failed');
    } finally {
      activeMockStorage._setQuotaExceeded(false);
    }
  });

  // =========================================================================
  // VECTOR 3: Dirty Tracking Consistency & Rapid Mutations
  // =========================================================================

  harness.test('ADV-3.1: Sequential rapid mutations (500 iterations) maintains state and dirty consistency', async () => {
    await useProfileStore.getState().resetToDefaults();
    const initialName = useProfileStore.getState().profile.name;

    for (let i = 0; i < 500; i++) {
      useProfileStore.getState().updateProfile({ name: `Rapid Name ${i}` });
    }

    const currentState = useProfileStore.getState();
    assert.equal(currentState.profile.name, 'Rapid Name 499', 'Final draft must reflect last mutation');
    assert.equal(currentState.isDirty, true, 'isDirty must be true after modifications');

    // Mutate back to initial committed value
    useProfileStore.getState().updateProfile({ name: initialName });
    const revertedState = useProfileStore.getState();
    assert.equal(revertedState.profile.name, initialName, 'Profile name must match original');
    assert.equal(revertedState.isDirty, false, 'isDirty must dynamically return to false when restored to initial value');
  });

  harness.test('ADV-3.2: Link reordering and self-canceling CRUD dirty tracking', async () => {
    await useProfileStore.getState().resetToDefaults();
    const initialLinks = JSON.parse(JSON.stringify(useProfileStore.getState().links));
    assert.equal(useProfileStore.getState().isDirty, false);

    // 1. Add link -> dirty
    useProfileStore.getState().addLink({ title: 'Temporary Link' });
    assert.equal(useProfileStore.getState().isDirty, true, 'Adding a link must make store dirty');
    const addedLink = useProfileStore.getState().links.find((l) => l.title === 'Temporary Link');

    // 2. Remove that exact link -> should return to clean
    useProfileStore.getState().removeLink(addedLink.id);
    const afterRemoval = useProfileStore.getState();
    assert.equal(afterRemoval.links.length, initialLinks.length);
    assert.equal(afterRemoval.isDirty, false, 'Removing newly added link should restore clean state');

    // 3. Reorder links -> dirty
    const reversed = [...afterRemoval.links].reverse();
    useProfileStore.getState().reorderLinks(reversed);
    assert.equal(useProfileStore.getState().isDirty, true, 'Reordering links must mark store dirty');

    // 4. Reorder back to original -> clean
    useProfileStore.getState().reorderLinks(initialLinks);
    assert.equal(useProfileStore.getState().isDirty, false, 'Reordering back to original order must restore clean state');
  });

  // =========================================================================
  // VECTOR 4: Race Conditions during Asynchronous saveChanges
  // =========================================================================

  harness.test('ADV-4.1: Concurrent mutation during async saveChanges must NOT clobber dirty state', async () => {
    await useProfileStore.getState().resetToDefaults();

    // Edit 1
    useProfileStore.getState().updateProfile({ name: 'Edit 1 (In Flight)' });
    assert.equal(useProfileStore.getState().isDirty, true);

    // Mock dataProvider.saveData with artificial delay to simulate async network/IO
    const originalSave = dataProvider.saveData;
    let saveResolve;
    const savePromise = new Promise((resolve) => {
      saveResolve = resolve;
    });

    dataProvider.saveData = async (data) => {
      await savePromise;
      return originalSave.call(dataProvider, data);
    };

    try {
      // Launch saveChanges (in-flight)
      const saveOp = useProfileStore.getState().saveChanges();

      // While save is in flight, user makes Edit 2
      useProfileStore.getState().updateProfile({ name: 'Edit 2 (Subsequent Unsaved Mutation)' });

      // Current draft has 'Edit 2'
      assert.equal(useProfileStore.getState().profile.name, 'Edit 2 (Subsequent Unsaved Mutation)');

      // Resolve the initial save
      saveResolve();
      const saveResult = await saveOp;
      assert.equal(saveResult.success, true);

      // Inspect store state after save completes:
      // The draft has 'Edit 2', while the saved snapshot was 'Edit 1'.
      // Therefore, the draft DOES NOT match the committed state!
      // isDirty MUST BE TRUE!
      const finalState = useProfileStore.getState();
      assert.equal(
        finalState.isDirty,
        true,
        'CRITICAL: isDirty must NOT be clobbered to false if another mutation occurred while saveChanges was in flight'
      );
    } finally {
      dataProvider.saveData = originalSave;
    }
  });

  // =========================================================================
  // VECTOR 5: Extreme Object Boundaries & Schema Edge Cases
  // =========================================================================

  harness.test('ADV-5.1: High volume data boundaries (200 links and 200 favorites)', async () => {
    await useProfileStore.getState().resetToDefaults();

    const manyLinks = Array.from({ length: 200 }, (_, i) => ({
      id: `stress-link-${i}`,
      title: `Stress Link ${i}`,
      url: `https://example.com/link-${i}`,
      icon: 'Globe',
      category: 'social',
      order: i,
      isActive: true,
    }));

    const manyFavs = Array.from({ length: 200 }, (_, i) => ({
      id: `stress-fav-${i}`,
      category: 'tech',
      title: `Stress Favorite ${i}`,
      order: i,
    }));

    // Test importData with large volume
    const importRes = useProfileStore.getState().importData({
      profile: { name: 'High Volume User' },
      links: manyLinks,
      favorites: manyFavs,
    });

    assert.equal(importRes.success, true, 'importData must accept large volume arrays');
    const state = useProfileStore.getState();
    assert.equal(state.links.length, 200);
    assert.equal(state.favorites.length, 200);

    // Save and verify serialization
    const saveRes = await useProfileStore.getState().saveChanges();
    assert.equal(saveRes.success, true);
    const cached = JSON.parse(activeMockStorage.getItem(LOCAL_STORAGE_KEY));
    assert.equal(cached.links.length, 200);
    assert.equal(cached.favorites.length, 200);
  });

  harness.test('ADV-5.2: Special characters, XSS vectors, and Unicode boundaries', async () => {
    await useProfileStore.getState().resetToDefaults();

    const specialStrings = {
      name: '<script>alert("XSS")</script>',
      bio: 'Multi-line \n\r\t with emojis 🚀🔥✨ and unicode ñ, ü, 中文, 👾',
      quote: '"Double quotes", \'single quotes\', `backticks`, and \\backslashes\\',
    };

    useProfileStore.getState().updateProfile(specialStrings);
    const afterUpdate = useProfileStore.getState();
    assert.equal(afterUpdate.profile.name, specialStrings.name);
    assert.equal(afterUpdate.profile.bio, specialStrings.bio);
    assert.equal(afterUpdate.profile.quote, specialStrings.quote);

    // Save, export, and re-import
    await useProfileStore.getState().saveChanges();
    const exported = useProfileStore.getState().exportData();
    const parsedExport = JSON.parse(exported);
    assert.equal(parsedExport.profile.name, specialStrings.name);
    assert.equal(parsedExport.profile.bio, specialStrings.bio);
    assert.equal(parsedExport.profile.quote, specialStrings.quote);

    const reimported = useProfileStore.getState().importData(exported);
    assert.equal(reimported.success, true);
    assert.equal(useProfileStore.getState().profile.name, specialStrings.name);
  });

  harness.test('ADV-5.3: validateImportData rejection of malformed or invalid schemas', () => {
    const invalidInputs = [
      null,
      undefined,
      'not-json',
      12345,
      {},
      { profile: null },
      { profile: { name: 123 } }, // name not string
      { profile: { name: 'Bob' }, links: 'not-array' }, // links not array
    ];

    for (const input of invalidInputs) {
      assert.throws(() => {
        dataProvider.validateImportData(input);
      }, 'validateImportData must throw for invalid root schemas');
    }
  });

  harness.test('ADV-5.4: validateImportData sanitization of null items in links array', () => {
    // What if imported links array has null or non-object elements?
    const inputWithNulls = {
      profile: { name: 'Sanitization Test' },
      links: [null, { id: 'valid-1', title: 'Valid', url: 'https://', icon: 'Globe', category: 'social', order: 0, isActive: true }],
    };

    const sanitized = dataProvider.validateImportData(inputWithNulls);
    // Each link in sanitized.links must be a valid non-null object
    sanitized.links.forEach((l, idx) => {
      assert.notEqual(l, null, `Link at index ${idx} must not be null`);
      assert.equal(typeof l, 'object', `Link at index ${idx} must be an object`);
    });
  });

  // =========================================================================
  // VECTOR 6: Revert & Reset Actions
  // =========================================================================

  harness.test('ADV-6.1: revertChanges cleanly restores all 5 sections and breaks object references', async () => {
    await useProfileStore.getState().resetToDefaults();

    // Mutate all 5 sections
    useProfileStore.getState().updateProfile({ name: 'Mutated Profile' });
    useProfileStore.getState().updateMusic({ title: 'Mutated Music' });
    useProfileStore.getState().updateSettings({ themePreset: 'retro-vaporwave' });
    useProfileStore.getState().addLink({ title: 'Mutated Link' });
    useProfileStore.getState().addFavorite({ title: 'Mutated Favorite' });

    assert.equal(useProfileStore.getState().isDirty, true);

    // Call revertChanges
    useProfileStore.getState().revertChanges();
    const reverted = useProfileStore.getState();

    assert.equal(reverted.isDirty, false, 'isDirty must be false after revertChanges');
    assert.equal(reverted.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Profile name must be restored');
    assert.equal(reverted.music.title, DEFAULT_PROFILE_DATA.music.title, 'Music title must be restored');
    assert.equal(reverted.settings.themePreset, DEFAULT_PROFILE_DATA.settings.themePreset, 'Theme must be restored');
    assert.equal(reverted.links.length, DEFAULT_PROFILE_DATA.links.length, 'Links count must be restored');
    assert.equal(reverted.favorites.length, DEFAULT_PROFILE_DATA.favorites.length, 'Favorites count must be restored');

    // Mutating draft after revert must NOT mutate committedState
    reverted.profile.name = 'Post Revert Mutation';
    assert.equal(
      useProfileStore.getState().committedState.profile.name,
      DEFAULT_PROFILE_DATA.profile.name,
      'committedState must be protected from reference mutations'
    );
  });

  harness.test('ADV-6.2: resetToDefaults resets storage, draft, committed state, and dirty flag', async () => {
    useProfileStore.getState().updateProfile({ name: 'Pre-Reset Mutation' });
    await useProfileStore.getState().saveChanges();
    assert.equal(useProfileStore.getState().isDirty, false);

    // Now modify again so it is dirty
    useProfileStore.getState().updateProfile({ name: 'Dirty Pre-Reset' });
    assert.equal(useProfileStore.getState().isDirty, true);

    // Call resetToDefaults
    await useProfileStore.getState().resetToDefaults();
    const resetState = useProfileStore.getState();

    assert.equal(resetState.isDirty, false, 'isDirty must be false after resetToDefaults');
    assert.equal(resetState.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Profile name must be default');
    assert.equal(resetState.committedState.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Committed state must be default');

    // Check localStorage
    const stored = JSON.parse(activeMockStorage.getItem(LOCAL_STORAGE_KEY));
    assert.equal(stored.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'LocalStorage must hold default seed');
  });

  return harness;
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('adversarial-m1-stress.test.js')) {
  const suite = createAdversarialM1Suite();
  const result = await suite.run();
  if (result.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
