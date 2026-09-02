/**
 * Tests for lyrics processor
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { cleanLyrics, validateLyrics, MAX_LYRICS_LENGTH } from './lyrics-processor.js';

test('cleanLyrics normalizes line endings', () => {
  const input = 'Line 1\r\nLine 2\rLine 3\nLine 4';
  const result = cleanLyrics(input);
  assert.strictEqual(result, 'Line 1\nLine 2\nLine 3\nLine 4');
});

test('cleanLyrics trims leading and trailing whitespace', () => {
  const input = '  \n\nVerse 1\n\n  ';
  const result = cleanLyrics(input);
  assert.strictEqual(result, 'Verse 1');
});

test('cleanLyrics reduces multiple blank lines to max 2', () => {
  const input = 'Verse 1\n\n\n\n\nVerse 2';
  const result = cleanLyrics(input);
  assert.strictEqual(result, 'Verse 1\n\nVerse 2');
});

test('cleanLyrics trims trailing spaces from each line', () => {
  const input = 'Line 1   \nLine 2  \nLine 3';
  const result = cleanLyrics(input);
  assert.strictEqual(result, 'Line 1\nLine 2\nLine 3');
});

test('cleanLyrics preserves content', () => {
  const input = `Verse 1
I'm a little teapot
Short and stout

Chorus
Here is my handle
Here is my spout`;
  
  const result = cleanLyrics(input);
  assert.ok(result.includes("I'm a little teapot"));
  assert.ok(result.includes('Short and stout'));
  assert.ok(result.includes('Chorus'));
});

test('validateLyrics rejects empty lyrics', () => {
  const result = validateLyrics('');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.errors.length, 1);
  assert.ok(result.errors[0].includes('empty'));
});

test('validateLyrics rejects whitespace-only lyrics', () => {
  const result = validateLyrics('   \n\n  ');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.errors.length, 1);
});

test('validateLyrics rejects too-long lyrics', () => {
  const tooLong = 'A'.repeat(MAX_LYRICS_LENGTH + 1);
  const result = validateLyrics(tooLong);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.errors.length, 1);
  assert.ok(result.errors[0].includes('exceed'));
});

test('validateLyrics accepts valid lyrics', () => {
  const valid = 'Verse 1\n\nChorus\n\nVerse 2';
  const result = validateLyrics(valid);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('validateLyrics accepts lyrics at max length', () => {
  const atMax = 'A'.repeat(MAX_LYRICS_LENGTH);
  const result = validateLyrics(atMax);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});
