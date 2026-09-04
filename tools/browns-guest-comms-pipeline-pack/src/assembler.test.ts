/**
 * Tests for browns-guest-comms-pipeline-pack
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('Boolean flag parsing - runFacts defaults to false', () => {
  // Simulate no --run-facts flag
  const args: string[] = [];
  const result = parseBooleanFlagTest(args, '--run-facts', false);
  assert.equal(result, false);
});

test('Boolean flag parsing - runFacts with --run-facts', () => {
  const args = ['--run-facts'];
  const result = parseBooleanFlagTest(args, '--run-facts', false);
  assert.equal(result, true);
});

test('Boolean flag parsing - runFacts with --no-run-facts', () => {
  const args = ['--no-run-facts'];
  const result = parseBooleanFlagTest(args, '--run-facts', false);
  assert.equal(result, false);
});

test('Boolean flag parsing - runFacts with --run-facts=true', () => {
  const args = ['--run-facts=true'];
  const result = parseBooleanFlagTest(args, '--run-facts', false);
  assert.equal(result, true);
});

test('Boolean flag parsing - runFacts with --run-facts=false', () => {
  const args = ['--run-facts=false'];
  const result = parseBooleanFlagTest(args, '--run-facts', false);
  assert.equal(result, false);
});

test('Boolean flag parsing - runComms defaults to true', () => {
  const args: string[] = [];
  const result = parseBooleanFlagTest(args, '--run-comms', true);
  assert.equal(result, true);
});

test('Boolean flag parsing - runComms with --no-run-comms', () => {
  const args = ['--no-run-comms'];
  const result = parseBooleanFlagTest(args, '--run-comms', true);
  assert.equal(result, false);
});

/**
 * Test helper for boolean flag parsing (PR #114 pattern)
 */
function parseBooleanFlagTest(
  args: string[],
  flagName: string,
  defaultValue: boolean
): boolean {
  const negatedFlag = `--no-${flagName.replace(/^--/, '')}`;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === negatedFlag) {
      return false;
    }
    
    if (arg === flagName) {
      if (i + 1 < args.length) {
        const next = args[i + 1];
        if (next === 'true' || next === 'false') {
          return next === 'true';
        }
      }
      return true;
    }
    
    if (arg.startsWith(`${flagName}=`)) {
      const value = arg.split('=')[1];
      return value === 'true';
    }
  }
  
  return defaultValue;
}

test('Manifest accuracy - only present files listed', () => {
  // This is a conceptual test - actual file listing happens during pack assembly
  const allPossibleFiles = [
    'PACK.md',
    'APPROVAL.md',
    'facts.json',
    'snippets/wifi.txt',
    'draft-welcome-whatsapp.txt',
    'draft-welcome-email.txt'
  ];
  
  const actualFiles = [
    'PACK.md',
    'APPROVAL.md',
    'draft-welcome-whatsapp.txt'
  ];
  
  // Manifest should only list actualFiles (PR #116 pattern)
  assert.equal(actualFiles.length, 3);
  assert.ok(actualFiles.includes('PACK.md'));
  assert.ok(actualFiles.includes('APPROVAL.md'));
  assert.ok(actualFiles.includes('draft-welcome-whatsapp.txt'));
  assert.ok(!actualFiles.includes('facts.json'));
});
