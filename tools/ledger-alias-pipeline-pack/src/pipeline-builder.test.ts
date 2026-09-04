/**
 * Tests for pipeline-builder
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildPipelineFromSuggestOutput } from './pipeline-builder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('buildPipelineFromSuggestOutput', () => {
  it('should fail if suggest output directory does not exist', () => {
    const result = buildPipelineFromSuggestOutput(
      '/nonexistent/path',
      true,
      './test-out',
      null
    );
    
    assert.strictEqual(result.success, false);
    assert.match(result.message, /not found/i);
  });
  
  it('should fail if suggestions.json is missing', () => {
    const tempDir = fs.mkdtempSync('test-ledger-alias-');
    
    try {
      const result = buildPipelineFromSuggestOutput(
        tempDir,
        true,
        './test-out',
        null
      );
      
      assert.strictEqual(result.success, false);
      assert.match(result.message, /suggestions\.json not found/i);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  it('should succeed with valid suggest output', () => {
    const fixturesDir = path.resolve(__dirname, '../fixtures/suggest-out');
    const testOutDir = path.resolve(__dirname, '../test-out-builder');
    
    // Clean test output
    if (fs.existsSync(testOutDir)) {
      fs.rmSync(testOutDir, { recursive: true });
    }
    
    const result = buildPipelineFromSuggestOutput(
      fixturesDir,
      false, // Skip apply-checklist for faster test
      testOutDir,
      '2026-09'
    );
    
    assert.strictEqual(result.success, true);
    assert.ok(result.outdir.includes('ledger-alias-pack-2026-09'));
    assert.ok(result.files.includes('PACK.md'));
    assert.ok(result.files.includes('manifest.json'));
    assert.ok(result.files.includes('suggestions.json'));
    
    // Verify PACK.md exists
    const packMdPath = path.join(result.outdir, 'PACK.md');
    assert.ok(fs.existsSync(packMdPath));
    
    // Verify manifest.json exists and is valid JSON
    const manifestPath = path.join(result.outdir, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath));
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(manifest.tool, 'ledger-alias-pipeline-pack');
    assert.strictEqual(manifest.month, '2026-09');
    assert.strictEqual(manifest.applyChecklistRan, false);
    
    // Clean up
    fs.rmSync(testOutDir, { recursive: true, force: true });
  });
});
