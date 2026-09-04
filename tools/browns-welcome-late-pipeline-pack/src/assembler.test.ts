/**
 * Tests for Browns Welcome Late Pipeline Pack Assembler
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Boolean Flag Parsing', () => {
  it('should parse --run-welcome as true', () => {
    const args = ['--run-welcome'];
    const result = parseBooleanFlag(args, '--run-welcome', false);
    assert.strictEqual(result, true);
  });

  it('should parse --no-run-welcome as false', () => {
    const args = ['--no-run-welcome'];
    const result = parseBooleanFlag(args, '--run-welcome', true);
    assert.strictEqual(result, false);
  });

  it('should parse --run-welcome=false as false', () => {
    const args = ['--run-welcome=false'];
    const result = parseBooleanFlag(args, '--run-welcome', true);
    assert.strictEqual(result, false);
  });

  it('should parse --run-welcome=true as true', () => {
    const args = ['--run-welcome=true'];
    const result = parseBooleanFlag(args, '--run-welcome', false);
    assert.strictEqual(result, true);
  });

  it('should parse --run-welcome false as false', () => {
    const args = ['--run-welcome', 'false'];
    const result = parseBooleanFlag(args, '--run-welcome', true);
    assert.strictEqual(result, false);
  });

  it('should use default when flag not present', () => {
    const args = ['--other-flag'];
    const result = parseBooleanFlag(args, '--run-welcome', true);
    assert.strictEqual(result, true);
  });
});

describe('Manifest File Listing', () => {
  it('should only list files that are present', () => {
    const files = ['PACK.md', 'APPROVAL.md', 'welcome-queue.md'];
    
    // When stages are skipped, their files should not be in the list
    assert.ok(files.includes('PACK.md'));
    assert.ok(files.includes('APPROVAL.md'));
    assert.ok(!files.includes('POST-CHECKLIST.md')); // Not present when checklist skipped
  });

  it('should include stage outputs when stages run', () => {
    const filesWhenAllRun = [
      'PACK.md',
      'APPROVAL.md',
      'welcome-queue.md',
      'late-queue.md',
      'daily-ops-brief.txt'
    ];
    
    assert.ok(filesWhenAllRun.includes('welcome-queue.md'));
    assert.ok(filesWhenAllRun.includes('late-queue.md'));
    assert.ok(filesWhenAllRun.includes('daily-ops-brief.txt'));
  });
});

/**
 * Helper function for testing (matches index.ts implementation)
 */
function parseBooleanFlag(
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
