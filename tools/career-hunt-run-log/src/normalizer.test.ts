/**
 * Tests for normalizer module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  validateEntry,
  normalizeFromSummary,
  normalizeFromFlags,
  validateAll,
} from './normalizer.js';
import { RunEntry, HuntRunSummary } from './types.js';

test('validateEntry - valid entry passes', () => {
  const entry: RunEntry = {
    company: 'Tesla',
    title: 'Operations Manager',
    action: 'scored',
    date: '2026-09-02',
  };

  const result = validateEntry(entry);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('validateEntry - missing company fails', () => {
  const entry: RunEntry = {
    company: '',
    title: 'Operations Manager',
    action: 'scored',
    date: '2026-09-02',
  };

  const result = validateEntry(entry);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('company')));
});

test('validateEntry - missing title fails', () => {
  const entry: RunEntry = {
    company: 'Tesla',
    title: '',
    action: 'scored',
    date: '2026-09-02',
  };

  const result = validateEntry(entry);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('title')));
});

test('validateEntry - invalid action fails', () => {
  const entry = {
    company: 'Tesla',
    title: 'Manager',
    action: 'invalid',
    date: '2026-09-02',
  } as any;

  const result = validateEntry(entry);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('action')));
});

test('validateEntry - invalid date fails', () => {
  const entry: RunEntry = {
    company: 'Tesla',
    title: 'Manager',
    action: 'scored',
    date: 'invalid-date',
  };

  const result = validateEntry(entry);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('date')));
});

test('normalizeFromSummary - handles scored entries', () => {
  const summary: HuntRunSummary = {
    date: '2026-09-02',
    scored: [
      { company: 'Tesla', title: 'Ops Manager', score: 9, gatePass: true, source: 'LinkedIn' },
    ],
  };

  const entries = normalizeFromSummary(summary);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].company, 'Tesla');
  assert.strictEqual(entries[0].title, 'Ops Manager');
  assert.strictEqual(entries[0].action, 'scored');
  assert.strictEqual(entries[0].score, 9);
  assert.strictEqual(entries[0].gatePass, true);
  assert.strictEqual(entries[0].source, 'LinkedIn');
  assert.strictEqual(entries[0].date, '2026-09-02');
});

test('normalizeFromSummary - handles applied entries', () => {
  const summary: HuntRunSummary = {
    date: '2026-09-02',
    applied: [
      { company: 'SpaceX', title: 'Director', source: 'Indeed' },
    ],
  };

  const entries = normalizeFromSummary(summary);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].company, 'SpaceX');
  assert.strictEqual(entries[0].title, 'Director');
  assert.strictEqual(entries[0].action, 'applied');
  assert.strictEqual(entries[0].source, 'Indeed');
});

test('normalizeFromSummary - handles skipped entries', () => {
  const summary: HuntRunSummary = {
    date: '2026-09-02',
    skipped: [
      { company: 'BadCo', title: 'Junior IC', reason: 'Too junior', source: 'LinkedIn' },
    ],
  };

  const entries = normalizeFromSummary(summary);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].company, 'BadCo');
  assert.strictEqual(entries[0].action, 'skipped');
  assert.strictEqual(entries[0].reason, 'Too junior');
});

test('normalizeFromSummary - handles rejected entries', () => {
  const summary: HuntRunSummary = {
    date: '2026-09-02',
    rejected: [
      { company: 'FailCo', title: 'Manager', reason: 'Comp too low', source: 'Indeed' },
    ],
  };

  const entries = normalizeFromSummary(summary);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].company, 'FailCo');
  assert.strictEqual(entries[0].action, 'rejected');
  assert.strictEqual(entries[0].reason, 'Comp too low');
});

test('normalizeFromFlags - handles mixed entries', () => {
  const entries = normalizeFromFlags({
    date: '2026-09-02',
    scored: [{ company: 'Tesla', title: 'Manager', score: 8, gatePass: true }],
    applied: [{ company: 'SpaceX', title: 'Director' }],
    skipped: [{ company: 'BadCo', title: 'IC', reason: 'Too junior' }],
  });

  assert.strictEqual(entries.length, 3);
  assert.strictEqual(entries[0].action, 'scored');
  assert.strictEqual(entries[1].action, 'applied');
  assert.strictEqual(entries[2].action, 'skipped');
});

test('validateAll - separates valid and invalid entries', () => {
  const entries: RunEntry[] = [
    { company: 'Tesla', title: 'Manager', action: 'scored', date: '2026-09-02' },
    { company: '', title: 'Manager', action: 'scored', date: '2026-09-02' }, // Invalid
    { company: 'SpaceX', title: 'Director', action: 'applied', date: '2026-09-02' },
  ];

  const result = validateAll(entries);
  assert.strictEqual(result.valid.length, 2);
  assert.strictEqual(result.invalid.length, 1);
  assert.strictEqual(result.invalid[0].entry.company, '');
});
