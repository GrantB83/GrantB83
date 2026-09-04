#!/usr/bin/env node
/**
 * Tests for pipeline builder manifest generation
 */

import { strict as assert } from 'assert';
import { test } from 'node:test';

/**
 * Test manifest structure
 */
test('manifest: includes only present files (PR #116)', () => {
  const manifest = {
    tool: 'pw-ordered-sold-pipeline-pack',
    version: '1.0.0',
    generatedAt: '2026-09-02T10:00:00.000Z',
    operations: {
      salesDigestRan: false,
      diffRan: true
    },
    inputs: {
      orderedCsv: 'ordered.csv',
      soldCsv: 'sold.csv',
      salesCsv: null,
      store: null,
      asOf: '2026-09-02'
    },
    files: [
      'PACK.md',
      'diff.md',
      'diff.json',
      'missing-keys.md',
      'APPROVAL.md',
      'manifest.json'
    ]
  };
  
  // Should NOT include sales digest files when salesDigestRan is false
  assert.ok(!manifest.files.includes('digest.md'));
  assert.ok(!manifest.files.includes('digest.json'));
  assert.ok(!manifest.files.includes('sales-manifest.json'));
  
  // Should include diff files when diffRan is true
  assert.ok(manifest.files.includes('diff.md'));
  assert.ok(manifest.files.includes('diff.json'));
  assert.ok(manifest.files.includes('missing-keys.md'));
  
  // Should always include core files
  assert.ok(manifest.files.includes('PACK.md'));
  assert.ok(manifest.files.includes('APPROVAL.md'));
  assert.ok(manifest.files.includes('manifest.json'));
});

test('manifest: includes sales files when salesDigestRan is true', () => {
  const manifest = {
    tool: 'pw-ordered-sold-pipeline-pack',
    version: '1.0.0',
    generatedAt: '2026-09-02T10:00:00.000Z',
    operations: {
      salesDigestRan: true,
      diffRan: true
    },
    inputs: {
      orderedCsv: 'ordered.csv',
      soldCsv: null,
      salesCsv: 'sales.csv',
      store: null,
      asOf: '2026-09-02'
    },
    files: [
      'PACK.md',
      'digest.md',
      'digest.json',
      'missing-fields.md',
      'sales-manifest.json',
      'diff.md',
      'diff.json',
      'missing-keys.md',
      'APPROVAL.md',
      'manifest.json'
    ]
  };
  
  // Should include sales digest files when salesDigestRan is true
  assert.ok(manifest.files.includes('digest.md'));
  assert.ok(manifest.files.includes('digest.json'));
  assert.ok(manifest.files.includes('sales-manifest.json'));
  
  // Should include diff files when diffRan is true
  assert.ok(manifest.files.includes('diff.md'));
  assert.ok(manifest.files.includes('diff.json'));
  
  // Should always include core files
  assert.ok(manifest.files.includes('PACK.md'));
  assert.ok(manifest.files.includes('APPROVAL.md'));
  assert.ok(manifest.files.includes('manifest.json'));
});

test('manifest: excludes diff files when diffRan is false', () => {
  const manifest = {
    tool: 'pw-ordered-sold-pipeline-pack',
    version: '1.0.0',
    generatedAt: '2026-09-02T10:00:00.000Z',
    operations: {
      salesDigestRan: true,
      diffRan: false
    },
    inputs: {
      orderedCsv: null,
      soldCsv: null,
      salesCsv: 'sales.csv',
      store: null,
      asOf: '2026-09-02'
    },
    files: [
      'PACK.md',
      'digest.md',
      'digest.json',
      'missing-fields.md',
      'sales-manifest.json',
      'APPROVAL.md',
      'manifest.json'
    ]
  };
  
  // Should NOT include diff files when diffRan is false
  assert.ok(!manifest.files.includes('diff.md'));
  assert.ok(!manifest.files.includes('diff.json'));
  assert.ok(!manifest.files.includes('missing-keys.md'));
  
  // Should include sales digest files when salesDigestRan is true
  assert.ok(manifest.files.includes('digest.md'));
  assert.ok(manifest.files.includes('digest.json'));
  
  // Should always include core files
  assert.ok(manifest.files.includes('PACK.md'));
  assert.ok(manifest.files.includes('APPROVAL.md'));
  assert.ok(manifest.files.includes('manifest.json'));
});

console.log('All pipeline builder tests passed! ✅');
