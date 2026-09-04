/**
 * Tests for CLI argument parsing (PR #114 boolean flag patterns)
 */

import { test } from 'node:test';
import assert from 'node:assert';

// Minimal CLI parser for testing
function parseTestArgs(args: string[]): { runRecon?: boolean; mode?: string } {
  const options: { runRecon?: boolean; mode?: string } = {
    runRecon: true,  // default ON
    mode: 'receipt'
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--mode') {
      options.mode = args[++i];
    } else if (arg === '--no-run-recon') {
      options.runRecon = false;
    } else if (arg === '--run-recon' || arg.startsWith('--run-recon=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runRecon = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runRecon = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runRecon = true;
          i++;
        } else {
          options.runRecon = true;
        }
      }
    }
  }
  
  return options;
}

test('CLI parser - default runRecon is true', () => {
  const result = parseTestArgs([]);
  assert.strictEqual(result.runRecon, true);
});

test('CLI parser - --no-run-recon sets false', () => {
  const result = parseTestArgs(['--no-run-recon']);
  assert.strictEqual(result.runRecon, false);
});

test('CLI parser - --run-recon=false sets false', () => {
  const result = parseTestArgs(['--run-recon=false']);
  assert.strictEqual(result.runRecon, false);
});

test('CLI parser - --run-recon false sets false', () => {
  const result = parseTestArgs(['--run-recon', 'false']);
  assert.strictEqual(result.runRecon, false);
});

test('CLI parser - --run-recon=true sets true', () => {
  const result = parseTestArgs(['--run-recon=true']);
  assert.strictEqual(result.runRecon, true);
});

test('CLI parser - --run-recon true sets true', () => {
  const result = parseTestArgs(['--run-recon', 'true']);
  assert.strictEqual(result.runRecon, true);
});

test('CLI parser - --run-recon alone sets true', () => {
  const result = parseTestArgs(['--run-recon']);
  assert.strictEqual(result.runRecon, true);
});

test('CLI parser - --mode receipt', () => {
  const result = parseTestArgs(['--mode', 'receipt']);
  assert.strictEqual(result.mode, 'receipt');
});

test('CLI parser - --mode summary', () => {
  const result = parseTestArgs(['--mode', 'summary']);
  assert.strictEqual(result.mode, 'summary');
});
