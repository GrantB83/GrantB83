/**
 * Tests for parser module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { parseJD } from './parser.js';

test('parseJD extracts company name', () => {
  const jd = 'Company: Tesla\n\nJob description here...';
  const parsed = parseJD(jd);
  
  assert.strictEqual(parsed.company, 'Tesla');
});

test('parseJD extracts title', () => {
  const jd = 'Title: Operations Manager\n\nJob description here...';
  const parsed = parseJD(jd);
  
  assert.strictEqual(parsed.title, 'Operations Manager');
});

test('parseJD detects Tesla', () => {
  const jd = 'Company: Tesla\nJob at Tesla...';
  const parsed = parseJD(jd);
  
  assert.strictEqual(parsed.isTesla, true);
});

test('parseJD detects remote', () => {
  const jd = 'This is a remote position...';
  const parsed = parseJD(jd);
  
  assert.strictEqual(parsed.isRemote, true);
});

test('parseJD extracts compensation', () => {
  const jd = 'Compensation: $150,000 - $180,000';
  const parsed = parseJD(jd);
  
  assert.ok(parsed.compensation);
  assert.ok(parsed.compensation.includes('150'));
});

test('parseJD respects company override', () => {
  const jd = 'Company: OldCo\nSome job...';
  const parsed = parseJD(jd, 'NewCo');
  
  assert.strictEqual(parsed.company, 'NewCo');
});

test('parseJD respects title override', () => {
  const jd = 'Title: Old Title\nSome job...';
  const parsed = parseJD(jd, undefined, 'New Title');
  
  assert.strictEqual(parsed.title, 'New Title');
});

test('parseJD extracts seniority keywords', () => {
  const jd = 'Looking for a Director of Operations with VP-level experience...';
  const parsed = parseJD(jd);
  
  assert.ok(parsed.seniorityKeywords.includes('director'));
  assert.ok(parsed.seniorityKeywords.includes('vp'));
});

test('parseJD extracts function keywords', () => {
  const jd = 'Operations and Product Strategy role...';
  const parsed = parseJD(jd);
  
  assert.ok(parsed.functionKeywords.includes('operations'));
  assert.ok(parsed.functionKeywords.includes('product'));
  assert.ok(parsed.functionKeywords.includes('strategy'));
});
