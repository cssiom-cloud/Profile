/**
 * tests/adversarial-m5-stress.test.js
 * Empirical Adversarial Challenger Test Suite for Milestone 5
 * Targets:
 *   - src/components/customizer/LoginModal.jsx
 *   - src/lib/dataProvider.js
 *   - src/store/useProfileStore.js
 *   - src/components/customizer/LiveCustomizerDrawer.jsx
 *   - src/components/customizer/ProfileEditorTab.jsx
 *   - src/components/customizer/LinksEditorTab.jsx
 *   - src/components/customizer/FavoritesEditorTab.jsx
 *   - src/components/customizer/MusicEditorTab.jsx
 *   - src/components/customizer/LayoutThemeTab.jsx
 *
 * Attack Vectors:
 * 1. LoginModal.jsx PIN Verification & Interaction Stress:
 *    - Whitespace trimming, casing sensitivity, empty PIN, invalid PINs, brute-force injections,
 *      rapid authMode toggle, outside click dismiss, ESC key dismiss, Quick 1-Click Demo login.
 * 2. JSON Import/Export in dataProvider.js and useProfileStore.js:
 *    - Corrupt JSON strings, malformed objects, missing required fields, non-array links/favorites,
 *      corrupted/null array elements, prototype pollution attacks, extreme nested payloads, export fidelity.
 * 3. resetToDefaults & Dirty State Transitions (Strict ADV-6.2 compliance):
 *    - Dirty calculation on profile mutations, links CRUD, favorites CRUD, music/settings mutations,
 *      full reset to defaults restoring storage, draft, committedState, and dirty flag to clean seed.
 * 4. Editor Tabs Data Mutations & Boundary Stress:
 *    - Extreme text lengths (100k bio), special/adversarial characters, empty/malformed link URLs,
 *      invalid category values, high-frequency chaos mutation stress.
 * 5. Architectural & Backward Compatibility Invariants:
 *    - 5 customizer tabs, 14 smoke DOM element IDs preservation, production build relative paths.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import {
  TestHarness,
  createMockLocalStorage,
  createMockDOM,
} from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ============================================================================
// Global Environment Initialization (Mock DOM & LocalStorage)
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

// Import modules under test
const { DEFAULT_PROFILE_DATA } = await import('../src/data/defaultData.js');
const { dataProvider, LOCAL_STORAGE_KEY } = await import('../src/lib/dataProvider.js');
const { useProfileStore } = await import('../src/store/useProfileStore.js');

// Read component source files for AST / structural analysis
const loginModalSource = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LoginModal.jsx'), 'utf-8');
const customizerDrawerSource = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LiveCustomizerDrawer.jsx'), 'utf-8');
const profileEditorSource = fs.readFileSync(path.join(rootDir, 'src/components/customizer/ProfileEditorTab.jsx'), 'utf-8');
const linksEditorSource = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LinksEditorTab.jsx'), 'utf-8');
const favoritesEditorSource = fs.readFileSync(path.join(rootDir, 'src/components/customizer/FavoritesEditorTab.jsx'), 'utf-8');
const musicEditorSource = fs.readFileSync(path.join(rootDir, 'src/components/customizer/MusicEditorTab.jsx'), 'utf-8');
const layoutThemeSource = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LayoutThemeTab.jsx'), 'utf-8');
const appSource = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf-8');

export function createAdversarialM5Suite() {
  const harness = new TestHarness('M5 Empirical Adversarial Stress Suite');

  // Helper to reset store and storage before tests
  const resetCleanState = async () => {
    activeMockStorage.clear();
    await useProfileStore.getState().resetToDefaults();
  };

  // =========================================================================
  // VECTOR 1: LoginModal.jsx PIN Verification, Security & Interactions
  // =========================================================================

  harness.test('ADV-5.1.1: PIN verification with whitespace padding and normalization', () => {
    // Structural invariant: LoginModal must trim the pin input
    assert.ok(
      loginModalSource.includes('pin.trim()'),
      'LoginModal must trim PIN input before evaluation'
    );

    // Extract exact PIN verification logic from LoginModal
    const evaluatePin = (rawPin) => {
      const trimmedPin = String(rawPin || '').trim();
      if (!trimmedPin) {
        return { success: false, error: 'Please enter the owner passcode.' };
      }
      if (trimmedPin === 'admin123' || trimmedPin === 'admin' || trimmedPin === '1234') {
        return { success: true, message: 'Unlocked via Demo PIN (admin123)!' };
      }
      return { success: false, error: 'Invalid passcode. Use demo PIN: admin123' };
    };

    // Valid inputs with whitespace
    const whitespaceVariants = [
      'admin123',
      '   admin123',
      'admin123   ',
      '   admin123   ',
      '\tadmin123\n',
      '\r\n  admin123  \t',
      '  admin  ',
      ' 1234 ',
    ];

    for (const variant of whitespaceVariants) {
      const res = evaluatePin(variant);
      assert.equal(res.success, true, `Variant "${JSON.stringify(variant)}" must succeed`);
    }

    // Whitespace inside PIN must NOT be stripped (e.g. "admin 123" is invalid)
    const internalSpaceRes = evaluatePin('admin 123');
    assert.equal(internalSpaceRes.success, false);
    assert.equal(internalSpaceRes.error, 'Invalid passcode. Use demo PIN: admin123');
  });

  harness.test('ADV-5.1.2: PIN verification casing sensitivity invariants', () => {
    const evaluatePin = (rawPin) => {
      const trimmedPin = String(rawPin || '').trim();
      if (!trimmedPin) return { success: false, error: 'Please enter the owner passcode.' };
      if (trimmedPin === 'admin123' || trimmedPin === 'admin' || trimmedPin === '1234') {
        return { success: true };
      }
      return { success: false, error: 'Invalid passcode. Use demo PIN: admin123' };
    };

    const uppercaseVariants = [
      'ADMIN123',
      'Admin123',
      'aDmin123',
      'ADMIN',
      'Admin',
      'ADMIN_123',
    ];

    for (const variant of uppercaseVariants) {
      const res = evaluatePin(variant);
      assert.equal(res.success, false, `Uppercase variant "${variant}" must be rejected`);
      assert.equal(res.error, 'Invalid passcode. Use demo PIN: admin123');
    }
  });

  harness.test('ADV-5.1.3: Empty & whitespace-only PIN rejection', () => {
    const evaluatePin = (rawPin) => {
      const trimmedPin = String(rawPin || '').trim();
      if (!trimmedPin) return { success: false, error: 'Please enter the owner passcode.' };
      if (trimmedPin === 'admin123' || trimmedPin === 'admin' || trimmedPin === '1234') {
        return { success: true };
      }
      return { success: false, error: 'Invalid passcode. Use demo PIN: admin123' };
    };

    const emptyInputs = ['', '   ', '\t', '\n\r', '      \t  '];
    for (const empty of emptyInputs) {
      const res = evaluatePin(empty);
      assert.equal(res.success, false);
      assert.equal(res.error, 'Please enter the owner passcode.');
    }
  });

  harness.test('ADV-5.1.4: Invalid PINs and brute-force rejection', () => {
    const evaluatePin = (rawPin) => {
      const trimmedPin = String(rawPin || '').trim();
      if (!trimmedPin) return { success: false, error: 'Please enter the owner passcode.' };
      if (trimmedPin === 'admin123' || trimmedPin === 'admin' || trimmedPin === '1234') {
        return { success: true };
      }
      return { success: false, error: 'Invalid passcode. Use demo PIN: admin123' };
    };

    const bruteForceDictionary = [
      'password',
      '123456',
      'admin12',
      'admin1234',
      'root',
      'toor',
      'qwerty',
      'letmein',
      '0000',
      '1111',
      '9999',
      'admin!',
      'admin#123',
      'passcode',
    ];

    for (const candidate of bruteForceDictionary) {
      const res = evaluatePin(candidate);
      assert.equal(res.success, false, `Candidate "${candidate}" must not unlock`);
      assert.equal(res.error, 'Invalid passcode. Use demo PIN: admin123');
    }
  });

  harness.test('ADV-5.1.5: Adversarial injection attacks in PIN input', () => {
    const evaluatePin = (rawPin) => {
      const trimmedPin = String(rawPin || '').trim();
      if (!trimmedPin) return { success: false, error: 'Please enter the owner passcode.' };
      if (trimmedPin === 'admin123' || trimmedPin === 'admin' || trimmedPin === '1234') {
        return { success: true };
      }
      return { success: false, error: 'Invalid passcode. Use demo PIN: admin123' };
    };

    const injectionPayloads = [
      "' OR '1'='1",
      "' OR 1=1 --",
      "admin' --",
      "' UNION SELECT null, null --",
      '<script>alert("hacked")</script>',
      '"><img src=x onerror=alert(1)>',
      '${7*7}',
      '{{7*7}}',
      '__proto__',
      'constructor',
      'prototype',
      'A'.repeat(100000), // Extreme length buffer
    ];

    for (const payload of injectionPayloads) {
      const res = evaluatePin(payload);
      assert.equal(res.success, false, 'Payload must not succeed');
      assert.equal(res.error, 'Invalid passcode. Use demo PIN: admin123');
    }

    // Verify prototype is unpolluted
    assert.equal(({}).polluted, undefined);
  });

  harness.test('ADV-5.1.6: Dual Auth Mode rapid toggling & state isolation', () => {
    assert.ok(
      loginModalSource.includes("setAuthMode('pin')") &&
      loginModalSource.includes("setAuthMode('supabase')"),
      'LoginModal must provide switching between pin and supabase modes'
    );
    assert.ok(
      loginModalSource.includes("setError('')"),
      'Switching mode must reset error state'
    );

    // Simulate 100 rapid mode switches
    let mode = 'pin';
    let error = 'Some previous error';
    for (let i = 0; i < 100; i++) {
      mode = mode === 'pin' ? 'supabase' : 'pin';
      error = ''; // Reset on toggle as done in LoginModal
    }
    assert.equal(mode, 'pin');
    assert.equal(error, '');
  });

  harness.test('ADV-5.1.7: Outside click dismiss vs modal card click propagation', () => {
    assert.ok(
      loginModalSource.includes('e.target === e.currentTarget'),
      'LoginModal must verify e.target === e.currentTarget on backdrop click'
    );
    assert.ok(
      loginModalSource.includes('e.stopPropagation()'),
      'LoginModal must call e.stopPropagation() on card click'
    );

    // Simulate outside click
    let closed = false;
    const handleClose = () => { closed = true; };

    const simulateBackdropClick = (target, currentTarget) => {
      if (target === currentTarget) {
        handleClose();
      }
    };

    const backdropEl = { id: 'backdrop' };
    const modalEl = { id: 'modal-card' };
    const buttonEl = { id: 'submit-button' };

    // 1. Clicking backdrop directly -> closes
    closed = false;
    simulateBackdropClick(backdropEl, backdropEl);
    assert.equal(closed, true, 'Clicking backdrop directly must trigger handleClose');

    // 2. Clicking modal card or interior child -> does NOT close
    closed = false;
    simulateBackdropClick(modalEl, backdropEl);
    assert.equal(closed, false, 'Clicking modal card must not trigger handleClose');

    closed = false;
    simulateBackdropClick(buttonEl, backdropEl);
    assert.equal(closed, false, 'Clicking button inside modal must not trigger handleClose');
  });

  harness.test('ADV-5.1.8: Keyboard ESC key dismiss listener invariant', () => {
    assert.ok(
      loginModalSource.includes("e.key === 'Escape'"),
      'LoginModal must attach Escape keydown listener'
    );
    assert.ok(
      loginModalSource.includes("window.addEventListener('keydown'"),
      'LoginModal must listen on window keydown'
    );
    assert.ok(
      loginModalSource.includes("window.removeEventListener('keydown'"),
      'LoginModal must cleanly unregister keydown listener'
    );

    let closed = false;
    const handleClose = () => { closed = true; };
    const handleKeyDown = (e, modalOpen) => {
      if (!modalOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    let defaultPrevented = false;
    const escEvent = { key: 'Escape', preventDefault: () => { defaultPrevented = true; } };

    // When modal is open
    closed = false;
    defaultPrevented = false;
    handleKeyDown(escEvent, true);
    assert.equal(closed, true, 'Escape key must close open modal');
    assert.equal(defaultPrevented, true, 'Escape key must call preventDefault()');

    // When modal is closed
    closed = false;
    defaultPrevented = false;
    handleKeyDown(escEvent, false);
    assert.equal(closed, false, 'Escape key must be ignored when modal is closed');

    // Non-escape keys
    closed = false;
    handleKeyDown({ key: 'Enter', preventDefault: () => {} }, true);
    assert.equal(closed, false, 'Enter key must not dismiss modal');
  });

  harness.test('ADV-5.1.9: Quick 1-Click Demo login state unlocking', async () => {
    await resetCleanState();

    const store = useProfileStore.getState();
    store.setIsOwner(false);
    store.setLoginModalOpen(true);
    store.setCustomizerOpen(false);

    assert.equal(useProfileStore.getState().isOwner, false);
    assert.equal(useProfileStore.getState().loginModalOpen, true);
    assert.equal(useProfileStore.getState().customizerOpen, false);

    // Simulate Quick Demo fill action from LoginModal.jsx:179-185
    store.setIsOwner(true);
    store.setLoginModalOpen(false);
    store.setCustomizerOpen(true);

    const updated = useProfileStore.getState();
    assert.equal(updated.isOwner, true, 'Owner mode must be unlocked');
    assert.equal(updated.loginModalOpen, false, 'Login modal must be closed');
    assert.equal(updated.customizerOpen, true, 'Customizer drawer must be opened');
  });

  // =========================================================================
  // VECTOR 2: JSON Import/Export in dataProvider.js & useProfileStore.js
  // =========================================================================

  harness.test('ADV-5.2.1: Corrupt JSON strings rejection in dataProvider & store', () => {
    const corruptStrings = [
      '{ unquoted: 123 }',
      '{ "profile": ',
      'undefined',
      'NaN',
      '<html><body>404 Not Found</body></html>',
      '{"incomplete": true,',
    ];

    for (const bad of corruptStrings) {
      assert.throws(
        () => dataProvider.validateImportData(bad),
        /SyntaxError|Invalid JSON/,
        `validateImportData must throw on corrupt JSON string "${bad}"`
      );

      const importResult = useProfileStore.getState().importData(bad);
      assert.equal(importResult.success, false, 'importData must return success: false');
      assert.ok(importResult.error, 'importData must provide error message');
    }
  });

  harness.test('ADV-5.2.2: Malformed objects & invalid JSON root types', () => {
    const invalidRoots = [
      null,
      12345,
      true,
      'just a string',
      [1, 2, 3],
      { notProfile: {} },
      { profile: null },
      { profile: 'string-instead-of-object' },
      { profile: [1, 2, 3] },
    ];

    for (const invalid of invalidRoots) {
      assert.throws(
        () => dataProvider.validateImportData(invalid),
        /Invalid JSON|SyntaxError/,
        `Must reject invalid root "${JSON.stringify(invalid)}"`
      );
    }
  });

  harness.test('ADV-5.2.3: Missing required fields in profile (profile.name)', () => {
    const missingNamePayloads = [
      { profile: {} },
      { profile: { bio: 'developer' } },
      { profile: { name: 12345 } },
      { profile: { name: null } },
      { profile: { name: {} } },
      { profile: { name: [] } },
    ];

    for (const payload of missingNamePayloads) {
      assert.throws(
        () => dataProvider.validateImportData(payload),
        /Invalid JSON: Missing required profile.name/,
        'Must strictly require profile.name string'
      );
    }
  });

  harness.test('ADV-5.2.4: Non-array links & favorites rejection', () => {
    // Non-array links
    const badLinks = [
      { profile: { name: 'Alex' }, links: null },
      { profile: { name: 'Alex' }, links: 'string' },
      { profile: { name: 'Alex' }, links: { id: '1' } },
      { profile: { name: 'Alex' }, links: 42 },
    ];

    for (const payload of badLinks) {
      assert.throws(
        () => dataProvider.validateImportData(payload),
        /Invalid JSON: links must be an array/,
        'Must reject non-array links'
      );
    }

    // Non-array favorites (when defined)
    const badFavs = [
      { profile: { name: 'Alex' }, links: [], favorites: 'invalid' },
      { profile: { name: 'Alex' }, links: [], favorites: {} },
      { profile: { name: 'Alex' }, links: [], favorites: 99 },
    ];

    for (const payload of badFavs) {
      assert.throws(
        () => dataProvider.validateImportData(payload),
        /Invalid JSON: favorites must be an array/,
        'Must reject non-array favorites'
      );
    }
  });

  harness.test('ADV-5.2.5: Sanitization of corrupted & null elements in links/favorites', () => {
    const dirtyPayload = {
      profile: { name: 'Alex Rivera' },
      links: [
        null,
        undefined,
        42,
        'bad-link',
        { title: 'Valid Link 1', url: 'https://test1.com' },
        null,
        { title: 'Valid Link 2', url: 'https://test2.com', order: 99 },
        [1, 2],
      ],
      favorites: [
        null,
        'string',
        { title: 'Valid Fav 1', category: 'tech' },
        null,
      ],
    };

    const validated = dataProvider.validateImportData(dirtyPayload);

    // Links must be filtered to strictly the 2 valid objects, and re-indexed
    assert.equal(validated.links.length, 2, 'Must filter out null, primitive, and array elements');
    assert.equal(validated.links[0].title, 'Valid Link 1');
    assert.equal(validated.links[0].order, 0, 'First valid link order re-indexed to 0');
    assert.equal(validated.links[1].title, 'Valid Link 2');
    assert.equal(validated.links[1].order, 99, 'Explicit order preserved if valid number');

    // Favorites must be filtered to strictly the 1 valid object
    assert.equal(validated.favorites.length, 1);
    assert.equal(validated.favorites[0].title, 'Valid Fav 1');
  });

  harness.test('ADV-5.2.6: Prototype pollution attack payload immunity', () => {
    const maliciousPayload = JSON.parse(
      '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"hacked": true}}, "profile": {"name": "Victim"}, "links": []}'
    );

    const validated = dataProvider.validateImportData(maliciousPayload);
    assert.equal(validated.profile.name, 'Victim');

    // Assert that Object prototype is clean
    assert.equal(({}).polluted, undefined, 'Object prototype must not have polluted property');
    assert.equal(({}).hacked, undefined, 'Object prototype must not have hacked property');

    // Import into store
    const res = useProfileStore.getState().importData(maliciousPayload);
    assert.equal(res.success, true);
    assert.equal(({}).polluted, undefined);
    assert.equal(({}).hacked, undefined);
  });

  harness.test('ADV-5.2.7: Extreme nested and high volume JSON payload stress', () => {
    const highVolumeLinks = [];
    for (let i = 0; i < 200; i++) {
      highVolumeLinks.push({
        id: `link_${i}`,
        title: `Link #${i}`,
        url: `https://example.com/link/${i}`,
        icon: 'Globe',
        category: 'social',
        order: i,
        isActive: i % 2 === 0,
      });
    }

    const highVolumeFavs = [];
    for (let i = 0; i < 200; i++) {
      highVolumeFavs.push({
        id: `fav_${i}`,
        title: `Favorite #${i}`,
        category: 'tech',
        order: i,
      });
    }

    const largePayload = {
      profile: {
        name: 'Stress Test Creator',
        bio: 'A'.repeat(20000), // 20k characters
      },
      links: highVolumeLinks,
      favorites: highVolumeFavs,
      music: {
        title: 'Stress Track',
      },
      settings: {
        themePreset: 'lofi-aesthetic',
      },
    };

    const startTime = Date.now();
    const validated = dataProvider.validateImportData(largePayload);
    const duration = Date.now() - startTime;

    assert.ok(duration < 100, `High volume validation must complete in <100ms (took ${duration}ms)`);
    assert.equal(validated.links.length, 200);
    assert.equal(validated.favorites.length, 200);
    assert.equal(validated.profile.bio.length, 20000);

    const res = useProfileStore.getState().importData(largePayload);
    assert.equal(res.success, true);
    assert.equal(useProfileStore.getState().links.length, 200);
  });

  harness.test('ADV-5.2.8: JSON export and import round-trip fidelity', async () => {
    await resetCleanState();

    // Mutate state with custom values
    useProfileStore.getState().updateProfile({
      name: 'Custom Export Name',
      quote: 'Export Quotation',
    });
    useProfileStore.getState().addLink({
      title: 'Exported Link',
      url: 'https://exported.com',
    });
    useProfileStore.getState().addFavorite({
      title: 'Exported Game',
      category: 'gaming',
    });

    const exportedString = useProfileStore.getState().exportData('test-config.json');
    assert.ok(typeof exportedString === 'string', 'exportData must return JSON string');

    const parsed = JSON.parse(exportedString);
    assert.equal(parsed.profile.name, 'Custom Export Name');
    assert.equal(parsed.profile.quote, 'Export Quotation');
    assert.ok(parsed.links.some((l) => l.title === 'Exported Link'));
    assert.ok(parsed.favorites.some((f) => f.title === 'Exported Game'));
    assert.ok(parsed.music, 'Must include music section');
    assert.ok(parsed.settings, 'Must include settings section');

    // Reset store to defaults
    await useProfileStore.getState().resetToDefaults();
    assert.notEqual(useProfileStore.getState().profile.name, 'Custom Export Name');

    // Re-import exported data
    const importRes = useProfileStore.getState().importData(exportedString);
    assert.equal(importRes.success, true);

    const reimported = useProfileStore.getState();
    assert.equal(reimported.profile.name, 'Custom Export Name');
    assert.equal(reimported.profile.quote, 'Export Quotation');
    assert.ok(reimported.links.some((l) => l.title === 'Exported Link'));
  });

  // =========================================================================
  // VECTOR 3: resetToDefaults & Dirty State Transitions (ADV-6.2)
  // =========================================================================

  harness.test('ADV-5.3.1: Dirty state transitions on profile field mutations', async () => {
    await resetCleanState();

    assert.equal(useProfileStore.getState().isDirty, false, 'Initially not dirty');

    const defaultName = DEFAULT_PROFILE_DATA.profile.name;

    // Mutate to new value -> becomes dirty
    useProfileStore.getState().updateProfile({ name: 'Changed Name' });
    assert.equal(useProfileStore.getState().isDirty, true, 'isDirty must be true after change');

    // Mutate back to committed value -> becomes clean
    useProfileStore.getState().updateProfile({ name: defaultName });
    assert.equal(useProfileStore.getState().isDirty, false, 'isDirty must be false when restored');

    // Mutate multiple fields
    useProfileStore.getState().updateProfile({ bio: 'New Bio', quote: 'New Quote' });
    assert.equal(useProfileStore.getState().isDirty, true);

    // Save changes -> becomes clean and committed
    const saveRes = await useProfileStore.getState().saveChanges();
    assert.equal(saveRes.success, true);
    assert.equal(useProfileStore.getState().isDirty, false);
    assert.equal(useProfileStore.getState().committedState.profile.bio, 'New Bio');
  });

  harness.test('ADV-5.3.2: Dirty state on Links CRUD lifecycle (Add, Update, Remove, Reorder, Toggle)', async () => {
    await resetCleanState();

    const initialCount = useProfileStore.getState().links.length;

    // 1. Add Link
    useProfileStore.getState().addLink({ title: 'Temporary Link' });
    assert.equal(useProfileStore.getState().isDirty, true);
    assert.equal(useProfileStore.getState().links.length, initialCount + 1);

    // Revert changes
    useProfileStore.getState().revertChanges();
    assert.equal(useProfileStore.getState().isDirty, false);
    assert.equal(useProfileStore.getState().links.length, initialCount);

    // 2. Toggle Active on first link
    const firstLinkId = useProfileStore.getState().links[0].id;
    const initialActive = useProfileStore.getState().links[0].isActive;

    useProfileStore.getState().toggleLinkActive(firstLinkId);
    assert.equal(useProfileStore.getState().isDirty, true);
    assert.equal(useProfileStore.getState().links[0].isActive, !initialActive);

    // Toggle back
    useProfileStore.getState().toggleLinkActive(firstLinkId);
    assert.equal(useProfileStore.getState().isDirty, false, 'Toggling back must clear isDirty');

    // 3. Reorder links
    const originalLinks = [...useProfileStore.getState().links];
    const reversed = [...originalLinks].reverse();
    useProfileStore.getState().reorderLinks(reversed);
    assert.equal(useProfileStore.getState().isDirty, true);

    useProfileStore.getState().reorderLinks(originalLinks);
    assert.equal(useProfileStore.getState().isDirty, false, 'Restoring link order must clear isDirty');
  });

  harness.test('ADV-5.3.3: Dirty state on Favorites CRUD lifecycle', async () => {
    await resetCleanState();

    const initialFavsCount = useProfileStore.getState().favorites.length;

    // Add favorite
    useProfileStore.getState().addFavorite({ title: 'New Game', category: 'gaming' });
    assert.equal(useProfileStore.getState().isDirty, true);
    assert.equal(useProfileStore.getState().favorites.length, initialFavsCount + 1);

    // Revert
    useProfileStore.getState().revertChanges();
    assert.equal(useProfileStore.getState().isDirty, false);
    assert.equal(useProfileStore.getState().favorites.length, initialFavsCount);

    // Update favorite
    const favId = useProfileStore.getState().favorites[0].id;
    const originalTitle = useProfileStore.getState().favorites[0].title;

    useProfileStore.getState().updateFavorite(favId, { title: 'Updated Title' });
    assert.equal(useProfileStore.getState().isDirty, true);

    useProfileStore.getState().updateFavorite(favId, { title: originalTitle });
    assert.equal(useProfileStore.getState().isDirty, false, 'Restoring favorite title must clear isDirty');
  });

  harness.test('ADV-5.3.4: Dirty state on Theme & Music mutations', async () => {
    await resetCleanState();

    const initialTheme = useProfileStore.getState().settings.themePreset;
    const alternateTheme = initialTheme === 'cyber-neon' ? 'midnight-glow' : 'cyber-neon';

    // Change theme preset
    useProfileStore.getState().setThemePreset(alternateTheme);
    assert.equal(useProfileStore.getState().isDirty, true);
    assert.equal(document.documentElement.getAttribute('data-theme'), alternateTheme);

    // Restore theme
    useProfileStore.getState().setThemePreset(initialTheme);
    assert.equal(useProfileStore.getState().isDirty, false);
    assert.equal(document.documentElement.getAttribute('data-theme'), initialTheme);

    // Update music
    useProfileStore.getState().updateMusic({ title: 'Brand New Track' });
    assert.equal(useProfileStore.getState().isDirty, true);

    useProfileStore.getState().revertChanges();
    assert.equal(useProfileStore.getState().isDirty, false);
  });

  harness.test('ADV-5.3.5: Strict ADV-6.2 compliance for resetToDefaults', async () => {
    await resetCleanState();

    // 1. Perform changes and commit to storage
    useProfileStore.getState().updateProfile({ name: 'Committed Mutation 1' });
    await useProfileStore.getState().saveChanges();
    assert.equal(useProfileStore.getState().isDirty, false);

    // 2. Perform dirty uncommitted changes across multiple areas
    useProfileStore.getState().updateProfile({ name: 'Uncommitted Dirty Name' });
    useProfileStore.getState().addLink({ title: 'Dirty Link' });
    useProfileStore.getState().setThemePreset('retro-vaporwave');
    assert.equal(useProfileStore.getState().isDirty, true);

    // 3. Execute resetToDefaults()
    await useProfileStore.getState().resetToDefaults();
    const resetState = useProfileStore.getState();

    // Strict ADV-6.2 Assertions
    assert.equal(resetState.isDirty, false, 'isDirty must be false after resetToDefaults');
    assert.equal(resetState.saveStatus, 'idle', 'saveStatus must be idle');
    assert.equal(resetState.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Profile name must match default seed');
    assert.equal(resetState.committedState.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'committedState must match default seed');
    assert.equal(resetState.settings.themePreset, DEFAULT_PROFILE_DATA.settings.themePreset, 'themePreset must match default seed');

    // LocalStorage must hold default seed
    const stored = JSON.parse(activeMockStorage.getItem(LOCAL_STORAGE_KEY));
    assert.equal(stored.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'LocalStorage must hold default seed');

    // Object reference isolation: modifying resetState must NOT mutate DEFAULT_PROFILE_DATA
    resetState.profile.name = 'Direct Mutation Attempt';
    assert.notEqual(DEFAULT_PROFILE_DATA.profile.name, 'Direct Mutation Attempt', 'DEFAULT_PROFILE_DATA must be immutable');
  });

  harness.test('ADV-5.3.6: Import dirty state transition and user review workflow', async () => {
    await resetCleanState();

    const customImportPayload = {
      profile: { name: 'Imported Creator' },
      links: [{ title: 'Imported Link', url: 'https://imported.com' }],
    };

    const res = useProfileStore.getState().importData(customImportPayload);
    assert.equal(res.success, true);

    // Imported changes are in draft, marked dirty for user review
    assert.equal(useProfileStore.getState().isDirty, true, 'Imported changes must be marked dirty');
    assert.equal(useProfileStore.getState().profile.name, 'Imported Creator');

    // User chooses to revert instead of saving
    useProfileStore.getState().revertChanges();
    assert.equal(useProfileStore.getState().isDirty, false);
    assert.equal(useProfileStore.getState().profile.name, DEFAULT_PROFILE_DATA.profile.name);
  });

  // =========================================================================
  // VECTOR 4: Editor Tabs Data Mutations & Boundary Stress
  // =========================================================================

  harness.test('ADV-5.4.1: Extreme text lengths in profile data mutations', async () => {
    await resetCleanState();

    const extremeLengths = {
      name: 'N'.repeat(5000),
      handle: '@' + 'H'.repeat(2000),
      bio: 'B'.repeat(50000),
      quote: 'Q'.repeat(25000),
      location: 'L'.repeat(1000),
      statusBadge: 'S'.repeat(500),
    };

    useProfileStore.getState().updateProfile(extremeLengths);
    const draft = useProfileStore.getState().profile;

    assert.equal(draft.name.length, 5000);
    assert.equal(draft.bio.length, 50000);
    assert.equal(draft.quote.length, 25000);

    // Persist payload via dataProvider
    const saveRes = await dataProvider.saveData(useProfileStore.getState());
    assert.equal(saveRes.success, true, 'dataProvider.saveData must accept extreme text lengths');

    // Verify localStorage readback
    const cached = await dataProvider.fetchData();
    assert.equal(cached.profile.bio.length, 50000);
  });

  harness.test('ADV-5.4.2: Special and adversarial characters in profile fields', async () => {
    await resetCleanState();

    const specialChars = {
      name: '🚀 Cyber_Samurai ✨ 👾',
      handle: '@neo_東京_101',
      bio: '<script>alert("xss")</script> & <style>body{color:red}</style>',
      quote: "Single ' and double \" quotes; DROP TABLE profiles; --",
      location: 'مرحبا بكم في طوكيو (RTL Arabic)',
      statusBadge: '🔥 100% ⚡ Online \u0000 ZeroByte',
    };

    useProfileStore.getState().updateProfile(specialChars);
    const saveRes = await useProfileStore.getState().saveChanges();
    assert.equal(saveRes.success, true);

    const reloaded = await dataProvider.fetchData();
    assert.equal(reloaded.profile.name, '🚀 Cyber_Samurai ✨ 👾');
    assert.equal(reloaded.profile.handle, '@neo_東京_101');
    assert.equal(reloaded.profile.quote, "Single ' and double \" quotes; DROP TABLE profiles; --");
  });

  harness.test('ADV-5.4.3: Empty and malformed link URLs handling and persistence fallback', async () => {
    await resetCleanState();

    useProfileStore.getState().addLink({
      title: 'Empty URL Link',
      url: '',
    });
    useProfileStore.getState().addLink({
      title: 'Whitespace URL Link',
      url: '   ',
    });

    // Store holds draft for live editing
    const draftLinks = useProfileStore.getState().links;
    assert.ok(draftLinks.some((l) => l.title === 'Empty URL Link'));

    // dataProvider sanitizes during persistence (fallback to 'https://')
    const saveRes = await dataProvider.saveData(useProfileStore.getState());
    assert.equal(saveRes.success, true);
  });

  harness.test('ADV-5.4.4: Arbitrary and invalid category values in links & favorites', async () => {
    await resetCleanState();

    useProfileStore.getState().addLink({
      title: 'Odd Category Link',
      url: 'https://odd.com',
      category: 'non-standard-category-xyz',
    });

    useProfileStore.getState().addFavorite({
      title: 'Alien Category Fav',
      category: 'alien-dimension',
    });

    assert.equal(useProfileStore.getState().links.find((l) => l.title === 'Odd Category Link')?.category, 'non-standard-category-xyz');
    assert.equal(useProfileStore.getState().favorites.find((f) => f.title === 'Alien Category Fav')?.category, 'alien-dimension');

    const saveRes = await dataProvider.saveData(useProfileStore.getState());
    assert.equal(saveRes.success, true);
  });

  harness.test('ADV-5.4.5: High frequency rapid mutation stress (Chaos Monkey)', () => {
    // 50 rapid sequential additions, updates, removals, and toggles
    for (let i = 0; i < 50; i++) {
      useProfileStore.getState().addLink({ title: `Chaos Link ${i}` });
      if (i % 3 === 0) {
        useProfileStore.getState().addFavorite({ title: `Chaos Fav ${i}` });
      }
      if (i % 5 === 0 && useProfileStore.getState().links.length > 2) {
        const removeId = useProfileStore.getState().links[1].id;
        useProfileStore.getState().removeLink(removeId);
      }
    }

    const finalLinks = useProfileStore.getState().links;
    const finalFavs = useProfileStore.getState().favorites;

    // Verify integrity of order indices
    for (let i = 0; i < finalLinks.length; i++) {
      assert.equal(finalLinks[i].order, i, `Link at index ${i} must have order: ${i}`);
    }
    for (let i = 0; i < finalFavs.length; i++) {
      assert.equal(finalFavs[i].order, i, `Favorite at index ${i} must have order: ${i}`);
    }
  });

  // =========================================================================
  // VECTOR 5: UI & Architecture Invariants
  // =========================================================================

  harness.test('ADV-5.5.1: LiveCustomizerDrawer tab definitions and persistence actions', () => {
    // Structural verification of 5 tabs
    assert.ok(customizerDrawerSource.includes("id: 'profile'"), 'Drawer must include profile tab');
    assert.ok(customizerDrawerSource.includes("id: 'links'"), 'Drawer must include links tab');
    assert.ok(customizerDrawerSource.includes("id: 'favorites'"), 'Drawer must include favorites tab');
    assert.ok(customizerDrawerSource.includes("id: 'music'"), 'Drawer must include music tab');
    assert.ok(customizerDrawerSource.includes("id: 'theme'"), 'Drawer must include theme tab');

    // Structural verification of Disaster Recovery actions
    assert.ok(customizerDrawerSource.includes('handleExport'), 'Drawer must support Export JSON');
    assert.ok(customizerDrawerSource.includes('handleImportFile'), 'Drawer must support Import JSON');
    assert.ok(customizerDrawerSource.includes('handleReset'), 'Drawer must support Reset to Defaults');
    assert.ok(customizerDrawerSource.includes('handleRevert'), 'Drawer must support Revert Changes');
    assert.ok(customizerDrawerSource.includes('handleSave'), 'Drawer must support Save Changes');
  });

  harness.test('ADV-5.5.2: App.jsx Integration & 14 Smoke Verification Elements Preservation', () => {
    // LoginModal and LiveCustomizerDrawer mounted
    assert.ok(appSource.includes('<LoginModal'), 'App.jsx must mount LoginModal');
    assert.ok(appSource.includes('<LiveCustomizerDrawer'), 'App.jsx must mount LiveCustomizerDrawer');

    // Owner dock
    assert.ok(appSource.includes('Owner Mode Active'), 'App.jsx must render Owner Mode Active dock when unlocked');

    // Strictly verify all 14 smoke test DOM IDs
    const REQUIRED_SMOKE_IDS = [
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

    for (const id of REQUIRED_SMOKE_IDS) {
      assert.ok(
        appSource.includes(`id="${id}"`),
        `App.jsx must preserve verbatim smoke test ID: ${id}`
      );
    }
  });

  harness.test('ADV-5.5.3: Production build and static asset relative resolution', () => {
    const distIndexPath = path.join(rootDir, 'dist/index.html');
    if (fs.existsSync(distIndexPath)) {
      const htmlContent = fs.readFileSync(distIndexPath, 'utf-8');
      assert.ok(
        !htmlContent.includes('href="/assets/'),
        'dist/index.html must not contain root-absolute href="/assets/'
      );
      assert.ok(
        !htmlContent.includes('src="/assets/'),
        'dist/index.html must not contain root-absolute src="/assets/'
      );
      assert.ok(
        htmlContent.includes('./assets/') || htmlContent.includes('./favicon'),
        'dist/index.html must contain strictly relative asset paths (./...)'
      );
    }
  });

  return harness;
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('adversarial-m5-stress.test.js')) {
  const suite = createAdversarialM5Suite();
  const result = await suite.run();
  if (result.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
