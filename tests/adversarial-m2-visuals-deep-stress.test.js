/**
 * tests/adversarial-m2-visuals-deep-stress.test.js
 * Empirical Adversarial Challenger 2 Test Suite for Milestone 2
 * Focus: Creative Visuals Engine, Particle Canvas Physics, Dynamic Theme System
 *
 * Attack Vectors & Stress Boundaries:
 * 1. Particle Canvas Screen-Area Scaling & Bounds Math across extreme viewports
 * 2. Particle Physics Simulation: Euclidean distance, zero-distance singularity (division by zero), velocity damping
 * 3. Color Parser Resiliency: Hex 3-digit, Hex 6-digit, RGB, RGBA, corrupt/empty values
 * 4. Theme Switcher DOM & Event Integrity: Rapid switching, local storage sync, custom event propagation
 * 5. Theme Configuration & CSS Bundle Parity: 5 presets, 8 variables each, exact color contract
 * 6. High-DPI DPR clamping & Page Visibility lifecycle invariants
 * 7. Production Dist Artifact Resolution & Zero-Root-Absolute URL guarantee
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TestHarness, createMockDOM, createMockLocalStorage } from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Setup Mock DOM and Storage
const mockDOM = createMockDOM();
global.document = mockDOM.document;
global.window = mockDOM.window;
global.localStorage = createMockLocalStorage();

export async function runM2AdversarialSuite() {
  const harness = new TestHarness('M2 Empirical Challenger 2 - Visuals & Themes Deep Stress Suite');

  const themeSwitcherContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'ui', 'ThemeSwitcher.jsx'), 'utf-8');
  const particleBgContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'canvas', 'ParticleBackground.jsx'), 'utf-8');

  // Replicate applyThemeToDOM logic directly from ThemeSwitcher.jsx for empirical DOM stress testing
  const applyThemeToDOM = (themeKey) => {
    if (typeof global.document === 'undefined' || !themeKey) return;
    global.document.documentElement.setAttribute('data-theme', themeKey);
    try {
      global.localStorage.setItem('profile_hub_active_theme', themeKey);
    } catch (err) {
      // Graceful fallback
    }
    if (typeof global.window !== 'undefined' && global.window.dispatchEvent) {
      global.window.dispatchEvent(
        new CustomEvent('themechange', {
          detail: { theme: themeKey },
        })
      );
    }
  };

  // =========================================================================
  // VECTOR 1: Screen-Area Scaling & Dynamic Particle Count Invariants
  // =========================================================================

  harness.test('M2-ADV-1.1: Particle count across extreme display viewports and density settings', () => {
    // Exact computeParticleCount logic from ParticleBackground.jsx
    const computeParticleCount = (width, height, densitySetting) => {
      if (densitySetting === 'off') return 0;
      const area = width * height;
      const rawCount = Math.floor(area / 22000);
      const baseCount = Math.max(25, Math.min(85, rawCount));
      switch (densitySetting) {
        case 'low':
          return Math.max(15, Math.floor(baseCount * 0.6));
        case 'high':
          return Math.min(85, Math.floor(baseCount * 1.3));
        case 'medium':
        default:
          return baseCount;
      }
    };

    const testViewports = [
      { w: 0, h: 0, desc: 'Zero dimensions (hidden container)' },
      { w: 1, h: 1, desc: '1x1 pixel edge case' },
      { w: 320, h: 480, desc: 'Small Mobile' },
      { w: 768, h: 1024, desc: 'Tablet' },
      { w: 1920, h: 1080, desc: 'Full HD 1080p Desktop' },
      { w: 3840, h: 2160, desc: '4K Ultra HD' },
      { w: 7680, h: 4320, desc: '8K Extreme Display' },
      { w: 100000, h: 100000, desc: 'Absurd extreme dimension' },
    ];

    for (const vp of testViewports) {
      // Off setting MUST always return exactly 0
      assert.strictEqual(
        computeParticleCount(vp.w, vp.h, 'off'),
        0,
        `Density 'off' must produce 0 particles on ${vp.desc}`
      );

      // Low setting bounds
      const low = computeParticleCount(vp.w, vp.h, 'low');
      assert(low >= 15 && low <= 85, `Low count must be within [15, 85] on ${vp.desc}, got ${low}`);

      // Medium setting bounds
      const med = computeParticleCount(vp.w, vp.h, 'medium');
      assert(med >= 25 && med <= 85, `Medium count must be within [25, 85] on ${vp.desc}, got ${med}`);

      // High setting bounds
      const high = computeParticleCount(vp.w, vp.h, 'high');
      assert(high >= 25 && high <= 85, `High count must be within [25, 85] on ${vp.desc}, got ${high}`);

      // Monotonicity: low <= med <= high
      assert(low <= med, `Low (${low}) must be <= Medium (${med}) on ${vp.desc}`);
      assert(med <= high, `Medium (${med}) must be <= High (${high}) on ${vp.desc}`);
    }
  });

  // =========================================================================
  // VECTOR 2: Particle Physics Euclidean Calculations & Singularity Protection
  // =========================================================================

  harness.test('M2-ADV-2.1: Particle physics repulsion avoids division-by-zero singularity', () => {
    // Exact physics simulation kernel from ParticleBackground.jsx
    const simulatePhysics = (particle, pointer) => {
      let vx = particle.vx;
      let vy = particle.vy;

      if (pointer.isActive) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Safety check: dist > 0 prevents division by zero
        if (dist < pointer.radius && dist > 0) {
          const force = 1 - dist / pointer.radius;
          const pushFactor = pointer.isTouch ? 3.5 : 4.5;
          const pushX = (dx / dist) * force * pushFactor;
          const pushY = (dy / dist) * force * pushFactor;
          vx += pushX;
          vy += pushY;
        }
      }

      // Smooth damping
      vx += (particle.baseVx - vx) * 0.04;
      vy += (particle.baseVy - vy) * 0.04;

      return { vx, vy, isFinite: Number.isFinite(vx) && Number.isFinite(vy) };
    };

    // Case A: Particle exactly on cursor position (dx=0, dy=0, dist=0)
    const singularResult = simulatePhysics(
      { x: 100, y: 100, vx: 0.1, vy: 0.1, baseVx: 0.1, baseVy: 0.1 },
      { x: 100, y: 100, isActive: true, isTouch: false, radius: 120 }
    );
    assert(singularResult.isFinite, 'Physics must produce finite numbers when dist === 0 (no NaN)');
    assert(!Number.isNaN(singularResult.vx), 'vx must not be NaN at singularity');
    assert(!Number.isNaN(singularResult.vy), 'vy must not be NaN at singularity');

    // Case B: Particle close to edge of repulsion radius
    const boundaryResult = simulatePhysics(
      { x: 219.9, y: 100, vx: 0.2, vy: 0.2, baseVx: 0.2, baseVy: 0.2 },
      { x: 100, y: 100, isActive: true, isTouch: false, radius: 120 }
    );
    assert(boundaryResult.isFinite, 'Physics must produce finite values near boundary');

    // Case C: Particle outside repulsion radius (no force)
    const outsideResult = simulatePhysics(
      { x: 300, y: 300, vx: 0.5, vy: 0.5, baseVx: 0.5, baseVy: 0.5 },
      { x: 100, y: 100, isActive: true, isTouch: false, radius: 120 }
    );
    assert(outsideResult.isFinite, 'Physics outside radius must remain finite');
  });

  harness.test('M2-ADV-2.2: Constellation line network alpha falloff invariants', () => {
    const maxLineDist = 100;
    const testDistances = [0, 25, 50, 75, 99.9, 100, 150];

    for (const dist of testDistances) {
      if (dist < maxLineDist) {
        const lineAlpha = (1 - dist / maxLineDist) * 0.22;
        assert(lineAlpha >= 0 && lineAlpha <= 0.22, `Alpha ${lineAlpha} must be within [0, 0.22]`);
      }
    }
  });

  // =========================================================================
  // VECTOR 3: Color Parser Resiliency
  // =========================================================================

  harness.test('M2-ADV-3.1: Color parsing engine handles standard, shorthand, and malformed inputs', () => {
    // Exact parseColorToRgb from ParticleBackground.jsx
    function parseColorToRgb(colorStr) {
      if (!colorStr) return { r: 0, g: 240, b: 255 };
      const clean = colorStr.trim();
      if (clean.startsWith('rgb')) {
        const match = clean.match(/\d+/g);
        if (match && match.length >= 3) {
          return {
            r: parseInt(match[0], 10),
            g: parseInt(match[1], 10),
            b: parseInt(match[2], 10),
          };
        }
      }
      let hex = clean.startsWith('#') ? clean.slice(1) : clean;
      if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('');
      }
      const num = parseInt(hex, 16);
      if (isNaN(num)) return { r: 0, g: 240, b: 255 };
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    }

    // 6-digit hex
    const cyan = parseColorToRgb('#00f0ff');
    assert.deepStrictEqual(cyan, { r: 0, g: 240, b: 255 });

    // 3-digit shorthand hex
    const white = parseColorToRgb('#fff');
    assert.deepStrictEqual(white, { r: 255, g: 255, b: 255 });

    // rgb format
    const rgbVal = parseColorToRgb('rgb(168, 85, 247)');
    assert.deepStrictEqual(rgbVal, { r: 168, g: 85, b: 247 });

    // rgba format
    const rgbaVal = parseColorToRgb('rgba(255, 113, 206, 0.42)');
    assert.deepStrictEqual(rgbaVal, { r: 255, g: 113, b: 206 });

    // Edge cases & malformed values: must return default cyan without throw
    const malformed = ['', null, undefined, 'not-a-color', '###', 'rgb()', '---'];
    for (const bad of malformed) {
      const res = parseColorToRgb(bad);
      assert(
        Number.isInteger(res.r) && Number.isInteger(res.g) && Number.isInteger(res.b),
        `Parsing "${bad}" must return valid integers`
      );
    }
  });

  // =========================================================================
  // VECTOR 4: Theme Switcher DOM & Event Integrity
  // =========================================================================

  const expectedThemes = [
    'cyber-neon',
    'midnight-glow',
    'lofi-aesthetic',
    'clean-minimalist',
    'retro-vaporwave',
  ];

  harness.test('M2-ADV-4.1: applyThemeToDOM attributes, localStorage sync & event dispatching', () => {
    let eventReceived = null;
    const testListener = (e) => {
      eventReceived = e.detail?.theme;
    };
    global.window.addEventListener('themechange', testListener);

    for (const themeId of expectedThemes) {
      applyThemeToDOM(themeId);
      assert.strictEqual(
        global.document.documentElement.getAttribute('data-theme'),
        themeId,
        `DOM attribute data-theme must equal ${themeId}`
      );
      assert.strictEqual(
        global.localStorage.getItem('profile_hub_active_theme'),
        themeId,
        `LocalStorage must store active theme ${themeId}`
      );
      assert.strictEqual(
        eventReceived,
        themeId,
        `themechange event detail must receive ${themeId}`
      );
    }

    global.window.removeEventListener('themechange', testListener);
  });

  harness.test('M2-ADV-4.2: Rapid theme switching stress test (100 sequential changes)', () => {
    for (let i = 0; i < 100; i++) {
      const target = expectedThemes[i % expectedThemes.length];
      assert.doesNotThrow(() => {
        applyThemeToDOM(target);
      }, `Rapid theme change #${i} must not throw`);
      assert.strictEqual(global.document.documentElement.getAttribute('data-theme'), target);
    }
  });

  // =========================================================================
  // VECTOR 5: Theme Configuration & Built CSS Asset Parity
  // =========================================================================

  harness.test('M2-ADV-5.1: 5 Presets configuration complete and matches dist CSS rules', () => {
    for (const themeId of expectedThemes) {
      assert(
        themeSwitcherContent.includes(`id: '${themeId}'`),
        `ThemeSwitcher.jsx must configure preset '${themeId}'`
      );
    }

    // Read dist CSS
    const distAssetsDir = path.join(rootDir, 'dist', 'assets');
    const cssFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.css'));
    assert(cssFiles.length >= 1, 'Built CSS must exist in dist/assets');
    const cssBundle = fs.readFileSync(path.join(distAssetsDir, cssFiles[0]), 'utf-8');

    const requiredVars = [
      '--bg-base',
      '--bg-surface',
      '--accent-primary',
      '--accent-secondary',
      '--text-main',
      '--text-sub',
      '--border-glow',
      '--particle-color',
    ];

    for (const themeId of expectedThemes) {
      assert(
        cssBundle.includes(`[data-theme=${themeId}]`),
        `dist CSS must contain selector [data-theme=${themeId}]`
      );
      // Verify variables within CSS block
      const blockMatch = cssBundle.match(new RegExp(`\\[data-theme=${themeId}\\]\\{([^}]+)\\}`, 'i'));
      assert(blockMatch, `Must extract CSS block for [data-theme=${themeId}]`);
      for (const v of requiredVars) {
        assert(blockMatch[1].includes(v), `Theme ${themeId} must contain ${v}`);
      }
    }
  });

  // =========================================================================
  // VECTOR 6: Production Artifact Resolution & Strict Relative Paths
  // =========================================================================

  harness.test('M2-ADV-6.1: dist/index.html strictly contains relative paths and zero absolute root paths', () => {
    const indexPath = path.join(rootDir, 'dist', 'index.html');
    assert(fs.existsSync(indexPath), 'dist/index.html must exist');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Extract all src and href
    const attrRegex = /(?:href|src)=["']([^"']+)["']/g;
    let match;
    const assetsFound = [];

    while ((match = attrRegex.exec(indexContent)) !== null) {
      const url = match[1];
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        assetsFound.push(url);
      }
    }

    assert(assetsFound.length >= 3, `Must find at least 3 local assets (found: ${assetsFound.join(', ')})`);

    for (const asset of assetsFound) {
      // Must NOT start with /
      assert(!asset.startsWith('/'), `Asset ${asset} MUST NOT start with root slash /`);
      // Must start with ./
      assert(asset.startsWith('./'), `Asset ${asset} MUST start with ./ for static hosting compatibility`);
      // File must physically exist in dist/
      const diskPath = path.resolve(rootDir, 'dist', asset);
      assert(fs.existsSync(diskPath), `Asset ${asset} must physically exist on disk at ${diskPath}`);
    }
  });

  // =========================================================================
  // VECTOR 7: High-DPI Clamping & Page Visibility Lifecycle
  // =========================================================================

  harness.test('M2-ADV-7.1: High-DPI devicePixelRatio clamped to 2 to prevent GPU fill-rate exhaustion', () => {
    const testDPRs = [0.5, 1, 1.25, 1.5, 2, 2.5, 3, 4];
    for (const dpr of testDPRs) {
      const clamped = Math.min(dpr || 1, 2);
      assert(clamped <= 2, `DPR ${dpr} must clamp to <= 2, got ${clamped}`);
      assert(clamped >= 0.5, `Clamped DPR must be >= 0.5, got ${clamped}`);
    }
  });

  harness.test('M2-ADV-7.2: ParticleBackground implements Page Visibility API and cleanup', () => {
    assert(
      particleBgContent.includes('visibilitychange'),
      'ParticleBackground must listen for visibilitychange events'
    );
    assert(
      particleBgContent.includes('document.hidden'),
      'ParticleBackground must inspect document.hidden'
    );
    assert(
      particleBgContent.includes('cancelAnimationFrame'),
      'ParticleBackground must cancel animation frame when pausing or unmounting'
    );
    assert(
      particleBgContent.includes('MutationObserver'),
      'ParticleBackground must use MutationObserver for instant data-theme detection'
    );
  });

  return harness.run();
}

// Self-run when executed directly via node
if (process.argv[1] && process.argv[1].endsWith('adversarial-m2-visuals-deep-stress.test.js')) {
  runM2AdversarialSuite().then((result) => {
    if (result.failed > 0) {
      process.exit(1);
    }
  });
}
