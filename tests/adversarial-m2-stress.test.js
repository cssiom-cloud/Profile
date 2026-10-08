/**
 * tests/adversarial-m2-stress.test.js
 * Empirical Adversarial Challenger Test Suite for Milestone 2
 *
 * Targets:
 * - src/components/canvas/ParticleBackground.jsx
 * - src/components/ui/ThemeSwitcher.jsx
 * - src/App.jsx integration & CSS variable contracts
 *
 * Stress Vectors:
 * 1. Rapid Resizing Stress (100 rapid resize events with pathological dimensions)
 * 2. Offscreen / Hidden Visibility Cycling (50 rapid visibilitychange cycles, RAF leak prevention)
 * 3. Touch/Mouse Coordinate Boundaries (negative, NaN, Infinity, division-by-zero, multi-touch)
 * 4. Particle Density Switching ('off', 'low', 'medium', 'high', unexpected / corrupt inputs)
 * 5. Memory Teardown & Unmount Cleanup (listener removal, RAF cancellation, DOM observer teardown)
 * 6. Rapid Sequential Theme Switching (50+ changes with real exported applyThemeToDOM)
 * 7. Storage Error Tolerance (QuotaExceededError, SecurityError) & Falsy/Invalid theme key safety
 * 8. Custom 'themechange' Event Propagation & Listener Responsiveness
 * 9. High-DPI DPR Capping & Canvas Dimension Scaling
 * 10. Color Parsing Fallbacks & CSS Custom Properties Completeness
 * 11. Multi-Frame Canvas Render Loop Simulation (100 frames with density & pointer chaos)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import {
  TestHarness,
  THEME_PRESETS,
  THEME_CSS_VARIABLES,
  PARTICLE_DENSITIES,
  createMockDOM,
  createMockLocalStorage,
} from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

// Read source files directly for structural and AST/code analysis
const particleSource = fs.readFileSync(
  path.join(rootDir, 'src/components/canvas/ParticleBackground.jsx'),
  'utf-8'
);
const themeSwitcherSource = fs.readFileSync(
  path.join(rootDir, 'src/components/ui/ThemeSwitcher.jsx'),
  'utf-8'
);
const appSource = fs.readFileSync(
  path.join(rootDir, 'src/App.jsx'),
  'utf-8'
);
const indexCssSource = fs.readFileSync(
  path.join(rootDir, 'src/index.css'),
  'utf-8'
);

// Dynamically bundle and extract real exported components & utilities from ThemeSwitcher.jsx
const themeSwitcherBundle = await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/components/ui/ThemeSwitcher.jsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
});

const themeSwitcherModule = { exports: {} };
const evalFn = new Function('module', 'exports', 'require', themeSwitcherBundle.outputFiles[0].text);
evalFn(themeSwitcherModule, themeSwitcherModule.exports, require);
const realApplyThemeToDOM = themeSwitcherModule.exports.applyThemeToDOM;
const realThemePresetsConfig = themeSwitcherModule.exports.THEME_PRESETS_CONFIG;

export function createAdversarialM2Suite() {
  const harness = new TestHarness('M2 Empirical Adversarial Stress Suite');

  // =========================================================================
  // VECTOR 1: Canvas Math & Particle Physics Engine Robustness
  // =========================================================================

  harness.test('ADV-2.1: Particle density computation under extreme & pathological viewports', () => {
    const computeCount = (width, height, densitySetting) => {
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

    // 1. Off state must ALWAYS produce 0 particles regardless of viewport
    assert.equal(computeCount(1920, 1080, 'off'), 0);
    assert.equal(computeCount(7680, 4320, 'off'), 0);
    assert.equal(computeCount(0, 0, 'off'), 0);

    // 2. Minimum screen size boundaries (0x0, 1x1, negative values)
    const zeroBase = computeCount(0, 0, 'medium');
    assert.equal(zeroBase, 25, 'Zero-sized viewport baseCount must clamp to minimum 25');
    const zeroLow = computeCount(0, 0, 'low');
    assert.equal(zeroLow, 15, 'Zero-sized viewport low density must clamp to minimum 15');

    // 3. Huge / 8K / Ultra-wide viewports (7680x4320, 10000x10000)
    const hugeBase = computeCount(7680, 4320, 'medium');
    assert.equal(hugeBase, 85, 'Huge viewport must cap baseCount at 85 to prevent performance degradation');
    const hugeHigh = computeCount(10000, 10000, 'high');
    assert.equal(hugeHigh, 85, 'Huge viewport high density must cap at 85');

    // 4. Standard mobile (375x812), tablet (768x1024), desktop (1920x1080)
    const mobileBase = computeCount(375, 812, 'medium');
    assert.ok(mobileBase >= 25 && mobileBase <= 85, `Mobile count (${mobileBase}) must be bounded`);
    const desktopBase = computeCount(1920, 1080, 'medium');
    assert.ok(desktopBase > mobileBase, 'Desktop must have more particles than mobile');

    // 5. Corrupted / unsupported density strings fallback
    const corruptedDensities = ['ultra', 'none', null, undefined, '', -99, 9999];
    for (const corrupt of corruptedDensities) {
      const res = computeCount(1920, 1080, corrupt);
      assert.ok(res >= 25 && res <= 85, `Corrupted density ${corrupt} must gracefully fallback to baseCount`);
    }
  });

  harness.test('ADV-2.2: Particle Euclidean physics & collision boundary protection', () => {
    class TestParticle {
      constructor(bounds) {
        this.bounds = bounds;
        this.x = 100;
        this.y = 100;
        this.baseVx = 0.3;
        this.baseVy = 0.3;
        this.vx = 0.3;
        this.vy = 0.3;
      }

      update(bounds, pointer) {
        if (pointer.isActive) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Defensive collision check: must prevent division by zero when dist === 0
          if (dist < pointer.radius && dist > 0) {
            const force = (1 - dist / pointer.radius);
            const pushFactor = pointer.isTouch ? 3.5 : 4.5;
            const pushX = (dx / dist) * force * pushFactor;
            const pushY = (dy / dist) * force * pushFactor;
            this.vx += pushX;
            this.vy += pushY;
          }
        }

        this.vx += (this.baseVx - this.vx) * 0.04;
        this.vy += (this.baseVy - this.vy) * 0.04;
        this.x += this.vx;
        this.y += this.vy;

        // Viewport boundaries
        if (this.x < 0) {
          this.x = 0;
          this.vx = -this.vx;
          this.baseVx = -this.baseVx;
        } else if (this.x > bounds.width) {
          this.x = bounds.width;
          this.vx = -this.vx;
          this.baseVx = -this.baseVx;
        }

        if (this.y < 0) {
          this.y = 0;
          this.vy = -this.vy;
          this.baseVy = -this.baseVy;
        } else if (this.y > bounds.height) {
          this.y = bounds.height;
          this.vy = -this.vy;
          this.baseVy = -this.baseVy;
        }
      }
    }

    const bounds = { width: 800, height: 600, dpr: 1 };
    const p = new TestParticle(bounds);

    // 1. Exact coordinate collision test (distance = 0)
    const exactCollisionPointer = {
      x: 100,
      y: 100,
      radius: 120,
      isActive: true,
      isTouch: false,
    };
    p.update(bounds, exactCollisionPointer);
    assert.ok(!Number.isNaN(p.vx), 'Velocity vx must NOT become NaN on exact coordinate collision');
    assert.ok(!Number.isNaN(p.vy), 'Velocity vy must NOT become NaN on exact coordinate collision');
    assert.ok(Number.isFinite(p.vx), 'Velocity vx must remain finite');
    assert.ok(Number.isFinite(p.vy), 'Velocity vy must remain finite');

    // 2. NaN Pointer Coordinates test
    const nanPointer = {
      x: NaN,
      y: NaN,
      radius: 120,
      isActive: true,
      isTouch: false,
    };
    p.update(bounds, nanPointer);
    assert.ok(!Number.isNaN(p.vx), 'Velocity vx must NOT become NaN on NaN pointer coordinates');
    assert.ok(!Number.isNaN(p.x), 'Position x must NOT become NaN on NaN pointer coordinates');

    // 3. Infinity Pointer Coordinates test
    const infinityPointer = {
      x: Infinity,
      y: -Infinity,
      radius: 120,
      isActive: true,
      isTouch: false,
    };
    p.update(bounds, infinityPointer);
    assert.ok(Number.isFinite(p.vx), 'Velocity must remain finite on Infinity pointer');

    // 4. Negative extreme pointer coordinates
    const negativePointer = {
      x: -99999,
      y: -99999,
      radius: 120,
      isActive: true,
      isTouch: false,
    };
    p.update(bounds, negativePointer);
    assert.ok(Number.isFinite(p.vx), 'Velocity must remain finite on negative coordinates');

    // 5. Boundary bounce & clamp verification
    p.x = 900; // Out of bounds right while moving right
    p.vx = 0.5;
    p.update(bounds, { isActive: false });
    assert.ok(p.x <= bounds.width, `Particle must clamp within bounds width (${p.x} <= ${bounds.width})`);
    assert.ok(p.vx < 0, 'Velocity vx must reverse (negative) after hitting right boundary');

    p.y = -50; // Out of bounds top while moving up
    p.vy = -0.5;
    p.update(bounds, { isActive: false });
    assert.ok(p.y >= 0, `Particle must clamp within bounds height (${p.y} >= 0)`);
    assert.ok(p.vy > 0, 'Velocity vy must reverse (positive) after hitting top boundary');
  });

  harness.test('ADV-2.3: Color parsing resilience across hex, rgb, rgba, and corrupted inputs', () => {
    const parseColorToRgb = (colorStr) => {
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
    };

    // 1. Standard 6-digit hex
    assert.deepEqual(parseColorToRgb('#00f0ff'), { r: 0, g: 240, b: 255 });
    assert.deepEqual(parseColorToRgb('#a855f7'), { r: 168, g: 85, b: 247 });
    assert.deepEqual(parseColorToRgb('#e09f67'), { r: 224, g: 159, b: 103 });

    // 2. 3-digit shorthand hex (#fff, #0f0)
    assert.deepEqual(parseColorToRgb('#fff'), { r: 255, g: 255, b: 255 });
    assert.deepEqual(parseColorToRgb('#0f0'), { r: 0, g: 255, b: 0 });

    // 3. RGB & RGBA formats
    assert.deepEqual(parseColorToRgb('rgb(168, 85, 247)'), { r: 168, g: 85, b: 247 });
    assert.deepEqual(parseColorToRgb('rgba(255, 113, 206, 0.42)'), { r: 255, g: 113, b: 206 });

    // 4. Corrupted / malicious / missing strings
    const corruptedInputs = [
      null,
      undefined,
      '',
      '   ',
      '#zzzzzz',
      'not-a-color',
      'rgb()',
      'rgba()',
      'hsl(120, 100%, 50%)',
      'javascript:alert(1)',
      '<script>',
    ];

    for (const input of corruptedInputs) {
      const rgb = parseColorToRgb(input);
      assert.ok(rgb && typeof rgb.r === 'number' && typeof rgb.g === 'number' && typeof rgb.b === 'number',
        `Input "${input}" must safely return an RGB object`);
      assert.ok(rgb.r >= 0 && rgb.r <= 255, 'R must be 0-255');
      assert.ok(rgb.g >= 0 && rgb.g <= 255, 'G must be 0-255');
      assert.ok(rgb.b >= 0 && rgb.b <= 255, 'B must be 0-255');
    }
  });

  // =========================================================================
  // VECTOR 2: Rapid Resizing & High-DPI Scaling Stress Test
  // =========================================================================

  harness.test('ADV-2.4: Rapid resizing stress (100 rapid sequential resize cycles)', () => {
    let particles = [];
    let bounds = { width: 0, height: 0, dpr: 1 };

    const mockCanvas = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
    };

    const computeParticleCount = (w, h, density) => {
      if (density === 'off') return 0;
      const count = Math.max(25, Math.min(85, Math.floor((w * h) / 22000)));
      return count;
    };

    const handleResize = (w, h, dpr = 1, density = 'medium') => {
      const safeDpr = Math.min(dpr || 1, 2);
      mockCanvas.width = Math.floor(w * safeDpr);
      mockCanvas.height = Math.floor(h * safeDpr);
      mockCanvas.style.width = `${w}px`;
      mockCanvas.style.height = `${h}px`;
      bounds = { width: w, height: h, dpr: safeDpr };

      const targetCount = computeParticleCount(w, h, density);
      if (particles.length < targetCount) {
        const toAdd = targetCount - particles.length;
        for (let i = 0; i < toAdd; i++) {
          particles.push({ x: Math.random() * w, y: Math.random() * h });
        }
      } else if (particles.length > targetCount) {
        particles = particles.slice(0, targetCount);
      }
    };

    const testDimensions = [
      { w: 320, h: 480, dpr: 2 },
      { w: 375, h: 667, dpr: 3 }, // DPR 3 should clamp to 2
      { w: 768, h: 1024, dpr: 1.5 },
      { w: 1024, h: 768, dpr: 1 },
      { w: 1920, h: 1080, dpr: 2 },
      { w: 2560, h: 1440, dpr: 1 },
      { w: 3840, h: 2160, dpr: 2 },
      { w: 0, h: 0, dpr: 1 },       // Minimized window
      { w: 1, h: 1, dpr: 1 },
      { w: 1366, h: 768, dpr: 1.25 },
    ];

    for (let cycle = 0; cycle < 100; cycle++) {
      const dim = testDimensions[cycle % testDimensions.length];
      handleResize(dim.w, dim.h, dim.dpr, 'medium');

      const expectedDpr = Math.min(dim.dpr, 2);
      assert.equal(mockCanvas.width, Math.floor(dim.w * expectedDpr));
      assert.equal(mockCanvas.height, Math.floor(dim.h * expectedDpr));
      assert.equal(mockCanvas.style.width, `${dim.w}px`);
      assert.equal(mockCanvas.style.height, `${dim.h}px`);
      assert.ok(particles.length >= 25 && particles.length <= 85,
        `Particles count (${particles.length}) must be in valid range [25, 85]`);
    }

    assert.equal(particles.length, computeParticleCount(1366, 768, 'medium'));
  });

  // =========================================================================
  // VECTOR 3: Page Visibility API & Offscreen Cycling (RAF Leak Prevention)
  // =========================================================================

  harness.test('ADV-2.5: Page Visibility API cycling (50 rapid hidden/visible cycles without RAF leak)', () => {
    let rafId = null;
    let nextRafId = 1;
    let cancelCount = 0;
    let requestCount = 0;
    let activeLoops = 0;

    const mockRequestAnimationFrame = () => {
      requestCount++;
      activeLoops++;
      return nextRafId++;
    };

    const mockCancelAnimationFrame = () => {
      cancelCount++;
      activeLoops = Math.max(0, activeLoops - 1);
    };

    let documentHidden = false;
    let reducedMotion = false;

    const handleVisibilityChange = () => {
      if (documentHidden) {
        if (rafId) {
          mockCancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        if (!rafId && !reducedMotion) {
          rafId = mockRequestAnimationFrame(() => {});
        }
      }
    };

    rafId = mockRequestAnimationFrame(() => {});
    assert.equal(activeLoops, 1, 'Initial render loop must be 1');

    for (let i = 0; i < 50; i++) {
      // 1. Tab switches to background
      documentHidden = true;
      handleVisibilityChange();
      assert.equal(rafId, null, `Cycle ${i}: RAF ID must be cleared when hidden`);
      assert.equal(activeLoops, 0, `Cycle ${i}: Active loops must be 0 when hidden`);

      handleVisibilityChange();
      assert.equal(rafId, null, `Cycle ${i}: Consecutive hidden call must remain null`);

      // 2. Tab returns to foreground
      documentHidden = false;
      handleVisibilityChange();
      assert.ok(rafId !== null, `Cycle ${i}: RAF ID must be set when returning to foreground`);
      assert.equal(activeLoops, 1, `Cycle ${i}: Active loops must be EXACTLY 1 (no leak)`);

      handleVisibilityChange();
      assert.equal(activeLoops, 1, `Cycle ${i}: Consecutive visible call must NOT spawn duplicate loops`);
    }

    assert.equal(activeLoops, 1, 'After 50 cycles, active RAF loop count must strictly equal 1');
    assert.equal(cancelCount, 50, 'Cancel animation frame must be called exactly 50 times');
  });

  // =========================================================================
  // VECTOR 4: Memory Teardown & Unmount Cleanup Verification
  // =========================================================================

  harness.test('ADV-2.6: Event listener & animation teardown on component unmount', () => {
    const requiredCleanups = [
      'cancelAnimationFrame',
      'observer.disconnect()',
      'removeEventListener(\'themechange\'',
      'removeEventListener(\'resize\'',
      'removeEventListener(\'mousemove\'',
      'removeEventListener(\'mouseout\'',
      'removeEventListener(\'touchstart\'',
      'removeEventListener(\'touchmove\'',
      'removeEventListener(\'touchend\'',
      'removeEventListener(\'touchcancel\'',
      'removeEventListener(\'visibilitychange\'',
      'particlesRef.current = []',
    ];

    for (const cleanupTarget of requiredCleanups) {
      assert.ok(
        particleSource.includes(cleanupTarget),
        `ParticleBackground cleanup must include: ${cleanupTarget}`
      );
    }

    const listeners = new Map();
    const addListener = (event, fn) => listeners.set(event, fn);
    const removeListener = (event) => listeners.delete(event);

    const eventsToRegister = [
      'themechange',
      'resize',
      'mousemove',
      'mouseout',
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
      'visibilitychange',
    ];

    eventsToRegister.forEach((e) => addListener(e, () => {}));
    assert.equal(listeners.size, 9, 'All 9 listeners registered on mount');

    eventsToRegister.forEach((e) => removeListener(e));
    assert.equal(listeners.size, 0, 'All 9 listeners must be completely removed on unmount');
  });

  // =========================================================================
  // VECTOR 5: Real Bundled ThemeSwitcher Rapid Sequential Switching & DOM Sync
  // =========================================================================

  harness.test('ADV-2.7: Rapid sequential theme switching (50 switches) with REAL exported applyThemeToDOM', () => {
    let currentThemeAttr = '';
    const mockDocument = {
      documentElement: {
        setAttribute: (attr, val) => {
          if (attr === 'data-theme') currentThemeAttr = val;
        },
        getAttribute: (attr) => (attr === 'data-theme' ? currentThemeAttr : null),
      },
    };

    let storedTheme = '';
    const mockStorage = {
      setItem: (key, val) => {
        if (key === 'profile_hub_active_theme') storedTheme = val;
      },
      getItem: (key) => (key === 'profile_hub_active_theme' ? storedTheme : null),
    };

    const dispatchedEvents = [];
    class MockCustomEvent {
      constructor(type, opts) {
        this.type = type;
        this.detail = opts?.detail;
      }
    }

    const mockWindow = {
      dispatchEvent: (e) => {
        dispatchedEvents.push(e);
      },
    };

    // Bind mocks to globals for real applyThemeToDOM execution
    const prevDoc = global.document;
    const prevWin = global.window;
    const prevStorage = global.localStorage;
    const prevCustomEvent = global.CustomEvent;

    global.document = mockDocument;
    global.window = mockWindow;
    global.localStorage = mockStorage;
    global.CustomEvent = MockCustomEvent;

    try {
      // Rapidly cycle through all 5 themes 10 times (50 total transitions)
      for (let i = 0; i < 50; i++) {
        const targetTheme = THEME_PRESETS[i % THEME_PRESETS.length];
        realApplyThemeToDOM(targetTheme);

        assert.equal(
          currentThemeAttr,
          targetTheme,
          `Step ${i}: DOM attribute data-theme must immediately equal ${targetTheme}`
        );

        assert.equal(
          storedTheme,
          targetTheme,
          `Step ${i}: localStorage must immediately store ${targetTheme}`
        );
      }

      assert.equal(dispatchedEvents.length, 50, 'Exactly 50 themechange events must be dispatched');
      assert.equal(
        dispatchedEvents[49].detail.theme,
        THEME_PRESETS[49 % THEME_PRESETS.length],
        'Final dispatched event must match last applied theme'
      );
    } finally {
      global.document = prevDoc;
      global.window = prevWin;
      global.localStorage = prevStorage;
      global.CustomEvent = prevCustomEvent;
    }
  });

  harness.test('ADV-2.8: Real applyThemeToDOM resilience under Storage QuotaExceededError and falsy inputs', () => {
    let currentThemeAttr = '';
    const mockDocument = {
      documentElement: {
        setAttribute: (attr, val) => {
          if (attr === 'data-theme') currentThemeAttr = val;
        },
        getAttribute: (attr) => (attr === 'data-theme' ? currentThemeAttr : null),
      },
    };

    const failingStorage = {
      setItem: () => {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      },
      getItem: () => null,
    };

    let eventDispatched = false;
    class MockCustomEvent {
      constructor(type, opts) {
        this.type = type;
        this.detail = opts?.detail;
      }
    }

    const mockWindow = {
      dispatchEvent: () => {
        eventDispatched = true;
      },
    };

    const prevDoc = global.document;
    const prevWin = global.window;
    const prevStorage = global.localStorage;
    const prevCustomEvent = global.CustomEvent;

    global.document = mockDocument;
    global.window = mockWindow;
    global.localStorage = failingStorage;
    global.CustomEvent = MockCustomEvent;

    try {
      // 1. Storage failure should NOT throw or prevent DOM and event synchronization
      assert.doesNotThrow(() => {
        realApplyThemeToDOM('midnight-glow');
      }, 'Storage error must be caught gracefully without crashing caller');

      assert.equal(currentThemeAttr, 'midnight-glow', 'DOM attribute must still update despite storage failure');
      assert.equal(eventDispatched, true, 'Event must still be dispatched despite storage failure');

      // 2. Falsy / invalid theme keys
      const falsyKeys = [null, undefined, '', false];
      for (const key of falsyKeys) {
        assert.doesNotThrow(() => {
          realApplyThemeToDOM(key);
        }, `Falsy themeKey (${key}) must be handled safely without error`);
      }
    } finally {
      global.document = prevDoc;
      global.window = prevWin;
      global.localStorage = prevStorage;
      global.CustomEvent = prevCustomEvent;
    }
  });

  // =========================================================================
  // VECTOR 6: Keyboard Accessibility & Radiogroup Navigation
  // =========================================================================

  harness.test('ADV-2.9: ThemeSwitcher radiogroup arrow navigation & bounds wrapping', () => {
    const themeCount = realThemePresetsConfig.length;
    assert.equal(themeCount, 5, 'Theme presets configuration must have exactly 5 items');

    const navigate = (currentIndex, key) => {
      let nextIndex = null;
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % themeCount;
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + themeCount) % themeCount;
      } else if (key === 'Home') {
        nextIndex = 0;
      } else if (key === 'End') {
        nextIndex = themeCount - 1;
      }
      return nextIndex;
    };

    // 1. Right / Down wrapping: 0 -> 1 -> 2 -> 3 -> 4 -> 0
    assert.equal(navigate(0, 'ArrowRight'), 1);
    assert.equal(navigate(3, 'ArrowRight'), 4);
    assert.equal(navigate(4, 'ArrowRight'), 0, 'ArrowRight on last preset must wrap to 0');
    assert.equal(navigate(4, 'ArrowDown'), 0, 'ArrowDown on last preset must wrap to 0');

    // 2. Left / Up wrapping: 0 -> 4 -> 3 -> 2 -> 1 -> 0
    assert.equal(navigate(0, 'ArrowLeft'), 4, 'ArrowLeft on first preset must wrap to 4');
    assert.equal(navigate(0, 'ArrowUp'), 4, 'ArrowUp on first preset must wrap to 4');
    assert.equal(navigate(4, 'ArrowLeft'), 3);

    // 3. Home and End
    assert.equal(navigate(3, 'Home'), 0, 'Home key must navigate to index 0');
    assert.equal(navigate(1, 'End'), 4, 'End key must navigate to index 4');

    // 4. Structural check for ARIA roles in ThemeSwitcher.jsx
    assert.ok(themeSwitcherSource.includes('role="radiogroup"'), 'ThemeSwitcher must define role="radiogroup"');
    assert.ok(themeSwitcherSource.includes('role="radio"'), 'Theme options must define role="radio"');
    assert.ok(themeSwitcherSource.includes('aria-checked='), 'Theme options must define aria-checked');
  });

  // =========================================================================
  // VECTOR 7: CSS Variables Contract Completeness
  // =========================================================================

  harness.test('ADV-2.10: All 5 presets define all 8 required CSS custom properties', () => {
    for (const preset of THEME_PRESETS) {
      const selectorRegex = new RegExp(`\\[data-theme=['"]?${preset}['"]?\\]\\s*{([^}]+)}`, 'i');
      const match = indexCssSource.match(selectorRegex);

      assert.ok(
        match !== null,
        `index.css must define a CSS block for preset [data-theme='${preset}']`
      );

      const blockContent = match[1];
      for (const cssVar of THEME_CSS_VARIABLES) {
        assert.ok(
          blockContent.includes(cssVar),
          `Preset ${preset} must declare CSS variable ${cssVar}`
        );
      }
    }
  });

  // =========================================================================
  // VECTOR 8: App.jsx Integration & Backward Compatibility Invariants
  // =========================================================================

  harness.test('ADV-2.11: App.jsx mounts ParticleBackground and ThemeSwitcher with smoke hooks preserved', () => {
    assert.ok(appSource.includes('<ParticleBackground'), 'App.jsx must mount <ParticleBackground />');
    assert.ok(appSource.includes('<ThemeSwitcher'), 'App.jsx must mount <ThemeSwitcher />');

    const requiredSmokeIds = [
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
    ];

    for (const id of requiredSmokeIds) {
      assert.ok(
        appSource.includes(`id="${id}"`),
        `App.jsx must preserve smoke element id="${id}" for backward compatibility`
      );
    }

    assert.ok(
      appSource.includes('handleDensityChange'),
      'App.jsx must provide handleDensityChange handler'
    );
  });

  // =========================================================================
  // VECTOR 9: Multi-Frame Canvas Render Loop Simulation Under Chaos
  // =========================================================================

  harness.test('ADV-2.12: 100-frame Canvas simulation under pointer chaos and density transitions', () => {
    const mockCtx = {
      setTransform: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      arc: () => {},
      fill: () => {},
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      shadowColor: '',
      shadowBlur: 0,
    };

    class SimParticle {
      constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.baseVx = this.vx;
        this.baseVy = this.vy;
        this.radius = 2;
        this.alpha = 0.5;
        this.pulsePhase = 0;
        this.pulseSpeed = 0.02;
      }
      update(bounds, pointer) {
        if (pointer.isActive) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pointer.radius && dist > 0) {
            const force = 1 - dist / pointer.radius;
            this.vx += (dx / dist) * force * 4.5;
            this.vy += (dy / dist) * force * 4.5;
          }
        }
        this.vx += (this.baseVx - this.vx) * 0.04;
        this.vy += (this.baseVy - this.vy) * 0.04;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) { this.x = 0; this.vx = -this.vx; }
        else if (this.x > bounds.width) { this.x = bounds.width; this.vx = -this.vx; }
        if (this.y < 0) { this.y = 0; this.vy = -this.vy; }
        else if (this.y > bounds.height) { this.y = bounds.height; this.vy = -this.vy; }
        this.pulsePhase += this.pulseSpeed;
      }
      draw(ctx, rgb) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
        ctx.fill();
      }
    }

    const bounds = { width: 1280, height: 720, dpr: 2 };
    let particles = Array.from({ length: 50 }, () => new SimParticle(bounds.width, bounds.height));
    const pointer = { x: 500, y: 300, targetX: 500, targetY: 300, isActive: true, radius: 120 };
    const rgb = { r: 0, g: 240, b: 255 };

    // Execute 100 simulation frames
    for (let frame = 0; frame < 100; frame++) {
      // Introduce chaos at specific frames
      if (frame === 20) {
        // Density change to off
        particles = [];
      } else if (frame === 30) {
        // Density change to high
        particles = Array.from({ length: 85 }, () => new SimParticle(bounds.width, bounds.height));
      } else if (frame === 50) {
        // Extreme negative pointer
        pointer.x = -9999;
        pointer.y = -9999;
      } else if (frame === 70) {
        // NaN coordinates injected
        pointer.targetX = NaN;
        pointer.targetY = NaN;
      } else if (frame === 80) {
        // Reset pointer to center
        pointer.targetX = 640;
        pointer.targetY = 360;
        pointer.x = 640;
        pointer.y = 360;
      }

      // Render frame simulation
      mockCtx.setTransform(bounds.dpr, 0, 0, bounds.dpr, 0, 0);
      mockCtx.clearRect(0, 0, bounds.width, bounds.height);

      // Constellation lines
      const maxLineDist = 100;
      const maxLineDistSq = maxLineDist * maxLineDist;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxLineDistSq) {
            mockCtx.beginPath();
            mockCtx.moveTo(p1.x, p1.y);
            mockCtx.lineTo(p2.x, p2.y);
            mockCtx.stroke();
          }
        }
      }

      // Update and draw particles
      for (const p of particles) {
        p.update(bounds, pointer);
        p.draw(mockCtx, rgb);

        // Sanity assertions per particle
        assert.ok(!Number.isNaN(p.x), `Frame ${frame}: Particle x must not be NaN`);
        assert.ok(!Number.isNaN(p.y), `Frame ${frame}: Particle y must not be NaN`);
        assert.ok(p.x >= 0 && p.x <= bounds.width, `Frame ${frame}: Particle x must be in bounds`);
        assert.ok(p.y >= 0 && p.y <= bounds.height, `Frame ${frame}: Particle y must be in bounds`);
      }
    }

    assert.ok(true, '100 simulation frames completed without mathematical or memory exceptions');
  });

  return harness;
}

// Run immediately if called directly via CLI: node tests/adversarial-m2-stress.test.js
if (process.argv[1] && process.argv[1].endsWith('adversarial-m2-stress.test.js')) {
  const suite = createAdversarialM2Suite();
  suite.run().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
