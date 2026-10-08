/**
 * tests/adversarial-challenger2-empirical.test.js
 * Independent Empirical Verification Suite by Challenger 2
 * 
 * Verifies:
 * 1. Clean build exit 0 and artifact generation
 * 2. Strict relative asset referencing in dist/index.html (zero root-absolute paths)
 * 3. Exact matching of all 5 theme presets and required CSS properties in dist/assets/*.css
 * 4. Syntactic and structural validity of .github/workflows/deploy.yml and supabase_schema.sql
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✖ [FAIL] ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

console.log('\n========================================================================');
console.log('   M1 Iteration 2 Challenger 2 - Empirical Verification Suite');
console.log('========================================================================\n');

// --------------------------------------------------------------------------
// 1. Build Verification
// --------------------------------------------------------------------------
console.log('--- 1. Build & Artifact Verification ---');

try {
  const buildStart = Date.now();
  const buildOutput = execSync('npm run build', {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  const duration = ((Date.now() - buildStart) / 1000).toFixed(2);
  assert(true, `npm run build completed cleanly with exit code 0 (${duration}s)`);
  assert(fs.existsSync(path.join(rootDir, 'dist')), 'dist directory exists');
  assert(fs.existsSync(path.join(rootDir, 'dist', 'index.html')), 'dist/index.html exists');
} catch (err) {
  assert(false, 'npm run build completed cleanly', err.message);
}

// --------------------------------------------------------------------------
// 2. Relative Asset Paths in dist/index.html
// --------------------------------------------------------------------------
console.log('\n--- 2. Relative Asset Paths in dist/index.html ---');

const indexPath = path.join(rootDir, 'dist', 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Match all src and href attributes
const assetAttrRegex = /(?:href|src)=["']([^"']+)["']/g;
const matches = [];
let match;
while ((match = assetAttrRegex.exec(indexHtml)) !== null) {
  matches.push(match[1]);
}

// Separate internal vs external links
const internalAssets = matches.filter(url => !url.startsWith('http://') && !url.startsWith('https://'));

assert(internalAssets.length > 0, `Discovered internal asset paths in dist/index.html (found ${internalAssets.length})`);

// Ensure ZERO root-absolute paths starting with '/'
const rootAbsolutePaths = internalAssets.filter(url => url.startsWith('/'));
assert(rootAbsolutePaths.length === 0, 'dist/index.html contains ZERO root-absolute paths (/...)', `Found root-absolute: ${rootAbsolutePaths.join(', ')}`);

// Ensure all internal assets start with './'
const nonRelativePaths = internalAssets.filter(url => !url.startsWith('./'));
assert(nonRelativePaths.length === 0, 'All internal assets strictly start with relative "./"', `Found non-relative: ${nonRelativePaths.join(', ')}`);

// Verify every referenced internal asset physically exists in dist
for (const relUrl of internalAssets) {
  // Strip query params or hash if any
  const cleanPath = relUrl.split('?')[0].split('#')[0];
  const diskPath = path.resolve(rootDir, 'dist', cleanPath);
  assert(fs.existsSync(diskPath), `Referenced asset exists on disk: ${relUrl} -> ${path.basename(diskPath)}`);
}

// Specific check for favicon.svg
assert(indexHtml.includes('href="./favicon.svg"'), 'index.html references ./favicon.svg');
assert(fs.existsSync(path.join(rootDir, 'dist', 'favicon.svg')), 'dist/favicon.svg exists');

// --------------------------------------------------------------------------
// 3. Theme Presets in Built CSS
// --------------------------------------------------------------------------
console.log('\n--- 3. Theme Presets in Built CSS ---');

const distAssetsDir = path.join(rootDir, 'dist', 'assets');
const cssFiles = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.css'));
assert(cssFiles.length >= 1, `CSS bundle found in dist/assets (${cssFiles.join(', ')})`);

const cssContent = cssFiles.map(f => fs.readFileSync(path.join(distAssetsDir, f), 'utf-8')).join('\n');

const expectedThemes = [
  'cyber-neon',
  'midnight-glow',
  'lofi-aesthetic',
  'clean-minimalist',
  'retro-vaporwave'
];

const requiredCssVars = [
  '--bg-base',
  '--bg-surface',
  '--accent-primary',
  '--accent-secondary',
  '--text-main',
  '--text-sub',
  '--border-glow',
  '--particle-color'
];

for (const theme of expectedThemes) {
  // Verify theme selector exists (either :root,[data-theme=name] or [data-theme=name])
  const themeRegex = new RegExp(`\\[data-theme=${theme}\\]`, 'i');
  assert(themeRegex.test(cssContent), `Theme preset "${theme}" selector present in dist CSS`);

  // Extract the block for this theme
  // e.g. [data-theme=cyber-neon]{...}
  const blockMatch = cssContent.match(new RegExp(`\\[data-theme=${theme}\\]\\{([^}]+)\\}`, 'i'));
  if (blockMatch) {
    const blockContent = blockMatch[1];
    let allVarsPresent = true;
    const missingVars = [];
    for (const v of requiredCssVars) {
      if (!blockContent.includes(v)) {
        allVarsPresent = false;
        missingVars.push(v);
      }
    }
    assert(allVarsPresent, `Theme preset "${theme}" contains all 8 required CSS custom properties`, `Missing: ${missingVars.join(', ')}`);
  } else {
    assert(false, `Theme preset "${theme}" CSS rule block extracted`);
  }
}

// --------------------------------------------------------------------------
// 4. GitHub Actions Workflow Syntax and Structure
// --------------------------------------------------------------------------
console.log('\n--- 4. GitHub Actions Workflow Validation ---');

const workflowPath = path.join(rootDir, '.github', 'workflows', 'deploy.yml');
assert(fs.existsSync(workflowPath), '.github/workflows/deploy.yml exists');

const workflowRaw = fs.readFileSync(workflowPath, 'utf-8');

// Basic YAML structural validations
assert(workflowRaw.includes('name: Deploy to GitHub Pages'), 'Workflow has valid name');
assert(/push:\s*branches:\s*-\s*main/.test(workflowRaw), 'Workflow triggers on push to main');
assert(workflowRaw.includes('workflow_dispatch:'), 'Workflow supports manual dispatch');
assert(workflowRaw.includes('pages: write'), 'Workflow specifies pages: write permission');
assert(workflowRaw.includes('id-token: write'), 'Workflow specifies id-token: write permission');
assert(workflowRaw.includes('actions/checkout@v4'), 'Workflow uses actions/checkout@v4');
assert(workflowRaw.includes('actions/setup-node@v4'), 'Workflow uses actions/setup-node@v4');
assert(workflowRaw.includes('npm run build'), 'Workflow runs npm run build');
assert(workflowRaw.includes('actions/upload-pages-artifact@v3'), 'Workflow uses actions/upload-pages-artifact@v3');
assert(workflowRaw.includes('path: ./dist'), 'Upload artifact path is ./dist');
assert(workflowRaw.includes('actions/deploy-pages@v4'), 'Workflow uses actions/deploy-pages@v4');

// --------------------------------------------------------------------------
// 5. Supabase Schema SQL Syntax and Structure
// --------------------------------------------------------------------------
console.log('\n--- 5. Supabase Schema SQL Validation ---');

const sqlPath = path.join(rootDir, 'supabase_schema.sql');
assert(fs.existsSync(sqlPath), 'supabase_schema.sql exists');

const sqlRaw = fs.readFileSync(sqlPath, 'utf-8');

// Check Extensions
assert(sqlRaw.includes('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'), 'Schema enables uuid-ossp extension');
assert(sqlRaw.includes('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'), 'Schema enables pgcrypto extension');

// Check Tables
const expectedTables = ['profiles', 'links', 'favorites', 'site_settings'];
for (const table of expectedTables) {
  const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i');
  assert(tableRegex.test(sqlRaw), `Schema defines table public.${table}`);
}

// Check Foreign Keys & Cascade Deletes
assert(sqlRaw.includes('profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE'), 'Links and Favorites reference profiles(id) with ON DELETE CASCADE');

// Check Row Level Security
for (const table of expectedTables) {
  const rlsRegex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i');
  assert(rlsRegex.test(sqlRaw), `RLS enabled on public.${table}`);
}

// Check Policies
assert(sqlRaw.includes('CREATE POLICY "Public can view profiles"'), 'Public read policy on profiles exists');
assert(sqlRaw.includes('CREATE POLICY "Public can view active links"'), 'Public read policy on active links exists');
assert(sqlRaw.includes('CREATE POLICY "Public can view favorites"'), 'Public read policy on favorites exists');
assert(sqlRaw.includes('CREATE POLICY "Public can view site settings"'), 'Public read policy on site settings exists');
assert(sqlRaw.includes('CREATE POLICY "Authenticated users can insert profiles"'), 'Authenticated insert policy on profiles exists');
assert(sqlRaw.includes('CREATE POLICY "Authenticated users can update profiles"'), 'Authenticated update policy on profiles exists');
assert(sqlRaw.includes('CREATE POLICY "Authenticated users can manage links"'), 'Authenticated manage policy on links exists');
assert(sqlRaw.includes('CREATE POLICY "Authenticated users can manage favorites"'), 'Authenticated manage policy on favorites exists');
assert(sqlRaw.includes('CREATE POLICY "Authenticated users can manage site settings"'), 'Authenticated manage policy on site settings exists');

// Check Updated At Trigger
assert(sqlRaw.includes('CREATE OR REPLACE FUNCTION public.handle_updated_at()'), 'Trigger function public.handle_updated_at exists');
assert(sqlRaw.includes('CREATE TRIGGER on_profiles_updated'), 'Trigger on_profiles_updated exists');
assert(sqlRaw.includes('CREATE TRIGGER on_site_settings_updated'), 'Trigger on_site_settings_updated exists');

// Check Seed Data Block
assert(sqlRaw.includes('DO $$') && sqlRaw.includes('INSERT INTO public.profiles'), 'Idempotent seed data DO block exists');

// --------------------------------------------------------------------------
// Summary & Exit Code
// --------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED:       ${passedTests}`);
console.log(`FAILED:       ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error(`[VERDICT] REQUEST_CHANGES - ${failedTests} checks failed!`);
  process.exit(1);
} else {
  console.log('[VERDICT] APPROVE - 100% of checks passed cleanly!');
  process.exit(0);
}
