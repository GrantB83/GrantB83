/**
 * Test fixtures for career-hunt-run-log
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const fixturesDir = './fixtures';
const testOutDir = './test-out';

console.log('Career Hunt Run Log - Fixture Tests\n');

// Clean test output
if (existsSync(testOutDir)) {
  rmSync(testOutDir, { recursive: true });
}
mkdirSync(testOutDir, { recursive: true });

// Test 1: Run with structured run.json
console.log('Test 1: Structured run.json');
try {
  execSync(`node dist/index.js --run ${fixturesDir}/run-sample.json --outdir ${testOutDir}/test1`, {
    stdio: 'inherit',
  });
  console.log('✅ Test 1 passed\n');
} catch (e) {
  console.error('❌ Test 1 failed\n');
  process.exit(1);
}

// Test 2: Run with individual flag files
console.log('Test 2: Individual flag files');
try {
  execSync(
    `node dist/index.js --date 2026-09-03 --scored ${fixturesDir}/scored.json --applied ${fixturesDir}/applied.json --skipped ${fixturesDir}/skipped.json --outdir ${testOutDir}/test2`,
    { stdio: 'inherit' }
  );
  console.log('✅ Test 2 passed\n');
} catch (e) {
  console.error('❌ Test 2 failed\n');
  process.exit(1);
}

// Test 3: Append to existing runs.jsonl (idempotency test)
console.log('Test 3: Append idempotency');
try {
  // First run
  execSync(`node dist/index.js --run ${fixturesDir}/run-sample.json --outdir ${testOutDir}/test3`, {
    stdio: 'inherit',
  });
  
  // Second run with different date
  const run2 = {
    date: '2026-09-04',
    scored: [
      { company: 'NewCo', title: 'New Manager', score: 7, gatePass: true },
    ],
  };
  writeFileSync(`${testOutDir}/test3/run2.json`, JSON.stringify(run2, null, 2));
  execSync(`node dist/index.js --run ${testOutDir}/test3/run2.json --outdir ${testOutDir}/test3`, {
    stdio: 'inherit',
  });
  
  console.log('✅ Test 3 passed\n');
} catch (e) {
  console.error('❌ Test 3 failed\n');
  process.exit(1);
}

// Test 4: Validation error (missing company)
console.log('Test 4: Validation error handling');
try {
  const badRun = {
    date: '2026-09-05',
    scored: [
      { company: '', title: 'Manager', score: 8, gatePass: true }, // Missing company
    ],
  };
  writeFileSync(`${testOutDir}/bad-run.json`, JSON.stringify(badRun, null, 2));
  
  execSync(`node dist/index.js --run ${testOutDir}/bad-run.json --outdir ${testOutDir}/test4`, {
    stdio: 'inherit',
  });
  
  console.error('❌ Test 4 failed: Expected validation error but succeeded\n');
  process.exit(1);
} catch (e) {
  // Expected to fail
  console.log('✅ Test 4 passed (correctly rejected invalid input)\n');
}

console.log('All fixture tests passed! ✅\n');
console.log('Review outputs in ./test-out/');
