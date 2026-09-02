import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  checkRequiredFiles,
  checkMetaJsonShape,
  checkLyricsNotEmpty,
  checkNoPiiPatterns,
  checkChecklistManualPaste
} from './validators.js';

// Helper to create temporary test directory
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'suno-validate-test-'));
}

// Helper to cleanup temp directory
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('validators', () => {
  describe('checkRequiredFiles', () => {
    it('should pass when all required files are present', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'lyrics.cleaned.txt'), 'test lyrics');
        fs.writeFileSync(path.join(dir, 'checklist.md'), '# Checklist');
        fs.writeFileSync(path.join(dir, 'manifest.json'), '{}');
        
        const result = checkRequiredFiles(dir);
        assert.strictEqual(result.passed, true);
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail when files are missing', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'lyrics.cleaned.txt'), 'test lyrics');
        
        const result = checkRequiredFiles(dir);
        assert.strictEqual(result.passed, false);
        assert.ok(result.details?.includes('checklist.md'));
      } finally {
        cleanupTempDir(dir);
      }
    });
  });

  describe('checkMetaJsonShape', () => {
    it('should pass with valid metadata', () => {
      const dir = createTempDir();
      try {
        const manifest = {
          metadata: {
            title: 'Test Song',
            kids: ['Kid1', 'Kid2']
          }
        };
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
        
        const result = checkMetaJsonShape(dir);
        assert.strictEqual(result.passed, true);
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail when metadata field is missing', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'manifest.json'), '{"title": "test"}');
        
        const result = checkMetaJsonShape(dir);
        assert.strictEqual(result.passed, false);
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail when field types are invalid', () => {
      const dir = createTempDir();
      try {
        const manifest = {
          metadata: {
            title: 123,  // Should be string
            kids: 'not-an-array'  // Should be array
          }
        };
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
        
        const result = checkMetaJsonShape(dir);
        assert.strictEqual(result.passed, false);
        assert.ok(result.details?.includes('title'));
      } finally {
        cleanupTempDir(dir);
      }
    });
  });

  describe('checkLyricsNotEmpty', () => {
    it('should pass with non-empty lyrics', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'lyrics.cleaned.txt'), 'Some lyrics here');
        
        const result = checkLyricsNotEmpty(dir);
        assert.strictEqual(result.passed, true);
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail with empty lyrics', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'lyrics.cleaned.txt'), '   \n\n  ');
        
        const result = checkLyricsNotEmpty(dir);
        assert.strictEqual(result.passed, false);
      } finally {
        cleanupTempDir(dir);
      }
    });
  });

  describe('checkNoPiiPatterns', () => {
    it('should pass with no PII', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'lyrics.cleaned.txt'), 'Twinkle twinkle little star');
        
        const result = checkNoPiiPatterns(dir);
        assert.strictEqual(result.passed, true);
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail with email addresses', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'lyrics.cleaned.txt'), 'Contact me at test@example.com for info');
        
        const result = checkNoPiiPatterns(dir);
        assert.strictEqual(result.passed, false);
        assert.ok(result.details?.includes('email'));
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail with phone numbers', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'lyrics.cleaned.txt'), 'Call me at 555-123-4567');
        
        const result = checkNoPiiPatterns(dir);
        assert.strictEqual(result.passed, false);
        assert.ok(result.details?.includes('phone'));
      } finally {
        cleanupTempDir(dir);
      }
    });
  });

  describe('checkChecklistManualPaste', () => {
    it('should pass with manual paste keywords', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'checklist.md'), 
          '# Manual Steps\n1. Open Chrome\n2. Paste the lyrics');
        
        const result = checkChecklistManualPaste(dir);
        assert.strictEqual(result.passed, true);
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail with automation keywords', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'checklist.md'), 
          '# Automated Steps\n1. Run Selenium script\n2. Wait for completion');
        
        const result = checkChecklistManualPaste(dir);
        assert.strictEqual(result.passed, false);
        assert.ok(result.details?.includes('automat'));
      } finally {
        cleanupTempDir(dir);
      }
    });

    it('should fail without manual workflow keywords', () => {
      const dir = createTempDir();
      try {
        fs.writeFileSync(path.join(dir, 'checklist.md'), 
          '# Steps\n1. Do something\n2. Do something else');
        
        const result = checkChecklistManualPaste(dir);
        assert.strictEqual(result.passed, false);
      } finally {
        cleanupTempDir(dir);
      }
    });
  });
});
