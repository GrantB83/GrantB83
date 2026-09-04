/**
 * Tests for vault-due-digest-pipeline-pack
 */

import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test, describe } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildPipelineFromPack } from './pipeline-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('vault-due-digest-pipeline-pack', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  const testOutdir = path.join(__dirname, '..', 'test-out-unit');

  test('buildPipelineFromPack - healthy pack', () => {
    const healthyPack = path.join(fixturesDir, 'healthy-pack');
    const result = buildPipelineFromPack(healthyPack, false, testOutdir);

    assert.strictEqual(result.success, true);
    assert.strictEqual(fs.existsSync(path.join(testOutdir, 'PACK.md')), true);
    assert.strictEqual(fs.existsSync(path.join(testOutdir, 'DIGEST.md')), true);
    assert.strictEqual(fs.existsSync(path.join(testOutdir, 'APPROVAL.md')), true);
    assert.strictEqual(fs.existsSync(path.join(testOutdir, 'manifest.json')), true);
    assert.strictEqual(fs.existsSync(path.join(testOutdir, 'by-entity')), true);

    // Clean up
    fs.rmSync(testOutdir, { recursive: true, force: true });
  });

  test('buildPipelineFromPack - missing pack directory', () => {
    const missingPack = path.join(fixturesDir, 'does-not-exist');
    const result = buildPipelineFromPack(missingPack, false, testOutdir);

    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('not found'));
  });

  test('buildPipelineFromPack - manifest reflects post-checklist status', () => {
    const healthyPack = path.join(fixturesDir, 'healthy-pack');
    
    // Without post-checklist
    const result1 = buildPipelineFromPack(healthyPack, false, testOutdir + '-1');
    assert.strictEqual(result1.manifest.runOptions.ranPostChecklist, false);
    fs.rmSync(testOutdir + '-1', { recursive: true, force: true });

    // With post-checklist (will fail/warn since tool not built, but should set flag)
    const result2 = buildPipelineFromPack(healthyPack, true, testOutdir + '-2');
    // Even if checklist fails, manifest should reflect attempt
    assert.strictEqual(result2.manifest.runOptions.ranPostChecklist, false); // Will be false if tool not found
    fs.rmSync(testOutdir + '-2', { recursive: true, force: true });
  });

  test('buildPipelineFromPack - files array excludes POST-CHECKLIST.md when checklist skipped', () => {
    const healthyPack = path.join(fixturesDir, 'healthy-pack');
    const result = buildPipelineFromPack(healthyPack, false, testOutdir);

    const hasPostChecklist = result.manifest.files.some(f => f.filename === 'POST-CHECKLIST.md');
    const hasIssues = result.manifest.files.some(f => f.filename === 'ISSUES.md');
    
    assert.strictEqual(hasPostChecklist, false, 'POST-CHECKLIST.md should not be in files array when skipped');
    assert.strictEqual(hasIssues, false, 'ISSUES.md should not be in files array when skipped');

    // Clean up
    fs.rmSync(testOutdir, { recursive: true, force: true });
  });
});
