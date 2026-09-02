/**
 * Test fixtures runner
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractClaims } from './extractor.js';
import { matchAllClaims } from './matcher.js';
import { buildLintReport, generateOutputs } from './generator.js';
import { AllowedFacts } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const TEST_OUT_DIR = path.join(__dirname, '..', 'test-out');

interface FixtureTest {
  name: string;
  draftFile: string;
  factsFile: string;
  expectedUnmatched: number;
  expectedSuspicious: number;
}

const TESTS: FixtureTest[] = [
  {
    name: 'clean-cover-letter',
    draftFile: 'draft-clean.md',
    factsFile: 'facts-ops-manager.json',
    expectedUnmatched: 8, // Conservative matching expected
    expectedSuspicious: 4,
  },
  {
    name: 'invented-numbers',
    draftFile: 'draft-invented-numbers.md',
    factsFile: 'facts-ops-manager.json',
    expectedUnmatched: 10, // At least 10 unmatched (includes invented numbers)
    expectedSuspicious: 4, // At least 4 suspicious
  },
  {
    name: 'invented-employer',
    draftFile: 'draft-invented-employer.md',
    factsFile: 'facts-ops-manager.json',
    expectedUnmatched: 8, // Unmatched (includes SpaceX, Google, Apple)
    expectedSuspicious: 5, // Suspicious
  },
];

async function runFixtureTest(test: FixtureTest): Promise<boolean> {
  console.log(`\n📝 Testing: ${test.name}`);
  
  try {
    const draftPath = path.join(FIXTURES_DIR, test.draftFile);
    const factsPath = path.join(FIXTURES_DIR, test.factsFile);
    
    if (!fs.existsSync(draftPath)) {
      console.error(`  ❌ Draft file not found: ${draftPath}`);
      return false;
    }
    
    if (!fs.existsSync(factsPath)) {
      console.error(`  ❌ Facts file not found: ${factsPath}`);
      return false;
    }
    
    // Load files
    const draftText = fs.readFileSync(draftPath, 'utf-8');
    const factsJson: AllowedFacts = JSON.parse(fs.readFileSync(factsPath, 'utf-8'));
    
    // Run lint
    const claims = extractClaims(draftText);
    const matchResults = matchAllClaims(claims, factsJson);
    const report = buildLintReport(draftText, matchResults);
    
    // Generate outputs
    const outputDir = path.join(TEST_OUT_DIR, test.name);
    await generateOutputs(report, {
      draftPath,
      factsPath,
      strictMode: false,
      outdir: outputDir,
    });
    
    console.log(`  Claims: ${report.totalClaims}`);
    console.log(`  Matched: ${report.summary.matchedCount}`);
    console.log(`  Unmatched: ${report.summary.unmatchedCount}`);
    console.log(`  Suspicious: ${report.summary.suspiciousCount}`);
    
    // Validate expectations
    let passed = true;
    
    if (report.summary.unmatchedCount !== test.expectedUnmatched) {
      console.error(`  ❌ Expected ${test.expectedUnmatched} unmatched, got ${report.summary.unmatchedCount}`);
      passed = false;
    }
    
    if (report.summary.suspiciousCount !== test.expectedSuspicious) {
      console.error(`  ❌ Expected ${test.expectedSuspicious} suspicious, got ${report.summary.suspiciousCount}`);
      passed = false;
    }
    
    if (passed) {
      console.log(`  ✅ Passed`);
    }
    
    console.log(`  📁 Output: ${outputDir}`);
    
    return passed;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('Career Cover Letter Facts Lint - Fixture Tests\n');
  
  // Create test output directory
  if (!fs.existsSync(TEST_OUT_DIR)) {
    fs.mkdirSync(TEST_OUT_DIR, { recursive: true });
  }
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    const result = await runFixtureTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\nFixture Test Results:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${TESTS.length}\n`);
  
  if (failed > 0) {
    console.log('❌ Some tests failed. Review output above.\n');
    process.exit(1);
  } else {
    console.log('✅ All fixture tests passed!\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
