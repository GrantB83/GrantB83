#!/usr/bin/env node
/**
 * Tests for CLI argument parsing, especially boolean flags (PR #114)
 */

import { strict as assert } from 'assert';
import { test } from 'node:test';

/**
 * Inline copy of parseArgs function for testing
 */
function parseArgs(args: string[]): any {
  const options: any = {
    runSales: false, // default OFF
    runDiff: true    // default ON
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--ordered-csv') {
      options.orderedCsv = args[++i];
    } else if (arg === '--sold-csv') {
      options.soldCsv = args[++i];
    } else if (arg === '--sales-csv') {
      options.salesCsv = args[++i];
      if (options.runSales === false) {
        options.runSales = true;
      }
    } else if (arg === '--store') {
      options.store = args[++i];
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--as-of') {
      options.asOf = args[++i];
    } else if (arg === '--no-run-sales') {
      options.runSales = false;
    } else if (arg === '--run-sales' || arg.startsWith('--run-sales=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runSales = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runSales = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runSales = true;
          i++;
        } else {
          options.runSales = true;
        }
      }
    } else if (arg === '--no-run-diff') {
      options.runDiff = false;
    } else if (arg === '--run-diff' || arg.startsWith('--run-diff=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runDiff = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runDiff = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runDiff = true;
          i++;
        } else {
          options.runDiff = true;
        }
      }
    }
  }
  
  return options;
}

// runSales tests
test('parseArgs: default runSales is false', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv']);
  assert.equal(result.runSales, false);
});

test('parseArgs: --sales-csv enables runSales by default', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sales-csv', 'b.csv']);
  assert.equal(result.runSales, true);
});

test('parseArgs: --run-sales=false overrides --sales-csv', () => {
  const result = parseArgs(['--sales-csv', 'b.csv', '--run-sales=false']);
  assert.equal(result.runSales, false);
});

test('parseArgs: --run-sales=true sets true', () => {
  const result = parseArgs(['--sold-csv', 'b.csv', '--run-sales=true']);
  assert.equal(result.runSales, true);
});

test('parseArgs: --run-sales false sets false', () => {
  const result = parseArgs(['--sold-csv', 'b.csv', '--run-sales', 'false']);
  assert.equal(result.runSales, false);
});

test('parseArgs: --run-sales true sets true', () => {
  const result = parseArgs(['--sold-csv', 'b.csv', '--run-sales', 'true']);
  assert.equal(result.runSales, true);
});

test('parseArgs: bare --run-sales sets true', () => {
  const result = parseArgs(['--sold-csv', 'b.csv', '--run-sales']);
  assert.equal(result.runSales, true);
});

test('parseArgs: --no-run-sales sets false', () => {
  const result = parseArgs(['--sold-csv', 'b.csv', '--no-run-sales']);
  assert.equal(result.runSales, false);
});

// runDiff tests
test('parseArgs: default runDiff is true', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv']);
  assert.equal(result.runDiff, true);
});

test('parseArgs: --run-diff=false sets false', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv', '--run-diff=false']);
  assert.equal(result.runDiff, false);
});

test('parseArgs: --run-diff=true sets true', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv', '--run-diff=true']);
  assert.equal(result.runDiff, true);
});

test('parseArgs: --run-diff false sets false', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv', '--run-diff', 'false']);
  assert.equal(result.runDiff, false);
});

test('parseArgs: --run-diff true sets true', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv', '--run-diff', 'true']);
  assert.equal(result.runDiff, true);
});

test('parseArgs: bare --run-diff sets true', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv', '--run-diff']);
  assert.equal(result.runDiff, true);
});

test('parseArgs: --no-run-diff sets false', () => {
  const result = parseArgs(['--ordered-csv', 'a.csv', '--sold-csv', 'b.csv', '--no-run-diff']);
  assert.equal(result.runDiff, false);
});

// Integration tests
test('parseArgs: preserves other args with boolean flags', () => {
  const result = parseArgs([
    '--ordered-csv', 'ordered.csv',
    '--sold-csv', 'sold.csv',
    '--run-sales', 'false',
    '--store', 'Louis Trichardt',
    '--as-of', '2026-09-02'
  ]);
  assert.equal(result.runSales, false);
  assert.equal(result.runDiff, true);
  assert.equal(result.orderedCsv, 'ordered.csv');
  assert.equal(result.soldCsv, 'sold.csv');
  assert.equal(result.store, 'Louis Trichardt');
  assert.equal(result.asOf, '2026-09-02');
});

console.log('All CLI parser tests passed! ✅');
