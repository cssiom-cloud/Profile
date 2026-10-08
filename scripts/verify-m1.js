/**
 * scripts/verify-m1.js
 * Automated Verification & Smoke Test Runner for Milestone 1
 * Run with: node scripts/verify-m1.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('\n========================================================');
console.log('   MILESTONE 1 VERIFICATION & SMOKE TEST SUITE');
console.log('========================================================\n');

// --------------------------------------------------------------------------
// SUITE 1: File Existence & Architecture Layout
// --------------------------------------------------------------------------
console.log('--- SUITE 1: File Existence & Architecture Layout ---');
const requiredFiles = [
  'package.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
  'README.md',
  '.gitignore',
  '.env.example',
  'supabase_schema.sql',
  '.github/workflows/deploy.yml',
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',
  'src/data/defaultData.js',
  'src/lib/supabase.js',
  'src/lib/dataProvider.js',
  'src/store/useProfileStore.js',
];

for (const relPath of requiredFiles) {
  const fullPath = path.join(rootDir, relPath);
  assert(fs.existsSync(fullPath), `Required file exists: ${relPath}`);
}

// --------------------------------------------------------------------------
// SUITE 2: Toolchain & Vite Static Base Configuration
// --------------------------------------------------------------------------
console.log('\n--- SUITE 2: Toolchain & Vite Static Base Configuration ---');

// Check package.json
const pkgJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  assert(pkg.scripts && pkg.scripts.build === 'vite build', 'package.json contains "build": "vite build"');
  assert(pkg.dependencies && pkg.dependencies.zustand, 'package.json contains zustand dependency');
  assert(pkg.dependencies && pkg.dependencies['@supabase/supabase-js'], 'package.json contains @supabase/supabase-js');
  assert(pkg.dependencies && pkg.dependencies['framer-motion'], 'package.json contains framer-motion');
  assert(pkg.dependencies && pkg.dependencies['lucide-react'], 'package.json contains lucide-react');
}

// Check vite.config.js base: './'
const viteConfigPath = path.join(rootDir, 'vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  const viteContent = fs.readFileSync(viteConfigPath, 'utf-8');
  assert(
    viteContent.includes("base: './'") || viteContent.includes('base: "./"'),
    "vite.config.js explicitly defines base: './' for GitHub Pages static hosting"
  );
}

// Check index.html
const indexHtmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
  assert(htmlContent.includes('id="root"'), 'index.html has <div id="root"></div>');
  assert(htmlContent.includes('data-theme='), 'index.html has default data-theme attribute on <html>');
  assert(htmlContent.includes('href="./favicon.svg"'), 'index.html references favicon relatively');
}

// --------------------------------------------------------------------------
// SUITE 3: Supabase Schema DDL Validation
// --------------------------------------------------------------------------
console.log('\n--- SUITE 3: Supabase Schema DDL Validation ---');
const sqlPath = path.join(rootDir, 'supabase_schema.sql');
if (fs.existsSync(sqlPath)) {
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.profiles') || sql.includes('CREATE TABLE IF NOT EXISTS profiles'), 'Schema defines "profiles" table');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.links') || sql.includes('CREATE TABLE IF NOT EXISTS links'), 'Schema defines "links" table');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.favorites') || sql.includes('CREATE TABLE IF NOT EXISTS favorites'), 'Schema defines "favorites" table');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.site_settings') || sql.includes('CREATE TABLE IF NOT EXISTS site_settings'), 'Schema defines "site_settings" table');
  assert(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Schema configures Row Level Security (RLS)');
}

// --------------------------------------------------------------------------
// SUITE 4: GitHub Actions Deployment Workflow Validation
// --------------------------------------------------------------------------
console.log('\n--- SUITE 4: GitHub Actions Deployment Workflow ---');
const workflowPath = path.join(rootDir, '.github/workflows/deploy.yml');
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf-8');
  assert(workflow.includes('actions/upload-pages-artifact@v3'), 'Workflow uses actions/upload-pages-artifact@v3');
  assert(workflow.includes('actions/deploy-pages@v4'), 'Workflow uses actions/deploy-pages@v4');
  assert(workflow.includes('path: ./dist'), 'Workflow targets ./dist directory for static Pages artifact');
  assert(workflow.includes('npm run build'), 'Workflow executes npm run build step');
}

// --------------------------------------------------------------------------
// SUITE 5: LocalStorage Fallback & Store Behavioral Contract (Simulated)
// --------------------------------------------------------------------------
console.log('\n--- SUITE 5: LocalStorage Fallback & Store Contract ---');

async function testDataLayerInNode() {
  try {
    // 1. Mock LocalStorage in Node memory
    const memoryStore = new Map();
    global.localStorage = {
      getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
      setItem: (key, val) => memoryStore.set(key, String(val)),
      removeItem: (key) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
    };
    global.window = {};
    global.document = {
      documentElement: {
        setAttribute: () => {},
      },
    };

    // 2. Import modules dynamically
    const { DEFAULT_PROFILE_DATA } = await import('../src/data/defaultData.js');
    const { isSupabaseConfigured } = await import('../src/lib/supabase.js');
    const { dataProvider, LOCAL_STORAGE_KEY } = await import('../src/lib/dataProvider.js');
    const { useProfileStore } = await import('../src/store/useProfileStore.js');

    // Test 5.1: Supabase configured check without .env keys
    assert(isSupabaseConfigured() === false, 'isSupabaseConfigured() safely returns false without keys');

    // Test 5.2: First run with empty LocalStorage
    localStorage.clear();
    const fetchedEmpty = await dataProvider.fetchData();
    assert(fetchedEmpty.profile.name === DEFAULT_PROFILE_DATA.profile.name, 'Empty LocalStorage falls back to DEFAULT_PROFILE_DATA');
    assert(localStorage.getItem(LOCAL_STORAGE_KEY) !== null, 'Empty LocalStorage is seeded automatically with default data');

    // Test 5.3: Corrupted LocalStorage recovery
    localStorage.setItem(LOCAL_STORAGE_KEY, '{corrupt-json-structure: true');
    const fetchedCorrupted = await dataProvider.fetchData();
    assert(fetchedCorrupted.profile.name === DEFAULT_PROFILE_DATA.profile.name, 'Corrupted LocalStorage JSON self-heals and returns default data');

    // Test 5.4: Store hydration
    await useProfileStore.getState().loadInitialData();
    const state = useProfileStore.getState();
    assert(state.profile.name === DEFAULT_PROFILE_DATA.profile.name, 'useProfileStore hydrates profile from dataProvider');
    assert(Array.isArray(state.links) && state.links.length > 0, 'useProfileStore hydrates links array');
    assert(state.isDirty === false, 'Store initializes with isDirty === false');
    assert(state.storageSource === 'local', 'Store initializes with storageSource === "local"');

    // Test 5.5: Store mutator & dirty tracking
    state.updateProfile({ quote: 'Modified for smoke test' });
    const dirtyState = useProfileStore.getState();
    assert(dirtyState.profile.quote === 'Modified for smoke test', 'updateProfile mutates draft state immediately');
    assert(dirtyState.isDirty === true, 'updateProfile triggers isDirty === true');

    // Test 5.6: Save changes in fallback mode
    const saveResult = await dirtyState.saveChanges();
    const savedState = useProfileStore.getState();
    assert(saveResult.success === true, 'saveChanges succeeds in LocalStorage fallback mode');
    assert(savedState.isDirty === false, 'saveChanges resets isDirty === false');
    assert(savedState.committedState.profile.quote === 'Modified for smoke test', 'Committed state updated after save');

  } catch (err) {
    assert(false, `Data layer simulation encountered error: ${err.message}`);
  }
}

await testDataLayerInNode();

// --------------------------------------------------------------------------
// FINAL SUMMARY
// --------------------------------------------------------------------------
console.log('\n========================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED:       ${passedChecks}`);
console.log(`FAILED:       ${failedChecks}`);
console.log('========================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('>> ALL MILESTONE 1 VERIFICATION CHECKS PASSED SUCCESSFULLY <<\n');
  process.exit(0);
}
