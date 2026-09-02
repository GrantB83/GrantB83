/**
 * Tests for browns-ct-pack-pipeline-pack assembler
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemblePipeline } from './assembler.js';
import type { CliOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = path.resolve(__dirname, '../fixtures');
const testOutDir = path.resolve(__dirname, '../test-out-unit');

test('assemblePipeline - with existing pack and post-checklist disabled', async () => {
  const packDir = path.join(fixturesDir, 'sample-pack');
  const outdir = path.join(testOutDir, 'test-1');

  if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true });
  }

  const options: CliOptions = {
    date: '2026-09-20',
    pack: packDir,
    outdir,
    runPostChecklist: false
  };

  const result = await assemblePipeline(options);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.manifest.date, '2026-09-20');
  assert.strictEqual(result.manifest.runOptions.ranAssemble, false);
  assert.strictEqual(result.manifest.runOptions.ranPostChecklist, false);

  assert.strictEqual(fs.existsSync(path.join(outdir, 'PACK.md')), true);
  assert.strictEqual(fs.existsSync(path.join(outdir, 'CT-PACK.md')), true);
  assert.strictEqual(fs.existsSync(path.join(outdir, 'manifest.json')), true);

  assert.strictEqual(fs.existsSync(path.join(outdir, 'POST-CHECKLIST.md')), false);
  assert.strictEqual(fs.existsSync(path.join(outdir, 'ISSUES.md')), false);

  const manifestContent = fs.readFileSync(path.join(outdir, 'manifest.json'), 'utf-8');
  const manifest = JSON.parse(manifestContent);
  
  const hasPostChecklist = manifest.files.some((f: { filename: string }) => f.filename === 'POST-CHECKLIST.md');
  const hasIssues = manifest.files.some((f: { filename: string }) => f.filename === 'ISSUES.md');
  
  assert.strictEqual(hasPostChecklist, false, 'manifest.files should not include POST-CHECKLIST.md when post-checklist skipped');
  assert.strictEqual(hasIssues, false, 'manifest.files should not include ISSUES.md when post-checklist skipped');

  fs.rmSync(outdir, { recursive: true });
});

test('assemblePipeline - validates required options', async () => {
  const options: CliOptions = {
    date: '2026-09-20',
    outdir: path.join(testOutDir, 'test-2')
  };

  await assert.rejects(
    async () => await assemblePipeline(options),
    /Either --pack or --bookings is required/
  );
});

test('assemblePipeline - validates pack directory exists', async () => {
  const options: CliOptions = {
    date: '2026-09-20',
    pack: '/nonexistent/pack',
    outdir: path.join(testOutDir, 'test-3')
  };

  await assert.rejects(
    async () => await assemblePipeline(options),
    /Pack directory not found/
  );
});

test('assemblePipeline - validates PACK.md exists in pack directory', async () => {
  const emptyDir = path.join(testOutDir, 'empty-pack');
  fs.mkdirSync(emptyDir, { recursive: true });

  const options: CliOptions = {
    date: '2026-09-20',
    pack: emptyDir,
    outdir: path.join(testOutDir, 'test-4')
  };

  await assert.rejects(
    async () => await assemblePipeline(options),
    /PACK.md not found in pack directory/
  );

  fs.rmSync(emptyDir, { recursive: true });
});

test('assemblePipeline - copies guest draft files', async () => {
  const packDir = path.join(fixturesDir, 'sample-pack');
  const outdir = path.join(testOutDir, 'test-5');

  if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true });
  }

  const options: CliOptions = {
    date: '2026-09-20',
    pack: packDir,
    outdir,
    runPostChecklist: false
  };

  const result = await assemblePipeline(options);

  assert.strictEqual(fs.existsSync(path.join(outdir, 'guest-henderson.md')), true);

  const guestDraftFiles = result.manifest.files.filter(f => f.type === 'guest-draft');
  assert.strictEqual(guestDraftFiles.length > 0, true);

  fs.rmSync(outdir, { recursive: true });
});
