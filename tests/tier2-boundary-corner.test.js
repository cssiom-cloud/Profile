/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Validates empty values, extreme lengths, protocol security, storage errors, and fallbacks
 */

import assert from 'node:assert/strict';
import {
  TestHarness,
  validateProfileHubData,
  validateProfile,
  validateLink,
  validateFavorite,
  validateMusic,
  validateSettings,
  isSafeUrl,
  normalizeUrl,
  createMockLocalStorage,
  createMockDOM,
  THEME_PRESETS,
} from './helpers/test-utils.js';

export function createTier2Suite() {
  const harness = new TestHarness('Tier 2: Boundary & Corner Cases');

  // --------------------------------------------------------------------------
  // Test 2.1: Missing Optional Fields & Empty String Boundaries
  // --------------------------------------------------------------------------
  harness.test('T2.1: Missing optional fields in Profile should validate gracefully', () => {
    // Valid profile with optional fields missing
    const minimalProfile = {
      name: 'Elena Rostova',
      handle: '@elena',
      bio: 'Cyberpunk Sound Designer',
      quote: 'Echoes in the neon.',
      avatarUrl: 'https://example.com/avatar.jpg',
    };
    const res = validateProfile(minimalProfile);
    assert.ok(res.valid, `Minimal profile should be valid: ${res.errors.join(', ')}`);

    // Invalid profile: empty name
    const invalidName = { ...minimalProfile, name: '   ' };
    assert.equal(validateProfile(invalidName).valid, false, 'Empty name must be rejected');

    // Invalid profile: handle without @
    const invalidHandle = { ...minimalProfile, handle: 'elena_no_at' };
    assert.equal(validateProfile(invalidHandle).valid, false, 'Handle without @ must be rejected');
  });

  // --------------------------------------------------------------------------
  // Test 2.2: Extreme String Length Stress (Bio, Quote, Name)
  // --------------------------------------------------------------------------
  harness.test('T2.2: Extreme string lengths handling and serialization', () => {
    const hugeBio = 'A'.repeat(2000);
    const hugeQuote = 'Q'.repeat(500);
    const hugeName = 'N'.repeat(250);

    const stressProfile = {
      name: hugeName,
      handle: '@stress',
      bio: hugeBio,
      quote: hugeQuote,
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    const res = validateProfile(stressProfile);
    assert.ok(res.valid, 'Extreme string lengths within valid type should pass schema validation');

    // Serialization check
    const serialized = JSON.stringify(stressProfile);
    const deserialized = JSON.parse(serialized);
    assert.equal(deserialized.bio.length, 2000);
    assert.equal(deserialized.quote.length, 500);
  });

  // --------------------------------------------------------------------------
  // Test 2.3: Zero Links (Empty List Boundary)
  // --------------------------------------------------------------------------
  harness.test('T2.3: Zero links empty state handling', () => {
    const emptyLinksData = {
      profile: {
        name: 'Neo',
        handle: '@neo',
        bio: 'The One',
        quote: 'Wake up.',
        avatarUrl: 'https://example.com/neo.jpg',
      },
      links: [], // Zero links
      favorites: [],
      music: {
        title: 'Clubbed to Death',
        artist: 'Rob Dougan',
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

    const res = validateProfileHubData(emptyLinksData);
    assert.ok(res.valid, `Empty links and favorites arrays must be valid schema states: ${res.errors.join(', ')}`);
  });

  // --------------------------------------------------------------------------
  // Test 2.4: Large Collection Volume (50+ Links Stress)
  // --------------------------------------------------------------------------
  harness.test('T2.4: High link count volume (50+ links) indexing and ordering', () => {
    const linksCount = 60;
    const manyLinks = Array.from({ length: linksCount }, (_, i) => ({
      id: `link-stress-${i}`,
      title: `Project Link #${i + 1}`,
      url: `https://example.com/project/${i + 1}`,
      icon: 'Globe',
      category: i % 2 === 0 ? 'project' : 'social',
      order: i,
      isActive: true,
      highlightColor: i === 0 ? '#00f2fe' : undefined,
    }));

    assert.equal(manyLinks.length, 60);
    manyLinks.forEach((link, idx) => {
      const res = validateLink(link, idx);
      assert.ok(res.valid, `Link ${idx} failed validation: ${res.errors.join(', ')}`);
      assert.equal(link.order, idx, `Link ${idx} order must match index`);
    });
  });

  // --------------------------------------------------------------------------
  // Test 2.5: URL Protocol Security & Injection Sanitization
  // --------------------------------------------------------------------------
  harness.test('T2.5: URL protocol safety and normalization against malicious schemes', () => {
    const maliciousUrls = [
      'javascript:alert(document.cookie)',
      'JAVASCRIPT:console.log("XSS")',
      'javascript:/*--></title></style></textarea><script>alert(1)</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox("test")',
      'file:///etc/passwd',
      'file://C:\\Windows\\System32\\calc.exe',
    ];

    maliciousUrls.forEach((url) => {
      assert.equal(isSafeUrl(url), false, `Should reject unsafe scheme: ${url}`);
    });

    const validUrls = [
      'https://github.com/myportfolio',
      'http://localhost:5173',
      'https://spotify.com/track/12345',
      'https://youtube.com/watch?v=abcd',
    ];

    validUrls.forEach((url) => {
      assert.equal(isSafeUrl(url), true, `Should accept safe URL: ${url}`);
    });

    // Auto-prefixing behavior
    assert.equal(normalizeUrl('github.com'), 'https://github.com');
    assert.equal(normalizeUrl('twitter.com/dev'), 'https://twitter.com/dev');
    assert.equal(normalizeUrl('http://myblog.io'), 'http://myblog.io');
  });

  // --------------------------------------------------------------------------
  // Test 2.6: Audio Stream Error & Fallback Synthetic Visualizer Math
  // --------------------------------------------------------------------------
  harness.test('T2.6: Synthetic harmonic oscillation fallback for soundwave visualizer', () => {
    // When Web Audio API is restricted or audio source has CORS issues,
    // the visualizer must compute synthetic wave heights without crashing.
    const barCount = 24;
    const time = 1200; // ms

    const computeSyntheticHeights = (isPlaying, t) => {
      if (!isPlaying) {
        // Resting baseline: uniform minimal height
        return Array.from({ length: barCount }, () => 15); // 15%
      }
      return Array.from({ length: barCount }, (_, i) => {
        // Harmonic combination of 2 frequencies
        const wave1 = Math.sin((t / 200) + (i * 0.4));
        const wave2 = Math.cos((t / 350) + (i * 0.2));
        const normalized = (wave1 + wave2 + 2) / 4; // range [0, 1]
        return Math.max(15, Math.min(100, Math.round(normalized * 85 + 15)));
      });
    };

    const restingBars = computeSyntheticHeights(false, time);
    assert.equal(restingBars.length, barCount);
    restingBars.forEach((h) => assert.equal(h, 15, 'Resting bars should be baseline height'));

    const activeBars = computeSyntheticHeights(true, time);
    assert.equal(activeBars.length, barCount);
    activeBars.forEach((h) => {
      assert.ok(h >= 15 && h <= 100, `Bar height ${h} must remain clamped between 15% and 100%`);
    });
  });

  // --------------------------------------------------------------------------
  // Test 2.7: LocalStorage Quota Exceeded & Incognito Fallback
  // --------------------------------------------------------------------------
  harness.test('T2.7: Storage QuotaExceededError and Disabled Storage resiliency', () => {
    const mockStorage = createMockLocalStorage({ quotaExceeded: true });

    let writeSucceeded = false;
    let handledError = false;

    try {
      mockStorage.setItem('key', 'large_value');
      writeSucceeded = true;
    } catch (err) {
      handledError = true;
      assert.ok(err.message.includes('QuotaExceededError'));
    }

    assert.equal(writeSucceeded, false);
    assert.equal(handledError, true, 'QuotaExceededError should be caught cleanly');

    // Disabled mode (private browser setting)
    const disabledStorage = createMockLocalStorage({ disabled: true });
    assert.throws(() => disabledStorage.getItem('key'), /SecurityError/);
  });

  // --------------------------------------------------------------------------
  // Test 2.8: Broken / Unreachable Avatar Image Fallback Spec
  // --------------------------------------------------------------------------
  harness.test('T2.8: Broken avatar image fallback generation', () => {
    const generateAvatarFallback = (name) => {
      if (!name || typeof name !== 'string') return '??';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    assert.equal(generateAvatarFallback('Alex Rivera'), 'AR');
    assert.equal(generateAvatarFallback('Kavinsky'), 'KA');
    assert.equal(generateAvatarFallback(''), '??');
    assert.equal(generateAvatarFallback(null), '??');
  });

  // --------------------------------------------------------------------------
  // Test 2.9: Corrupted or Malformed JSON Import Handling
  // --------------------------------------------------------------------------
  harness.test('T2.9: Malformed JSON import error detection and protection', () => {
    const malformedJsonStrings = [
      '{ invalid: json syntax ',
      'null',
      '{"profile": "not an object"}',
      '{"profile": {"name": ""}, "links": "not array"}',
      '{"settings": {"themePreset": "unsupported-rainbow-theme"}}',
    ];

    malformedJsonStrings.forEach((raw) => {
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Syntax error caught
        assert.ok(true, 'JSON syntax error caught safely');
        return;
      }

      // If syntax is valid JSON, schema validation must reject it
      const validation = validateProfileHubData(parsed);
      assert.equal(validation.valid, false, `Schema validation must catch invalid schema: ${raw}`);
      assert.ok(validation.errors.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // Test 2.10: Supabase Client Fallback when Keys are Missing or Placeholders
  // --------------------------------------------------------------------------
  harness.test('T2.10: Safe client configuration check logic', () => {
    const isConfiguredCheck = (url, key) => {
      return (
        typeof url === 'string' &&
        url.trim() !== '' &&
        !url.includes('YOUR_SUPABASE_URL') &&
        !url.includes('placeholder') &&
        typeof key === 'string' &&
        key.trim() !== '' &&
        !key.includes('YOUR_SUPABASE_ANON_KEY')
      );
    };

    assert.equal(isConfiguredCheck(undefined, undefined), false);
    assert.equal(isConfiguredCheck('', ''), false);
    assert.equal(isConfiguredCheck('https://YOUR_SUPABASE_URL.supabase.co', 'YOUR_SUPABASE_ANON_KEY'), false);
    assert.equal(isConfiguredCheck('https://xyz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'), true);
  });

  // --------------------------------------------------------------------------
  // Test 2.11: Rapid Theme Switching Stress Test
  // --------------------------------------------------------------------------
  harness.test('T2.11: Rapid theme switching DOM stress', () => {
    const { document, attributes } = createMockDOM();

    // Rapidly switch themes 50 times
    for (let i = 0; i < 50; i++) {
      const theme = THEME_PRESETS[i % THEME_PRESETS.length];
      document.documentElement.setAttribute('data-theme', theme);
    }

    const finalTheme = attributes.get('data-theme');
    const expectedFinalTheme = THEME_PRESETS[49 % THEME_PRESETS.length];
    assert.equal(finalTheme, expectedFinalTheme, 'Final theme attribute must match last set preset');
  });

  return harness;
}
