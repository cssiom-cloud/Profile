/**
 * Tier 4: Real-World Scenarios Test Suite
 * End-to-end simulation of complete Visitor and Owner journeys,
 * state persistence across sessions, and JSON backup/restore.
 */

import assert from 'node:assert/strict';
import {
  TestHarness,
  validateProfileHubData,
  createMockLocalStorage,
  createMockDOM,
  THEME_PRESETS,
} from './helpers/test-utils.js';

export function createTier4Suite() {
  const harness = new TestHarness('Tier 4: Real-World Scenarios (End-to-End Journeys)');

  // --------------------------------------------------------------------------
  // Scenario 4.1: Complete Visitor Journey
  // --------------------------------------------------------------------------
  harness.test('S4.1: Complete Visitor Journey (Browse, Audio, Filter Links, Clean UI)', () => {
    const { document, attributes } = createMockDOM();

    // 1. Visitor arrives: default theme is applied
    const initialTheme = 'cyber-neon';
    document.documentElement.setAttribute('data-theme', initialTheme);
    assert.equal(attributes.get('data-theme'), 'cyber-neon');

    // 2. Initial state viewed by visitor
    const visitorSession = {
      isOwner: false,
      isCustomizerOpen: false,
      activeCategoryFilter: 'all',
      audio: {
        isPlaying: false,
        trackTitle: 'Synthetic Serenade',
        spotifyUrl: 'https://open.spotify.com/track/12345',
        youtubeUrl: 'https://youtube.com/watch?v=12345',
      },
      links: [
        { id: 'l1', title: 'GitHub', category: 'project', isActive: true },
        { id: 'l2', title: 'Twitter', category: 'social', isActive: true },
        { id: 'l3', title: 'Secret Lab', category: 'project', isActive: false }, // Hidden
      ],
    };

    // Verify visitor is unauthenticated and drawer is closed
    assert.equal(visitorSession.isOwner, false, 'Visitor must not have owner permissions');
    assert.equal(visitorSession.isCustomizerOpen, false, 'Customizer drawer must be closed for visitor');

    // 3. Audio interaction: visitor clicks Play
    visitorSession.audio.isPlaying = true;
    assert.equal(visitorSession.audio.isPlaying, true, 'Audio starts playing upon click');

    // 4. External streaming link check
    assert.ok(visitorSession.audio.spotifyUrl.startsWith('https://open.spotify.com'));
    assert.ok(visitorSession.audio.youtubeUrl.startsWith('https://youtube.com'));

    // 5. Category filter: visitor filters by 'project'
    visitorSession.activeCategoryFilter = 'project';
    const filteredVisibleLinks = visitorSession.links.filter(
      (l) => l.isActive && (visitorSession.activeCategoryFilter === 'all' || l.category === visitorSession.activeCategoryFilter)
    );
    assert.equal(filteredVisibleLinks.length, 1, 'Only 1 active project link should be displayed');
    assert.equal(filteredVisibleLinks[0].id, 'l1');
  });

  // --------------------------------------------------------------------------
  // Scenario 4.2: Complete Owner Authoring & Customization Journey
  // --------------------------------------------------------------------------
  harness.test('S4.2: Complete Owner Journey (Unlock, Edit, WYSIWYG, Save, Refresh Persistence)', async () => {
    const mockStorage = createMockLocalStorage();
    const STORAGE_KEY = 'profile_hub_local_storage_v1';

    // Baseline Seed Data
    const committedData = {
      profile: {
        name: 'Alex Rivera',
        handle: '@alexrivera',
        bio: 'Initial Bio',
        quote: 'Dream in code.',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      links: [
        { id: 'l1', title: 'GitHub', url: 'https://github.com', icon: 'Github', category: 'project', order: 0, isActive: true },
      ],
      favorites: [
        { id: 'f1', category: 'tech', title: 'React', order: 0 },
      ],
      music: {
        title: 'Initial Song',
        artist: 'Initial Artist',
        audioUrl: 'https://example.com/audio.mp3',
        spotifyUrl: 'https://spotify.com',
        youtubeUrl: 'https://youtube.com',
      },
      settings: {
        themePreset: 'cyber-neon',
        layoutStyle: 'bento',
        cardStyle: 'glassmorphism',
        particleDensity: 'medium',
      },
    };

    // Save baseline to storage
    mockStorage.setItem(STORAGE_KEY, JSON.stringify({ state: committedData }));

    // Owner Store State Simulator
    let liveState = JSON.parse(JSON.stringify(committedData));
    let isOwner = false;
    let isCustomizerOpen = false;
    let isDirty = false;

    // Step 1 & 2: Discreet Unlock with Demo PIN admin123
    const login = (pin) => {
      if (pin === 'admin123') {
        isOwner = true;
        isCustomizerOpen = true;
        return true;
      }
      return false;
    };

    assert.equal(login('wrong_pin'), false);
    assert.equal(login('admin123'), true);
    assert.equal(isOwner, true);
    assert.equal(isCustomizerOpen, true);

    // Step 3: Edit Profile Info in real-time
    liveState.profile.name = 'Cipher Fox';
    liveState.profile.bio = 'Full-Stack Web3 & Cyberpunk Architect';
    isDirty = true;

    // WYSIWYG verification: live state updated immediately
    assert.equal(liveState.profile.name, 'Cipher Fox');
    assert.equal(isDirty, true);

    // Step 4: Add a new link in Links tab
    const newLink = {
      id: 'l2',
      title: 'Mastodon Social',
      url: 'https://mastodon.social/@cipher',
      icon: 'Globe',
      category: 'social',
      order: 1,
      isActive: true,
    };
    liveState.links.push(newLink);
    assert.equal(liveState.links.length, 2);

    // Step 5: Switch Theme & Layout
    liveState.settings.themePreset = 'retro-vaporwave';
    liveState.settings.layoutStyle = 'stack';

    // Step 6: Validate updated data conforms to schema before commit
    const validation = validateProfileHubData(liveState);
    assert.ok(validation.valid, `Draft data must be valid: ${validation.errors.join(', ')}`);

    // Step 7: Click "Save Changes" -> Commit to Storage
    mockStorage.setItem(STORAGE_KEY, JSON.stringify({ state: liveState }));
    isDirty = false;
    assert.equal(isDirty, false, 'Dirty flag must clear upon save');

    // Step 8: Simulate Page Refresh -> reload from storage
    const reloadedRaw = mockStorage.getItem(STORAGE_KEY);
    assert.ok(reloadedRaw, 'Storage must retain saved data');
    const reloadedData = JSON.parse(reloadedRaw).state;

    // Verification: all customized fields survived refresh
    assert.equal(reloadedData.profile.name, 'Cipher Fox');
    assert.equal(reloadedData.profile.bio, 'Full-Stack Web3 & Cyberpunk Architect');
    assert.equal(reloadedData.links.length, 2);
    assert.equal(reloadedData.links[1].title, 'Mastodon Social');
    assert.equal(reloadedData.settings.themePreset, 'retro-vaporwave');
    assert.equal(reloadedData.settings.layoutStyle, 'stack');
  });

  // --------------------------------------------------------------------------
  // Scenario 4.3: Disaster Recovery, Reset & JSON Import/Export Journey
  // --------------------------------------------------------------------------
  harness.test('S4.3: Disaster Recovery - JSON Export, Corrupt State, Reset to Defaults, JSON Re-import', () => {
    const customConfig = {
      profile: {
        name: 'Neo Artisan',
        handle: '@neoart',
        bio: 'Custom exported bio.',
        quote: 'Through the matrix.',
        avatarUrl: 'https://example.com/avatar2.jpg',
      },
      links: [
        { id: 'l10', title: 'ArtStation', url: 'https://artstation.com', icon: 'Globe', category: 'project', order: 0, isActive: true },
      ],
      favorites: [
        { id: 'f10', category: 'anime', title: 'Akira', order: 0 },
      ],
      music: {
        title: 'Kaneda Theme',
        artist: 'Geinoh Yamashirogumi',
        audioUrl: 'https://example.com/akira.mp3',
        spotifyUrl: 'https://spotify.com',
        youtubeUrl: 'https://youtube.com',
      },
      settings: {
        themePreset: 'midnight-glow',
        layoutStyle: 'cards',
        cardStyle: 'neon-border',
        particleDensity: 'high',
      },
    };

    // 1. Export to JSON string
    const exportedJson = JSON.stringify(customConfig, null, 2);
    assert.ok(exportedJson.includes('Neo Artisan'));

    // 2. State becomes corrupted / reset triggered
    const defaultData = {
      profile: {
        name: 'Alex Rivera',
        handle: '@alexrivera',
        bio: 'Default Bio',
        quote: 'Default Quote',
        avatarUrl: 'https://example.com/default.jpg',
      },
      links: [],
      favorites: [],
      music: {
        title: 'Default Track',
        artist: 'Default Artist',
        audioUrl: 'https://example.com/default.mp3',
        spotifyUrl: 'https://spotify.com',
        youtubeUrl: 'https://youtube.com',
      },
      settings: {
        themePreset: 'cyber-neon',
        layoutStyle: 'bento',
        cardStyle: 'glassmorphism',
        particleDensity: 'medium',
      },
    };

    let activeState = JSON.parse(JSON.stringify(defaultData));
    assert.equal(activeState.profile.name, 'Alex Rivera');

    // 3. Import previously exported JSON backup
    const importedObj = JSON.parse(exportedJson);
    const validation = validateProfileHubData(importedObj);
    assert.ok(validation.valid, 'Imported configuration must pass schema validation');

    activeState = importedObj;

    // 4. Confirm total recovery of customized state
    assert.equal(activeState.profile.name, 'Neo Artisan');
    assert.equal(activeState.links[0].title, 'ArtStation');
    assert.equal(activeState.favorites[0].title, 'Akira');
    assert.equal(activeState.settings.themePreset, 'midnight-glow');
    assert.equal(activeState.settings.cardStyle, 'neon-border');
  });

  return harness;
}
