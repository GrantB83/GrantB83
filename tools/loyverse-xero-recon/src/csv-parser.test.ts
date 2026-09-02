import { test } from 'node:test';
import { strictEqual, ok, throws } from 'node:assert';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parseLoyverseCSV, parseXeroCSV } from './csv-parser.js';

const TEST_DIR = join(process.cwd(), 'test-tmp');

test('parseLoyverseCSV - valid file', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'test-loyverse.csv');
  
  writeFileSync(testFile, `Date,Receipt Number,Total Amount,Payment Type
2024-01-15,RCP-001,125.50,Card
2024-01-16,RCP-002,89.99,Cash`);

  const records = parseLoyverseCSV(testFile);

  strictEqual(records.length, 2);
  strictEqual(records[0].receiptNumber, 'RCP-001');
  strictEqual(records[0].totalAmount, 125.50);
  strictEqual(records[1].receiptNumber, 'RCP-002');
  strictEqual(records[1].totalAmount, 89.99);

  unlinkSync(testFile);
});

test('parseLoyverseCSV - date normalization', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'test-loyverse-dates.csv');
  
  writeFileSync(testFile, `Date,Receipt Number,Total Amount,Payment Type
15/01/2024,RCP-001,100.00,Card
2024-01-16,RCP-002,200.00,Cash`);

  const records = parseLoyverseCSV(testFile);

  strictEqual(records.length, 2);
  strictEqual(records[0].date, '2024-01-15');
  strictEqual(records[1].date, '2024-01-16');

  unlinkSync(testFile);
});

test('parseXeroCSV - valid file', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'test-xero.csv');
  
  writeFileSync(testFile, `Date,Reference,Amount,Description
2024-01-15,RCP-001,125.50,Card Payment
2024-01-16,RCP-002,89.99,Cash Payment`);

  const records = parseXeroCSV(testFile);

  strictEqual(records.length, 2);
  strictEqual(records[0].reference, 'RCP-001');
  strictEqual(records[0].amount, 125.50);
  strictEqual(records[1].reference, 'RCP-002');
  strictEqual(records[1].amount, 89.99);

  unlinkSync(testFile);
});

test('parseLoyverseCSV - handles quoted values', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'test-loyverse-quotes.csv');
  
  writeFileSync(testFile, `Date,Receipt Number,Total Amount,Payment Type
"2024-01-15","RCP-001","125.50","Card"
2024-01-16,RCP-002,89.99,Cash`);

  const records = parseLoyverseCSV(testFile);

  strictEqual(records.length, 2);
  strictEqual(records[0].receiptNumber, 'RCP-001');

  unlinkSync(testFile);
});

test('parseLoyverseCSV - handles amount with dollar signs', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'test-loyverse-dollar.csv');
  
  writeFileSync(testFile, `Date,Receipt Number,Total Amount,Payment Type
2024-01-15,RCP-001,$125.50,Card`);

  const records = parseLoyverseCSV(testFile);

  strictEqual(records.length, 1);
  strictEqual(records[0].totalAmount, 125.50);

  unlinkSync(testFile);
});

test('parseLoyverseCSV - throws on empty file', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'test-empty.csv');
  
  writeFileSync(testFile, '');

  throws(() => parseLoyverseCSV(testFile), /Empty Loyverse CSV file/);

  unlinkSync(testFile);
});
