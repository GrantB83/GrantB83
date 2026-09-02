/**
 * Tests for pipeline-builder.ts
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { buildPipelineFromExistingPack } from './pipeline-builder.js';

test('buildPipelineFromExistingPack validates pack path exists', () => {
  const result = buildPipelineFromExistingPack(
    '/nonexistent/path',
    true,
    './test-out',
    '2026-09-02'
  );
  
  assert.strictEqual(result.success, false);
  assert.match(result.message, /does not exist/);
});

test('buildPipelineFromExistingPack validates required files', () => {
  const tempDir = fs.mkdtempSync('/tmp/test-pack-');
  
  try {
    const result = buildPipelineFromExistingPack(
      tempDir,
      false,
      './test-out',
      '2026-09-02'
    );
    
    assert.strictEqual(result.success, false);
    assert.match(result.message, /Missing required file/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('buildPipelineFromExistingPack creates pipeline pack from valid input', () => {
  const tempDir = fs.mkdtempSync('/tmp/test-pack-');
  const outdir = fs.mkdtempSync('/tmp/test-out-');
  
  try {
    // Create minimal valid morning pack
    fs.writeFileSync(path.join(tempDir, 'PACK.md'), '# Pack\n');
    fs.writeFileSync(path.join(tempDir, 'school.md'), '# Kids School\n\nNo items.\n');
    fs.writeFileSync(path.join(tempDir, 'family.md'), '# Family Admin\n\nNo items.\n');
    fs.writeFileSync(path.join(tempDir, 'APPROVAL.md'), '# Approval\n');
    
    const result = buildPipelineFromExistingPack(
      tempDir,
      false, // skip post-checklist for this test
      outdir,
      '2026-09-02'
    );
    
    assert.strictEqual(result.success, true);
    
    const pipelinePack = path.join(outdir, 'pipeline-pack-2026-09-02');
    assert.ok(fs.existsSync(pipelinePack));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'PACK.md')));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'school.md')));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'family.md')));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'manifest.json')));
    
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(outdir, { recursive: true, force: true });
  }
});
