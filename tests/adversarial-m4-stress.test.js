/**
 * tests/adversarial-m4-stress.test.js
 * Empirical Adversarial Challenger Test Suite for Milestone 4
 *
 * Scope:
 * - ProfileHeader.jsx: generateAvatarFallback, getSafeProfile, avatar/banner fallbacks, extreme strings
 * - LinkCard.jsx: isSafeUrl protocol security, normalizeUrl, resolveLucideIcon, cardStyle variants
 * - LinksGrid.jsx: layoutStyle variants ('bento', 'stack', 'cards'), featured spans, category counts
 * - FavoritesSection.jsx: CATEGORY_META, category filtering, malformed items, dual icon/image resolution
 * - SocialHub.jsx: security attributes, platform icons, discreet owner shortcut (Ctrl+Shift+L)
 * - Static Build & Asset Verification: relative paths invariant (./), zero root-absolute (/assets/)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {
  TestHarness,
  PROJECT_ROOT,
  LAYOUT_STYLES,
  CARD_STYLES,
  FAVORITE_CATEGORIES,
} from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// 1. Bundle and Extract M4 Modules via esbuild
// ---------------------------------------------------------------------------

async function bundleModule(entryRelativePath) {
  const result = await esbuild.build({
    entryPoints: [path.join(PROJECT_ROOT, entryRelativePath)],
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

  const mod = { exports: {} };
  const evalFn = new Function('module', 'exports', 'require', result.outputFiles[0].text);
  evalFn(mod, mod.exports, require);
  return mod.exports;
}

// Pre-bundle target modules
const profileHeaderMod = await bundleModule('src/components/profile/ProfileHeader.jsx');
const linkCardMod = await bundleModule('src/components/links/LinkCard.jsx');
const favoritesSectionMod = await bundleModule('src/components/links/FavoritesSection.jsx');

const {
  generateAvatarFallback,
  getSafeProfile,
  default: ProfileHeader,
} = profileHeaderMod;

const {
  isSafeUrl,
  normalizeUrl,
  resolveLucideIcon,
  default: LinkCard,
} = linkCardMod;

const {
  CATEGORY_META,
  default: FavoritesSection,
} = favoritesSectionMod;

// ---------------------------------------------------------------------------
// 2. Read Raw Component Sources for Structural Invariant Checking
// ---------------------------------------------------------------------------
const profileHeaderSrc = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/components/profile/ProfileHeader.jsx'),
  'utf-8'
);
const linkCardSrc = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/components/links/LinkCard.jsx'),
  'utf-8'
);
const linksGridSrc = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/components/links/LinksGrid.jsx'),
  'utf-8'
);
const favoritesSrc = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/components/links/FavoritesSection.jsx'),
  'utf-8'
);
const socialHubSrc = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/components/profile/SocialHub.jsx'),
  'utf-8'
);

// ---------------------------------------------------------------------------
// 3. Define Test Suite
// ---------------------------------------------------------------------------

export function createAdversarialM4Suite() {
  const harness = new TestHarness('M4 Empirical Adversarial Stress Suite');

  // =========================================================================
  // VECTOR 1: Avatar Fallback Monogram Generator (generateAvatarFallback)
  // =========================================================================

  harness.test('ADV-4.1: Avatar fallback with boundary and malformed inputs', () => {
    // Falsy and nullish boundaries
    assert.equal(generateAvatarFallback(''), '??', 'Empty string must return "??"');
    assert.equal(generateAvatarFallback(null), '??', 'Null must return "??"');
    assert.equal(generateAvatarFallback(undefined), '??', 'Undefined must return "??"');
    assert.equal(generateAvatarFallback('   '), '??', 'Whitespace-only must return "??"');
    assert.equal(generateAvatarFallback('\t\n\r  '), '??', 'Whitespace controls must return "??"');

    // Non-string types
    assert.equal(generateAvatarFallback(123), '??', 'Numbers must return "??"');
    assert.equal(generateAvatarFallback(0), '??', 'Zero must return "??"');
    assert.equal(generateAvatarFallback(true), '??', 'Boolean true must return "??"');
    assert.equal(generateAvatarFallback(false), '??', 'Boolean false must return "??"');
    assert.equal(generateAvatarFallback({}), '??', 'Object must return "??"');
    assert.equal(generateAvatarFallback([]), '??', 'Array must return "??"');
    assert.equal(generateAvatarFallback(NaN), '??', 'NaN must return "??"');
    assert.equal(generateAvatarFallback(() => {}), '??', 'Function must return "??"');

    // Single words
    assert.equal(generateAvatarFallback('Kavinsky'), 'KA', 'Single word returns first 2 chars uppercase');
    assert.equal(generateAvatarFallback('kavinsky'), 'KA', 'Lowercase word converted to uppercase');
    assert.equal(generateAvatarFallback('Alex'), 'AL', '"Alex" returns "AL"');
    assert.equal(generateAvatarFallback('A'), 'A', 'Single letter word returns single letter');
    assert.equal(generateAvatarFallback('z'), 'Z', 'Single lowercase letter returns uppercase');

    // Multiple words
    assert.equal(generateAvatarFallback('Alex Rivera'), 'AR', 'First of first + first of last');
    assert.equal(generateAvatarFallback('alex rivera'), 'AR', 'Lowercase two words converted to uppercase');
    assert.equal(generateAvatarFallback('Alex Benjamin Rivera'), 'AR', 'Three words picks first and last word');
    assert.equal(generateAvatarFallback('John Middle Second Third Doe'), 'JD', 'Five words picks first and last word');

    // Pathological spacing
    assert.equal(generateAvatarFallback('   Alex      Rivera   '), 'AR', 'Extra leading/trailing/inner spaces');
    assert.equal(generateAvatarFallback('Alex\tRivera'), 'AR', 'Tab separated words');
    assert.equal(generateAvatarFallback('Alex\n\rRivera'), 'AR', 'Newline separated words');

    // Numbers in names
    assert.equal(generateAvatarFallback('12345'), '12', 'Numeric string single word');
    assert.equal(generateAvatarFallback('1 2'), '12', 'Numeric string two words');
    assert.equal(generateAvatarFallback('42 Developers'), '4D', 'Number + word');

    // Special characters & symbols
    assert.equal(generateAvatarFallback('@#$%'), '@#', 'Special characters single word');
    assert.equal(generateAvatarFallback('! ?'), '!?', 'Special characters two words');
    assert.equal(generateAvatarFallback('- _'), '-_', 'Hyphen and underscore');

    // Unicode & Emojis
    assert.equal(typeof generateAvatarFallback('✨'), 'string', 'Single emoji returns string without error');
    assert.equal(typeof generateAvatarFallback('🚀 Rocket'), 'string', 'Emoji and word returns string');
    assert.equal(generateAvatarFallback('Élise Reclus'), 'ÉR', 'Accented characters properly formatted');
    assert.equal(generateAvatarFallback('Иван Иванов'), 'ИИ', 'Cyrillic characters properly formatted');

    // Extreme string length (50,000 characters)
    const longName = 'A'.repeat(25000) + ' ' + 'Z'.repeat(25000);
    const start = Date.now();
    const longResult = generateAvatarFallback(longName);
    const elapsed = Date.now() - start;
    assert.equal(longResult, 'AZ', 'Extreme 50k character name parsed to "AZ"');
    assert.ok(elapsed < 20, `Execution time must be fast (<20ms, took ${elapsed}ms)`);
  });

  // =========================================================================
  // VECTOR 2: Defensive Profile Data Normalization (getSafeProfile)
  // =========================================================================

  harness.test('ADV-4.2: Defensive profile normalization against corrupt or missing schemas', () => {
    // Nullish & empty object fallbacks
    const safeNull = getSafeProfile(null);
    assert.ok(safeNull.name && safeNull.handle.startsWith('@'), 'Null falls back to default seed');

    const safeUndefined = getSafeProfile(undefined);
    assert.ok(safeUndefined.name && safeUndefined.handle.startsWith('@'), 'Undefined falls back to default seed');

    const safeEmpty = getSafeProfile({});
    assert.ok(safeEmpty.name && safeEmpty.handle.startsWith('@'), 'Empty object falls back to default seed');

    // Handle auto-prefixing with @
    const withNoAt = getSafeProfile({ name: 'Nova', handle: 'novadev' });
    assert.equal(withNoAt.handle, '@novadev', 'Handle without @ automatically receives @ prefix');

    const withAt = getSafeProfile({ name: 'Nova', handle: '@novadev' });
    assert.equal(withAt.handle, '@novadev', 'Handle with @ remains unchanged');

    // Name whitespace trimming
    const trimmed = getSafeProfile({ name: '   Nova Hacker   ' });
    assert.equal(trimmed.name, 'Nova Hacker', 'Name whitespace is trimmed cleanly');

    // Extreme string length resilience
    const hugeBio = 'B'.repeat(10000);
    const hugeQuote = 'Q'.repeat(5000);
    const extreme = getSafeProfile({ bio: hugeBio, quote: hugeQuote });
    assert.equal(extreme.bio.length, 10000, 'Extreme bio preserved');
    assert.equal(extreme.quote.length, 5000, 'Extreme quote preserved');
  });

  // =========================================================================
  // VECTOR 3: URL Protocol Security & Malicious Scheme Neutralization (isSafeUrl)
  // =========================================================================

  harness.test('ADV-4.3: URL safety validation blocks all dangerous pseudo-protocols', () => {
    // Dangerous schemes: javascript, data, vbscript, file
    const maliciousUrls = [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'JaVaScRiPt:alert(1)',
      'JAVASCRIPT:console.log("xss")',
      'javascript:void(0)',
      'javascript:/*--></title></style></textarea><script>alert(1)</script>',
      'data:text/html,<script>alert(1)</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'DATA:image/svg+xml;utf8,<svg onload="alert(1)"/>',
      'data:application/javascript,alert(1)',
      'vbscript:msgbox(1)',
      'VBSCRIPT:alert(1)',
      'vbscript:Execute("alert 1")',
      'file:///etc/passwd',
      'FILE:///c:/windows/system32',
      'file://localhost/etc/shadow',
      // Whitespace bypass vectors
      '   javascript:alert(1)   ',
      '\tjavascript:alert(1)',
      '\njavascript:alert(1)',
      '\r\njavascript:alert(1)',
      ' \t\n JAVASCRIPT:prompt(1) \n',
      '   data:text/plain,hello',
      '  file:///tmp/secret.txt',
    ];

    for (const url of maliciousUrls) {
      assert.equal(
        isSafeUrl(url),
        false,
        `Malicious URL scheme must be rejected: ${JSON.stringify(url)}`
      );
    }

    // Non-string inputs must be rejected safely without throwing
    const nonStrings = [null, undefined, 123, 0, true, false, {}, [], NaN];
    for (const val of nonStrings) {
      assert.equal(isSafeUrl(val), false, `Non-string value must return false: ${typeof val}`);
    }

    // Benign / legitimate URLs must be permitted
    const safeUrls = [
      'https://github.com/developer',
      'http://localhost:5173',
      'https://spotify.com/artist/12345?si=abc#track',
      'https://youtube.com/watch?v=dQw4w9WgXcQ',
      'mailto:alex.rivera@example.com',
      'tel:+15551234567',
    ];

    for (const url of safeUrls) {
      assert.equal(isSafeUrl(url), true, `Safe URL must be approved: ${url}`);
    }
  });

  // =========================================================================
  // VECTOR 4: URL Normalization Rules (normalizeUrl)
  // =========================================================================

  harness.test('ADV-4.4: URL normalization handles schemes and auto-prefixing', () => {
    // Naked domains get https://
    assert.equal(normalizeUrl('github.com'), 'https://github.com');
    assert.equal(normalizeUrl('twitter.com/dev'), 'https://twitter.com/dev');
    assert.equal(normalizeUrl('portfolio.io/projects'), 'https://portfolio.io/projects');

    // Existing schemes are preserved verbatim
    assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
    assert.equal(normalizeUrl('http://localhost:3000'), 'http://localhost:3000');
    assert.equal(normalizeUrl('ftp://files.example.org'), 'ftp://files.example.org');

    // Empty and falsy values return empty string
    assert.equal(normalizeUrl(''), '');
    assert.equal(normalizeUrl('   '), '');
    assert.equal(normalizeUrl(null), '');
    assert.equal(normalizeUrl(undefined), '');
    assert.equal(normalizeUrl(123), '');
  });

  // =========================================================================
  // VECTOR 5: Dynamic Lucide Icon Resolution (resolveLucideIcon)
  // =========================================================================

  harness.test('ADV-4.5: Dynamic Lucide icon resolution and graceful fallback to Globe', () => {
    // Standard platform names
    assert.ok(resolveLucideIcon('github'), 'github resolves');
    assert.ok(resolveLucideIcon('twitter'), 'twitter resolves');
    assert.ok(resolveLucideIcon('x'), 'x resolves to twitter');
    assert.ok(resolveLucideIcon('linkedin'), 'linkedin resolves');
    assert.ok(resolveLucideIcon('youtube'), 'youtube resolves');
    assert.ok(resolveLucideIcon('discord'), 'discord resolves');
    assert.ok(resolveLucideIcon('mail'), 'mail resolves');
    assert.ok(resolveLucideIcon('terminal'), 'terminal resolves');
    assert.ok(resolveLucideIcon('code'), 'code resolves');
    assert.ok(resolveLucideIcon('globe'), 'globe resolves');

    // Normalization tolerance (case, hyphens, underscores, spaces)
    assert.equal(resolveLucideIcon('GitHub'), resolveLucideIcon('github'));
    assert.equal(resolveLucideIcon('GIT-HUB'), resolveLucideIcon('github'));
    assert.equal(resolveLucideIcon('git_hub'), resolveLucideIcon('github'));
    assert.equal(resolveLucideIcon('  twitter  '), resolveLucideIcon('twitter'));

    // Unknown or invalid icons fallback cleanly to Globe
    const GlobeComponent = resolveLucideIcon('globe');
    assert.equal(resolveLucideIcon('non_existent_crazy_icon_999'), GlobeComponent);
    assert.equal(resolveLucideIcon(''), GlobeComponent);
    assert.equal(resolveLucideIcon('   '), GlobeComponent);
    assert.equal(resolveLucideIcon(null), GlobeComponent);
    assert.equal(resolveLucideIcon(undefined), GlobeComponent);
    assert.equal(resolveLucideIcon(42), GlobeComponent);
  });

  // =========================================================================
  // VECTOR 6: Layout Styles & Card Style Variants Verification
  // =========================================================================

  harness.test('ADV-4.6: Layout variants and Card Style variants matrix', () => {
    // Verify layout styles specified in PROJECT.md
    assert.deepEqual(LAYOUT_STYLES, ['bento', 'stack', 'cards']);
    assert.deepEqual(CARD_STYLES, ['glassmorphism', 'neon-border', 'minimal-flat']);

    // Check LinksGrid.jsx handles layout variants
    assert.ok(linksGridSrc.includes('bento'), 'LinksGrid includes bento layout');
    assert.ok(linksGridSrc.includes('stack'), 'LinksGrid includes stack layout');
    assert.ok(linksGridSrc.includes('cards'), 'LinksGrid includes cards layout');

    // Check LinkCard.jsx handles card style variants
    assert.ok(linkCardSrc.includes('glassmorphism'), 'LinkCard includes glassmorphism');
    assert.ok(linkCardSrc.includes('neon-border'), 'LinkCard includes neon-border');
    assert.ok(linkCardSrc.includes('minimal-flat'), 'LinkCard includes minimal-flat');

    // Test SSR rendering across all 3x3 combinations
    let combinationCount = 0;
    for (const layout of LAYOUT_STYLES) {
      for (const card of CARD_STYLES) {
        const testLink = {
          id: `link-${layout}-${card}`,
          title: `Test ${layout} ${card}`,
          url: 'https://example.com/test',
          icon: 'github',
          category: 'project',
          order: 1,
          isActive: true,
        };

        const html = ReactDOMServer.renderToStaticMarkup(
          React.createElement(LinkCard, {
            link: testLink,
            layoutStyle: layout,
            cardStyle: card,
            isFeatured: layout === 'bento',
          })
        );

        assert.ok(html.includes('href="https://example.com/test"'), 'Href rendered');
        assert.ok(html.includes(testLink.title), 'Title rendered');

        // Style class assertions
        if (card === 'neon-border') {
          assert.ok(html.includes('border-theme-primary'), 'neon-border primary border');
        } else if (card === 'minimal-flat') {
          assert.ok(html.includes('shadow-none'), 'minimal-flat shadow-none');
        } else {
          assert.ok(html.includes('backdrop-blur'), 'glassmorphism backdrop blur');
        }

        combinationCount++;
      }
    }
    assert.equal(combinationCount, 9, 'All 9 layout x cardStyle combinations rendered cleanly');

    // Adversarial SSR: Malicious URL rendered in LinkCard
    const xssLink = {
      id: 'xss-link',
      title: 'Exploit Card',
      url: 'javascript:alert(1)',
      icon: 'terminal',
    };
    const xssHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(LinkCard, { link: xssLink })
    );
    assert.ok(xssHtml.includes('href="#"'), 'Malicious URL in LinkCard must render href="#"');
    assert.ok(
      !xssHtml.includes('href="javascript:'),
      'Dangerous script must not be in href attribute'
    );
  });

  // =========================================================================
  // VECTOR 7: FavoritesSection Category Filtering & Malformed Data Stress
  // =========================================================================

  harness.test('ADV-4.7: FavoritesSection category metadata and malformed array stress', () => {
    // Verify canonical categories in CATEGORY_META
    assert.ok(CATEGORY_META.all, 'CATEGORY_META has "all"');
    assert.ok(CATEGORY_META.tech, 'CATEGORY_META has "tech"');
    assert.ok(CATEGORY_META.gaming, 'CATEGORY_META has "gaming"');
    assert.ok(CATEGORY_META.anime, 'CATEGORY_META has "anime"');
    assert.ok(CATEGORY_META.music, 'CATEGORY_META has "music"');
    assert.ok(CATEGORY_META.hobbies, 'CATEGORY_META has "hobbies"');

    for (const cat of FAVORITE_CATEGORIES) {
      assert.ok(CATEGORY_META[cat], `Canonical category ${cat} must exist in CATEGORY_META`);
      assert.ok(CATEGORY_META[cat].label, `Category ${cat} must have label`);
      assert.ok(CATEGORY_META[cat].icon, `Category ${cat} must have icon`);
    }

    // Stress test 1: Render with null / empty favorites prop
    const emptyHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(FavoritesSection, { favorites: [] })
    );
    assert.ok(
      emptyHtml.includes('No favorites found') || emptyHtml.includes('Interests'),
      'Empty favorites renders clean fallback message'
    );

    // Stress test 2: Malformed favorites items containing null, undefined, primitives
    const malformedFavorites = [
      null,
      undefined,
      'just a string',
      12345,
      {},
      { id: 'fav-1', category: 'tech', title: 'React 18', order: 1 },
      { id: 'fav-2', category: 'tech', title: 'Vite', iconOrImage: 'https://vitejs.dev/logo.svg', order: 2 },
      { id: 'fav-3', category: 'gaming', title: 'Cyberpunk 2077', badge: 'Masterpiece', order: 3 },
      { id: 'fav-4', category: 'unknown_custom_cat', title: 'Obscure Hobby', order: 4 },
    ];

    const malformedHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(FavoritesSection, { favorites: malformedFavorites })
    );

    assert.ok(malformedHtml.includes('React 18'), 'Valid item 1 rendered despite malformed peers');
    assert.ok(malformedHtml.includes('Cyberpunk 2077'), 'Valid item 2 rendered');
    assert.ok(malformedHtml.includes('https://vitejs.dev/logo.svg'), 'Image URL rendered in img tag');
    assert.ok(malformedHtml.includes('Obscure Hobby'), 'Item with custom category rendered');

    // Dual resolution: Image URL vs Lucide Icon glyph
    assert.ok(favoritesSrc.includes('iconOrImage.startsWith'), 'FavoritesSection checks image URL prefixes');
    assert.ok(favoritesSrc.includes('<img'), 'FavoritesSection renders <img> for external images');
  });

  // =========================================================================
  // VECTOR 8: SocialHub Security & Discreet Owner Mode Trigger
  // =========================================================================

  harness.test('ADV-4.8: SocialHub discreet owner shortcut and external link security', () => {
    // Discreet owner trigger (Ctrl+Shift+L / Cmd+Shift+L)
    assert.ok(
      socialHubSrc.includes('Ctrl+Shift+L') || socialHubSrc.includes('Shift+L') || socialHubSrc.includes('key === "L"'),
      'SocialHub must register Ctrl+Shift+L / Cmd+Shift+L keyboard shortcut'
    );

    // Padlock button trigger
    assert.ok(
      socialHubSrc.includes('Lock') || socialHubSrc.includes('padlock') || socialHubSrc.includes('Owner'),
      'SocialHub contains padlock trigger button'
    );

    // Enforced external link security (target="_blank" and rel="noopener noreferrer")
    assert.ok(
      socialHubSrc.includes('target="_blank"'),
      'SocialHub external links must specify target="_blank"'
    );
    assert.ok(
      socialHubSrc.includes('rel="noopener noreferrer"'),
      'SocialHub external links must specify rel="noopener noreferrer"'
    );

    // Dynamic current year
    assert.ok(
      socialHubSrc.includes('getFullYear()'),
      'SocialHub uses dynamic current year'
    );
  });

  // =========================================================================
  // VECTOR 9: ProfileHeader Structural Invariants & SSR Verification
  // =========================================================================

  harness.test('ADV-4.9: ProfileHeader SSR renders verified badge, quote, and initials fallback', () => {
    const testProfile = {
      name: 'Elena Rostova',
      handle: '@elena',
      bio: 'Cyberpunk Audio Architect & WebGL Explorer.',
      quote: 'Code is sound made visible.',
      avatarUrl: '', // empty to force monogram fallback
      location: 'Neo-Tokyo',
      statusBadge: 'Building the Future',
    };

    const headerHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProfileHeader, { profile: testProfile })
    );

    assert.ok(headerHtml.includes('Elena Rostova'), 'Name rendered in ProfileHeader');
    assert.ok(headerHtml.includes('@elena'), 'Handle rendered in ProfileHeader');
    assert.ok(headerHtml.includes('Neo-Tokyo'), 'Location rendered in ProfileHeader');
    assert.ok(headerHtml.includes('Building the Future'), 'Status badge rendered');
    assert.ok(headerHtml.includes('Code is sound made visible.'), 'Quote rendered');
    assert.ok(headerHtml.includes('ER'), 'Initials fallback "ER" rendered for empty avatarUrl');

    // Error recovery flags present in source
    assert.ok(profileHeaderSrc.includes('avatarError'), 'Handles avatar image loading error');
    assert.ok(profileHeaderSrc.includes('bannerError'), 'Handles banner image loading error');
    assert.ok(profileHeaderSrc.includes('BadgeCheck'), 'Includes verified badge check icon');
  });

  // =========================================================================
  // VECTOR 10: Production Static Build & Relative Asset Path Compliance
  // =========================================================================

  harness.test('ADV-4.10: Production static build inspection and strict relative paths', () => {
    const distPath = path.join(PROJECT_ROOT, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    const distAssets = path.join(distPath, 'assets');

    assert.ok(fs.existsSync(distPath), 'dist folder exists');
    assert.ok(fs.existsSync(indexPath), 'dist/index.html exists');
    assert.ok(fs.existsSync(distAssets), 'dist/assets exists');

    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // Match all href and src attributes in dist/index.html
    const assetRegex = /(?:href|src)=["']([^"']+)["']/g;
    const internalUrls = [];
    let m;
    while ((m = assetRegex.exec(indexHtml)) !== null) {
      const url = m[1];
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        internalUrls.push(url);
      }
    }

    assert.ok(internalUrls.length >= 2, `Internal assets found: ${internalUrls.length}`);

    // STRICT INVARIANT: ZERO root-absolute paths starting with '/'
    const rootAbsolute = internalUrls.filter((u) => u.startsWith('/') && !u.startsWith('//'));
    assert.equal(
      rootAbsolute.length,
      0,
      `dist/index.html must not contain root-absolute paths (/...). Found: ${rootAbsolute.join(', ')}`
    );

    // STRICT INVARIANT: All internal assets must strictly begin with './'
    const nonRelative = internalUrls.filter((u) => !u.startsWith('./'));
    assert.equal(
      nonRelative.length,
      0,
      `All assets must begin with "./". Non-relative: ${nonRelative.join(', ')}`
    );

    // Verify all referenced assets physically exist on disk
    for (const relUrl of internalUrls) {
      const clean = relUrl.split('?')[0].split('#')[0];
      const diskPath = path.resolve(distPath, clean);
      assert.ok(fs.existsSync(diskPath), `Asset file exists on disk: ${relUrl}`);
    }
  });

  return harness;
}

// ---------------------------------------------------------------------------
// 4. CLI Entrypoint
// ---------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('adversarial-m4-stress.test.js')) {
  console.log('\n========================================================================');
  console.log('   M4 Empirical Adversarial Stress Suite (Challenger 1)');
  console.log('========================================================================\n');

  const suite = createAdversarialM4Suite();
  suite.run().then((res) => {
    if (res.failed > 0) {
      console.error(`\n[✖] Suite failed: ${res.failed} tests failed out of ${res.total}`);
      process.exit(1);
    } else {
      console.log(`\n[✔] Suite passed: 100% (${res.passed}/${res.total}) adversarial tests passed!`);
      process.exit(0);
    }
  });
}
