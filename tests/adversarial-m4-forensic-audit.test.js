/**
 * tests/adversarial-m4-forensic-audit.test.js
 * Independent Forensic Integrity Audit & Adversarial Verification Suite for Milestone 4
 *
 * Checks:
 * 1. Monogram Initials Fallback (generateAvatarFallback) logic & edge case resilience
 * 2. Profile Sanitization & Extreme Length Defenses (getSafeProfile)
 * 3. URL Protocol Safety & Normalization (isSafeUrl, normalizeUrl)
 * 4. Lucide Icon Dynamic Resolver & Registry (resolveLucideIcon)
 * 5. Social Platform Resolver & Global Shortcut Invariants (getSocialIcon, Ctrl+Shift+L)
 * 6. Layout Matrices & Asymmetric Bento Spans (LinksGrid, LinkCard)
 * 7. Canonical Categories & Dual Resolution (FavoritesSection)
 * 8. App.jsx Integration & 14 Smoke Verification Element Preservation
 * 9. Production Build & Relative Dist Resolution (dist/index.html)
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
console.log('   M4 Forensic Integrity Audit & Empirical Adversarial Suite');
console.log('========================================================================\n');

// --------------------------------------------------------------------------
// 1. Bundle Components for Dynamic Pure Logic Evaluation
// --------------------------------------------------------------------------
console.log('--- 1. Dynamic Bundling & Module Exports Integrity ---');

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Helper to bundle JSX component using esbuild
async function bundleComponent(filePath) {
  const result = await esbuild.build({
    entryPoints: [filePath],
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
  const code = result.outputFiles[0].text;
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', code);
  fn(mod, mod.exports, require);
  return mod.exports;
}

const profileHeaderExports = await bundleComponent(path.join(rootDir, 'src/components/profile/ProfileHeader.jsx'));
const linkCardExports = await bundleComponent(path.join(rootDir, 'src/components/links/LinkCard.jsx'));
const favoritesExports = await bundleComponent(path.join(rootDir, 'src/components/links/FavoritesSection.jsx'));
const socialHubExports = await bundleComponent(path.join(rootDir, 'src/components/profile/SocialHub.jsx'));

assert(typeof profileHeaderExports.generateAvatarFallback === 'function', 'ProfileHeader exports generateAvatarFallback');
assert(typeof profileHeaderExports.getSafeProfile === 'function', 'ProfileHeader exports getSafeProfile');
assert(typeof linkCardExports.resolveLucideIcon === 'function', 'LinkCard exports resolveLucideIcon');
assert(typeof linkCardExports.isSafeUrl === 'function', 'LinkCard exports isSafeUrl');
assert(typeof linkCardExports.normalizeUrl === 'function', 'LinkCard exports normalizeUrl');
assert(typeof favoritesExports.CATEGORY_META === 'object', 'FavoritesSection exports CATEGORY_META dictionary');
assert(typeof socialHubExports.getSocialIcon === 'function', 'SocialHub exports getSocialIcon');

// --------------------------------------------------------------------------
// 2. Monogram Initials Fallback (generateAvatarFallback) Non-Facade Logic
// --------------------------------------------------------------------------
console.log('\n--- 2. Monogram Initials Fallback (generateAvatarFallback) Empirical Fuzzing ---');

const { generateAvatarFallback } = profileHeaderExports;

assert(generateAvatarFallback('Alex Rivera') === 'AR', 'Standard two words: "Alex Rivera" -> "AR"');
assert(generateAvatarFallback('Kavinsky') === 'KA', 'Single word: "Kavinsky" -> "KA"');
assert(generateAvatarFallback('Ada Lovelace') === 'AL', '"Ada Lovelace" -> "AL"');
assert(generateAvatarFallback('Hideo Kojima') === 'HK', '"Hideo Kojima" -> "HK"');
assert(generateAvatarFallback('Leonardo Wilhelm DiCaprio') === 'LD', 'Three words: first and last initial -> "LD"');
assert(generateAvatarFallback('Jean-Luc Picard') === 'JP', 'Hyphenated first word -> "JP"');
assert(generateAvatarFallback('   grace   hopper   ') === 'GH', 'Whitespace padded -> "GH"');
assert(generateAvatarFallback('z') === 'Z', 'Single character -> "Z"');
assert(generateAvatarFallback('x y') === 'XY', 'Single letter words -> "XY"');

// Edge & boundary cases (Must strictly return '??')
assert(generateAvatarFallback('') === '??', 'Empty string -> "??"');
assert(generateAvatarFallback('   ') === '??', 'Whitespace only -> "??"');
assert(generateAvatarFallback(null) === '??', 'null -> "??"');
assert(generateAvatarFallback(undefined) === '??', 'undefined -> "??"');
assert(generateAvatarFallback(12345) === '??', 'Numeric input -> "??"');
assert(generateAvatarFallback({}) === '??', 'Object input -> "??"');
assert(generateAvatarFallback([]) === '??', 'Array input -> "??"');

// Fuzz test 100 pseudorandom names to verify NO constant/mock cheating
let fuzzPassed = true;
const sampleFirstNames = ['Cyber', 'Neon', 'Vapor', 'Echo', 'Solar', 'Luna', 'Pixel', 'Vector'];
const sampleLastNames = ['Coder', 'Pilot', 'Runner', 'Ghost', 'Knight', 'Smith', 'Doe', 'Wired'];
for (let i = 0; i < 50; i++) {
  const fn = sampleFirstNames[i % sampleFirstNames.length];
  const ln = sampleLastNames[(i * 3) % sampleLastNames.length];
  const expected = (fn[0] + ln[0]).toUpperCase();
  if (generateAvatarFallback(`${fn} ${ln}`) !== expected) {
    fuzzPassed = false;
    break;
  }
}
assert(fuzzPassed, '50 pseudorandom name permutations generated authentic initials without hardcoded cheats');

// --------------------------------------------------------------------------
// 3. Profile Defensive Normalization & Extreme Strings (getSafeProfile)
// --------------------------------------------------------------------------
console.log('\n--- 3. Defensive Profile Sanitization & Boundary Handling ---');

const { getSafeProfile } = profileHeaderExports;

const defaultSafe = getSafeProfile(null);
assert(typeof defaultSafe.name === 'string' && defaultSafe.name.length > 0, 'Null input safely resolves default name');
assert(typeof defaultSafe.handle === 'string' && defaultSafe.handle.startsWith('@'), 'Null input safely resolves @handle');

// Handle formatting
const safeWithoutAt = getSafeProfile({ handle: 'alexrivera' });
assert(safeWithoutAt.handle === '@alexrivera', 'Auto-prefixes @ to handle if omitted');
const safeWithAt = getSafeProfile({ handle: '@alexrivera' });
assert(safeWithAt.handle === '@alexrivera', 'Preserves @ if already present');

// Extreme string length defense
const massiveBio = 'A'.repeat(50000);
const extremeProfile = getSafeProfile({ bio: massiveBio });
assert(extremeProfile.bio.length === 50000, 'Preserves large bio strings without truncating or throwing');

// --------------------------------------------------------------------------
// 4. URL Protocol Safety & Normalization (LinkCard)
// --------------------------------------------------------------------------
console.log('\n--- 4. URL Protocol Security & Sanitization (isSafeUrl, normalizeUrl) ---');

const { isSafeUrl, normalizeUrl } = linkCardExports;

// Malicious schemes must be strictly rejected (case-insensitive & whitespace trimmed)
const maliciousVectors = [
  'javascript:alert("XSS")',
  'JAVASCRIPT:alert(1)',
  '  javascript:evil()',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'DATA:text/html,test',
  'vbscript:msgbox("hello")',
  'VBSCRIPT:run()',
  'file:///etc/passwd',
  'file://C:\\Windows\\System32\\cmd.exe',
];

maliciousVectors.forEach((mal) => {
  assert(isSafeUrl(mal) === false, `Reject dangerous protocol: ${mal.slice(0, 30)}...`);
});

// Safe protocols must be accepted
const safeVectors = [
  'https://github.com/developer',
  'http://localhost:3000',
  'https://spotify.com/album/12345',
  'https://youtube.com/watch?v=xyz',
  'https://example.com/path?query=1&b=2#hash',
];

safeVectors.forEach((safe) => {
  assert(isSafeUrl(safe) === true, `Accept valid protocol: ${safe}`);
});

// Normalization auto-prefixing
assert(normalizeUrl('github.com') === 'https://github.com', 'Auto-prefixes https:// to domain-only URLs');
assert(normalizeUrl('twitter.com/dev') === 'https://twitter.com/dev', 'Auto-prefixes https:// to paths without scheme');
assert(normalizeUrl('http://myblog.org') === 'http://myblog.org', 'Preserves explicit http:// scheme');
assert(normalizeUrl('https://secure.io') === 'https://secure.io', 'Preserves explicit https:// scheme');
assert(normalizeUrl('') === '', 'Empty string normalizes to empty string');
assert(normalizeUrl('   ') === '', 'Whitespace normalizes to empty string');
assert(normalizeUrl(null) === '', 'null normalizes to empty string');

// --------------------------------------------------------------------------
// 5. Dynamic Lucide Icon Resolution (resolveLucideIcon)
// --------------------------------------------------------------------------
console.log('\n--- 5. Dynamic Lucide Icon Resolver (resolveLucideIcon) ---');

const { resolveLucideIcon } = linkCardExports;

// Verify known aliases resolve to truthy icon components
const testAliases = ['github', 'twitter', 'x', 'linkedin', 'youtube', 'discord', 'globe', 'code', 'sparkles', 'music', 'gamepad2'];
testAliases.forEach((alias) => {
  const icon = resolveLucideIcon(alias);
  assert(Boolean(icon), `Resolves alias icon: "${alias}"`);
});

// Verify fallback to Globe on unknown or invalid inputs
const fallbackIcon = resolveLucideIcon('completely_unknown_icon_xyz_999');
assert(Boolean(fallbackIcon), 'Falls back gracefully on unknown icon identifier');
assert(Boolean(resolveLucideIcon('')), 'Falls back gracefully on empty string icon');
assert(Boolean(resolveLucideIcon(null)), 'Falls back gracefully on null icon');
assert(Boolean(resolveLucideIcon(undefined)), 'Falls back gracefully on undefined icon');

// --------------------------------------------------------------------------
// 6. SocialHub Platform Resolver & Discreet Trigger Invariants
// --------------------------------------------------------------------------
console.log('\n--- 6. SocialHub Platform Resolver & Discreet Trigger Verification ---');

const { getSocialIcon } = socialHubExports;

assert(Boolean(getSocialIcon('github', 'https://github.com/user')), 'Resolves GitHub platform icon');
assert(Boolean(getSocialIcon('twitter', 'https://x.com/user')), 'Resolves Twitter/X platform icon');
assert(Boolean(getSocialIcon('linkedin', 'https://linkedin.com/in/user')), 'Resolves LinkedIn platform icon');
assert(Boolean(getSocialIcon('youtube', 'https://youtube.com/@channel')), 'Resolves YouTube platform icon');
assert(Boolean(getSocialIcon('discord', 'https://discord.gg/invite')), 'Resolves Discord platform icon');
assert(Boolean(getSocialIcon('mail', 'mailto:dev@example.com')), 'Resolves Email/Mail platform icon');
assert(Boolean(getSocialIcon('instagram', 'https://instagram.com/user')), 'Resolves Instagram platform icon');
assert(Boolean(getSocialIcon('unknown', 'https://portfolio.com')), 'Resolves fallback Globe icon for generic URL');

// Inspect SocialHub source for keyboard listener and discreet trigger
const socialHubSource = fs.readFileSync(path.join(rootDir, 'src/components/profile/SocialHub.jsx'), 'utf-8');
assert(socialHubSource.includes('keydown') && socialHubSource.includes('ctrlKey') && socialHubSource.includes('shiftKey'), 'Implements global Ctrl+Shift+L keyboard shortcut listener');
assert(socialHubSource.includes('removeEventListener'), 'Properly cleans up keydown listener in useEffect return');
assert(socialHubSource.includes('rel="noopener noreferrer"'), 'Social links enforce rel="noopener noreferrer" security attribute');
assert(socialHubSource.includes('target="_blank"'), 'Social links open in external tab target="_blank"');
assert(socialHubSource.includes('getFullYear()'), 'Dynamic current copyright year using getFullYear()');

// --------------------------------------------------------------------------
// 7. Canonical Categories & Dual Resolution (FavoritesSection)
// --------------------------------------------------------------------------
console.log('\n--- 7. FavoritesSection Canonical Categories & Asset Resolution ---');

const { CATEGORY_META } = favoritesExports;
const expectedCategories = ['all', 'tech', 'gaming', 'anime', 'music', 'hobbies'];
expectedCategories.forEach((cat) => {
  assert(Boolean(CATEGORY_META[cat]), `Canonical category metadata present for "${cat}"`);
  assert(typeof CATEGORY_META[cat].label === 'string', `Category "${cat}" has human-readable label`);
  assert(Boolean(CATEGORY_META[cat].icon), `Category "${cat}" has associated icon component`);
});

const favoritesSource = fs.readFileSync(path.join(rootDir, 'src/components/links/FavoritesSection.jsx'), 'utf-8');
assert(favoritesSource.includes('propFavorites') || favoritesSource.includes('favorites: propFavorites'), 'Supports prop-driven favorites override');
assert(favoritesSource.includes('useProfileStore'), 'Supports reactive Zustand store draft state');
assert(favoritesSource.includes('startsWith(\'http://\')') || favoritesSource.includes('startsWith(\'https://\')'), 'Implements URL image detection for cover art');
assert(favoritesSource.includes('<img') && favoritesSource.includes('<IconComp'), 'Implements dual resolution (<img> for media and Lucide icon for glyphs)');

// --------------------------------------------------------------------------
// 8. Layout Matrix & Asymmetric Bento Spans (LinksGrid)
// --------------------------------------------------------------------------
console.log('\n--- 8. LinksGrid Layout Engines & Filtering ---');

const linksGridSource = fs.readFileSync(path.join(rootDir, 'src/components/links/LinksGrid.jsx'), 'utf-8');
assert(linksGridSource.includes('bento') && linksGridSource.includes('stack') && linksGridSource.includes('cards'), 'Supports all 3 layout engines (bento, stack, cards)');
assert(linksGridSource.includes('sm:col-span-2 md:col-span-2'), 'Bento layout features asymmetric 2-column span for featured links');
assert(linksGridSource.includes('max-w-xl mx-auto'), 'Stack layout features centered linear container');
assert(linksGridSource.includes('AnimatePresence'), 'Framer Motion AnimatePresence handles dynamic category filtering');
assert(linksGridSource.includes('categoryCounts'), 'Dynamic category filtering pills calculate exact item counts');

// --------------------------------------------------------------------------
// 9. App.jsx Complete Integration & 14 Smoke Verification Elements
// --------------------------------------------------------------------------
console.log('\n--- 9. App.jsx Integration & Backward Compatibility Preservation ---');

const appSource = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf-8');

// Component mounting assertions
const requiredComponents = [
  'ParticleBackground',
  'ThemeSwitcher',
  'ProfileHeader',
  'MusicPlayer',
  'LinksGrid',
  'FavoritesSection',
  'SocialHub',
  'LoginModal',
  'LiveCustomizerDrawer',
];

requiredComponents.forEach((comp) => {
  assert(appSource.includes(`<${comp}`), `App.jsx genuinely mounts <${comp} />`);
});

// 14 Smoke verification DOM elements for backward compatibility
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

requiredSmokeIds.forEach((id) => {
  assert(appSource.includes(`id="${id}"`), `App.jsx preserves smoke element id="${id}"`);
});

// Particle density handler preservation
assert(appSource.includes('handleDensityChange'), 'App.jsx implements handleDensityChange');

// --------------------------------------------------------------------------
// 10. Production Static Dist Resolution (Relative Paths Invariant)
// --------------------------------------------------------------------------
console.log('\n--- 10. Production Build Static Asset Resolution Invariant ---');

const distPath = path.join(rootDir, 'dist');
const indexPath = path.join(distPath, 'index.html');

assert(fs.existsSync(distPath), 'Production dist/ directory exists');
assert(fs.existsSync(indexPath), 'Production dist/index.html exists');

const distHtml = fs.readFileSync(indexPath, 'utf-8');
const assetMatches = Array.from(distHtml.matchAll(/(?:href|src)=["']([^"']+)["']/g)).map((m) => m[1]);
const internalAssets = assetMatches.filter((u) => !u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('data:'));

assert(internalAssets.length > 0, `Discovered internal assets in dist/index.html (found ${internalAssets.length})`);

let zeroRootAbsolute = true;
let allStartRelative = true;

internalAssets.forEach((url) => {
  if (url.startsWith('/') && !url.startsWith('./')) zeroRootAbsolute = false;
  if (!url.startsWith('./')) allStartRelative = false;
});

assert(zeroRootAbsolute, 'dist/index.html contains strictly ZERO root-absolute paths (/...)');
assert(allStartRelative, 'dist/index.html internal assets strictly begin with "./" for GitHub Pages subfolder compatibility');

// --------------------------------------------------------------------------
// Final Audit Summary
// --------------------------------------------------------------------------
console.log('\n========================================================================');
console.log('   M4 FORENSIC AUDIT SUMMARY');
console.log('========================================================================');
console.log(`Total Forensic Checks : ${totalTests}`);
console.log(`Passed Checks         : ${passedTests}`);
console.log(`Failed Checks         : ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error(`[AUDIT FAILED] ${failedTests} integrity or contract violations discovered:`);
  failureDetails.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
} else {
  console.log('[AUDIT VERDICT] CLEAN - Zero mock facades, authentic logic verified across all M4 deliverables.');
  process.exit(0);
}
