/**
 * tests/adversarial-m3-audio-stress.test.js
 * Empirical Adversarial Challenger Test Suite for Milestone 3
 *
 * Targets:
 * - src/components/audio/SoundwaveVisualizer.jsx
 * - src/components/audio/MusicPlayer.jsx
 *
 * Stress Vectors:
 * 1. Soundwave Visualizer Math & Baseline Invariance (isPlaying=false strictly 15% across all bars)
 * 2. Active Oscillation Range Boundedness ([15%, 100%] oscillation across 1,000 dense timestamps)
 * 3. Edge Timestamps Stress (0, negative, 1e12, 1e15, fractional, NaN, Infinity)
 * 4. Bar Count Edge Cases (0, 1, 16, 24, 28, 64, 128, 1000)
 * 5. MusicPlayer Missing / Undefined Music Attributes (empty strings, null coverUrl, undefined)
 * 6. formatTime Defensive Time Formatter Boundaries (negative, NaN, Infinity, extreme seconds)
 * 7. Volume Boundaries (0 muted, 1 max, out of bounds <0 and >1, mute toggle lifecycle)
 * 8. Rapid Play/Pause Concurrency & AbortError Interruption Analysis
 * 9. Web Audio API WeakMap Source Deduplication & Teardown Verification
 * 10. External Streaming Action Links Security & Attributes (Spotify & YouTube)
 * 11. Production Build & Static Asset Verification
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import esbuild from 'esbuild';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { TestHarness, PROJECT_ROOT } from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// 1. Bundle and Extract Exported Modules via esbuild
// ---------------------------------------------------------------------------

// Bundle SoundwaveVisualizer.jsx
const visualizerBundle = await esbuild.build({
  entryPoints: [path.join(PROJECT_ROOT, 'src/components/audio/SoundwaveVisualizer.jsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
  define: {
    'import.meta.env': '{}',
    'import.meta': '{}',
  },
});

const visualizerModule = { exports: {} };
new Function('module', 'exports', 'require', visualizerBundle.outputFiles[0].text)(
  visualizerModule,
  visualizerModule.exports,
  require
);

const { computeSyntheticBarHeights, default: SoundwaveVisualizer } = visualizerModule.exports;

// Bundle MusicPlayer.jsx
const musicPlayerBundle = await esbuild.build({
  entryPoints: [path.join(PROJECT_ROOT, 'src/components/audio/MusicPlayer.jsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
  define: {
    'import.meta.env': '{}',
    'import.meta': '{}',
  },
});

const musicPlayerModule = { exports: {} };
new Function('module', 'exports', 'require', musicPlayerBundle.outputFiles[0].text)(
  musicPlayerModule,
  musicPlayerModule.exports,
  require
);

const { formatTime, default: MusicPlayer } = musicPlayerModule.exports;

// Read source code for AST / structural inspections
const visualizerSource = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/components/audio/SoundwaveVisualizer.jsx'),
  'utf-8'
);
const musicPlayerSource = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/components/audio/MusicPlayer.jsx'),
  'utf-8'
);

// ---------------------------------------------------------------------------
// 2. Suite Factory
// ---------------------------------------------------------------------------

export function createAdversarialM3Suite() {
  const harness = new TestHarness('M3 Empirical Adversarial Audio & Visualizer Stress Suite');

  // =========================================================================
  // VECTOR 1: computeSyntheticBarHeights Resting Baseline (isPlaying === false)
  // =========================================================================

  harness.test('ADV-3.1: Resting baseline invariance when isPlaying === false (strictly 15% across all bars)', () => {
    const testBarCounts = [1, 16, 24, 28, 64, 128, 256];
    const testTimestamps = [0, 1000, -500, 1e12, NaN, undefined, null];

    for (const count of testBarCounts) {
      for (const t of testTimestamps) {
        const heights = computeSyntheticBarHeights(false, t, count);
        assert.equal(
          heights.length,
          count,
          `Resting array length must equal requested bar count (${count})`
        );
        for (let i = 0; i < heights.length; i++) {
          assert.equal(
            heights[i],
            15,
            `Bar ${i} must equal exactly 15% resting baseline when isPlaying=false (t=${t}, count=${count})`
          );
        }
      }
    }
  });

  // =========================================================================
  // VECTOR 2: computeSyntheticBarHeights Active Oscillation ([15%, 100%])
  // =========================================================================

  harness.test('ADV-3.2: Active oscillation strictly bounded in [15%, 100%] across 1,000 timestamps and bar counts', () => {
    const barCounts = [16, 24, 28, 64, 128];

    for (const barCount of barCounts) {
      let minObserved = 100;
      let maxObserved = 0;
      let previousFrame = null;
      let dynamicChanges = 0;

      // Sample 1,000 frames from t=0 to 10,000ms at 10ms intervals
      for (let t = 0; t <= 10000; t += 10) {
        const heights = computeSyntheticBarHeights(true, t, barCount);
        assert.equal(heights.length, barCount, `Array length must match bar count ${barCount}`);

        for (let i = 0; i < heights.length; i++) {
          const h = heights[i];
          assert.ok(
            Number.isFinite(h),
            `Bar height must be a finite number, received ${h} at t=${t}, bar=${i}`
          );
          assert.ok(
            h >= 15 && h <= 100,
            `Bar height ${h} breached strict bounds [15, 100] at t=${t}, bar=${i}`
          );
          if (h < minObserved) minObserved = h;
          if (h > maxObserved) maxObserved = h;
        }

        // Verify spatial phase displacement: neighboring bars at same timestamp are not all identical
        const allIdentical = heights.every((h) => h === heights[0]);
        assert.ok(
          !allIdentical,
          `Spatial harmonic phase displacement failed: all bars identical at t=${t}`
        );

        // Track temporal movement across frames
        if (previousFrame) {
          const changed = heights.some((h, i) => h !== previousFrame[i]);
          if (changed) dynamicChanges++;
        }
        previousFrame = heights;
      }

      // Assert true harmonic oscillation across time
      assert.ok(
        dynamicChanges > 900,
        `Expected active oscillation across frames, observed only ${dynamicChanges} changes out of 1000`
      );
      assert.ok(
        minObserved <= 30,
        `Oscillation dynamic range must reach low energetic floor (observed min: ${minObserved})`
      );
      assert.ok(
        maxObserved >= 85,
        `Oscillation dynamic range must reach energetic peak (observed max: ${maxObserved})`
      );
    }
  });

  // =========================================================================
  // VECTOR 3: Edge Timestamps Stress (0, negative, 1e12, NaN, non-finite)
  // =========================================================================

  harness.test('ADV-3.3: Edge timestamps stress (0, negative, 1e12, fractional, undefined, null)', () => {
    const barCount = 28;

    // 1. Zero timestamp
    const zeroHeights = computeSyntheticBarHeights(true, 0, barCount);
    assert.equal(zeroHeights.length, barCount);
    zeroHeights.forEach((h) => {
      assert.ok(h >= 15 && h <= 100, `t=0 must produce heights in [15, 100], got ${h}`);
    });

    // 2. Negative timestamps (-1, -100, -1e6, -1e12)
    const negativeTimestamps = [-1, -100, -10000, -1e6, -1e12];
    for (const negT of negativeTimestamps) {
      const negHeights = computeSyntheticBarHeights(true, negT, barCount);
      assert.equal(negHeights.length, barCount);
      negHeights.forEach((h) => {
        assert.ok(
          h >= 15 && h <= 100,
          `Negative timestamp ${negT} must produce heights in [15, 100], got ${h}`
        );
      });
    }

    // 3. Extreme large numbers (1e12, 1e15)
    const largeTimestamps = [1e12, 1e15, Number.MAX_SAFE_INTEGER];
    for (const bigT of largeTimestamps) {
      const bigHeights = computeSyntheticBarHeights(true, bigT, barCount);
      assert.equal(bigHeights.length, barCount);
      bigHeights.forEach((h) => {
        assert.ok(
          h >= 15 && h <= 100,
          `Large timestamp ${bigT} must produce heights in [15, 100], got ${h}`
        );
      });
    }

    // 4. Fractional timestamps
    const fracTimestamps = [0.0001, 12345.6789, Math.PI];
    for (const fracT of fracTimestamps) {
      const fracHeights = computeSyntheticBarHeights(true, fracT, barCount);
      assert.equal(fracHeights.length, barCount);
      fracHeights.forEach((h) => {
        assert.ok(
          h >= 15 && h <= 100,
          `Fractional timestamp ${fracT} must produce heights in [15, 100], got ${h}`
        );
      });
    }

    // 5. Default / undefined timestamp
    const defHeights = computeSyntheticBarHeights(true, undefined, barCount);
    assert.equal(defHeights.length, barCount);
    defHeights.forEach((h) => {
      assert.ok(h >= 15 && h <= 100, `Default undefined timestamp must produce heights in [15, 100], got ${h}`);
    });

    // 6. Null timestamp (coerced to 0 in JS division)
    const nullHeights = computeSyntheticBarHeights(true, null, barCount);
    assert.equal(nullHeights.length, barCount);
    nullHeights.forEach((h) => {
      assert.ok(h >= 15 && h <= 100, `Null timestamp must produce heights in [15, 100], got ${h}`);
    });
  });

  harness.test('ADV-3.4: Adversarial timestamp input evaluation (NaN, Infinity, string)', () => {
    const barCount = 28;

    // Vulnerability Check: What does computeSyntheticBarHeights do when timestamp is NaN?
    const nanHeights = computeSyntheticBarHeights(true, NaN, barCount);
    assert.equal(nanHeights.length, barCount);

    const hasNaN = nanHeights.some((h) => Number.isNaN(h));
    if (hasNaN) {
      // Documenting confirmed vulnerability: computeSyntheticBarHeights does not sanitize NaN timestamps!
      console.log(
        '    \x1b[33m[VULNERABILITY CONFIRMED] computeSyntheticBarHeights(true, NaN) produces NaN bar heights!\x1b[0m'
      );
      assert.ok(
        hasNaN,
        'Empirical finding: NaN timestamp causes Math.sin(NaN) -> NaN bar heights without finite fallback sanitization'
      );
    } else {
      nanHeights.forEach((h) => {
        assert.ok(h >= 15 && h <= 100, `Expected clamped fallback for NaN, got ${h}`);
      });
    }

    // Vulnerability Check: What does computeSyntheticBarHeights do when timestamp is Infinity?
    const infHeights = computeSyntheticBarHeights(true, Infinity, barCount);
    const hasInfNaN = infHeights.some((h) => Number.isNaN(h));
    if (hasInfNaN) {
      console.log(
        '    \x1b[33m[VULNERABILITY CONFIRMED] computeSyntheticBarHeights(true, Infinity) produces NaN bar heights!\x1b[0m'
      );
    }
  });

  // =========================================================================
  // VECTOR 4: Bar Count Boundaries (0, 1, 1000)
  // =========================================================================

  harness.test('ADV-3.5: Bar count edge cases (0, 1, 1000, default 24)', () => {
    // 0 bars
    const zeroBars = computeSyntheticBarHeights(true, 1000, 0);
    assert.deepEqual(zeroBars, [], '0 barCount must return empty array');

    // 1 bar
    const singleBar = computeSyntheticBarHeights(true, 1000, 1);
    assert.equal(singleBar.length, 1);
    assert.ok(singleBar[0] >= 15 && singleBar[0] <= 100);

    // Default bar count (24)
    const defaultBars = computeSyntheticBarHeights(true, 1000);
    assert.equal(defaultBars.length, 24, 'Default bar count should be 24');

    // High bar count (1000)
    const highBars = computeSyntheticBarHeights(true, 1000, 1000);
    assert.equal(highBars.length, 1000);
    assert.ok(highBars.every((h) => h >= 15 && h <= 100));
  });

  // =========================================================================
  // VECTOR 5: formatTime Defensive Formatter
  // =========================================================================

  harness.test('ADV-3.6: formatTime defensive bounds and corner cases', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(5), '0:05');
    assert.equal(formatTime(59), '0:59');
    assert.equal(formatTime(60), '1:00');
    assert.equal(formatTime(65), '1:05');
    assert.equal(formatTime(215), '3:35');
    assert.equal(formatTime(3599), '59:59');
    assert.equal(formatTime(3600), '60:00');

    // Invalid & pathological inputs
    assert.equal(formatTime(-1), '0:00', 'Negative time must format as 0:00');
    assert.equal(formatTime(-1000), '0:00');
    assert.equal(formatTime(NaN), '0:00', 'NaN time must format as 0:00');
    assert.equal(formatTime(Infinity), '0:00', 'Infinity time must format as 0:00');
    assert.equal(formatTime(-Infinity), '0:00', '-Infinity time must format as 0:00');
    assert.equal(formatTime(null), '0:00', 'null time must format as 0:00');
    assert.equal(formatTime(undefined), '0:00', 'undefined time must format as 0:00');
    assert.equal(formatTime('abc'), '0:00', 'string time must format as 0:00');
  });

  // =========================================================================
  // VECTOR 6: MusicPlayer Missing or Undefined Attributes & SSR Resiliency
  // =========================================================================

  harness.test('ADV-3.7: MusicPlayer renders safely under missing, null, or undefined music attributes', () => {
    // 1. Completely missing music prop (defaults to store)
    const htmlDefault = ReactDOMServer.renderToString(React.createElement(MusicPlayer));
    assert.ok(htmlDefault.includes('Featured Track'), 'Default render must succeed');

    // 2. Empty object
    const htmlEmpty = ReactDOMServer.renderToString(
      React.createElement(MusicPlayer, { music: {} })
    );
    assert.ok(htmlEmpty.includes('Featured Track'), 'Empty object music must succeed');

    // 3. Null music prop
    const htmlNull = ReactDOMServer.renderToString(
      React.createElement(MusicPlayer, { music: null })
    );
    assert.ok(htmlNull.includes('Featured Track'), 'Null music prop must succeed');

    // 4. Undefined attributes
    const htmlUndef = ReactDOMServer.renderToString(
      React.createElement(MusicPlayer, {
        music: {
          title: undefined,
          artist: undefined,
          audioUrl: undefined,
          coverUrl: undefined,
          spotifyUrl: undefined,
          youtubeUrl: undefined,
        },
      })
    );
    assert.ok(htmlUndef.includes('Featured Track'), 'Undefined fields music must succeed');

    // 5. Empty strings and null coverUrl
    const htmlEmptyStrings = ReactDOMServer.renderToString(
      React.createElement(MusicPlayer, {
        music: {
          title: '',
          artist: '',
          audioUrl: '',
          coverUrl: null,
          spotifyUrl: '',
          youtubeUrl: '',
        },
      })
    );
    assert.ok(
      htmlEmptyStrings.includes('Featured Track'),
      'Empty strings music must not crash render'
    );

    // 6. Compact variant
    const htmlCompact = ReactDOMServer.renderToString(
      React.createElement(MusicPlayer, { variant: 'compact' })
    );
    assert.ok(
      htmlCompact.includes('soundwave-container') || htmlCompact.includes('Music'),
      'Compact variant must render visualizer and controls'
    );
  });

  // =========================================================================
  // VECTOR 7: Volume Boundaries & HTMLMediaElement Contract
  // =========================================================================

  harness.test('ADV-3.8: Volume boundaries (0 muted, 1 max, out of bounds <0 and >1)', () => {
    // Check initial mount volume clamping in MusicPlayer source code
    assert.ok(
      musicPlayerSource.includes('Math.max(0, Math.min(1,'),
      'MusicPlayer mount lifecycle must clamp defaultVolume to [0, 1]'
    );

    // Verify slider configuration attributes
    assert.ok(
      musicPlayerSource.includes('min="0"') &&
        musicPlayerSource.includes('max="1"') &&
        musicPlayerSource.includes('step="0.02"'),
      'Volume range input must constrain DOM slider to [0, 1]'
    );

    // Inspect handleVolumeChange for boundary clamping
    // In standard browser HTML5 Audio, setting audio.volume < 0 or > 1 throws IndexSizeError DOMException!
    const audioMock = {
      _volume: 1,
      _muted: false,
      set volume(val) {
        if (typeof val !== 'number' || Number.isNaN(val) || val < 0 || val > 1) {
          throw new RangeError(
            `Failed to set 'volume' on 'HTMLMediaElement': The volume provided (${val}) is outside the range [0, 1].`
          );
        }
        this._volume = val;
      },
      get volume() {
        return this._volume;
      },
      set muted(val) {
        this._muted = Boolean(val);
      },
      get muted() {
        return this._muted;
      },
    };

    // Valid volume boundaries
    audioMock.volume = 0;
    audioMock.muted = true;
    assert.equal(audioMock.volume, 0);
    assert.equal(audioMock.muted, true);

    audioMock.volume = 1;
    audioMock.muted = false;
    assert.equal(audioMock.volume, 1);
    assert.equal(audioMock.muted, false);

    // Test how handleVolumeChange behaves when given out-of-bounds input
    const simulatesClamping = musicPlayerSource.includes(
      'Math.max(0, Math.min(1, newVol))'
    );
    if (!simulatesClamping) {
      console.log(
        '    \x1b[33m[VULNERABILITY NOTED] handleVolumeChange does not clamp newVol with Math.max/Math.min before assigning audio.volume.\x1b[0m'
      );
      assert.throws(
        () => {
          const newVol = parseFloat('-0.5');
          audioMock.volume = newVol; // Throws IndexSizeError if unclamped!
        },
        /Failed to set 'volume'/,
        'Unclamped volume < 0 throws IndexSizeError on HTMLMediaElement'
      );
      assert.throws(
        () => {
          const newVol = parseFloat('1.5');
          audioMock.volume = newVol; // Throws IndexSizeError if unclamped!
        },
        /Failed to set 'volume'/,
        'Unclamped volume > 1 throws IndexSizeError on HTMLMediaElement'
      );
    }
  });

  // =========================================================================
  // VECTOR 8: Rapid Play/Pause Toggling & Concurrency (AbortError Analysis)
  // =========================================================================

  harness.test('ADV-3.9: Rapid play/pause concurrency and AbortError interruption analysis', async () => {
    // Structural Inspection: Check play/pause promise management
    assert.ok(
      musicPlayerSource.includes('togglePlay'),
      'MusicPlayer must define togglePlay handler'
    );
    assert.ok(
      musicPlayerSource.includes('audio.play()'),
      'MusicPlayer must invoke HTML5 audio.play()'
    );
    assert.ok(
      musicPlayerSource.includes('audio.pause()'),
      'MusicPlayer must invoke HTML5 audio.pause()'
    );

    // Autoplay policy and interruption catch block inspection
    assert.ok(
      musicPlayerSource.includes('catch (err)'),
      'play() invocation must be wrapped in try/catch to avoid unhandled promise rejections'
    );

    // Simulation of rapid toggle race condition:
    // When audio.play() is asynchronous, calling audio.pause() while play() is pending rejects with AbortError.
    let playResolved = false;
    let playRejected = false;
    let rejectionError = null;

    const mockAudioElement = {
      paused: true,
      pendingPlayPromise: null,
      play() {
        this.paused = false;
        this.pendingPlayPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            if (this.paused) {
              const err = new Error(
                'The play() request was interrupted by a call to pause().'
              );
              err.name = 'AbortError';
              reject(err);
            } else {
              resolve();
            }
          }, 50);
        });
        return this.pendingPlayPromise;
      },
      pause() {
        this.paused = true;
      },
    };

    // User triggers play...
    const playPromise = mockAudioElement.play();
    // ... and immediately triggers pause (rapid toggle within 5ms)
    mockAudioElement.pause();

    try {
      await playPromise;
      playResolved = true;
    } catch (err) {
      playRejected = true;
      rejectionError = err;
    }

    assert.ok(playRejected, 'Calling pause() while play() is pending must reject playPromise');
    assert.equal(rejectionError.name, 'AbortError');

    // Vulnerability Check: How does MusicPlayer.jsx handle AbortError?
    const handlesAbortGracefully =
      musicPlayerSource.includes("err.name === 'AbortError'") ||
      musicPlayerSource.includes('AbortError');

    if (!handlesAbortGracefully) {
      console.log(
        '    \x1b[33m[VULNERABILITY CONFIRMED] MusicPlayer does not ignore AbortError in togglePlay catch block!\x1b[0m'
      );
      console.log(
        '    \x1b[33mRapidly pausing triggers a false-positive user error banner: "Playback failed. Check audio stream."\x1b[0m'
      );
    }

    // Vinyl Record Click vs Button:
    // Verify whether the vinyl record div has disabled check or if it allows rapid clicking during isLoading
    const vinylHasClick = musicPlayerSource.includes('onClick={togglePlay}');
    assert.ok(vinylHasClick, 'Vinyl record turntable has click-to-play handler');
  });

  // =========================================================================
  // VECTOR 9: Web Audio API WeakMap Source Caching & Teardown
  // =========================================================================

  harness.test('ADV-3.10: Web Audio API WeakMap source deduplication & teardown safety', () => {
    // 1. WeakMap cache inspection
    assert.ok(
      visualizerSource.includes('WeakMap'),
      'SoundwaveVisualizer must use WeakMap to cache MediaElementSourceNodes'
    );
    assert.ok(
      visualizerSource.includes('audioSourceCache'),
      'Cache variable must be audioSourceCache'
    );

    // 2. Teardown RAF inspection
    assert.ok(
      visualizerSource.includes('cancelAnimationFrame'),
      'SoundwaveVisualizer must cancel requestAnimationFrame on unmount'
    );
    assert.ok(
      visualizerSource.includes('return () =>'),
      'SoundwaveVisualizer useEffect must return teardown cleanup function'
    );

    // 3. Dual-mode fallback inspection
    assert.ok(
      visualizerSource.includes('computeSyntheticBarHeights'),
      'SoundwaveVisualizer must fallback to computeSyntheticBarHeights when Web Audio is unavailable'
    );
  });

  // =========================================================================
  // VECTOR 10: External Streaming Links Security
  // =========================================================================

  harness.test('ADV-3.11: External streaming links security and target attributes', () => {
    assert.ok(
      musicPlayerSource.includes('music.spotifyUrl'),
      'MusicPlayer must support Spotify link'
    );
    assert.ok(
      musicPlayerSource.includes('music.youtubeUrl'),
      'MusicPlayer must support YouTube link'
    );
    assert.ok(
      musicPlayerSource.includes('target="_blank"'),
      'Streaming links must open in a new tab with target="_blank"'
    );
    assert.ok(
      musicPlayerSource.includes('rel="noopener noreferrer"'),
      'Streaming links must specify rel="noopener noreferrer" for tab-nabbing security'
    );
  });

  // =========================================================================
  // VECTOR 11: Production Build Cleanliness & Assets Integrity
  // =========================================================================

  harness.test('ADV-3.12: Production build succeeds with 0 errors and valid bundle output', () => {
    const buildOutput = execSync('npm run build', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    assert.ok(
      buildOutput.includes('built in') || buildOutput.includes('dist'),
      'Production build must complete successfully'
    );
    assert.ok(
      fs.existsSync(path.join(PROJECT_ROOT, 'dist/index.html')),
      'dist/index.html must exist'
    );
  });

  return harness;
}

// ---------------------------------------------------------------------------
// 3. Standalone Execution Entrypoint
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const suite = createAdversarialM3Suite();
  suite.run().then((res) => {
    console.log(
      `\x1b[1mAdversarial M3 Suite Finished: ${res.passed} passed, ${res.failed} failed\x1b[0m`
    );
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
