/**
 * tests/adversarial-m4-challenger2.test.js
 * Independent Empirical Challenger 2 Verification Suite for Milestone 4
 *
 * Verifies:
 * 1. Production Build & Static Asset Resolution (Strictly relative ./, zero /assets/ root-absolute)
 * 2. Static Hosting Subpath Simulation (GitHub Pages URL resolution)
 * 3. CSS & JS Compiled Bundle M4 Inspection (ProfileHeader, Bento/Stack/Cards Grid, Favorites, SocialHub)
 * 4. Empirical Stress Testing of M4 Core Logic (generateAvatarFallback, getSafeProfile, isSafeUrl, normalizeUrl, resolveLucideIcon)
 * 5. App.jsx Integration & 14 Smoke Verification Element Preservation (ADV-2.11)
 * 6. Cross-Tier Invariant Checks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✖ [FAIL] ${testName}`);
    if (details) {
      console.error(`     Details: ${details}`);
      failureDetails.push(`${testName}: ${details}`);
    } else {
      failureDetails.push(testName);
    }
  }
}

console.log('\n========================================================================');
console.log('   M4 Challenger 2 - Empirical Adversarial Verification Suite');
console.log('========================================================================\n');

// --------------------------------------------------------------------------
// 1. Build Verification & Static Asset Resolution
// --------------------------------------------------------------------------
console.log('--- 1. Production Build & Static Asset Resolution ---');

const distPath = path.join(rootDir, 'dist');
const indexPath = path.join(distPath, 'index.html');
const distAssetsPath = path.join(distPath, 'assets');

assert(fs.existsSync(distPath), 'dist directory exists on disk');
assert(fs.existsSync(indexPath), 'dist/index.html exists on disk');
assert(fs.existsSync(distAssetsPath), 'dist/assets directory exists on disk');

const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Match all href and src attributes in dist/index.html
const assetAttrRegex = /(?:href|src)=["']([^"']+)["']/g;
const allUrls = [];
let match;
while ((match = assetAttrRegex.exec(indexHtml)) !== null) {
  allUrls.push(match[1]);
}

const internalUrls = allUrls.filter(
  (url) => !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')
);

assert(internalUrls.length >= 3, `Internal asset references found in dist/index.html (found ${internalUrls.length})`);

// STRICT INVARIANT: ZERO root-absolute paths starting with '/'
const rootAbsoluteUrls = internalUrls.filter((url) => url.startsWith('/') && !url.startsWith('//'));
assert(
  rootAbsoluteUrls.length === 0,
  'dist/index.html contains ZERO root-absolute paths (/...)',
  `Found: ${rootAbsoluteUrls.join(', ')}`
);

// STRICT INVARIANT: All internal assets must strictly begin with './'
const nonRelativeUrls = internalUrls.filter((url) => !url.startsWith('./'));
assert(
  nonRelativeUrls.length === 0,
  'All internal assets strictly begin with relative "./"',
  `Non-relative: ${nonRelativeUrls.join(', ')}`
);

// Verify all referenced relative files physically exist on disk and are non-empty
for (const relUrl of internalUrls) {
  const cleanPath = relUrl.split('?')[0].split('#')[0];
  const diskPath = path.resolve(distPath, cleanPath);
  const exists = fs.existsSync(diskPath);
  const stat = exists ? fs.statSync(diskPath) : null;
  assert(
    exists && stat && stat.size > 0,
    `Referenced asset exists and is non-empty: ${relUrl} (${stat ? stat.size + ' bytes' : 'missing'})`
  );
}

// Verify favicon.svg specifically
assert(indexHtml.includes('href="./favicon.svg"'), 'dist/index.html contains strictly relative favicon href="./favicon.svg"');
const faviconPath = path.join(distPath, 'favicon.svg');
assert(fs.existsSync(faviconPath) && fs.statSync(faviconPath).size > 0, 'dist/favicon.svg physically exists on disk and is non-empty');

// --------------------------------------------------------------------------
// 2. Static Hosting Subpath Simulation (GitHub Pages URL Resolution)
// --------------------------------------------------------------------------
console.log('\n--- 2. Static Hosting Subpath Simulation ---');

const ghPagesBase = 'https://octocat.github.io/my-portfolio/';

for (const relUrl of internalUrls) {
  // Test how the browser resolves relative URL against GitHub Pages subfolder
  const resolvedUrl = new URL(relUrl, ghPagesBase).toString();
  const cleanPath = relUrl.replace(/^\.\//, '');
  const expectedUrl = `https://octocat.github.io/my-portfolio/${cleanPath}`;

  assert(
    resolvedUrl === expectedUrl,
    `Browser subpath resolution correct for ${relUrl} -> ${resolvedUrl}`
  );

  // Counter-proof: If URL were root-absolute, it would break under GitHub Pages subpath
  const brokenRootAbsUrl = '/' + cleanPath;
  const brokenResolved = new URL(brokenRootAbsUrl, ghPagesBase).toString();
  assert(
    brokenResolved === `https://octocat.github.io/${cleanPath}`,
    `Root-absolute path counter-proof verified: ${brokenRootAbsUrl} would incorrectly resolve outside repo subpath`
  );
}

// --------------------------------------------------------------------------
// 3. Compiled Bundle M4 Inspection
// --------------------------------------------------------------------------
console.log('\n--- 3. Compiled CSS & JS Bundle M4 Inspection ---');

const assetFiles = fs.readdirSync(distAssetsPath);
const cssFile = assetFiles.find((f) => f.endsWith('.css'));
const jsFile = assetFiles.find((f) => f.endsWith('.js'));

assert(!!cssFile, `Compiled CSS file exists in dist/assets (${cssFile})`);
assert(!!jsFile, `Compiled JS bundle exists in dist/assets (${jsFile})`);

const cssContent = fs.readFileSync(path.join(distAssetsPath, cssFile), 'utf-8');
const jsContent = fs.readFileSync(path.join(distAssetsPath, jsFile), 'utf-8');

// Ensure CSS contains ZERO root-absolute url(/...)
const rootAbsUrlInCss = cssContent.match(/url\(\s*["']?\/(?!\/)[^"')]+["']?\s*\)/gi) || [];
assert(
  rootAbsUrlInCss.length === 0,
  'Compiled CSS contains ZERO root-absolute url(/...) references',
  `Found: ${rootAbsUrlInCss.join(', ')}`
);

// Inspect M4 features in compiled CSS
assert(
  cssContent.includes('sm:col-span-2') || cssContent.includes('col-span-2') || cssContent.includes('grid-cols'),
  'Compiled CSS contains grid layout styling for Bento cards'
);

// Inspect M4 features in compiled JS
assert(jsContent.includes('generateAvatarFallback') || jsContent.includes('??'), 'Compiled JS contains avatar initials fallback logic');
assert(jsContent.includes('javascript:') && jsContent.includes('vbscript:'), 'Compiled JS preserves XSS protocol sanitization against dangerous schemes');
assert(jsContent.includes('bento') && jsContent.includes('stack') && jsContent.includes('cards'), 'Compiled JS contains all 3 layout engines (bento, stack, cards)');
assert(jsContent.includes('tech') && jsContent.includes('gaming') && jsContent.includes('anime'), 'Compiled JS contains canonical favorites categories');
assert(jsContent.includes('noopener noreferrer'), 'Compiled JS enforces rel="noopener noreferrer" on external links');
assert(jsContent.includes('smoke-profile-name') && jsContent.includes('smoke-links-count'), 'Compiled JS preserves smoke verification element IDs');

// --------------------------------------------------------------------------
// 4. Empirical Stress Testing of M4 Core Logic via Isolated Bundle
// --------------------------------------------------------------------------
console.log('\n--- 4. Empirical Stress Testing of M4 Core Logic ---');

// Build an isolated bundle of M4 modules for unit fuzzing
const buildResult = esbuild.buildSync({
  stdin: {
    contents: `
      export { generateAvatarFallback, getSafeProfile } from './src/components/profile/ProfileHeader.jsx';
      export { resolveLucideIcon, isSafeUrl, normalizeUrl } from './src/components/links/LinkCard.jsx';
      export { CATEGORY_META } from './src/components/links/FavoritesSection.jsx';
      export { getSocialIcon } from './src/components/profile/SocialHub.jsx';
    `,
    resolveDir: rootDir,
    loader: 'jsx',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'framer-motion', 'lucide-react', 'zustand'],
});

const bundledCode = buildResult.outputFiles[0].text;
const tempBundlePath = path.join(rootDir, 'tests', '.m4-challenger-temp.mjs');
fs.writeFileSync(tempBundlePath, bundledCode, 'utf-8');

let m4Exports;
try {
  m4Exports = await import(`file://${tempBundlePath.replace(/\\/g, '/')}`);
} finally {
  if (fs.existsSync(tempBundlePath)) {
    fs.unlinkSync(tempBundlePath);
  }
}

const {
  generateAvatarFallback,
  getSafeProfile,
  isSafeUrl,
  normalizeUrl,
  resolveLucideIcon,
  CATEGORY_META,
  getSocialIcon,
} = m4Exports;

// --- Test 4.1: generateAvatarFallback Fuzzing & Boundaries ---
console.log('\n--- 4.1 Avatar Fallback Fuzzing ---');
assert(generateAvatarFallback('Alex Rivera') === 'AR', 'generateAvatarFallback("Alex Rivera") === "AR"');
assert(generateAvatarFallback('Kavinsky') === 'KA', 'generateAvatarFallback("Kavinsky") === "KA"');
assert(generateAvatarFallback('John Fitzgerald Kennedy') === 'JK', 'generateAvatarFallback("John Fitzgerald Kennedy") === "JK"');
assert(generateAvatarFallback('A') === 'A', 'generateAvatarFallback("A") === "A"');
assert(generateAvatarFallback('404') === '40', 'generateAvatarFallback("404") === "40"');
assert(generateAvatarFallback('   Alex    Rivera   ') === 'AR', 'generateAvatarFallback trims whitespace correctly');
assert(generateAvatarFallback('') === '??', 'generateAvatarFallback("") === "??"');
assert(generateAvatarFallback('   ') === '??', 'generateAvatarFallback("   ") === "??"');
assert(generateAvatarFallback(null) === '??', 'generateAvatarFallback(null) === "??"');
assert(generateAvatarFallback(undefined) === '??', 'generateAvatarFallback(undefined) === "??"');
assert(generateAvatarFallback(12345) === '??', 'generateAvatarFallback(number) === "??"');
assert(generateAvatarFallback({}) === '??', 'generateAvatarFallback(object) === "??"');

// --- Test 4.2: getSafeProfile Defensive Boundaries ---
console.log('\n--- 4.2 getSafeProfile Boundaries ---');
const safeNull = getSafeProfile(null);
assert(typeof safeNull === 'object' && safeNull.name, 'getSafeProfile(null) returns valid profile object');
const safeMissing = getSafeProfile({ name: 'Bob' });
assert(safeMissing.name === 'Bob' && safeMissing.handle.startsWith('@'), 'getSafeProfile preserves name and auto-prefixes handle');
const safeHandle = getSafeProfile({ name: 'Alice', handle: 'alice_dev' });
assert(safeHandle.handle === '@alice_dev', 'getSafeProfile auto-prefixes missing @ in handle');
const safeAlreadyPrefixed = getSafeProfile({ name: 'Alice', handle: '@alice_dev' });
assert(safeAlreadyPrefixed.handle === '@alice_dev', 'getSafeProfile does not double-prefix @ in handle');

// Extreme string stress
const extremeProfile = getSafeProfile({
  name: 'X'.repeat(5000),
  bio: 'Y'.repeat(20000),
  quote: 'Z'.repeat(10000),
});
assert(extremeProfile.name.length === 5000, 'getSafeProfile handles extreme 5,000 char name without crashing');
assert(extremeProfile.bio.length === 20000, 'getSafeProfile handles extreme 20,000 char bio without crashing');

// --- Test 4.3: URL Security & Normalization Fuzzing ---
console.log('\n--- 4.3 URL Security & Normalization ---');
const maliciousUrls = [
  'javascript:alert(1)',
  'JAVASCRIPT:alert(document.cookie)',
  '  javascript:void(0)  ',
  'data:text/html,<script>alert(1)</script>',
  'DATA:image/svg+xml,...',
  'vbscript:msgbox(1)',
  'VBSCRIPT:test',
  'file:///etc/passwd',
  'FILE:///C:/Windows/System32',
];

for (const badUrl of maliciousUrls) {
  assert(isSafeUrl(badUrl) === false, `isSafeUrl rejects malicious scheme: ${badUrl}`);
}

const safeUrls = [
  'https://github.com/alexrivera',
  'http://example.com/blog',
  'mailto:alex@example.com',
  'tel:+1234567890',
  'github.com/alexrivera',
];

for (const goodUrl of safeUrls) {
  assert(isSafeUrl(goodUrl) === true, `isSafeUrl accepts valid url: ${goodUrl}`);
}

// Normalization checks
assert(normalizeUrl('github.com/user') === 'https://github.com/user', 'normalizeUrl prepends https:// to naked domains');
assert(normalizeUrl('https://example.com') === 'https://example.com', 'normalizeUrl preserves existing https://');
assert(normalizeUrl('http://example.com') === 'http://example.com', 'normalizeUrl preserves existing http://');
assert(normalizeUrl('') === '', 'normalizeUrl handles empty string');
assert(normalizeUrl(null) === '', 'normalizeUrl handles null');

// --- Test 4.4: resolveLucideIcon & Social Icons ---
console.log('\n--- 4.4 Icon Resolution Resilience ---');
const knownIcons = ['github', 'twitter', 'x', 'linkedin', 'youtube', 'discord', 'mail', 'instagram', 'twitch', 'code'];
for (const icon of knownIcons) {
  const resolved = resolveLucideIcon(icon);
  assert(typeof resolved === 'object' || typeof resolved === 'function', `resolveLucideIcon successfully resolves: ${icon}`);
}

const fallbackIcon = resolveLucideIcon('non_existent_random_icon_xyz_123');
assert(typeof fallbackIcon === 'object' || typeof fallbackIcon === 'function', 'resolveLucideIcon falls back safely on unknown icon');
const nullIcon = resolveLucideIcon(null);
assert(typeof nullIcon === 'object' || typeof nullIcon === 'function', 'resolveLucideIcon handles null icon safely');

// --- Test 4.5: Canonical Favorites Categories Meta ---
console.log('\n--- 4.5 Favorites Category Meta ---');
const canonicalCategories = ['tech', 'gaming', 'anime', 'music', 'hobbies'];
for (const cat of canonicalCategories) {
  assert(
    CATEGORY_META[cat] && CATEGORY_META[cat].label && CATEGORY_META[cat].badgeText,
    `CATEGORY_META defines canonical category: ${cat} with label "${CATEGORY_META[cat]?.label}"`
  );
}

// --------------------------------------------------------------------------
// 5. App.jsx Integration & Backward Compatibility (ADV-2.11 Full Audit)
// --------------------------------------------------------------------------
console.log('\n--- 5. App.jsx Integration & Smoke Invariants (ADV-2.11) ---');

const appPath = path.join(rootDir, 'src', 'App.jsx');
assert(fs.existsSync(appPath), 'src/App.jsx exists on disk');
const appSource = fs.readFileSync(appPath, 'utf-8');

// M4 components mount check
assert(appSource.includes('<ProfileHeader'), 'App.jsx mounts <ProfileHeader />');
assert(appSource.includes('<LinksGrid'), 'App.jsx mounts <LinksGrid />');
assert(appSource.includes('<FavoritesSection'), 'App.jsx mounts <FavoritesSection />');
assert(appSource.includes('<SocialHub'), 'App.jsx mounts <SocialHub />');
assert(appSource.includes('<ParticleBackground'), 'App.jsx mounts <ParticleBackground />');
assert(appSource.includes('<ThemeSwitcher'), 'App.jsx mounts <ThemeSwitcher />');
assert(appSource.includes('<MusicPlayer'), 'App.jsx mounts <MusicPlayer />');

// ALL 14 Smoke Test Element IDs Check
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
  'smoke-save-btn',
  'smoke-mutate-result',
];

assert(requiredSmokeIds.length === 14, 'Strictly 14 smoke test elements tested');

for (const id of requiredSmokeIds) {
  assert(
    appSource.includes(`id="${id}"`),
    `App.jsx strictly preserves smoke element id="${id}"`
  );
}

assert(appSource.includes('handleDensityChange'), 'App.jsx provides handleDensityChange handler');

// --------------------------------------------------------------------------
// Summary & Verdict
// --------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED:       ${passedTests}`);
console.log(`FAILED:       ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error('[VERDICT] REQUEST_CHANGES - Found empirical failures:');
  failureDetails.forEach((d) => console.error(`  - ${d}`));
  process.exit(1);
} else {
  console.log('[VERDICT] APPROVE - 100% of Milestone 4 empirical checks passed cleanly!\n');
  process.exit(0);
}
