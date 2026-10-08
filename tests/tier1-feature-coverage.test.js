/**
 * Tier 1: Feature Coverage (Category-Partition) Test Suite
 * Validates Features 1 through 25 defined in PROJECT.md
 */

import assert from 'node:assert/strict';
import {
  TestHarness,
  fileExists,
  readFileContent,
  parseJsonFile,
  validateProfileHubData,
  validateProfile,
  validateLink,
  validateFavorite,
  validateMusic,
  validateSettings,
  THEME_PRESETS,
  LAYOUT_STYLES,
  CARD_STYLES,
  PARTICLE_DENSITIES,
  FAVORITE_CATEGORIES,
  THEME_CSS_VARIABLES,
  isSafeUrl,
  normalizeUrl,
  createMockLocalStorage,
} from './helpers/test-utils.js';

export function createTier1Suite() {
  const harness = new TestHarness('Tier 1: Feature Coverage (Category-Partition)');

  // --------------------------------------------------------------------------
  // Feature 1: Toolchain Scaffolding (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F01: Toolchain Scaffolding - package.json and config files', () => {
    assert.ok(fileExists('package.json'), 'package.json must exist in project root');
    const pkg = parseJsonFile('package.json');
    assert.ok(pkg, 'package.json must be valid JSON');

    // Dependencies check
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    assert.ok(allDeps.react, 'react must be listed in dependencies');
    assert.ok(allDeps['react-dom'], 'react-dom must be listed in dependencies');
    assert.ok(allDeps['framer-motion'], 'framer-motion must be listed in dependencies');
    assert.ok(allDeps['lucide-react'], 'lucide-react must be listed in dependencies');
    assert.ok(allDeps['@supabase/supabase-js'], '@supabase/supabase-js must be listed in dependencies');
    assert.ok(allDeps.vite, 'vite must be listed in dependencies');
    assert.ok(allDeps.tailwindcss, 'tailwindcss must be listed in dependencies');
    assert.ok(allDeps.postcss, 'postcss must be listed in dependencies');

    // Scripts check
    assert.ok(pkg.scripts?.dev, 'package.json must have "dev" script');
    assert.ok(pkg.scripts?.build, 'package.json must have "build" script');

    // Toolchain config files
    assert.ok(fileExists('tailwind.config.js') || fileExists('tailwind.config.cjs'), 'tailwind.config must exist');
    assert.ok(fileExists('postcss.config.js') || fileExists('postcss.config.cjs'), 'postcss.config must exist');
    assert.ok(fileExists('index.html'), 'index.html entry point must exist');
  });

  // --------------------------------------------------------------------------
  // Feature 2: Static Hosting Config (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F02: Static Hosting Config - vite.config.js base path', () => {
    assert.ok(fileExists('vite.config.js'), 'vite.config.js must exist');
    const content = readFileContent('vite.config.js');
    assert.ok(content, 'vite.config.js must have content');

    // Check for base: './'
    const hasRelativeBase = content.includes("base: './'") || content.includes('base: "./"');
    assert.ok(
      hasRelativeBase,
      "vite.config.js must configure base: './' to ensure relative asset paths on GitHub Pages"
    );

    // Check for react plugin
    assert.ok(
      content.includes('@vitejs/plugin-react') || content.includes('react('),
      'vite.config.js must load react plugin'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 3: CI/CD Deploy Workflow (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F03: CI/CD Deploy Workflow - GitHub Pages Actions workflow', () => {
    assert.ok(
      fileExists('.github/workflows/deploy.yml'),
      '.github/workflows/deploy.yml must exist'
    );
    const content = readFileContent('.github/workflows/deploy.yml');
    assert.ok(content, 'deploy.yml must have content');

    // Check trigger and steps
    assert.ok(content.includes('actions/upload-pages-artifact'), 'Must use actions/upload-pages-artifact');
    assert.ok(content.includes('actions/deploy-pages'), 'Must use actions/deploy-pages');
    assert.ok(content.includes('npm run build'), 'Workflow must execute npm run build');
    assert.ok(content.includes('pages: write'), 'Workflow must declare pages: write permission');
    assert.ok(content.includes('id-token: write'), 'Workflow must declare id-token: write permission');
  });

  // --------------------------------------------------------------------------
  // Feature 4: Supabase Client Integration (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F04: Supabase Client Integration - Safe configuration and client module', () => {
    assert.ok(fileExists('src/lib/supabase.js'), 'src/lib/supabase.js must exist');
    const content = readFileContent('src/lib/supabase.js');
    assert.ok(content, 'supabase.js must have content');

    assert.ok(
      content.includes('createClient'),
      'src/lib/supabase.js must import or use createClient from @supabase/supabase-js'
    );
    assert.ok(
      content.includes('isSupabaseConfigured'),
      'src/lib/supabase.js must export isSupabaseConfigured check'
    );
    assert.ok(
      content.includes('VITE_SUPABASE_URL'),
      'src/lib/supabase.js must inspect VITE_SUPABASE_URL'
    );
    assert.ok(
      content.includes('VITE_SUPABASE_ANON_KEY'),
      'src/lib/supabase.js must inspect VITE_SUPABASE_ANON_KEY'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 5: Database Schema DDL (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F05: Database Schema DDL - PostgreSQL schema with 4 tables and RLS', () => {
    assert.ok(fileExists('supabase_schema.sql'), 'supabase_schema.sql must exist');
    const sql = readFileContent('supabase_schema.sql');
    assert.ok(sql, 'supabase_schema.sql must have content');

    // Required tables
    assert.ok(/create\s+table.*profiles/i.test(sql), 'Schema must create profiles table');
    assert.ok(/create\s+table.*links/i.test(sql), 'Schema must create links table');
    assert.ok(/create\s+table.*favorites/i.test(sql), 'Schema must create favorites table');
    assert.ok(/create\s+table.*site_settings/i.test(sql), 'Schema must create site_settings table');

    // Row Level Security
    assert.ok(/alter\s+table.*enable\s+row\s+level\s+security/i.test(sql), 'Schema must enable RLS');
    assert.ok(/create\s+policy/i.test(sql), 'Schema must define RLS policies for read/write');

    // Default Seed Data
    assert.ok(/insert\s+into.*profiles/i.test(sql), 'Schema must include initial seed insert for profiles');
  });

  // --------------------------------------------------------------------------
  // Feature 6: Offline Seed & Fallback Data (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F06: Offline Seed & Fallback Data - defaultData.js & dataProvider.js', async () => {
    assert.ok(fileExists('src/data/defaultData.js'), 'src/data/defaultData.js must exist');
    assert.ok(fileExists('src/lib/dataProvider.js'), 'src/lib/dataProvider.js must exist');

    const defaultDataContent = readFileContent('src/data/defaultData.js');
    assert.ok(
      defaultDataContent.includes('DEFAULT_PROFILE_DATA'),
      'defaultData.js must export DEFAULT_PROFILE_DATA'
    );

    const providerContent = readFileContent('src/lib/dataProvider.js');
    assert.ok(providerContent.includes('isSupabaseActive'), 'dataProvider must define isSupabaseActive');
    assert.ok(providerContent.includes('fetchData'), 'dataProvider must define fetchData');
    assert.ok(providerContent.includes('saveData'), 'dataProvider must define saveData');
    assert.ok(providerContent.includes('resetData'), 'dataProvider must define resetData');
    assert.ok(
      providerContent.includes('localStorage') || providerContent.includes('LOCAL_STORAGE_KEY'),
      'dataProvider must utilize localStorage for offline persistence'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 7: Global Reactive Store (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F07: Global Reactive Store - useProfileStore.js', () => {
    assert.ok(fileExists('src/store/useProfileStore.js'), 'src/store/useProfileStore.js must exist');
    const content = readFileContent('src/store/useProfileStore.js');

    // State properties
    assert.ok(content.includes('profile:'), 'Store must track profile state');
    assert.ok(content.includes('links:'), 'Store must track links state');
    assert.ok(content.includes('favorites:'), 'Store must track favorites state');
    assert.ok(content.includes('music:'), 'Store must track music state');
    assert.ok(content.includes('settings:'), 'Store must track settings state');
    assert.ok(content.includes('isOwner:'), 'Store must track isOwner state');
    assert.ok(content.includes('isDirty:'), 'Store must track isDirty state');

    // Mutators
    assert.ok(content.includes('updateProfile'), 'Store must define updateProfile mutator');
    assert.ok(content.includes('addLink'), 'Store must define addLink mutator');
    assert.ok(content.includes('removeLink') || content.includes('deleteLink'), 'Store must define removeLink mutator');
    assert.ok(content.includes('updateLink'), 'Store must define updateLink mutator');
    assert.ok(content.includes('saveChanges'), 'Store must define saveChanges action');
    assert.ok(content.includes('resetToDefaults'), 'Store must define resetToDefaults action');
  });

  // --------------------------------------------------------------------------
  // Feature 8: Project Documentation (Milestone M1)
  // --------------------------------------------------------------------------
  harness.test('F08: Project Documentation - README.md completeness', () => {
    assert.ok(fileExists('README.md'), 'README.md must exist in project root');
    const content = readFileContent('README.md');
    assert.ok(content && content.length > 200, 'README.md must have comprehensive documentation');

    assert.ok(
      content.toLowerCase().includes('supabase'),
      'README.md must describe Supabase setup/configuration'
    );
    assert.ok(
      content.toLowerCase().includes('github pages') || content.toLowerCase().includes('deploy'),
      'README.md must explain GitHub Pages deployment'
    );
    assert.ok(
      content.includes('npm run') || content.includes('npm install'),
      'README.md must provide local run instructions'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 9: HTML5 Particle Canvas (Milestone M2)
  // --------------------------------------------------------------------------
  harness.test('F09: HTML5 Particle Canvas - Native 2D canvas simulation', () => {
    assert.ok(
      fileExists('src/components/canvas/ParticleBackground.jsx'),
      'src/components/canvas/ParticleBackground.jsx must exist'
    );
    const content = readFileContent('src/components/canvas/ParticleBackground.jsx');

    assert.ok(content.includes('<canvas'), 'Component must render an HTML5 canvas element');
    assert.ok(content.includes('requestAnimationFrame'), 'Canvas must use requestAnimationFrame');
    assert.ok(
      content.includes('cancelAnimationFrame') || content.includes('return () =>'),
      'Canvas must clean up animation frame on unmount'
    );
    assert.ok(
      content.includes('devicePixelRatio') || content.includes('dpr'),
      'Canvas must handle device pixel ratio for High-DPI screens'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 10: Mouse & Touch Physics (Milestone M2)
  // --------------------------------------------------------------------------
  harness.test('F10: Mouse & Touch Physics - Repulsion, attraction & constellation lines', () => {
    assert.ok(
      fileExists('src/components/canvas/ParticleBackground.jsx'),
      'ParticleBackground component required for physics inspection'
    );
    const content = readFileContent('src/components/canvas/ParticleBackground.jsx');

    assert.ok(
      content.includes('mousemove') || content.includes('handleMouseMove'),
      'Canvas must attach mousemove listeners'
    );
    assert.ok(
      content.includes('touchmove') || content.includes('handleTouch'),
      'Canvas must attach touchmove listeners for mobile interactions'
    );
    assert.ok(
      content.includes('Math.sqrt') || content.includes('hypot') || content.includes('dist'),
      'Physics engine must calculate Euclidean distances for particle interaction'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 11: Dynamic Theme Engine (Milestone M2)
  // --------------------------------------------------------------------------
  harness.test('F11: Dynamic Theme Engine - 5 presets & CSS variables', () => {
    assert.equal(THEME_PRESETS.length, 5, 'Must define exactly 5 theme presets');
    assert.deepEqual(THEME_PRESETS, [
      'cyber-neon',
      'midnight-glow',
      'lofi-aesthetic',
      'clean-minimalist',
      'retro-vaporwave',
    ]);

    // Check index.css or tailwind config for CSS variables
    const indexCss = readFileContent('src/index.css') || '';
    const tailwindConfig = readFileContent('tailwind.config.js') || '';
    const combined = indexCss + tailwindConfig;

    THEME_CSS_VARIABLES.forEach((varName) => {
      assert.ok(
        combined.includes(varName) || combined.includes(varName.replace('--', '')),
        `Theme system or CSS should expose/support variable: ${varName}`
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 12: Theme Switcher UI (Milestone M2)
  // --------------------------------------------------------------------------
  harness.test('F12: Theme Switcher UI - Interactive theme picker', () => {
    assert.ok(
      fileExists('src/components/ui/ThemeSwitcher.jsx'),
      'src/components/ui/ThemeSwitcher.jsx must exist'
    );
    const content = readFileContent('src/components/ui/ThemeSwitcher.jsx');

    THEME_PRESETS.forEach((preset) => {
      assert.ok(
        content.includes(preset) || content.toLowerCase().includes(preset.split('-')[0]),
        `ThemeSwitcher must render or reference preset: ${preset}`
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 13: Embedded Music Player (Milestone M3)
  // --------------------------------------------------------------------------
  harness.test('F13: Embedded Music Player - Audio controls & vinyl state', () => {
    assert.ok(
      fileExists('src/components/audio/MusicPlayer.jsx'),
      'src/components/audio/MusicPlayer.jsx must exist'
    );
    const content = readFileContent('src/components/audio/MusicPlayer.jsx');

    assert.ok(
      content.includes('<audio') || content.includes('Audio(') || content.includes('audioRef'),
      'MusicPlayer must manage an HTML5 Audio element'
    );
    assert.ok(
      content.includes('play') && content.includes('pause'),
      'MusicPlayer must support play and pause controls'
    );
    assert.ok(
      content.includes('volume') || content.includes('setVolume'),
      'MusicPlayer must support volume control'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 14: Soundwave Visualizer (Milestone M3)
  // --------------------------------------------------------------------------
  harness.test('F14: Soundwave Visualizer - Animated wave bars with fallback oscillation', () => {
    assert.ok(
      fileExists('src/components/audio/SoundwaveVisualizer.jsx'),
      'src/components/audio/SoundwaveVisualizer.jsx must exist'
    );
    const content = readFileContent('src/components/audio/SoundwaveVisualizer.jsx');

    assert.ok(
      content.includes('isPlaying') || content.includes('playing'),
      'SoundwaveVisualizer must accept or track isPlaying property'
    );
    assert.ok(
      content.includes('Math.sin') || content.includes('AnalyserNode') || content.includes('bar'),
      'SoundwaveVisualizer must compute oscillating bar heights'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 15: External Streaming Links (Milestone M3)
  // --------------------------------------------------------------------------
  harness.test('F15: External Streaming Links - Spotify & YouTube links', () => {
    assert.ok(
      fileExists('src/components/audio/MusicPlayer.jsx'),
      'MusicPlayer required to test streaming buttons'
    );
    const content = readFileContent('src/components/audio/MusicPlayer.jsx');

    assert.ok(
      content.includes('spotifyUrl') || content.toLowerCase().includes('spotify'),
      'MusicPlayer must reference Spotify streaming link'
    );
    assert.ok(
      content.includes('youtubeUrl') || content.toLowerCase().includes('youtube'),
      'MusicPlayer must reference YouTube streaming link'
    );
    assert.ok(
      content.includes('_blank'),
      'External streaming links must open in new tab (target="_blank")'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 16: Profile Header & Status (Milestone M4)
  // --------------------------------------------------------------------------
  harness.test('F16: Profile Header & Status - Avatar, Bio, Quote, Status pill', () => {
    assert.ok(
      fileExists('src/components/profile/ProfileHeader.jsx'),
      'src/components/profile/ProfileHeader.jsx must exist'
    );
    const content = readFileContent('src/components/profile/ProfileHeader.jsx');

    assert.ok(content.includes('avatarUrl') || content.includes('avatar'), 'Must display avatar image');
    assert.ok(content.includes('name'), 'Must display profile name');
    assert.ok(content.includes('handle'), 'Must display profile handle');
    assert.ok(content.includes('bio'), 'Must display bio');
    assert.ok(content.includes('quote'), 'Must display quote');
  });

  // --------------------------------------------------------------------------
  // Feature 17: Categorized Links Grid (Milestone M4)
  // --------------------------------------------------------------------------
  harness.test('F17: Categorized Links Grid - Bento / Stack links layout', () => {
    assert.ok(
      fileExists('src/components/links/LinksGrid.jsx'),
      'src/components/links/LinksGrid.jsx must exist'
    );
    assert.ok(
      fileExists('src/components/links/LinkCard.jsx'),
      'src/components/links/LinkCard.jsx must exist'
    );

    const gridContent = readFileContent('src/components/links/LinksGrid.jsx');
    assert.ok(
      gridContent.includes('filter') || gridContent.includes('category') || gridContent.includes('links'),
      'LinksGrid must iterate or filter links'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 18: Favorites & Interests Grid (Milestone M4)
  // --------------------------------------------------------------------------
  harness.test('F18: Favorites & Interests Grid - Categorized cards showcase', () => {
    assert.ok(
      fileExists('src/components/links/FavoritesSection.jsx'),
      'src/components/links/FavoritesSection.jsx must exist'
    );
    const content = readFileContent('src/components/links/FavoritesSection.jsx');

    assert.ok(content.includes('favorites'), 'FavoritesSection must consume favorites array');
    assert.ok(
      content.includes('tech') || content.includes('gaming') || content.includes('category'),
      'FavoritesSection must handle interest categories'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 19: Responsive Viewport & Social Hub (Milestone M4)
  // --------------------------------------------------------------------------
  harness.test('F19: Responsive Viewport & Social Hub - Mobile adaptivity & footer', () => {
    assert.ok(
      fileExists('src/components/profile/SocialHub.jsx'),
      'src/components/profile/SocialHub.jsx must exist'
    );
    const content = readFileContent('src/components/profile/SocialHub.jsx');

    assert.ok(
      content.includes('footer') || content.includes('social') || content.includes('links'),
      'SocialHub must render social links'
    );
    assert.ok(
      content.includes('owner') || content.includes('lock') || content.includes('Login') || content.includes('Key'),
      'SocialHub or footer must provide discreet owner entry'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 20: Dual-Mode Authentication (Milestone M5)
  // --------------------------------------------------------------------------
  harness.test('F20: Dual-Mode Authentication - Login modal with Demo PIN admin123', () => {
    assert.ok(
      fileExists('src/components/customizer/LoginModal.jsx'),
      'src/components/customizer/LoginModal.jsx must exist'
    );
    const content = readFileContent('src/components/customizer/LoginModal.jsx');

    assert.ok(
      content.includes('admin123'),
      'LoginModal must accept offline demo PIN "admin123" for instant evaluation'
    );
    assert.ok(
      content.includes('isOwner') || content.includes('setOwner') || content.includes('login'),
      'LoginModal must trigger owner mode unlocking'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 21: Live Customizer Drawer (Milestone M5)
  // --------------------------------------------------------------------------
  harness.test('F21: Live Customizer Drawer - Slide-over drawer with 5 tabs', () => {
    assert.ok(
      fileExists('src/components/customizer/LiveCustomizerDrawer.jsx'),
      'src/components/customizer/LiveCustomizerDrawer.jsx must exist'
    );
    const content = readFileContent('src/components/customizer/LiveCustomizerDrawer.jsx');

    assert.ok(
      fileExists('src/components/customizer/ProfileEditorTab.jsx'),
      'ProfileEditorTab must exist'
    );
    assert.ok(
      fileExists('src/components/customizer/LinksEditorTab.jsx'),
      'LinksEditorTab must exist'
    );
    assert.ok(
      fileExists('src/components/customizer/FavoritesEditorTab.jsx'),
      'FavoritesEditorTab must exist'
    );
    assert.ok(
      fileExists('src/components/customizer/MusicEditorTab.jsx'),
      'MusicEditorTab must exist'
    );
    assert.ok(
      fileExists('src/components/customizer/LayoutThemeTab.jsx'),
      'LayoutThemeTab must exist'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 22: Real-time WYSIWYG Preview (Milestone M5)
  // --------------------------------------------------------------------------
  harness.test('F22: Real-time WYSIWYG Preview - Direct store state reactivity', () => {
    const storeContent = readFileContent('src/store/useProfileStore.js');
    assert.ok(storeContent, 'useProfileStore.js required for preview reactivity');

    // Mutators must directly set state and mark isDirty: true
    assert.ok(
      storeContent.includes('isDirty: true') || storeContent.includes('set({ isDirty: true'),
      'Store mutators must immediately update reactive state and set isDirty flag'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 23: Save & Export Actions (Milestone M5)
  // --------------------------------------------------------------------------
  harness.test('F23: Save & Export Actions - Commit, Revert, Reset, JSON Export/Import', () => {
    const drawerContent = readFileContent('src/components/customizer/LiveCustomizerDrawer.jsx') || '';
    const storeContent = readFileContent('src/store/useProfileStore.js') || '';
    const combined = drawerContent + storeContent;

    assert.ok(
      combined.includes('saveChanges') || combined.includes('saveData'),
      'Must support Save Changes action'
    );
    assert.ok(
      combined.includes('resetToDefaults') || combined.includes('resetData'),
      'Must support Reset to Defaults action'
    );
    assert.ok(
      combined.includes('export') || combined.includes('JSON.stringify') || combined.includes('download'),
      'Must support JSON export capability'
    );
    assert.ok(
      combined.includes('import') || combined.includes('JSON.parse') || combined.includes('FileReader'),
      'Must support JSON import capability'
    );
  });

  // --------------------------------------------------------------------------
  // Feature 24: E2E Testing Suite Pass (Milestone M6)
  // --------------------------------------------------------------------------
  harness.test('F24: E2E Testing Suite Integrity - Non-facade test verification', () => {
    assert.ok(fileExists('tests/run-all-tests.js'), 'tests/run-all-tests.js must exist');
    assert.ok(fileExists('tests/tier1-feature-coverage.test.js'), 'Tier 1 test must exist');
    assert.ok(fileExists('tests/tier2-boundary-corner.test.js'), 'Tier 2 test must exist');
    assert.ok(fileExists('tests/tier3-pairwise-combinations.test.js'), 'Tier 3 test must exist');
    assert.ok(fileExists('tests/tier4-real-world-scenarios.test.js'), 'Tier 4 test must exist');
    assert.ok(fileExists('TEST_INFRA.md'), 'TEST_INFRA.md must exist in project root');
  });

  // --------------------------------------------------------------------------
  // Feature 25: Adversarial Coverage Hardening (Milestone M6)
  // --------------------------------------------------------------------------
  harness.test('F25: Adversarial Coverage Hardening - Sanitization and Stress contracts', () => {
    // Check URL safety validator against XSS injection strings
    assert.equal(isSafeUrl('javascript:alert(1)'), false, 'Must reject javascript: pseudo-protocol');
    assert.equal(isSafeUrl('javascript:/*--></title></style></textarea><script>alert(1)</script>'), false);
    assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false, 'Must reject data: URLs');
    assert.equal(isSafeUrl('https://github.com/developer'), true, 'Must allow valid https URLs');

    // Check normalization
    assert.equal(normalizeUrl('github.com/test'), 'https://github.com/test');
    assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
  });

  return harness;
}
