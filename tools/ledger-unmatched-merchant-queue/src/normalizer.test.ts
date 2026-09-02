import { test } from 'node:test';
import * as assert from 'node:assert';
import { normalizeMerchantName, isUnmatched } from './normalizer.js';

test('normalizeMerchantName removes punctuation and lowercases', () => {
  assert.strictEqual(
    normalizeMerchantName('Starbucks Coffee'),
    'starbucks coffee'
  );
  assert.strictEqual(
    normalizeMerchantName('ABC Corp. - Payment'),
    'abc corp  payment'
  );
  assert.strictEqual(
    normalizeMerchantName('SHELL GAS STATION #234'),
    'shell gas station 234'
  );
});

test('normalizeMerchantName handles extra spaces', () => {
  assert.strictEqual(
    normalizeMerchantName('  Multiple   Spaces  '),
    'multiple spaces'
  );
});

test('isUnmatched detects unmatched status', () => {
  const result = isUnmatched(
    { status: 'unmatched' },
    ['unmatched', 'unknown'],
    true
  );
  assert.strictEqual(result.isUnmatched, true);
  assert.strictEqual(result.reason, 'status-match');
});

test('isUnmatched detects matched status', () => {
  const result = isUnmatched(
    { status: 'matched' },
    ['unmatched', 'unknown'],
    true
  );
  assert.strictEqual(result.isUnmatched, false);
});

test('isUnmatched treats empty status as unmatched', () => {
  const result = isUnmatched({ status: '' }, ['unmatched', 'unknown'], true);
  assert.strictEqual(result.isUnmatched, true);
  assert.strictEqual(result.reason, 'empty-status');
});

test('isUnmatched treats all as unmatched when no status column', () => {
  const result = isUnmatched({ status: 'matched' }, ['unmatched'], false);
  assert.strictEqual(result.isUnmatched, true);
  assert.strictEqual(result.reason, 'no-status-column');
});
