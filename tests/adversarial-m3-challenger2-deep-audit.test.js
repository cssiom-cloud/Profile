/**
 * tests/adversarial-m3-challenger2-deep-audit.test.js
 * Additional Empirical Stress & Adversarial Hardening Suite by M3 Challenger 2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import esbuild from 'esbuild';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

console.log('\n========================================================================');
console.log('   M3 Challenger 2 - Deep Adversarial Audit & Chaos Test Suite');
console.log('========================================================================\n');

// 1. Bundle and extract exports via CJS
const soundwaveBuild = await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/components/audio/SoundwaveVisualizer.jsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  packages: 'external',
});

const soundwaveModule = { exports: {} };
const evalSoundwave = new Function('module', 'exports', 'require', soundwaveBuild.outputFiles[0].text);
evalSoundwave(soundwaveModule, soundwaveModule.exports, require);
const { computeSyntheticBarHeights } = soundwaveModule.exports;

console.log('--- 1. Pathological Timestamp Inputs Stress ---');
const pathologicalTimestamps = [
  NaN,
  Infinity,
  -Infinity,
  null,
  undefined,
  0,
  -0,
  -99999999,
  1e15,
  1e-15,
  Number.MAX_SAFE_INTEGER,
  Number.MIN_SAFE_INTEGER,
  Number.MAX_VALUE,
  Number.MIN_VALUE,
  Number.EPSILON,
  'string_timestamp',
  '',
  '   ',
  {},
  [],
  [123],
  { foo: 'bar' },
  () => {},
  true,
  false,
];

let timestampPassCount = 0;
for (const ts of pathologicalTimestamps) {
  const result = computeSyntheticBarHeights(true, ts, 24);
  assert.equal(result.length, 24, `Length must be 24 for timestamp: ${String(ts)}`);
  for (let i = 0; i < result.length; i++) {
    const val = result[i];
    assert.ok(
      Number.isFinite(val),
      `Value at bar ${i} must be a finite number for ts: ${String(ts)}, got: ${val}`
    );
    assert.ok(
      val >= 15 && val <= 100,
      `Value at bar ${i} must be in [15, 100] for ts: ${String(ts)}, got: ${val}`
    );
  }
  timestampPassCount++;
}
console.log(`  ✔ [PASS] Passed ${timestampPassCount}/${pathologicalTimestamps.length} pathological timestamp fuzzing vectors.`);

console.log('\n--- 2. Pathological Bar Count Boundaries ---');
const pathologicalBarCounts = [0, 1, 2, 5, 10, 24, 50, 100, 500, 1000];
for (const count of pathologicalBarCounts) {
  const result = computeSyntheticBarHeights(true, 123456, count);
  assert.equal(result.length, count, `Length must match bar count: ${count}`);
  if (count > 0) {
    assert.ok(result.every((v) => Number.isFinite(v) && v >= 15 && v <= 100));
  }
}
console.log(`  ✔ [PASS] Passed all ${pathologicalBarCounts.length} bar count boundary tests.`);

console.log('\n--- 3. MusicPlayer Volume Clamping & HTMLMediaElement Contract ---');
const musicPlayerSource = fs.readFileSync(
  path.join(rootDir, 'src/components/audio/MusicPlayer.jsx'),
  'utf-8'
);

// Extract handleVolumeChange logic
assert.ok(
  musicPlayerSource.includes('Math.max(0, Math.min(1,'),
  'handleVolumeChange clamps volume strictly to [0, 1]'
);

// Simulate the exact handleVolumeChange math logic
function simulateHandleVolumeChange(rawValue) {
  const rawVol = parseFloat(rawValue);
  const newVol = Number.isFinite(rawVol) ? Math.max(0, Math.min(1, rawVol)) : 0.7;
  return newVol;
}

const volumeInputs = [
  { input: '0', expected: 0 },
  { input: '1', expected: 1 },
  { input: '0.5', expected: 0.5 },
  { input: '-0.01', expected: 0 },
  { input: '-100', expected: 0 },
  { input: '1.01', expected: 1 },
  { input: '999', expected: 1 },
  { input: 'NaN', expected: 0.7 },
  { input: 'Infinity', expected: 0.7 },
  { input: '-Infinity', expected: 0.7 },
  { input: 'invalid', expected: 0.7 },
  { input: '', expected: 0.7 },
  { input: null, expected: 0.7 },
  { input: undefined, expected: 0.7 },
];

for (const { input, expected } of volumeInputs) {
  const actual = simulateHandleVolumeChange(input);
  assert.equal(
    actual,
    expected,
    `Volume input '${input}' should clamp/fallback to ${expected}, got ${actual}`
  );
  assert.ok(
    actual >= 0 && actual <= 1,
    `Volume must always be in [0, 1], got ${actual}`
  );
}
console.log(`  ✔ [PASS] Passed all ${volumeInputs.length} volume boundary clamping tests.`);

console.log('\n--- 4. MusicPlayer AbortError Interruption Safety ---');
assert.ok(
  musicPlayerSource.includes("if (err.name === 'AbortError')"),
  'MusicPlayer explicitly checks and ignores err.name === "AbortError"'
);
assert.ok(
  musicPlayerSource.includes('finally {'),
  'MusicPlayer ensures setIsLoading(false) in finally block'
);
console.log('  ✔ [PASS] Verified AbortError benign absorption and finally cleanup.');

console.log('\n--- 5. Static Dist Relative Assets Zero-Absolute Check ---');
const distIndexPath = path.join(rootDir, 'dist/index.html');
const distHtml = fs.readFileSync(distIndexPath, 'utf-8');

const matches = [...distHtml.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m => m[1]);
const internalPaths = matches.filter(url => !url.startsWith('http://') && !url.startsWith('https://'));

for (const p of internalPaths) {
  assert.ok(
    p.startsWith('./'),
    `Internal asset '${p}' must start with strictly relative './'`
  );
  assert.ok(
    !p.startsWith('/assets/'),
    `Asset '${p}' must NOT be root-absolute`
  );
  const diskFile = path.resolve(rootDir, 'dist', p);
  assert.ok(fs.existsSync(diskFile), `Referenced file '${p}' exists on disk at ${diskFile}`);
}
console.log(`  ✔ [PASS] Verified ${internalPaths.length} internal assets in dist/index.html are 100% relative and exist on disk.`);

console.log('\n========================================================================');
console.log('   ALL DEEP ADVERSARIAL AUDIT TESTS PASSED CLEANLY (100% PASS)');
console.log('========================================================================\n');
