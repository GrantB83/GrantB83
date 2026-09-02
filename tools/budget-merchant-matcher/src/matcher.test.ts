import { test } from 'node:test';
import * as assert from 'node:assert';
import { matchTransactions } from './matcher.js';
import { Transaction, Rule } from './types.js';

test('matchTransactions with substring matching', () => {
  const transactions: Transaction[] = [
    { merchant: 'whole foods market', rawRow: [] },
    { merchant: 'shell gas station', rawRow: [] },
    { merchant: 'amazon.com', rawRow: [] },
    { merchant: 'unknown merchant', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: 'whole foods', category: 'Grocery' },
    { pattern: 'shell', category: 'Fuel' },
    { pattern: 'amazon', category: 'Shopping' }
  ];

  const summary = matchTransactions(transactions, rules);

  assert.strictEqual(summary.totalTransactions, 4);
  assert.strictEqual(summary.matchedTransactions, 3);
  assert.strictEqual(summary.unmatchedTransactions, 1);
  assert.strictEqual(summary.uniqueMatchedMerchants, 3);
  assert.strictEqual(summary.uniqueUnmatchedMerchants, 1);
  
  assert.strictEqual(summary.unmatched[0].merchant, 'unknown merchant');
  assert.strictEqual(summary.unmatched[0].count, 1);
});

test('matchTransactions with regex matching', () => {
  const transactions: Transaction[] = [
    { merchant: 'netflix subscription', rawRow: [] },
    { merchant: 'hulu streaming', rawRow: [] },
    { merchant: 'disney+ monthly', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: '^netflix', category: 'Streaming', isRegex: true },
    { pattern: 'hulu|disney', category: 'Streaming', isRegex: true }
  ];

  const summary = matchTransactions(transactions, rules);

  assert.strictEqual(summary.matchedTransactions, 3);
  assert.strictEqual(summary.unmatchedTransactions, 0);
});

test('matchTransactions counts duplicate merchants', () => {
  const transactions: Transaction[] = [
    { merchant: 'whole foods market', rawRow: [] },
    { merchant: 'whole foods market', rawRow: [] },
    { merchant: 'whole foods market', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: 'whole foods', category: 'Grocery' }
  ];

  const summary = matchTransactions(transactions, rules);

  assert.strictEqual(summary.matchedTransactions, 3);
  assert.strictEqual(summary.uniqueMatchedMerchants, 1);
  assert.strictEqual(summary.matched[0].count, 3);
});

test('matchTransactions with amounts', () => {
  const transactions: Transaction[] = [
    { merchant: 'whole foods', amount: '85.23', rawRow: [] },
    { merchant: 'whole foods', amount: '42.50', rawRow: [] },
    { merchant: 'shell', amount: '$45.00', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: 'whole foods', category: 'Grocery' },
    { pattern: 'shell', category: 'Fuel' }
  ];

  const summary = matchTransactions(transactions, rules);

  const groceryMatch = summary.matched.find(m => m.category === 'Grocery');
  assert.ok(groceryMatch);
  assert.strictEqual(groceryMatch.count, 2);
  assert.strictEqual(groceryMatch.totalAmount, 127.73);

  const fuelMatch = summary.matched.find(m => m.category === 'Fuel');
  assert.ok(fuelMatch);
  assert.strictEqual(fuelMatch.totalAmount, 45.00);
});

test('matchTransactions without amounts', () => {
  const transactions: Transaction[] = [
    { merchant: 'test merchant', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: 'test', category: 'Test' }
  ];

  const summary = matchTransactions(transactions, rules);

  assert.strictEqual(summary.matched[0].totalAmount, undefined);
});

test('matchTransactions prefers first matching rule', () => {
  const transactions: Transaction[] = [
    { merchant: 'amazon prime', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: 'amazon', category: 'Shopping' },
    { pattern: 'prime', category: 'Subscription' }
  ];

  const summary = matchTransactions(transactions, rules);

  assert.strictEqual(summary.matched[0].category, 'Shopping');
});

test('matchTransactions with invalid regex falls back gracefully', () => {
  const transactions: Transaction[] = [
    { merchant: 'test merchant', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: '[invalid(regex', category: 'Test', isRegex: true }
  ];

  const summary = matchTransactions(transactions, rules);

  assert.strictEqual(summary.unmatchedTransactions, 1);
});

test('matchTransactions sorts by count descending', () => {
  const transactions: Transaction[] = [
    { merchant: 'merchant a', rawRow: [] },
    { merchant: 'merchant b', rawRow: [] },
    { merchant: 'merchant b', rawRow: [] },
    { merchant: 'merchant c', rawRow: [] },
    { merchant: 'merchant c', rawRow: [] },
    { merchant: 'merchant c', rawRow: [] }
  ];

  const rules: Rule[] = [
    { pattern: 'merchant', category: 'Test' }
  ];

  const summary = matchTransactions(transactions, rules);

  assert.strictEqual(summary.matched[0].merchant, 'merchant c');
  assert.strictEqual(summary.matched[0].count, 3);
  assert.strictEqual(summary.matched[1].merchant, 'merchant b');
  assert.strictEqual(summary.matched[1].count, 2);
  assert.strictEqual(summary.matched[2].merchant, 'merchant a');
  assert.strictEqual(summary.matched[2].count, 1);
});
