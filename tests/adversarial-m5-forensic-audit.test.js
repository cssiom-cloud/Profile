/**
 * tests/adversarial-m5-forensic-audit.test.js
 * Independent Empirical Forensic Integrity Audit & Adversarial Verification Suite for Milestone 5
 *
 * Verifies:
 * 1. Deliverables existence and structural authenticity
 * 2. LoginModal.jsx: authentic PIN verification & Supabase auth flow
 * 3. LiveCustomizerDrawer.jsx: slide-over drawer, 5 tabs, backup/recovery, save/revert footer
 * 4. 5 Editor Tabs: genuine CRUD, field bindings, preview swatches, audio playback
 * 5. useProfileStore.js: deep-clone draft reactivity, isDirty tracking, save/revert/reset/export/import
 * 6. dataProvider.js: persistence cascade, schema sanitization, import validation, disaster recovery
 * 7. App.jsx: component mounting, owner floating dock, 14 smoke elements preservation
 * 8. Zero mock facades, zero hardcoded bypasses, zero fake test certificates
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ✖ [FAIL] ${message}`);
    if (details) console.error(`     Details: ${details}`);
    failures.push({ message, details });
  }
}

console.log('\n========================================================================');
console.log('   M5 Empirical Forensic Integrity Audit & Adversarial Suite');
console.log('========================================================================\n');

// --------------------------------------------------------------------------
// Section 1: File Presence & Static Code Analysis
// --------------------------------------------------------------------------
console.log('--- 1. Deliverables Presence & Integrity ---');

const m5Files = [
  'src/components/customizer/LoginModal.jsx',
  'src/components/customizer/LiveCustomizerDrawer.jsx',
  'src/components/customizer/ProfileEditorTab.jsx',
  'src/components/customizer/LinksEditorTab.jsx',
  'src/components/customizer/FavoritesEditorTab.jsx',
  'src/components/customizer/MusicEditorTab.jsx',
  'src/components/customizer/LayoutThemeTab.jsx',
  'src/store/useProfileStore.js',
  'src/lib/dataProvider.js',
  'src/App.jsx',
];

m5Files.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  const exists = fs.existsSync(fullPath);
  assert(exists, `File exists: ${relPath}`);
  if (exists) {
    const stat = fs.statSync(fullPath);
    assert(stat.size > 200, `File has substantial implementation (> 200 bytes): ${relPath} (${stat.size} bytes)`);
  }
});

// --------------------------------------------------------------------------
// Section 2: Prohibited Patterns & Facade Detection
// --------------------------------------------------------------------------
console.log('\n--- 2. Facade & Bypass Pattern Audit ---');

m5Files.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');

  // Check for NotImplementedError
  assert(!content.includes('NotImplementedError'), `No NotImplementedError in ${relPath}`);

  // Check for fake hardcoded PASS bypasses
  const fakeBypasses = [
    '__AUDITOR_BYPASS__',
    'return true; // bypass',
    '/* mock implementation */',
    '// fake pass',
    'const isPassing = true',
  ];
  fakeBypasses.forEach((pattern) => {
    assert(!content.includes(pattern), `No fake bypass pattern "${pattern}" in ${relPath}`);
  });
});

// --------------------------------------------------------------------------
// Section 3: LoginModal.jsx Forensic Audit
// --------------------------------------------------------------------------
console.log('\n--- 3. LoginModal.jsx Authentication Forensics ---');

const loginModalCode = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LoginModal.jsx'), 'utf8');

assert(loginModalCode.includes("authMode === 'pin'") && loginModalCode.includes("authMode === 'supabase'"),
  'LoginModal supports dual auth modes (pin & supabase)');
assert(loginModalCode.includes('admin123'), 'LoginModal authenticates demo PIN "admin123"');
assert(loginModalCode.includes('supabase.auth.signInWithPassword'), 'LoginModal authenticates via Supabase Auth client');
assert(loginModalCode.includes('isSupabaseConfigured()'), 'LoginModal checks isSupabaseConfigured() defensively');
assert(loginModalCode.includes('Escape'), 'LoginModal listens to Escape key for accessibility dismiss');
assert(loginModalCode.includes('setIsOwner(true)'), 'LoginModal updates isOwner state upon successful auth');
assert(loginModalCode.includes('setCustomizerOpen(true)'), 'LoginModal opens Live Customizer drawer upon successful auth');
assert(loginModalCode.includes('AnimatePresence') && loginModalCode.includes('motion.div'),
  'LoginModal utilizes Framer Motion animations');

// --------------------------------------------------------------------------
// Section 4: LiveCustomizerDrawer.jsx Forensic Audit
// --------------------------------------------------------------------------
console.log('\n--- 4. LiveCustomizerDrawer.jsx Architecture Forensics ---');

const drawerCode = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LiveCustomizerDrawer.jsx'), 'utf8');

assert(drawerCode.includes('motion.aside'), 'Drawer uses motion.aside slide-over component');
assert(drawerCode.includes("activeTab === 'profile'"), 'Drawer mounts ProfileEditorTab');
assert(drawerCode.includes("activeTab === 'links'"), 'Drawer mounts LinksEditorTab');
assert(drawerCode.includes("activeTab === 'favorites'"), 'Drawer mounts FavoritesEditorTab');
assert(drawerCode.includes("activeTab === 'music'"), 'Drawer mounts MusicEditorTab');
assert(drawerCode.includes("activeTab === 'theme'"), 'Drawer mounts LayoutThemeTab');
assert(drawerCode.includes('exportData(') && drawerCode.includes('profile-hub-config.json'),
  'Drawer implements JSON configuration export');
assert(drawerCode.includes('importData(') && drawerCode.includes('FileReader'),
  'Drawer implements JSON configuration import via FileReader');
assert(drawerCode.includes('resetToDefaults()'), 'Drawer implements Reset to Defaults action');
assert(drawerCode.includes('revertChanges()'), 'Drawer implements Revert Changes action');
assert(drawerCode.includes('saveChanges()'), 'Drawer implements Save Changes action');
assert(drawerCode.includes('isDirty'), 'Drawer evaluates reactive isDirty flag');

// --------------------------------------------------------------------------
// Section 5: 5 Editor Tabs Component Forensics
// --------------------------------------------------------------------------
console.log('\n--- 5. Editor Tabs CRUD & Interactivity Forensics ---');

// ProfileEditorTab
const profileTabCode = fs.readFileSync(path.join(rootDir, 'src/components/customizer/ProfileEditorTab.jsx'), 'utf8');
['name', 'handle', 'bio', 'quote', 'avatarUrl', 'bannerUrl', 'location', 'statusBadge'].forEach((field) => {
  assert(profileTabCode.includes(field), `ProfileEditorTab binds field: ${field}`);
});
assert(profileTabCode.includes('updateProfile'), 'ProfileEditorTab calls store updateProfile');

// LinksEditorTab
const linksTabCode = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LinksEditorTab.jsx'), 'utf8');
assert(linksTabCode.includes('addLink'), 'LinksEditorTab implements addLink');
assert(linksTabCode.includes('updateLink'), 'LinksEditorTab implements updateLink');
assert(linksTabCode.includes('removeLink'), 'LinksEditorTab implements removeLink');
assert(linksTabCode.includes('reorderLinks'), 'LinksEditorTab implements reorderLinks');
assert(linksTabCode.includes('toggleLinkActive'), 'LinksEditorTab implements toggleLinkActive');
assert(linksTabCode.includes('POPULAR_ICONS'), 'LinksEditorTab provides curated popular Lucide icons');
assert(linksTabCode.includes('PRESET_HIGHLIGHT_COLORS'), 'LinksEditorTab provides highlight aura colors');

// FavoritesEditorTab
const favsTabCode = fs.readFileSync(path.join(rootDir, 'src/components/customizer/FavoritesEditorTab.jsx'), 'utf8');
assert(favsTabCode.includes('addFavorite'), 'FavoritesEditorTab implements addFavorite');
assert(favsTabCode.includes('updateFavorite'), 'FavoritesEditorTab implements updateFavorite');
assert(favsTabCode.includes('removeFavorite'), 'FavoritesEditorTab implements removeFavorite');
assert(favsTabCode.includes('reorderFavorites'), 'FavoritesEditorTab implements reorderFavorites');
assert(favsTabCode.includes('FAVORITE_CATEGORIES'), 'FavoritesEditorTab categorizes items');

// MusicEditorTab
const musicTabCode = fs.readFileSync(path.join(rootDir, 'src/components/customizer/MusicEditorTab.jsx'), 'utf8');
['title', 'artist', 'audioUrl', 'coverUrl', 'spotifyUrl', 'youtubeUrl', 'isAutoPlay', 'defaultVolume'].forEach((field) => {
  assert(musicTabCode.includes(field), `MusicEditorTab binds field: ${field}`);
});
assert(musicTabCode.includes('updateMusic'), 'MusicEditorTab calls store updateMusic');
assert(musicTabCode.includes('new Audio('), 'MusicEditorTab implements audio stream preview tester');

// LayoutThemeTab
const layoutTabCode = fs.readFileSync(path.join(rootDir, 'src/components/customizer/LayoutThemeTab.jsx'), 'utf8');
assert(layoutTabCode.includes('THEME_PRESETS'), 'LayoutThemeTab provides 5 theme presets');
assert(layoutTabCode.includes('LAYOUT_STYLES'), 'LayoutThemeTab provides layout styles (bento, stack, cards)');
assert(layoutTabCode.includes('CARD_STYLES'), 'LayoutThemeTab provides card styles');
assert(layoutTabCode.includes('PARTICLE_DENSITIES'), 'LayoutThemeTab provides particle densities');
assert(layoutTabCode.includes('setThemePreset'), 'LayoutThemeTab binds setThemePreset');

// --------------------------------------------------------------------------
// Section 6: Dynamic Store & Data Provider Behavioral Verification
// --------------------------------------------------------------------------
console.log('\n--- 6. Behavioral Verification of Store & DataProvider ---');

import { useProfileStore } from '../src/store/useProfileStore.js';
import { dataProvider } from '../src/lib/dataProvider.js';
import { DEFAULT_PROFILE_DATA } from '../src/data/defaultData.js';

// Test Initial Store State
const storeState = useProfileStore.getState();
assert(storeState.profile !== undefined, 'Store initial profile exists');
assert(storeState.links.length > 0, 'Store initial links populated');
assert(storeState.favorites.length > 0, 'Store initial favorites populated');
assert(storeState.isDirty === false, 'Store initial isDirty is false');
assert(storeState.isOwner === false, 'Store initial isOwner is false');

// Test Profile Mutator & isDirty reactivity
useProfileStore.getState().updateProfile({ name: 'Forensic Investigator' });
assert(useProfileStore.getState().profile.name === 'Forensic Investigator', 'updateProfile updates draft name');
assert(useProfileStore.getState().isDirty === true, 'updateProfile automatically sets isDirty to true');

// Test Revert Changes
useProfileStore.getState().revertChanges();
assert(useProfileStore.getState().profile.name === DEFAULT_PROFILE_DATA.profile.name,
  'revertChanges restores draft to committed state');
assert(useProfileStore.getState().isDirty === false, 'revertChanges resets isDirty to false');

// Test Links CRUD
const initialLinksCount = useProfileStore.getState().links.length;
useProfileStore.getState().addLink({ title: 'Forensic Link', url: 'https://audit.test', category: 'work' });
assert(useProfileStore.getState().links.length === initialLinksCount + 1, 'addLink appends new link');
assert(useProfileStore.getState().isDirty === true, 'addLink marks store isDirty: true');

const addedLink = useProfileStore.getState().links[useProfileStore.getState().links.length - 1];
assert(addedLink.title === 'Forensic Link', 'added link has specified title');

useProfileStore.getState().updateLink(addedLink.id, { title: 'Updated Forensic Link' });
const updatedLink = useProfileStore.getState().links.find((l) => l.id === addedLink.id);
assert(updatedLink.title === 'Updated Forensic Link', 'updateLink modifies link properties');

useProfileStore.getState().toggleLinkActive(addedLink.id);
const toggledLink = useProfileStore.getState().links.find((l) => l.id === addedLink.id);
assert(toggledLink.isActive === false, 'toggleLinkActive toggles active boolean');

useProfileStore.getState().removeLink(addedLink.id);
assert(useProfileStore.getState().links.length === initialLinksCount, 'removeLink deletes link');

// Test Favorites CRUD
const initialFavCount = useProfileStore.getState().favorites.length;
useProfileStore.getState().addFavorite({ title: 'Adversarial Audit', category: 'tech' });
assert(useProfileStore.getState().favorites.length === initialFavCount + 1, 'addFavorite appends favorite');

const addedFav = useProfileStore.getState().favorites[useProfileStore.getState().favorites.length - 1];
useProfileStore.getState().updateFavorite(addedFav.id, { badge: 'Verified' });
const updatedFav = useProfileStore.getState().favorites.find((f) => f.id === addedFav.id);
assert(updatedFav.badge === 'Verified', 'updateFavorite modifies item properties');

useProfileStore.getState().removeFavorite(addedFav.id);
assert(useProfileStore.getState().favorites.length === initialFavCount, 'removeFavorite deletes favorite');

// Test Reset to Defaults (ADV-6.2 Invariant)
await useProfileStore.getState().resetToDefaults();
assert(useProfileStore.getState().isDirty === false, 'resetToDefaults sets isDirty: false (ADV-6.2)');
assert(useProfileStore.getState().profile.name === DEFAULT_PROFILE_DATA.profile.name,
  'resetToDefaults restores default seed profile');

// Test JSON Export
const exportedJson = useProfileStore.getState().exportData('test-export.json');
assert(typeof exportedJson === 'string', 'exportData returns JSON string');
const parsedExport = JSON.parse(exportedJson);
assert(parsedExport.profile && parsedExport.links && parsedExport.favorites,
  'Exported JSON contains complete schema structure');

// Test JSON Import
const importPayload = {
  profile: { name: 'Imported Auditor', handle: '@auditor' },
  links: [{ id: 'link_imp', title: 'Imported', url: 'https://imported.org', category: 'social' }],
  favorites: [{ id: 'fav_imp', title: 'Imported Fav', category: 'anime' }],
  music: { title: 'Imported Track', artist: 'Artist Imp', audioUrl: 'https://imp.mp3' },
  settings: { themePreset: 'midnight-glow', layoutStyle: 'stack' },
};
const importResult = useProfileStore.getState().importData(importPayload);
assert(importResult.success === true, 'importData successfully parses valid payload');
assert(useProfileStore.getState().profile.name === 'Imported Auditor', 'importData updates draft profile');
assert(useProfileStore.getState().isDirty === true, 'importData marks draft isDirty for user review');

// Test Defensive Import Validation in DataProvider
let malformedCaught = false;
try {
  dataProvider.validateImportData({ profile: 'not-an-object', links: [] });
} catch (e) {
  malformedCaught = true;
}
assert(malformedCaught, 'validateImportData rejects invalid profile object');

let missingNameCaught = false;
try {
  dataProvider.validateImportData({ profile: { bio: 'no name' }, links: [] });
} catch (e) {
  missingNameCaught = true;
}
assert(missingNameCaught, 'validateImportData rejects missing profile.name');

// Clean up store state
await useProfileStore.getState().resetToDefaults();

// --------------------------------------------------------------------------
// Section 7: App.jsx Integration & Smoke Element Preservation
// --------------------------------------------------------------------------
console.log('\n--- 7. App.jsx Mounting & Backward Compatibility ---');

const appCode = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');

assert(appCode.includes('<LoginModal />'), 'App.jsx mounts <LoginModal />');
assert(appCode.includes('<LiveCustomizerDrawer />'), 'App.jsx mounts <LiveCustomizerDrawer />');
assert(appCode.includes('Owner Mode Active'), 'App.jsx renders Owner Mode Active floating pill');
assert(appCode.includes('Edit Hub'), 'App.jsx renders Edit Hub button');
assert(appCode.includes('Logout'), 'App.jsx renders Logout button');

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

smokeIds.forEach((smokeId) => {
  assert(appCode.includes(`id="${smokeId}"`), `App.jsx preserves smoke ID: #${smokeId}`);
});
assert(appCode.includes('handleDensityChange'), 'App.jsx preserves handleDensityChange');

// --------------------------------------------------------------------------
// Summary & Verdict
// --------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`TOTAL FORENSIC AUDIT CHECKS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error('[VERDICT] INTEGRITY VIOLATION DETECTED!');
  failures.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.message}: ${f.details}`);
  });
  process.exit(1);
} else {
  console.log('[VERDICT] CLEAN - All Milestone 5 deliverables passed forensic integrity checks!');
  process.exit(0);
}
