/**
 * Test fixtures runner
 * Runs all fixtures through the CLI and validates expected outcomes
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseJD } from './parser.js';
import { evaluateGates } from './gates.js';
import { scoreJD, determineVerdict, buildScorecard } from './scorer.js';
import { generateOutputs } from './generator.js';
import { DEFAULT_HARD_GATES } from './types.js';

interface FixtureTest {
  name: string;
  jdFile: string;
  expectedVerdict: 'apply' | 'watch' | 'discard' | 'skip';
  expectedGateFailures?: string[];
}

const FIXTURES: FixtureTest[] = [
  {
    name: 'Remote Ops Manager (should tend apply/watch)',
    jdFile: 'fixtures/jd-ops-manager-remote.txt',
    expectedVerdict: 'apply', // or 'watch' - should pass gates
  },
  {
    name: 'DNC Abrams (should skip)',
    jdFile: 'fixtures/jd-dnc-abrams.txt',
    expectedVerdict: 'skip',
    expectedGateFailures: ['DNC'],
  },
  {
    name: 'Junior Coordinator (should skip)',
    jdFile: 'fixtures/jd-junior-coordinator.txt',
    expectedVerdict: 'skip',
    expectedGateFailures: ['Seniority', 'Function'],
  },
  {
    name: 'Tesla Ops (should pass location gate via Tesla exception)',
    jdFile: 'fixtures/jd-tesla-ops.txt',
    expectedVerdict: 'apply', // or 'watch'
  },
];

async function runFixtureTests(): Promise<void> {
  console.log('Running fixture tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const fixture of FIXTURES) {
    console.log(`Testing: ${fixture.name}`);
    console.log(`  File: ${fixture.jdFile}`);
    
    try {
      // Load JD
      const jdText = fs.readFileSync(fixture.jdFile, 'utf-8');
      
      // Parse
      const parsed = parseJD(jdText);
      
      // Evaluate gates
      const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
      
      // Score
      const scores = scoreJD(parsed, gates);
      
      // Verdict
      const verdict = determineVerdict(gates, scores);
      
      // Build scorecard
      const scorecard = buildScorecard(parsed, gates, scores, verdict);
      
      // Generate outputs
      const outputDir = await generateOutputs(scorecard, {
        jdPath: fixture.jdFile,
        gatesPath: null,
        companyOverride: null,
        titleOverride: null,
        outdir: 'test-out',
      });
      
      console.log(`  Verdict: ${verdict}`);
      console.log(`  Score: ${scores.total}/10`);
      console.log(`  Gates pass: ${gates.overallPass ? 'yes' : 'no'}`);
      
      // Validate expected verdict (flexible for apply/watch)
      let verdictMatch = false;
      if (fixture.expectedVerdict === 'skip') {
        verdictMatch = verdict === 'skip';
      } else if (fixture.expectedVerdict === 'apply' || fixture.expectedVerdict === 'watch') {
        // Both apply and watch are acceptable for high-scoring roles
        verdictMatch = verdict === 'apply' || verdict === 'watch';
      } else {
        verdictMatch = verdict === fixture.expectedVerdict;
      }
      
      // Validate expected gate failures
      if (fixture.expectedGateFailures) {
        const gatesList = [gates.dnc, gates.comp, gates.location, gates.function, gates.seniority];
        for (const expectedFailure of fixture.expectedGateFailures) {
          const gate = gatesList.find(g => g.gate === expectedFailure);
          if (!gate || gate.status !== 'fail') {
            throw new Error(`Expected ${expectedFailure} gate to fail, but it didn't`);
          }
        }
      }
      
      if (verdictMatch) {
        console.log(`  ✅ PASS\n`);
        passed++;
      } else {
        console.log(`  ❌ FAIL: Expected verdict ${fixture.expectedVerdict}, got ${verdict}\n`);
        failed++;
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
      failed++;
    }
  }
  
  console.log('---');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runFixtureTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
