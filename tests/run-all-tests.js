#!/usr/bin/env node
/**
 * Master E2E Test Runner
 * Dynamic Creative Profile & Link Hub
 *
 * Usage:
 *   node tests/run-all-tests.js
 *   node tests/run-all-tests.js --tier=1
 *   node tests/run-all-tests.js --milestone=M1
 *   node tests/run-all-tests.js --verbose
 */

import { createTier1Suite } from './tier1-feature-coverage.test.js';
import { createTier2Suite } from './tier2-boundary-corner.test.js';
import { createTier3Suite } from './tier3-pairwise-combinations.test.js';
import { createTier4Suite } from './tier4-real-world-scenarios.test.js';

// Parse CLI Arguments
const args = process.argv.slice(2);
const tierArg = args.find((a) => a.startsWith('--tier='))?.split('=')[1];
const milestoneArg = args.find((a) => a.startsWith('--milestone='))?.split('=')[1]?.toUpperCase();
const isVerbose = args.includes('--verbose') || args.includes('-v');

if (isVerbose) {
  process.env.TEST_VERBOSE = '1';
}

console.log(`\n\x1b[1m\x1b[35m========================================================================\x1b[0m`);
console.log(`\x1b[1m\x1b[35m   Dynamic Creative Profile & Link Hub - Opaque-Box E2E Test Suite     \x1b[0m`);
console.log(`\x1b[1m\x1b[35m========================================================================\x1b[0m`);
console.log(`Options: Tier=${tierArg || 'ALL'} | Milestone=${milestoneArg || 'ALL'} | Verbose=${isVerbose}\n`);

// Milestone mapping for Tier 1 tests
const MILESTONE_FEATURE_MAP = {
  M1: ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08'],
  M2: ['F09', 'F10', 'F11', 'F12'],
  M3: ['F13', 'F14', 'F15'],
  M4: ['F16', 'F17', 'F18', 'F19'],
  M5: ['F20', 'F21', 'F22', 'F23'],
  M6: ['F24', 'F25'],
};

async function main() {
  const startTime = Date.now();
  const suiteResults = [];

  // Determine which suites to run
  const shouldRunTier1 = !tierArg || tierArg === '1';
  const shouldRunTier2 = !milestoneArg && (!tierArg || tierArg === '2');
  const shouldRunTier3 = !milestoneArg && (!tierArg || tierArg === '3');
  const shouldRunTier4 = !milestoneArg && (!tierArg || tierArg === '4');

  // Tier 1 Suite
  if (shouldRunTier1) {
    const tier1 = createTier1Suite();

    // Filter by milestone if specified
    if (milestoneArg && MILESTONE_FEATURE_MAP[milestoneArg]) {
      const allowedPrefixes = MILESTONE_FEATURE_MAP[milestoneArg];
      tier1.tests = tier1.tests.filter((t) =>
        allowedPrefixes.some((prefix) => t.name.startsWith(prefix))
      );
    }

    const res = await tier1.run();
    suiteResults.push(res);
  }

  // Tier 2 Suite
  if (shouldRunTier2) {
    const tier2 = createTier2Suite();
    const res = await tier2.run();
    suiteResults.push(res);
  }

  // Tier 3 Suite
  if (shouldRunTier3) {
    const tier3 = createTier3Suite();
    const res = await tier3.run();
    suiteResults.push(res);
  }

  // Tier 4 Suite
  if (shouldRunTier4) {
    const tier4 = createTier4Suite();
    const res = await tier4.run();
    suiteResults.push(res);
  }

  const totalDuration = Date.now() - startTime;
  const totalPassed = suiteResults.reduce((acc, s) => acc + s.passed, 0);
  const totalFailed = suiteResults.reduce((acc, s) => acc + s.failed, 0);
  const totalTests = suiteResults.reduce((acc, s) => acc + s.total, 0);

  console.log(`\x1b[1m\x1b[35m========================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[37m                       FINAL TEST EXECUTION SUMMARY                      \x1b[0m`);
  console.log(`\x1b[1m\x1b[35m========================================================================\x1b[0m`);
  console.log(`Suites Executed : ${suiteResults.length}`);
  console.log(`Total Tests     : ${totalTests}`);
  console.log(`Passed Tests    : \x1b[32m${totalPassed}\x1b[0m`);
  console.log(`Failed Tests    : ${totalFailed > 0 ? `\x1b[31m${totalFailed}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
  console.log(`Execution Time  : ${totalDuration}ms`);
  console.log(`\x1b[1m\x1b[35m========================================================================\x1b[0m\n`);

  if (totalFailed > 0) {
    console.log(`\x1b[31m[!] Test run completed with ${totalFailed} failure(s).\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[✓] All ${totalPassed} tests passed successfully!\x1b[0m`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\x1b[31mFatal Runner Error:\x1b[0m', err);
  process.exit(1);
});
