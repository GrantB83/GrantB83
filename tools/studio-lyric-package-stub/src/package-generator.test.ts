import { test } from 'node:test';
import assert from 'node:assert';
import { deriveTitleFromLyrics, validateLyrics } from './package-generator.js';

test('deriveTitleFromLyrics - simple first line', () => {
  const lyrics = 'Twinkle twinkle little star\nHow I wonder what you are';
  const title = deriveTitleFromLyrics(lyrics);
  assert.strictEqual(title, 'Twinkle twinkle little star');
});

test('deriveTitleFromLyrics - truncates long first line', () => {
  const lyrics = 'This is a very long first line that exceeds fifty characters and should be truncated\nSecond line';
  const title = deriveTitleFromLyrics(lyrics);
  assert.ok(title.length <= 50);
  assert.ok(title.endsWith('...'));
});

test('deriveTitleFromLyrics - strips special characters', () => {
  const lyrics = 'Hello, World! @#$%\nSecond line';
  const title = deriveTitleFromLyrics(lyrics);
  assert.strictEqual(title, 'Hello World');
});

test('deriveTitleFromLyrics - empty lyrics returns Untitled', () => {
  const lyrics = '';
  const title = deriveTitleFromLyrics(lyrics);
  assert.strictEqual(title, 'Untitled');
});

test('deriveTitleFromLyrics - whitespace only returns Untitled', () => {
  const lyrics = '   \n\n   ';
  const title = deriveTitleFromLyrics(lyrics);
  assert.strictEqual(title, 'Untitled');
});

test('validateLyrics - accepts non-empty lyrics', () => {
  const lyrics = 'Valid lyrics content';
  assert.doesNotThrow(() => validateLyrics(lyrics));
});

test('validateLyrics - rejects empty lyrics', () => {
  const lyrics = '';
  assert.throws(() => validateLyrics(lyrics), {
    message: 'Lyrics file is empty or contains only whitespace'
  });
});

test('validateLyrics - rejects whitespace-only lyrics', () => {
  const lyrics = '   \n\n   ';
  assert.throws(() => validateLyrics(lyrics), {
    message: 'Lyrics file is empty or contains only whitespace'
  });
});
