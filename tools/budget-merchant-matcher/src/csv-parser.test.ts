import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseTransactions, parseRulesCSV, parseRulesJSON } from './csv-parser.js';

test('parseTransactions with standard Merchant column', () => {
  const testFile = '/tmp/test-txns-merchant.csv';
  fs.writeFileSync(testFile, 
    'Date,Merchant,Amount\n' +
    '2024-01-15,Whole Foods Market,85.23\n' +
    '2024-01-16,Shell Gas Station,45.00\n'
  );

  const transactions = parseTransactions(testFile);
  
  assert.strictEqual(transactions.length, 2);
  assert.strictEqual(transactions[0].merchant, 'whole foods market');
  assert.strictEqual(transactions[0].amount, '85.23');
  assert.strictEqual(transactions[1].merchant, 'shell gas station');
  
  fs.unlinkSync(testFile);
});

test('parseTransactions with Description column', () => {
  const testFile = '/tmp/test-txns-description.csv';
  fs.writeFileSync(testFile, 
    'Date,Description,Amount\n' +
    '2024-01-15,Amazon.com Purchase,125.50\n'
  );

  const transactions = parseTransactions(testFile);
  
  assert.strictEqual(transactions.length, 1);
  assert.strictEqual(transactions[0].merchant, 'amazon.com purchase');
  
  fs.unlinkSync(testFile);
});

test('parseTransactions normalizes whitespace', () => {
  const testFile = '/tmp/test-txns-whitespace.csv';
  fs.writeFileSync(testFile, 
    'Merchant,Amount\n' +
    '  Multiple   Spaces   Inc  ,100\n'
  );

  const transactions = parseTransactions(testFile);
  
  assert.strictEqual(transactions.length, 1);
  assert.strictEqual(transactions[0].merchant, 'multiple spaces inc');
  
  fs.unlinkSync(testFile);
});

test('parseTransactions without amount column', () => {
  const testFile = '/tmp/test-txns-no-amount.csv';
  fs.writeFileSync(testFile, 
    'Date,Merchant\n' +
    '2024-01-15,Test Merchant\n'
  );

  const transactions = parseTransactions(testFile);
  
  assert.strictEqual(transactions.length, 1);
  assert.strictEqual(transactions[0].merchant, 'test merchant');
  assert.strictEqual(transactions[0].amount, undefined);
  
  fs.unlinkSync(testFile);
});

test('parseRulesCSV with basic rules', () => {
  const testFile = '/tmp/test-rules.csv';
  fs.writeFileSync(testFile, 
    'pattern,category,notes\n' +
    'whole foods,Grocery,Organic foods\n' +
    'shell,Fuel,Gas station\n'
  );

  const rules = parseRulesCSV(testFile);
  
  assert.strictEqual(rules.length, 2);
  assert.strictEqual(rules[0].pattern, 'whole foods');
  assert.strictEqual(rules[0].category, 'Grocery');
  assert.strictEqual(rules[0].notes, 'Organic foods');
  assert.strictEqual(rules[0].isRegex, false);
  
  fs.unlinkSync(testFile);
});

test('parseRulesCSV with regex flag', () => {
  const testFile = '/tmp/test-rules-regex.csv';
  fs.writeFileSync(testFile, 
    'pattern,category,isRegex\n' +
    '^amazon,Shopping,true\n'
  );

  const rules = parseRulesCSV(testFile);
  
  assert.strictEqual(rules.length, 1);
  assert.strictEqual(rules[0].pattern, '^amazon');
  assert.strictEqual(rules[0].isRegex, true);
  
  fs.unlinkSync(testFile);
});

test('parseRulesJSON', () => {
  const testFile = '/tmp/test-rules.json';
  fs.writeFileSync(testFile, JSON.stringify([
    { pattern: 'netflix', category: 'Streaming', notes: 'Monthly subscription' },
    { pattern: '^hulu', category: 'Streaming', isRegex: true }
  ]));

  const rules = parseRulesJSON(testFile);
  
  assert.strictEqual(rules.length, 2);
  assert.strictEqual(rules[0].pattern, 'netflix');
  assert.strictEqual(rules[0].category, 'Streaming');
  assert.strictEqual(rules[1].isRegex, true);
  
  fs.unlinkSync(testFile);
});

test('parseTransactions throws on missing merchant column', () => {
  const testFile = '/tmp/test-txns-no-merchant.csv';
  fs.writeFileSync(testFile, 
    'Date,Amount\n' +
    '2024-01-15,100\n'
  );

  assert.throws(() => {
    parseTransactions(testFile);
  }, /No merchant\/description column found/);
  
  fs.unlinkSync(testFile);
});
