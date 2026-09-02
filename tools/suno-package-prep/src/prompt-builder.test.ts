/**
 * Tests for prompt builder
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { buildPrompt, buildStyle, buildTitle } from './prompt-builder.js';
import { SunoMetadata } from './types.js';

test('buildPrompt with full metadata', () => {
  const meta: SunoMetadata = {
    mood: 'Happy and upbeat',
    duration_hint: '2-3 minutes',
    kids: ['Emma', 'Liam'],
  };
  
  const result = buildPrompt(meta);
  assert.ok(result.includes('Happy and upbeat'));
  assert.ok(result.includes('Duration: 2-3 minutes'));
  assert.ok(result.includes('Written by: Emma, Liam'));
});

test('buildPrompt with artist instead of kids', () => {
  const meta: SunoMetadata = {
    mood: 'Energetic',
    artist: 'BrownieTunez',
  };
  
  const result = buildPrompt(meta);
  assert.ok(result.includes('Energetic'));
  assert.ok(result.includes('Artist: BrownieTunez'));
});

test('buildPrompt with minimal metadata', () => {
  const meta: SunoMetadata = {};
  const result = buildPrompt(meta);
  assert.strictEqual(result, '');
});

test('buildStyle with style and negative prompts', () => {
  const meta: SunoMetadata = {
    style: 'pop, children\'s music, upbeat',
    negative_prompts: ['explicit', 'dark'],
  };
  
  const result = buildStyle(meta);
  assert.ok(result.includes('pop, children\'s music, upbeat'));
  assert.ok(result.includes('Avoid: explicit, dark'));
});

test('buildStyle with only style', () => {
  const meta: SunoMetadata = {
    style: 'rock, energetic',
  };
  
  const result = buildStyle(meta);
  assert.ok(result.includes('rock, energetic'));
  assert.ok(!result.includes('Avoid'));
});

test('buildStyle with minimal metadata', () => {
  const meta: SunoMetadata = {};
  const result = buildStyle(meta);
  assert.strictEqual(result, '');
});

test('buildTitle uses provided title', () => {
  const meta: SunoMetadata = {
    title: 'My Amazing Song',
  };
  
  const result = buildTitle(meta);
  assert.strictEqual(result, 'My Amazing Song');
});

test('buildTitle generates from kids name', () => {
  const meta: SunoMetadata = {
    kids: ['Emma', 'Liam'],
  };
  
  const result = buildTitle(meta);
  assert.strictEqual(result, 'Emma\'s Song');
});

test('buildTitle generates from artist', () => {
  const meta: SunoMetadata = {
    artist: 'BrownieTunez',
  };
  
  const result = buildTitle(meta);
  assert.strictEqual(result, 'BrownieTunez - Untitled');
});

test('buildTitle with no metadata', () => {
  const meta: SunoMetadata = {};
  const result = buildTitle(meta);
  assert.strictEqual(result, 'Untitled Song');
});
