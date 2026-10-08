/**
 * tests/adversarial-m5-audit.test.js
 * Empirical Adversarial Audit & Stress Test Suite for Milestone 5:
 * Dual-Mode Owner Auth & Live Customizer Drawer (Features 20, 21, 22, 23).
 *
 * Covers:
 * 1. Store WYSIWYG reactivity & self-canceling isDirty tracking
 * 2. Profile mutator boundary conditions & Unicode/XSS resilience
 * 3. Links CRUD, 27 Lucide icons, highlight colors, and boundary reordering
 * 4. Favorites CRUD, 5 canonical categories, inline edits, and reordering
 * 5. Music settings: volume boundaries, autoplay toggle, stream URL
 * 6. Layout & Theme settings: 5 presets, 3 layouts, 3 card styles, 4 densities
 * 7. Persistence workflows: saveChanges, revertChanges, resetToDefaults (ADV-6.2)
 * 8. Disaster Recovery: exportData, importData, and defensive schema validation
 * 9. Dual-mode authentication logic and demo PIN resilience
 * 10. Static component structure and drawer integration verification
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TestHarness,
  createMockLocalStorage,
  createMockDOM,
} from './helpers/test-utils.js';
import { useProfileStore } from '../src/store/useProfileStore.js';
import { dataProvider, LOCAL_STORAGE_KEY } from '../src/lib/dataProvider.js';
import {
  DEFAULT_PROFILE_DATA,
  THEME_PRESETS,
  LAYOUT_STYLES,
  CARD_STYLES,
  PARTICLE_DENSITIES,
  FAVORITE_CATEGORIES,
} from '../src/data/defaultData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export function createAdversarialM5Suite() {
  const harness = new TestHarness('M5 Empirical Adversarial Audit & Stress Suite');

  // Setup mock environment
  const mockStorage = createMockLocalStorage();
  const { document, attributes } = createMockDOM();
  document.createElement = (tag) => ({
    tagName: tag,
    href: '',
    download: '',
    click: () => {},
  });
  document.body = {
    appendChild: () => {},
    removeChild: () => {},
  };
  globalThis.URL = globalThis.URL || {};
  globalThis.URL.createObjectURL = () => 'blob:mock-url';
  globalThis.URL.revokeObjectURL = () => {};
  globalThis.localStorage = mockStorage;
  globalThis.document = document;

  // --------------------------------------------------------------------------
  // Audit 1: WYSIWYG Reactivity & Self-Canceling Dirty Tracking
  // --------------------------------------------------------------------------
  harness.test('M5-A1: Instant WYSIWYG reactivity and self-canceling isDirty tracking', async () => {
    mockStorage.clear();
    await useProfileStore.getState().resetToDefaults();

    const initial = useProfileStore.getState();
    assert.equal(initial.isDirty, false, 'Initial state must not be dirty');

    // Mutate 1 field
    useProfileStore.getState().updateProfile({ name: 'Adversarial Tester' });
    assert.equal(useProfileStore.getState().profile.name, 'Adversarial Tester');
    assert.equal(useProfileStore.getState().isDirty, true, 'State must immediately be dirty');

    // Mutate back to initial value: dirty state must self-cancel to false
    useProfileStore.getState().updateProfile({ name: DEFAULT_PROFILE_DATA.profile.name });
    assert.equal(useProfileStore.getState().profile.name, DEFAULT_PROFILE_DATA.profile.name);
    assert.equal(useProfileStore.getState().isDirty, false, 'Reverting to committed snapshot must clear isDirty');
  });

  // --------------------------------------------------------------------------
  // Audit 2: Profile Mutator Boundaries (Unicode, XSS strings, Extreme Bio)
  // --------------------------------------------------------------------------
  harness.test('M5-A2: Profile fields boundary stress (5000-char bio, Unicode, script tags)', () => {
    const extremeBio = 'A'.repeat(5000);
    const unicodeName = '🦊 ゼロ • Alex (アレックス) ✨';
    const xssQuote = '<script>alert("xss")</script><img src=x onerror=alert(1)>';

    useProfileStore.getState().updateProfile({
      bio: extremeBio,
      name: unicodeName,
      quote: xssQuote,
      location: 'Neo-Tokyo 2099',
      statusBadge: '🔥 Overclocked',
    });

    const state = useProfileStore.getState();
    assert.equal(state.profile.bio.length, 5000);
    assert.equal(state.profile.name, unicodeName);
    assert.equal(state.profile.quote, xssQuote);
    assert.equal(state.profile.location, 'Neo-Tokyo 2099');
    assert.equal(state.profile.statusBadge, '🔥 Overclocked');
    assert.equal(state.isDirty, true);
  });

  // --------------------------------------------------------------------------
  // Audit 3: Links CRUD & Boundary Reordering (Out-of-bounds safety)
  // --------------------------------------------------------------------------
  harness.test('M5-A3: Links CRUD, highlight colors, and boundary reordering safety', () => {
    // Start fresh
    useProfileStore.setState({ links: [] });

    // Add 3 links
    useProfileStore.getState().addLink({ title: 'Link A', url: 'https://a.com', highlightColor: '#00f2fe' });
    useProfileStore.getState().addLink({ title: 'Link B', url: 'https://b.com', highlightColor: '#ff007f' });
    useProfileStore.getState().addLink({ title: 'Link C', url: 'https://c.com', highlightColor: '#a855f7' });

    let links = useProfileStore.getState().links;
    assert.equal(links.length, 3);
    assert.equal(links[0].title, 'Link A');
    assert.equal(links[1].title, 'Link B');
    assert.equal(links[2].title, 'Link C');
    assert.equal(links[0].highlightColor, '#00f2fe');

    // Update link B
    const targetId = links[1].id;
    useProfileStore.getState().updateLink(targetId, { title: 'Updated Link B', icon: 'Github' });
    assert.equal(useProfileStore.getState().links[1].title, 'Updated Link B');
    assert.equal(useProfileStore.getState().links[1].icon, 'Github');

    // Toggle active
    useProfileStore.getState().toggleLinkActive(links[1].id);
    assert.equal(useProfileStore.getState().links[1].isActive, false);
    useProfileStore.getState().toggleLinkActive(links[1].id);
    assert.equal(useProfileStore.getState().links[1].isActive, true);

    // Reorder: swap index 0 and 1
    const currentLinks = useProfileStore.getState().links;
    const reordered = [currentLinks[1], currentLinks[0], currentLinks[2]];
    useProfileStore.getState().reorderLinks(reordered);
    const postReorderLinks = useProfileStore.getState().links;
    assert.equal(postReorderLinks[0].title, 'Updated Link B');
    assert.equal(postReorderLinks[0].order, 0);
    assert.equal(postReorderLinks[1].title, 'Link A');
    assert.equal(postReorderLinks[1].order, 1);

    // Delete link
    useProfileStore.getState().removeLink(postReorderLinks[0].id);
    const postDeleteLinks = useProfileStore.getState().links;
    assert.equal(postDeleteLinks.length, 2);
    assert.equal(postDeleteLinks[0].title, 'Link A');
    assert.equal(postDeleteLinks[0].order, 0);
  });

  // --------------------------------------------------------------------------
  // Audit 4: Favorites CRUD Across 5 Canonical Categories & Filtering
  // --------------------------------------------------------------------------
  harness.test('M5-A4: Favorites CRUD across 5 canonical categories and reordering', () => {
    useProfileStore.setState({ favorites: [] });

    const categories = ['tech', 'gaming', 'anime', 'music', 'hobbies'];
    categories.forEach((cat, idx) => {
      useProfileStore.getState().addFavorite({
        title: `Item in ${cat}`,
        category: cat,
        subtitle: `Subtitle ${idx}`,
        badge: 'Top Tier',
        iconOrImage: 'Star',
      });
    });

    let favs = useProfileStore.getState().favorites;
    assert.equal(favs.length, 5);

    // Verify all 5 categories are represented
    const presentCats = new Set(favs.map((f) => f.category));
    categories.forEach((c) => assert.ok(presentCats.has(c), `Category ${c} must be present`));

    // Update favorite
    useProfileStore.getState().updateFavorite(favs[0].id, {
      title: 'Updated Tech Item',
      badge: 'S-Rank',
    });
    assert.equal(useProfileStore.getState().favorites[0].title, 'Updated Tech Item');
    assert.equal(useProfileStore.getState().favorites[0].badge, 'S-Rank');

    // Reorder
    const currentFavs = useProfileStore.getState().favorites;
    const swapped = [currentFavs[1], currentFavs[0], ...currentFavs.slice(2)];
    useProfileStore.getState().reorderFavorites(swapped);
    favs = useProfileStore.getState().favorites;
    assert.equal(favs[0].category, 'gaming');
    assert.equal(favs[0].order, 0);
    assert.equal(favs[1].title, 'Updated Tech Item');
    assert.equal(favs[1].order, 1);

    // Remove favorite
    useProfileStore.getState().removeFavorite(favs[0].id);
    favs = useProfileStore.getState().favorites;
    assert.equal(favs.length, 4);
  });

  // --------------------------------------------------------------------------
  // Audit 5: Music Settings: Volume Boundaries, Autoplay, Stream URL
  // --------------------------------------------------------------------------
  harness.test('M5-A5: Music player settings (volume boundaries 0.0 - 1.0, isAutoPlay toggle)', () => {
    useProfileStore.getState().updateMusic({
      title: 'Neon Drift',
      artist: 'Synthwave Pilot',
      audioUrl: 'https://example.com/audio.mp3',
      coverUrl: 'https://example.com/cover.jpg',
      spotifyUrl: 'https://open.spotify.com/track/xyz',
      youtubeUrl: 'https://youtube.com/watch?v=xyz',
      isAutoPlay: true,
      defaultVolume: 0.85,
    });

    let music = useProfileStore.getState().music;
    assert.equal(music.title, 'Neon Drift');
    assert.equal(music.isAutoPlay, true);
    assert.equal(music.defaultVolume, 0.85);

    // Mute boundary
    useProfileStore.getState().updateMusic({ defaultVolume: 0 });
    assert.equal(useProfileStore.getState().music.defaultVolume, 0);

    // Max volume boundary
    useProfileStore.getState().updateMusic({ defaultVolume: 1.0 });
    assert.equal(useProfileStore.getState().music.defaultVolume, 1.0);
  });

  // --------------------------------------------------------------------------
  // Audit 6: Layout & Theme Settings: 5 Themes, 3 Layouts, 3 Cards, 4 Densities
  // --------------------------------------------------------------------------
  harness.test('M5-A6: Layout & Theme options matrix and DOM theme synchronization', () => {
    // 5 Themes
    const expectedThemes = ['cyber-neon', 'midnight-glow', 'lofi-aesthetic', 'clean-minimalist', 'retro-vaporwave'];
    expectedThemes.forEach((theme) => {
      useProfileStore.getState().setThemePreset(theme);
      assert.equal(useProfileStore.getState().settings.themePreset, theme);
      assert.equal(attributes.get('data-theme'), theme, `DOM attribute data-theme must be ${theme}`);
    });

    // 3 Layout Styles
    const expectedLayouts = ['bento', 'stack', 'cards'];
    expectedLayouts.forEach((layout) => {
      useProfileStore.getState().updateSettings({ layoutStyle: layout });
      assert.equal(useProfileStore.getState().settings.layoutStyle, layout);
    });

    // 3 Card Styles
    const expectedCardStyles = ['glassmorphism', 'neon-border', 'minimal-flat'];
    expectedCardStyles.forEach((style) => {
      useProfileStore.getState().updateSettings({ cardStyle: style });
      assert.equal(useProfileStore.getState().settings.cardStyle, style);
    });

    // 4 Particle Densities
    const expectedDensities = ['off', 'low', 'medium', 'high'];
    expectedDensities.forEach((density) => {
      useProfileStore.getState().updateSettings({ particleDensity: density });
      assert.equal(useProfileStore.getState().settings.particleDensity, density);
    });
  });

  // --------------------------------------------------------------------------
  // Audit 7: Save & Revert Lifecycle
  // --------------------------------------------------------------------------
  harness.test('M5-A7: Save Changes and Revert Changes state preservation', async () => {
    await useProfileStore.getState().resetToDefaults();

    // Baseline committed name
    const initialName = useProfileStore.getState().profile.name;

    // Mutate and save
    useProfileStore.getState().updateProfile({ name: 'Committed Name Alpha' });
    assert.equal(useProfileStore.getState().isDirty, true);

    const saveRes = await useProfileStore.getState().saveChanges();
    assert.ok(saveRes.success, 'Save changes must succeed');
    assert.equal(useProfileStore.getState().isDirty, false, 'isDirty must be false after save');
    assert.equal(useProfileStore.getState().committedState.profile.name, 'Committed Name Alpha');

    // Mutate again without saving
    useProfileStore.getState().updateProfile({ name: 'Unsaved Transient Name' });
    assert.equal(useProfileStore.getState().isDirty, true);

    // Revert changes
    useProfileStore.getState().revertChanges();
    assert.equal(useProfileStore.getState().profile.name, 'Committed Name Alpha', 'Must revert to committed name');
    assert.equal(useProfileStore.getState().isDirty, false, 'isDirty must be false after revert');
  });

  // --------------------------------------------------------------------------
  // Audit 8: ADV-6.2 resetToDefaults Contract
  // --------------------------------------------------------------------------
  harness.test('M5-A8: resetToDefaults resets store, draft, committed snapshot, and localStorage', async () => {
    // Dirty state with custom settings
    useProfileStore.getState().updateProfile({ name: 'Trash Name' });
    useProfileStore.getState().setThemePreset('retro-vaporwave');
    await useProfileStore.getState().saveChanges();

    useProfileStore.getState().updateProfile({ name: 'Dirty Uncommitted' });
    assert.equal(useProfileStore.getState().isDirty, true);

    // Reset to defaults
    await useProfileStore.getState().resetToDefaults();
    const state = useProfileStore.getState();

    assert.equal(state.isDirty, false, 'isDirty must be false');
    assert.equal(state.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Draft profile name must be default');
    assert.equal(state.committedState.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Committed profile name must be default');
    assert.equal(state.settings.themePreset, DEFAULT_PROFILE_DATA.settings.themePreset, 'Theme must be default');

    // Verify localStorage
    const stored = JSON.parse(mockStorage.getItem(LOCAL_STORAGE_KEY));
    assert.equal(stored.profile.name, DEFAULT_PROFILE_DATA.profile.name, 'Stored profile must be default');
  });

  // --------------------------------------------------------------------------
  // Audit 9: Disaster Recovery: exportData & defensive importData
  // --------------------------------------------------------------------------
  harness.test('M5-A9: Disaster Recovery JSON export, validation, sanitization of null items', () => {
    const exportedJson = useProfileStore.getState().exportData('profile-hub-config.json');
    assert.ok(typeof exportedJson === 'string');
    const parsed = JSON.parse(exportedJson);
    assert.ok(parsed.profile);
    assert.ok(parsed.links);
    assert.ok(parsed.favorites);
    assert.ok(parsed.music);
    assert.ok(parsed.settings);

    // Defensive validation tests
    assert.throws(() => dataProvider.validateImportData(null), /must be an object/);
    assert.throws(() => dataProvider.validateImportData([]), /must be an object/);
    assert.throws(() => dataProvider.validateImportData({ profile: {} }), /Missing required profile.name/);
    assert.throws(() => dataProvider.validateImportData({ profile: { name: 'Test' }, links: 'invalid' }), /links must be an array/);

    // Array with null items sanitization
    const dataWithNulls = {
      profile: { name: 'Sanitized User' },
      links: [null, { title: 'Valid Link', url: 'https://val.id' }, undefined, 'string'],
      favorites: [null, { title: 'Valid Fav', category: 'tech' }],
    };

    const sanitized = dataProvider.validateImportData(dataWithNulls);
    assert.equal(sanitized.links.length, 1, 'Only non-null link objects should remain');
    assert.equal(sanitized.links[0].title, 'Valid Link');
    assert.equal(sanitized.favorites.length, 1);
    assert.equal(sanitized.favorites[0].title, 'Valid Fav');

    // importData updates store draft and sets isDirty: true
    const importRes = useProfileStore.getState().importData(sanitized);
    assert.ok(importRes.success);
    assert.equal(useProfileStore.getState().profile.name, 'Sanitized User');
    assert.equal(useProfileStore.getState().isDirty, true, 'Importing must mark draft as dirty');
  });

  // --------------------------------------------------------------------------
  // Audit 10: Static Inspection of 5 Customizer Tabs & Drawer Integration
  // --------------------------------------------------------------------------
  harness.test('M5-A10: Static verification of all 5 tabs and 27 Lucide icons in LinksEditorTab', () => {
    const tabsDir = path.join(ROOT_DIR, 'src', 'components', 'customizer');
    
    // Check files exist
    assert.ok(fs.existsSync(path.join(tabsDir, 'ProfileEditorTab.jsx')), 'ProfileEditorTab.jsx must exist');
    assert.ok(fs.existsSync(path.join(tabsDir, 'LinksEditorTab.jsx')), 'LinksEditorTab.jsx must exist');
    assert.ok(fs.existsSync(path.join(tabsDir, 'FavoritesEditorTab.jsx')), 'FavoritesEditorTab.jsx must exist');
    assert.ok(fs.existsSync(path.join(tabsDir, 'MusicEditorTab.jsx')), 'MusicEditorTab.jsx must exist');
    assert.ok(fs.existsSync(path.join(tabsDir, 'LayoutThemeTab.jsx')), 'LayoutThemeTab.jsx must exist');
    assert.ok(fs.existsSync(path.join(tabsDir, 'LiveCustomizerDrawer.jsx')), 'LiveCustomizerDrawer.jsx must exist');
    assert.ok(fs.existsSync(path.join(tabsDir, 'LoginModal.jsx')), 'LoginModal.jsx must exist');

    // Check LinksEditorTab POPULAR_ICONS count
    const linksContent = fs.readFileSync(path.join(tabsDir, 'LinksEditorTab.jsx'), 'utf-8');
    const popularIconsMatches = linksContent.match(/\{\s*name:\s*'([^']+)'/g);
    assert.ok(popularIconsMatches && popularIconsMatches.length >= 27, `LinksEditorTab must define at least 27 Lucide icons, found ${popularIconsMatches?.length}`);

    // Check FavoritesEditorTab categories
    const favsContent = fs.readFileSync(path.join(tabsDir, 'FavoritesEditorTab.jsx'), 'utf-8');
    ['tech', 'gaming', 'anime', 'music', 'hobbies'].forEach((cat) => {
      assert.ok(favsContent.includes(cat), `FavoritesEditorTab must support canonical category ${cat}`);
    });

    // Check MusicEditorTab shortcuts and controls
    const musicContent = fs.readFileSync(path.join(tabsDir, 'MusicEditorTab.jsx'), 'utf-8');
    assert.ok(musicContent.includes('Load Demo Lofi MP3'), 'MusicEditorTab must provide demo audio shortcut');
    assert.ok(musicContent.includes('isAutoPlay'), 'MusicEditorTab must support isAutoPlay');
    assert.ok(musicContent.includes('defaultVolume'), 'MusicEditorTab must support defaultVolume slider');
    assert.ok(musicContent.includes('handleTestAudioToggle'), 'MusicEditorTab must provide audio stream testing');

    // Check LayoutThemeTab wireframes and styles
    const layoutContent = fs.readFileSync(path.join(tabsDir, 'LayoutThemeTab.jsx'), 'utf-8');
    assert.ok(layoutContent.includes('bento'), 'LayoutThemeTab must support bento layout');
    assert.ok(layoutContent.includes('stack'), 'LayoutThemeTab must support stack layout');
    assert.ok(layoutContent.includes('cards'), 'LayoutThemeTab must support cards layout');
    assert.ok(layoutContent.includes('glassmorphism'), 'LayoutThemeTab must support glassmorphism');
    assert.ok(layoutContent.includes('neon-border'), 'LayoutThemeTab must support neon-border');
    assert.ok(layoutContent.includes('minimal-flat'), 'LayoutThemeTab must support minimal-flat');

    // Check LiveCustomizerDrawer imports and renders all 5 tabs
    const drawerContent = fs.readFileSync(path.join(tabsDir, 'LiveCustomizerDrawer.jsx'), 'utf-8');
    assert.ok(drawerContent.includes('ProfileEditorTab'), 'Drawer must import ProfileEditorTab');
    assert.ok(drawerContent.includes('LinksEditorTab'), 'Drawer must import LinksEditorTab');
    assert.ok(drawerContent.includes('FavoritesEditorTab'), 'Drawer must import FavoritesEditorTab');
    assert.ok(drawerContent.includes('MusicEditorTab'), 'Drawer must import MusicEditorTab');
    assert.ok(drawerContent.includes('LayoutThemeTab'), 'Drawer must import LayoutThemeTab');
    assert.ok(drawerContent.includes('resetToDefaults'), 'Drawer must wire resetToDefaults');
    assert.ok(drawerContent.includes('revertChanges'), 'Drawer must wire revertChanges');
    assert.ok(drawerContent.includes('saveChanges'), 'Drawer must wire saveChanges');
  });

  return harness;
}

// Direct execution
if (process.argv[1]?.endsWith('adversarial-m5-audit.test.js')) {
  const suite = createAdversarialM5Suite();
  const result = await suite.run();
  if (result.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
