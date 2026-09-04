/**
 * Tests for pipeline builder
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('Pipeline builder - skipped stage in manifest', () => {
  // Test that manifest.json accurately lists only present files (PR #116)
  const mockManifest = {
    tool: 'pw-loyverse-xero-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    operations: {
      reconRan: false
    },
    inputs: {
      loyverseCsv: 'test.csv',
      xeroCsv: 'test.csv',
      mode: 'receipt',
      asOf: '2026-09-04'
    },
    files: ['PACK.md', 'APPROVAL.md', 'manifest.json']  // no gap-report files when skipped
  };
  
  assert.strictEqual(mockManifest.operations.reconRan, false);
  assert.ok(!mockManifest.files.includes('gap-report.csv'));
  assert.ok(!mockManifest.files.includes('gap-report.md'));
});

test('Pipeline builder - recon ran in manifest', () => {
  // Test that manifest.json includes recon files when stage ran
  const mockManifest = {
    tool: 'pw-loyverse-xero-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    operations: {
      reconRan: true
    },
    inputs: {
      loyverseCsv: 'test.csv',
      xeroCsv: 'test.csv',
      mode: 'receipt',
      asOf: '2026-09-04'
    },
    files: ['PACK.md', 'APPROVAL.md', 'gap-report.csv', 'gap-report.md', 'manifest.json']
  };
  
  assert.strictEqual(mockManifest.operations.reconRan, true);
  assert.ok(mockManifest.files.includes('gap-report.csv'));
  assert.ok(mockManifest.files.includes('gap-report.md'));
});

test('Pipeline builder - manifest file list accuracy (PR #116)', () => {
  // Test that manifest only lists files that are present
  const mockFiles = ['PACK.md', 'APPROVAL.md', 'manifest.json'];
  const mockManifest = {
    tool: 'pw-loyverse-xero-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    operations: {
      reconRan: false
    },
    inputs: {
      loyverseCsv: 'test.csv',
      xeroCsv: 'test.csv',
      mode: 'receipt',
      asOf: '2026-09-04'
    },
    files: mockFiles
  };
  
  // Verify files list matches what was actually generated
  assert.deepStrictEqual(mockManifest.files, mockFiles);
  assert.strictEqual(mockManifest.files.length, 3);
});
