/**
 * Tests for boolean flag parsing (PR #114 pattern)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Helper to parse boolean flag (same logic as in index.ts)
 */
function parseBooleanFlag(
  args: string[],
  i: number,
  arg: string,
  flagName: string
): { value: boolean; skip: number } {
  if (arg.startsWith(`--no-${flagName}`)) {
    return { value: false, skip: 0 };
  }
  
  if (arg.includes('=')) {
    const value = arg.split('=')[1].toLowerCase();
    return { value: !(value === 'false' || value === '0' || value === 'no'), skip: 0 };
  }
  
  const nextArg = args[i + 1];
  if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
    return { value: false, skip: 1 };
  } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
    return { value: true, skip: 1 };
  } else {
    return { value: true, skip: 0 };
  }
}

describe('Boolean flag parsing', () => {
  it('should parse --flag as true', () => {
    const result = parseBooleanFlag([], 0, '--run-digest', 'run-digest');
    assert.strictEqual(result.value, true);
    assert.strictEqual(result.skip, 0);
  });

  it('should parse --flag=true as true', () => {
    const result = parseBooleanFlag([], 0, '--run-digest=true', 'run-digest');
    assert.strictEqual(result.value, true);
    assert.strictEqual(result.skip, 0);
  });

  it('should parse --flag=false as false', () => {
    const result = parseBooleanFlag([], 0, '--run-digest=false', 'run-digest');
    assert.strictEqual(result.value, false);
    assert.strictEqual(result.skip, 0);
  });

  it('should parse --flag false as false', () => {
    const result = parseBooleanFlag(['--run-digest', 'false'], 0, '--run-digest', 'run-digest');
    assert.strictEqual(result.value, false);
    assert.strictEqual(result.skip, 1);
  });

  it('should parse --flag true as true', () => {
    const result = parseBooleanFlag(['--run-digest', 'true'], 0, '--run-digest', 'run-digest');
    assert.strictEqual(result.value, true);
    assert.strictEqual(result.skip, 1);
  });

  it('should parse --no-flag as false', () => {
    const result = parseBooleanFlag([], 0, '--no-run-digest', 'run-digest');
    assert.strictEqual(result.value, false);
    assert.strictEqual(result.skip, 0);
  });

  it('should parse --flag=0 as false', () => {
    const result = parseBooleanFlag([], 0, '--run-digest=0', 'run-digest');
    assert.strictEqual(result.value, false);
    assert.strictEqual(result.skip, 0);
  });

  it('should parse --flag 0 as false', () => {
    const result = parseBooleanFlag(['--run-digest', '0'], 0, '--run-digest', 'run-digest');
    assert.strictEqual(result.value, false);
    assert.strictEqual(result.skip, 1);
  });

  it('should parse --flag no as false', () => {
    const result = parseBooleanFlag(['--run-digest', 'no'], 0, '--run-digest', 'run-digest');
    assert.strictEqual(result.value, false);
    assert.strictEqual(result.skip, 1);
  });
});
