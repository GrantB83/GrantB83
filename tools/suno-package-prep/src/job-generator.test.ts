/**
 * Tests for job generator
 */

import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { generateJobPackage } from './job-generator.js';
import { SunoMetadata } from './types.js';

test('generateJobPackage creates job directory', async () => {
  const testOutDir = './test-job-gen-out';
  
  try {
    const jobDir = await generateJobPackage({
      lyrics: 'Test verse\n\nTest chorus',
      meta: {
        title: 'Test Song',
      },
      outdir: testOutDir,
    });
    
    assert.ok(fs.existsSync(jobDir));
    assert.ok(jobDir.includes('test-song'));
    
    // Cleanup
    fs.rmSync(testOutDir, { recursive: true, force: true });
  } catch (error) {
    // Cleanup on failure
    if (fs.existsSync(testOutDir)) {
      fs.rmSync(testOutDir, { recursive: true, force: true });
    }
    throw error;
  }
});

test('generateJobPackage creates all required files', async () => {
  const testOutDir = './test-job-files-out';
  
  try {
    const jobDir = await generateJobPackage({
      lyrics: 'Test lyrics',
      meta: { title: 'Test' },
      outdir: testOutDir,
    });
    
    assert.ok(fs.existsSync(path.join(jobDir, 'lyrics.cleaned.txt')));
    assert.ok(fs.existsSync(path.join(jobDir, 'suno-prompt.txt')));
    assert.ok(fs.existsSync(path.join(jobDir, 'style.txt')));
    assert.ok(fs.existsSync(path.join(jobDir, 'title.txt')));
    assert.ok(fs.existsSync(path.join(jobDir, 'checklist.md')));
    assert.ok(fs.existsSync(path.join(jobDir, 'manifest.json')));
    
    // Cleanup
    fs.rmSync(testOutDir, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(testOutDir)) {
      fs.rmSync(testOutDir, { recursive: true, force: true });
    }
    throw error;
  }
});

test('generateJobPackage rejects empty lyrics', async () => {
  const testOutDir = './test-empty-lyrics-out';
  
  try {
    await assert.rejects(
      async () => {
        await generateJobPackage({
          lyrics: '   ',
          outdir: testOutDir,
        });
      },
      (error: Error) => {
        return error.message.includes('empty');
      }
    );
  } finally {
    if (fs.existsSync(testOutDir)) {
      fs.rmSync(testOutDir, { recursive: true, force: true });
    }
  }
});

test('generateJobPackage rejects too-long lyrics', async () => {
  const testOutDir = './test-long-lyrics-out';
  
  try {
    const tooLong = 'A'.repeat(3001);
    await assert.rejects(
      async () => {
        await generateJobPackage({
          lyrics: tooLong,
          outdir: testOutDir,
        });
      },
      (error: Error) => {
        return error.message.includes('exceed');
      }
    );
  } finally {
    if (fs.existsSync(testOutDir)) {
      fs.rmSync(testOutDir, { recursive: true, force: true });
    }
  }
});

test('generateJobPackage writes valid manifest', async () => {
  const testOutDir = './test-manifest-out';
  
  try {
    const meta: SunoMetadata = {
      title: 'Test Song',
      artist: 'Test Artist',
      style: 'pop',
    };
    
    const jobDir = await generateJobPackage({
      lyrics: 'Test lyrics',
      meta,
      outdir: testOutDir,
    });
    
    const manifestPath = path.join(jobDir, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    assert.strictEqual(manifest.title, 'Test Song');
    assert.strictEqual(manifest.artist, 'Test Artist');
    assert.strictEqual(manifest.metadata.style, 'pop');
    assert.ok(manifest.generated_at);
    
    // Cleanup
    fs.rmSync(testOutDir, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(testOutDir)) {
      fs.rmSync(testOutDir, { recursive: true, force: true });
    }
    throw error;
  }
});
