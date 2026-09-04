/**
 * Tests for career-weekday-improve-pipeline-pack
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildPipelineFromExistingPack } from './pipeline-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('buildPipelineFromExistingPack validates pack exists', () => {
  const result = buildPipelineFromExistingPack(
    '/nonexistent/path',
    true,
    false,
    './test-out',
    '2026-09-02'
  );

  assert.strictEqual(result.success, false);
  assert.match(result.message, /does not exist/);
});

test('buildPipelineFromExistingPack validates pack is directory', () => {
  const tempFile = path.join(__dirname, 'temp-file.txt');
  fs.writeFileSync(tempFile, 'test');

  try {
    const result = buildPipelineFromExistingPack(
      tempFile,
      true,
      false,
      './test-out',
      '2026-09-02'
    );

    assert.strictEqual(result.success, false);
    assert.match(result.message, /not a directory/);
  } finally {
    fs.unlinkSync(tempFile);
  }
});

test('buildPipelineFromExistingPack validates required files', () => {
  const tempDir = path.join(__dirname, 'temp-pack-incomplete');
  fs.mkdirSync(tempDir, { recursive: true });

  // Create only some required files
  fs.writeFileSync(path.join(tempDir, 'PACK.md'), '# Pack');

  try {
    const result = buildPipelineFromExistingPack(
      tempDir,
      true,
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

test('buildPipelineFromExistingPack creates pipeline pack with all required files', () => {
  const tempDir = path.join(__dirname, 'temp-pack-complete');
  const outdir = path.join(__dirname, 'test-out-complete');

  fs.mkdirSync(tempDir, { recursive: true });

  // Create required files
  fs.writeFileSync(path.join(tempDir, 'PACK.md'), '# Improve Pack');
  fs.writeFileSync(path.join(tempDir, 'LEARNING-DRAFT.md'), '# Learning');
  fs.writeFileSync(path.join(tempDir, 'APPROVAL.md'), '# Approval');
  fs.writeFileSync(path.join(tempDir, 'stats.json'), '{"totals":{"entries":5}}');

  try {
    const result = buildPipelineFromExistingPack(
      tempDir,
      false, // skip digest
      false, // skip hunt-log
      outdir,
      '2026-09-02'
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.pipelinePackPath);

    const pipelinePack = result.pipelinePackPath;
    assert.ok(fs.existsSync(path.join(pipelinePack, 'PACK.md')));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'APPROVAL.md')));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'manifest.json')));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'LEARNING-DRAFT.md')));
    assert.ok(fs.existsSync(path.join(pipelinePack, 'stats.json')));

    // Verify manifest
    const manifest = JSON.parse(fs.readFileSync(path.join(pipelinePack, 'manifest.json'), 'utf-8'));
    assert.strictEqual(manifest.tool, 'career-weekday-improve-pipeline-pack');
    assert.strictEqual(manifest.digestRan, false);
    assert.strictEqual(manifest.huntLogRan, false);
    assert.ok(manifest.files.includes('PACK.md'));
    assert.ok(manifest.files.includes('manifest.json'));
    assert.ok(manifest.files.includes('APPROVAL.md'));
    assert.ok(manifest.files.includes('LEARNING-DRAFT.md'));
    assert.ok(manifest.files.includes('stats.json'));

    // Verify DIGEST and HUNT-LOG files NOT in manifest when skipped
    assert.ok(!manifest.files.includes('DIGEST-LEARNING-DRAFT.md'));
    assert.ok(!manifest.files.includes('DIGEST-stats.json'));
    assert.ok(!manifest.files.includes('HUNT-LOG-runs.jsonl'));
    assert.ok(!manifest.files.includes('HUNT-LOG-runs.md'));

  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(outdir, { recursive: true, force: true });
  }
});

test('buildPipelineFromExistingPack manifest excludes optional files when stages skipped', () => {
  const tempDir = path.join(__dirname, 'temp-pack-manifest-test');
  const outdir = path.join(__dirname, 'test-out-manifest');

  fs.mkdirSync(tempDir, { recursive: true });

  // Create required files only
  fs.writeFileSync(path.join(tempDir, 'PACK.md'), '# Improve Pack');
  fs.writeFileSync(path.join(tempDir, 'LEARNING-DRAFT.md'), '# Learning');
  fs.writeFileSync(path.join(tempDir, 'APPROVAL.md'), '# Approval');

  try {
    const result = buildPipelineFromExistingPack(
      tempDir,
      false, // skip digest (default ON, but OFF here)
      false, // skip hunt-log (default OFF)
      outdir,
      '2026-09-02'
    );

    assert.strictEqual(result.success, true);

    const pipelinePack = result.pipelinePackPath!;
    const manifest = JSON.parse(fs.readFileSync(path.join(pipelinePack, 'manifest.json'), 'utf-8'));

    // Verify digest files NOT in manifest
    assert.ok(!manifest.files.includes('DIGEST-LEARNING-DRAFT.md'));
    assert.ok(!manifest.files.includes('DIGEST-stats.json'));

    // Verify hunt-log files NOT in manifest
    assert.ok(!manifest.files.includes('HUNT-LOG-runs.jsonl'));
    assert.ok(!manifest.files.includes('HUNT-LOG-runs.md'));

    // Verify core files ARE in manifest
    assert.ok(manifest.files.includes('PACK.md'));
    assert.ok(manifest.files.includes('manifest.json'));
    assert.ok(manifest.files.includes('APPROVAL.md'));
    assert.ok(manifest.files.includes('LEARNING-DRAFT.md'));

  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(outdir, { recursive: true, force: true });
  }
});
