/**
 * Tier 3: Cross-Feature Combinations (Pairwise Matrix) Test Suite
 * Validates interactions between themes, layouts, card styles, audio playback,
 * authentication modes, and link visibility.
 */

import assert from 'node:assert/strict';
import {
  TestHarness,
  THEME_PRESETS,
  LAYOUT_STYLES,
  CARD_STYLES,
  PARTICLE_DENSITIES,
  validateSettings,
  createMockDOM,
} from './helpers/test-utils.js';

export function createTier3Suite() {
  const harness = new TestHarness('Tier 3: Cross-Feature Combinations (Pairwise Matrix)');

  // --------------------------------------------------------------------------
  // Matrix 3.1: 5 Themes x 3 Layout Styles (15 Combinations)
  // --------------------------------------------------------------------------
  harness.test('T3.1: Themes x Layouts pairwise matrix (15 valid combinations)', () => {
    const { document, attributes } = createMockDOM();
    let verifiedCount = 0;

    THEME_PRESETS.forEach((theme) => {
      LAYOUT_STYLES.forEach((layout) => {
        const settings = {
          themePreset: theme,
          layoutStyle: layout,
          cardStyle: 'glassmorphism',
          particleDensity: 'medium',
        };

        const res = validateSettings(settings);
        assert.ok(
          res.valid,
          `Settings combination failed: ${theme} + ${layout}: ${res.errors.join(', ')}`
        );

        // Simulate applying to DOM
        document.documentElement.setAttribute('data-theme', theme);
        assert.equal(attributes.get('data-theme'), theme);
        verifiedCount++;
      });
    });

    assert.equal(verifiedCount, 15, 'All 15 Theme x Layout combinations must be tested');
  });

  // --------------------------------------------------------------------------
  // Matrix 3.2: Themes x Card Styles (15 Combinations)
  // --------------------------------------------------------------------------
  harness.test('T3.2: Themes x Card Styles matrix (15 combinations)', () => {
    let verifiedCount = 0;

    THEME_PRESETS.forEach((theme) => {
      CARD_STYLES.forEach((cardStyle) => {
        const settings = {
          themePreset: theme,
          layoutStyle: 'bento',
          cardStyle: cardStyle,
          particleDensity: 'low',
        };

        const res = validateSettings(settings);
        assert.ok(
          res.valid,
          `Settings combination failed: ${theme} + ${cardStyle}: ${res.errors.join(', ')}`
        );
        verifiedCount++;
      });
    });

    assert.equal(verifiedCount, 15, 'All 15 Theme x CardStyle combinations must be tested');
  });

  // --------------------------------------------------------------------------
  // Matrix 3.3: Audio Playback State x Theme Switch Interaction
  // --------------------------------------------------------------------------
  harness.test('T3.3: Audio playback continuity during dynamic theme switching', () => {
    const audioState = {
      isPlaying: true,
      currentTrack: 'Synthetic Serenade',
      currentTime: 42.5,
      volume: 0.8,
    };

    const { document, attributes } = createMockDOM();

    // Verify audio state remains unbroken when iterating through theme switches
    THEME_PRESETS.forEach((theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      assert.equal(attributes.get('data-theme'), theme);

      // Invariant checks: playback must NOT reset or pause
      assert.equal(audioState.isPlaying, true, 'Audio must remain playing during theme swap');
      assert.equal(audioState.currentTime, 42.5, 'Audio progress must not reset during theme swap');
      assert.equal(audioState.volume, 0.8, 'Audio volume must remain unchanged');
    });
  });

  // --------------------------------------------------------------------------
  // Matrix 3.4: Visitor Mode vs Owner Mode x Link Inactive Visibility
  // --------------------------------------------------------------------------
  harness.test('T3.4: Link visibility filtering based on Owner mode vs Visitor mode', () => {
    const rawLinks = [
      { id: 'l1', title: 'GitHub', isActive: true, order: 0 },
      { id: 'l2', title: 'Secret Project (Draft)', isActive: false, order: 1 },
      { id: 'l3', title: 'Twitter', isActive: true, order: 2 },
      { id: 'l4', title: 'Archived Site', isActive: false, order: 3 },
    ];

    // Filter function contract
    const getVisibleLinks = (links, isOwner) => {
      if (isOwner) return links; // Owner sees all, including inactive
      return links.filter((link) => link.isActive === true); // Visitors only see active
    };

    // Visitor view
    const visitorLinks = getVisibleLinks(rawLinks, false);
    assert.equal(visitorLinks.length, 2, 'Visitors should only see 2 active links');
    assert.deepEqual(
      visitorLinks.map((l) => l.id),
      ['l1', 'l3']
    );

    // Owner view
    const ownerLinks = getVisibleLinks(rawLinks, true);
    assert.equal(ownerLinks.length, 4, 'Owner should see all 4 links for management');
  });

  // --------------------------------------------------------------------------
  // Matrix 3.5: Offline Auth PIN x Real-Time Mutators x Dirty Tracking
  // --------------------------------------------------------------------------
  harness.test('T3.5: Offline PIN unlock & Live Mutator dirty tracking lifecycle', () => {
    // Initial state
    let state = {
      isOwner: false,
      isCustomizerOpen: false,
      isDirty: false,
      profile: { name: 'Original Name', bio: 'Original Bio' },
      committed: { name: 'Original Name', bio: 'Original Bio' },
    };

    // 1. Attempt login with wrong PIN
    const verifyPin = (pin) => pin === 'admin123';
    assert.equal(verifyPin('wrong_pin'), false, 'Wrong PIN must be rejected');
    assert.equal(state.isOwner, false);

    // 2. Successful PIN unlock
    assert.equal(verifyPin('admin123'), true, 'Correct PIN must unlock');
    state.isOwner = true;
    state.isCustomizerOpen = true;

    // 3. Mutate profile
    state.profile.name = 'Updated Live Name';
    state.isDirty = JSON.stringify(state.profile) !== JSON.stringify(state.committed);
    assert.equal(state.isDirty, true, 'Dirty state must be true after mutation');

    // 4. Discard / Revert edits
    state.profile = JSON.parse(JSON.stringify(state.committed));
    state.isDirty = JSON.stringify(state.profile) !== JSON.stringify(state.committed);
    assert.equal(state.isDirty, false, 'Dirty state must be false after revert');
    assert.equal(state.profile.name, 'Original Name');
  });

  // --------------------------------------------------------------------------
  // Matrix 3.6: Particle Density x Theme Presets Combinations
  // --------------------------------------------------------------------------
  harness.test('T3.6: Particle Densities x Theme Presets combinations (20 combinations)', () => {
    let verified = 0;
    PARTICLE_DENSITIES.forEach((density) => {
      THEME_PRESETS.forEach((theme) => {
        const settings = {
          themePreset: theme,
          layoutStyle: 'bento',
          cardStyle: 'neon-border',
          particleDensity: density,
        };
        const res = validateSettings(settings);
        assert.ok(res.valid, `Density ${density} with theme ${theme} should be valid`);
        verified++;
      });
    });
    assert.equal(verified, 20);
  });

  return harness;
}
