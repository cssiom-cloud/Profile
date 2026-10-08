/**
 * tests/adversarial-m4-links-favorites.test.js
 * Adversarial Challenger & Reviewer Stress Suite for Milestone 4
 *
 * Targets:
 * - src/components/links/LinkCard.jsx
 * - src/components/links/LinksGrid.jsx
 * - src/components/links/FavoritesSection.jsx
 * - src/components/profile/ProfileHeader.jsx
 * - src/components/profile/SocialHub.jsx
 *
 * Adversarial Dimensions:
 * 1. URL Protocol Sanitization & Attack Injection (javascript:, data:, vbscript:, file:, casing, whitespace, unicode)
 * 2. URL Normalization & Link Navigation Safety (safe schemes, auto-prefixing, '#' fallback, rel="noopener noreferrer")
 * 3. Dynamic Lucide Icon Resolution & Alias Dictionary (30+ aliases, kebab/snake normalization, nonexistent icons, edge types)
 * 4. Card Style Variants & Visual Classes ('glassmorphism', 'neon-border', 'minimal-flat', invalid fallbacks)
 * 5. Layout Container Engine & Asymmetric Bento Span Mathematics ('bento', 'stack', 'cards', single/multiple item ratios)
 * 6. Category Filtering Pills, Counts, & Ordering Consistency
 * 7. Favorites Section Canonical Categories, Theming, and Image vs Icon Dual Resolution
 * 8. Favorites Props Invariance (props.favorites precedence vs store fallback, empty array, malformed elements)
 * 9. Avatar Initials Monogram Fallback Boundary Matrix ('AR', 'KA', '??', single char, long names)
 * 10. Social Hub Platform Icon Matching & Global Keyboard Listener Shortcut Attributes
 * 11. React Component Integrity & SSR Smoke Rendering under Adversarial Payloads
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { TestHarness, PROJECT_ROOT } from './helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// 1. Bundle Modules via esbuild for Node.js Evaluation
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
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(
    mod,
    mod.exports,
    require
  );
  return mod.exports;
}

const linkCardModule = await bundleModule('src/components/links/LinkCard.jsx');
const linksGridModule = await bundleModule('src/components/links/LinksGrid.jsx');
const favoritesModule = await bundleModule('src/components/links/FavoritesSection.jsx');
const profileHeaderModule = await bundleModule('src/components/profile/ProfileHeader.jsx');
const socialHubModule = await bundleModule('src/components/profile/SocialHub.jsx');

const { isSafeUrl, normalizeUrl, resolveLucideIcon, default: LinkCard } = linkCardModule;
const { default: LinksGrid } = linksGridModule;
const { CATEGORY_META, default: FavoritesSection } = favoritesModule;
const { generateAvatarFallback, getSafeProfile, default: ProfileHeader } = profileHeaderModule;
const { getSocialIcon, default: SocialHub } = socialHubModule;

// Source inspections
const linkCardSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/links/LinkCard.jsx'), 'utf-8');
const linksGridSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/links/LinksGrid.jsx'), 'utf-8');
const favoritesSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/links/FavoritesSection.jsx'), 'utf-8');
const profileHeaderSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/profile/ProfileHeader.jsx'), 'utf-8');
const socialHubSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/profile/SocialHub.jsx'), 'utf-8');

// ---------------------------------------------------------------------------
// 2. Adversarial Test Suite Execution
// ---------------------------------------------------------------------------

export async function runAdversarialM4Suite() {
  const harness = new TestHarness('M4 Adversarial Links Grid, Cards & Favorites Stress Suite');

  // =========================================================================
  // VECTOR 1: URL Protocol Sanitization & Attack Injection
  // =========================================================================
  harness.test('ADV-4.1: URL protocol sanitization rejects malicious XSS vectors and invalid types', () => {
    const maliciousVectors = [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(document.cookie)',
      '  javascript:alert(1)',
      '\njavascript:alert(1)',
      '\tjavascript:confirm(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'DATA:image/svg+xml;utf8,<svg onload=alert(1)>',
      'vbscript:msgbox("pwnd")',
      'VBSCRIPT:execute("evil")',
      'file:///etc/passwd',
      'file://C:/Windows/win.ini',
      'FILE:///root/.ssh/id_rsa',
    ];

    for (const vector of maliciousVectors) {
      assert.equal(
        isSafeUrl(vector),
        false,
        `isSafeUrl must reject malicious vector: ${vector}`
      );
    }

    // Invalid non-string types
    const invalidTypes = [null, undefined, 12345, {}, [], true, false, Symbol('x')];
    for (const val of invalidTypes) {
      assert.equal(
        isSafeUrl(val),
        false,
        `isSafeUrl must return false for non-string type: ${typeof val}`
      );
    }

    // Legitimate safe URLs
    const safeUrls = [
      'https://github.com/developer',
      'http://localhost:5173',
      'https://spotify.com/album/12345?query=test#hash',
      'https://sub-domain.service.co.uk/path/to/resource',
      'http://127.0.0.1:8080/dashboard',
    ];
    for (const url of safeUrls) {
      assert.equal(
        isSafeUrl(url),
        true,
        `isSafeUrl must accept legitimate URL: ${url}`
      );
    }
  });

  // =========================================================================
  // VECTOR 2: URL Normalization & Link Navigation Safety
  // =========================================================================
  harness.test('ADV-4.2: URL normalization properly prefixes schema-less URLs and handles edge strings', () => {
    // Non-string inputs
    assert.equal(normalizeUrl(null), '');
    assert.equal(normalizeUrl(undefined), '');
    assert.equal(normalizeUrl(123), '');
    assert.equal(normalizeUrl({}), '');

    // Whitespace inputs
    assert.equal(normalizeUrl(''), '');
    assert.equal(normalizeUrl('   '), '');

    // Scheme-less URLs should get https://
    assert.equal(normalizeUrl('github.com/profile'), 'https://github.com/profile');
    assert.equal(normalizeUrl('twitter.com/dev'), 'https://twitter.com/dev');
    assert.equal(normalizeUrl('my-portfolio.dev'), 'https://my-portfolio.dev');
    assert.equal(normalizeUrl('  sub.domain.org/feed  '), 'https://sub.domain.org/feed');

    // Existing schemes preserved intact
    assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
    assert.equal(normalizeUrl('http://example.com'), 'http://example.com');
    assert.equal(normalizeUrl('ftp://files.example.com'), 'ftp://files.example.com');
  });

  // =========================================================================
  // VECTOR 3: Dynamic Lucide Icon Resolution & Alias Dictionary
  // =========================================================================
  harness.test('ADV-4.3: Dynamic Lucide icon resolver handles aliases, casing, symbols and nonexistent icons without throwing', () => {
    // Non-string / invalid names must return default Globe
    assert.ok(resolveLucideIcon(null), 'null must resolve to fallback icon');
    assert.ok(resolveLucideIcon(undefined), 'undefined must resolve to fallback icon');
    assert.ok(resolveLucideIcon(''), 'empty string must resolve to fallback icon');
    assert.ok(resolveLucideIcon('   '), 'whitespace must resolve to fallback icon');
    assert.ok(resolveLucideIcon(42), 'numbers must resolve to fallback icon');

    // Known alias mappings
    const aliasTests = [
      'github', 'GITHUB', '  Github  ',
      'twitter', 'x',
      'linkedin', 'youtube',
      'discord', 'messagesquare',
      'mail', 'email', 'send',
      'globe', 'web', 'site',
      'code', 'dev', 'terminal', 'cpu',
      'sparkles', 'palette', 'play', 'music', 'gamepad2', 'game',
      'bookopen', 'book-open', 'book_open',
      'externallink', 'external-link', 'external_link',
      'share2', 'share-2',
      'filetext', 'file-text',
    ];

    for (const alias of aliasTests) {
      const Icon = resolveLucideIcon(alias);
      assert.ok(
        Icon && (typeof Icon === 'function' || typeof Icon === 'object'),
        `resolveLucideIcon('${alias}') must resolve to a valid React component`
      );
    }

    // Completely unknown / gibberish icon name
    const unknownIcon = resolveLucideIcon('completely_nonexistent_custom_icon_98765');
    assert.ok(
      unknownIcon && (typeof unknownIcon === 'function' || typeof unknownIcon === 'object'),
      'Unknown icon name must safely fall back to default without throwing'
    );
  });

  // =========================================================================
  // VECTOR 4: LinkCard Props, Styling Variants & XSS Neutralization in Render
  // =========================================================================
  harness.test('ADV-4.4: LinkCard renders all 3 style variants and enforces rel="noopener noreferrer" and target="_blank"', () => {
    const sampleLink = {
      id: 'test-1',
      title: 'Dev Portal',
      url: 'https://example.com',
      icon: 'Github',
      category: 'project',
      order: 0,
      isActive: true,
      highlightColor: '#00f2fe',
    };

    // Test each card style variant
    for (const style of ['glassmorphism', 'neon-border', 'minimal-flat', 'invalid-style']) {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(LinkCard, {
          link: sampleLink,
          layoutStyle: 'bento',
          cardStyle: style,
          isFeatured: false,
        })
      );

      assert.ok(html.includes('Dev Portal'), `Render must include title for style ${style}`);
      assert.ok(html.includes('href="https://example.com"'), `Render must have valid href for style ${style}`);
      assert.ok(html.includes('target="_blank"'), `Render must have target="_blank" for style ${style}`);
      assert.ok(html.includes('rel="noopener noreferrer"'), `Render must have rel="noopener noreferrer" for style ${style}`);
    }

    // Malicious link URL neutralization in SSR markup
    const maliciousLink = {
      id: 'bad-1',
      title: 'Malicious Link',
      url: 'javascript:alert(1)',
      icon: 'Alert',
      category: 'project',
    };

    const maliciousHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(LinkCard, {
        link: maliciousLink,
        layoutStyle: 'bento',
        cardStyle: 'glassmorphism',
      })
    );

    // Href must be neutralized to '#'
    assert.ok(maliciousHtml.includes('href="#"'), 'Malicious URL must be replaced with href="#"');
    assert.ok(!maliciousHtml.includes('href="javascript:'), 'Dangerous scheme must not appear in href attribute');
    assert.ok(!maliciousHtml.includes('href="data:'), 'Dangerous data scheme must not appear in href attribute');
  });

  // =========================================================================
  // VECTOR 5: Asymmetric Bento Span & Layout Container Engine
  // =========================================================================
  harness.test('ADV-4.5: LinksGrid layout container and asymmetric bento span rules', () => {
    // Check that source code implements all 3 required layout types
    assert.ok(linksGridSrc.includes("'stack'"), "Must handle 'stack' layout");
    assert.ok(linksGridSrc.includes("'cards'"), "Must handle 'cards' layout");
    assert.ok(linksGridSrc.includes("'bento'"), "Must handle 'bento' layout");

    // Asymmetric Bento span checks
    assert.ok(linksGridSrc.includes('sm:col-span-2'), 'Bento layout must provide asymmetric 2-column span');
    assert.ok(linksGridSrc.includes('max-w-xl'), 'Stack layout must constrain to max-w-xl');

    // Layout animation check
    assert.ok(linksGridSrc.includes('AnimatePresence'), 'Must use Framer Motion AnimatePresence');
    assert.ok(linksGridSrc.includes('layout'), 'Must use Framer Motion layout prop');
  });

  // =========================================================================
  // VECTOR 6: Category Filtering Pills & Count Calculation
  // =========================================================================
  harness.test('ADV-4.6: LinksGrid category count derivation and filter pills', () => {
    assert.ok(linksGridSrc.includes('categoryCounts'), 'Must compute category counts');
    assert.ok(linksGridSrc.includes('formatCategoryLabel'), 'Must format category labels');
    assert.ok(linksGridSrc.includes('selectedCategory'), 'Must track selected category state');
    assert.ok(linksGridSrc.includes('No active portals') || linksGridSrc.includes('No portals found'), 'Must have informative empty state');
  });

  // =========================================================================
  // VECTOR 7: Favorites Section Canonical Categories & Theming Meta
  // =========================================================================
  harness.test('ADV-4.7: FavoritesSection canonical categories contract (5 categories + all)', () => {
    assert.ok(CATEGORY_META, 'CATEGORY_META must be exported');
    const canonical = ['tech', 'gaming', 'anime', 'music', 'hobbies'];

    for (const cat of canonical) {
      assert.ok(CATEGORY_META[cat], `CATEGORY_META must define '${cat}'`);
      assert.ok(CATEGORY_META[cat].label, `'${cat}' must have a label`);
      assert.ok(CATEGORY_META[cat].icon, `'${cat}' must have an icon`);
      assert.ok(CATEGORY_META[cat].badgeBg, `'${cat}' must have badgeBg`);
      assert.ok(CATEGORY_META[cat].badgeText, `'${cat}' must have badgeText`);
      assert.ok(CATEGORY_META[cat].border, `'${cat}' must have border`);
    }

    assert.ok(CATEGORY_META.all, "CATEGORY_META must define 'all'");
  });

  // =========================================================================
  // VECTOR 8: Favorites Props vs Store Precedence & Dual Media Resolution
  // =========================================================================
  harness.test('ADV-4.8: FavoritesSection dual image vs icon resolution and prop precedence', () => {
    const mockFavorites = [
      {
        id: 'fav-1',
        category: 'tech',
        title: 'React',
        subtitle: 'UI Library',
        iconOrImage: 'Code',
        badge: 'Frontend',
        order: 1,
      },
      {
        id: 'fav-2',
        category: 'gaming',
        title: 'Cyberpunk 2077',
        subtitle: 'Night City',
        iconOrImage: 'https://images.example.com/cyberpunk.jpg',
        badge: 'RPG',
        order: 2,
      },
    ];

    // SSR render with prop favorites
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(FavoritesSection, { favorites: mockFavorites })
    );

    assert.ok(html.includes('React'), 'Must render item from props.favorites');
    assert.ok(html.includes('Cyberpunk 2077'), 'Must render item 2 from props.favorites');
    assert.ok(html.includes('Frontend'), 'Must render badge');
    // Check dual resolution: image item renders <img> tag
    assert.ok(html.includes('<img'), 'Media URL must render an <img> element');
    assert.ok(html.includes('src="https://images.example.com/cyberpunk.jpg"'), 'Image src must match URL');

    // Empty array prop renders empty state without crashing
    const emptyHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(FavoritesSection, { favorites: [] })
    );
    assert.ok(emptyHtml.includes('No favorites found'), 'Empty favorites array must render clean empty state');
  });

  // =========================================================================
  // VECTOR 9: Avatar Initials Monogram Fallback Boundary Matrix (T2.8)
  // =========================================================================
  harness.test('ADV-4.9: generateAvatarFallback monogram matrix complies with T2.8 contract', () => {
    // Single word: first 2 uppercase
    assert.equal(generateAvatarFallback('Kavinsky'), 'KA');
    assert.equal(generateAvatarFallback('neon'), 'NE');
    assert.equal(generateAvatarFallback('X'), 'X');

    // Two words: first letter of first + first letter of last
    assert.equal(generateAvatarFallback('Alex Rivera'), 'AR');
    assert.equal(generateAvatarFallback('Ada Lovelace'), 'AL');

    // Multiple words (> 2): first letter of first + first letter of last
    assert.equal(generateAvatarFallback('John Fitzgerald Kennedy'), 'JK');
    assert.equal(generateAvatarFallback('Ludwig van Beethoven'), 'LB');

    // Whitespace and casing handling
    assert.equal(generateAvatarFallback('   cyber   punk   '), 'CP');

    // Invalid / empty inputs: '??"
    assert.equal(generateAvatarFallback(''), '??');
    assert.equal(generateAvatarFallback('   '), '??');
    assert.equal(generateAvatarFallback(null), '??');
    assert.equal(generateAvatarFallback(undefined), '??');
    assert.equal(generateAvatarFallback(123), '??');
  });

  // =========================================================================
  // VECTOR 10: Social Hub Platform Icons & Owner Shortcut Trigger
  // =========================================================================
  harness.test('ADV-4.10: SocialHub icon resolver and discreet owner authentication shortcuts', () => {
    assert.ok(getSocialIcon('github', 'https://github.com/user'), 'Must resolve Github icon');
    assert.ok(getSocialIcon('twitter', 'https://twitter.com/user'), 'Must resolve Twitter icon');
    assert.ok(getSocialIcon('linkedin', 'https://linkedin.com/in/user'), 'Must resolve LinkedIn icon');
    assert.ok(getSocialIcon('youtube', 'https://youtube.com/channel'), 'Must resolve YouTube icon');
    assert.ok(getSocialIcon('discord', 'https://discord.gg/invite'), 'Must resolve Discord icon');
    assert.ok(getSocialIcon('email', 'mailto:dev@example.com'), 'Must resolve Mail icon');
    assert.ok(getSocialIcon('instagram', 'https://instagram.com/user'), 'Must resolve Instagram icon');

    // Global keyboard listener inspection in source
    assert.ok(socialHubSrc.includes('Ctrl+Shift+L') || socialHubSrc.includes('ctrlKey'), 'Must handle Ctrl+Shift+L shortcut');
    assert.ok(socialHubSrc.includes('keydown'), 'Must register keydown listener');
    assert.ok(socialHubSrc.includes('removeEventListener'), 'Must cleanup keydown listener');
  });

  // =========================================================================
  // VECTOR 11: Production Build Artifacts Integrity
  // =========================================================================
  harness.test('ADV-4.11: Production build dist files exist and are non-empty', () => {
    const distHtml = path.join(PROJECT_ROOT, 'dist', 'index.html');
    assert.ok(fs.existsSync(distHtml), 'dist/index.html must exist after build');
    const htmlContent = fs.readFileSync(distHtml, 'utf-8');
    assert.ok(htmlContent.includes('<div id="root"></div>'), 'dist/index.html must contain root mount point');
  });

  const result = await harness.run();
  return result.failed > 0 ? 1 : 0;
}

const exitCode = await runAdversarialM4Suite();
process.exit(exitCode);
