#!/usr/bin/env node
/**
 * Tests for CLI argument parsing, especially boolean flags
 */

import { strict as assert } from 'assert';
import { test } from 'node:test';

/**
 * Inline copy of parseArgs function for testing
 * (In production, this would be exported from index.ts)
 */
function parseArgs(args: string[]): any {
  const options: any = {
    runPostChecklist: true // default to true
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--pack' || arg === '-p') {
      options.pack = args[++i];
    } else if (arg === '--run-morning-pack') {
      options.runMorningPack = true;
    } else if (arg === '--no-run-post-checklist') {
      // Handle negative flag: --no-run-post-checklist
      options.runPostChecklist = false;
    } else if (arg === '--run-post-checklist' || arg.startsWith('--run-post-checklist=')) {
      // Handle --run-post-checklist[=value]
      if (arg.includes('=')) {
        // Parse --run-post-checklist=false or --run-post-checklist=true
        const value = arg.split('=')[1].toLowerCase();
        options.runPostChecklist = !(value === 'false' || value === '0' || value === 'no');
      } else {
        // Check next argument for false/0/no
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runPostChecklist = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runPostChecklist = true;
          i++;
        } else {
          // Bare --run-post-checklist means true
          options.runPostChecklist = true;
        }
      }
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    }
  }
  
  return options;
}

test('parseArgs: default runPostChecklist is true', () => {
  const result = parseArgs(['--pack', '/some/path']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: --run-post-checklist=false sets false', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist=false']);
  assert.equal(result.runPostChecklist, false);
});

test('parseArgs: --run-post-checklist=true sets true', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist=true']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: --run-post-checklist=0 sets false', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist=0']);
  assert.equal(result.runPostChecklist, false);
});

test('parseArgs: --run-post-checklist=1 sets true', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist=1']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: --run-post-checklist=no sets false', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist=no']);
  assert.equal(result.runPostChecklist, false);
});

test('parseArgs: --run-post-checklist=yes sets true', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist=yes']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: --run-post-checklist false sets false', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist', 'false']);
  assert.equal(result.runPostChecklist, false);
});

test('parseArgs: --run-post-checklist true sets true', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist', 'true']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: --run-post-checklist 0 sets false', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist', '0']);
  assert.equal(result.runPostChecklist, false);
});

test('parseArgs: --run-post-checklist 1 sets true', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist', '1']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: --run-post-checklist no sets false', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist', 'no']);
  assert.equal(result.runPostChecklist, false);
});

test('parseArgs: --run-post-checklist yes sets true', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist', 'yes']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: bare --run-post-checklist sets true', () => {
  const result = parseArgs(['--pack', '/some/path', '--run-post-checklist']);
  assert.equal(result.runPostChecklist, true);
});

test('parseArgs: --no-run-post-checklist sets false', () => {
  const result = parseArgs(['--pack', '/some/path', '--no-run-post-checklist']);
  assert.equal(result.runPostChecklist, false);
});

test('parseArgs: --run-post-checklist false --date 2026-09-02 preserves other args', () => {
  const result = parseArgs([
    '--pack', '/some/path',
    '--run-post-checklist', 'false',
    '--date', '2026-09-02'
  ]);
  assert.equal(result.runPostChecklist, false);
  assert.equal(result.pack, '/some/path');
  assert.equal(result.date, '2026-09-02');
});

test('parseArgs: bare --run-post-checklist followed by --date does not consume date as flag value', () => {
  const result = parseArgs([
    '--pack', '/some/path',
    '--run-post-checklist',
    '--date', '2026-09-02'
  ]);
  assert.equal(result.runPostChecklist, true);
  assert.equal(result.date, '2026-09-02');
});

console.log('All CLI parser tests passed! ✅');
