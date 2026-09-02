import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import { parsePromo } from './promo-parser.js';

test('parsePromo - parses JSON with discountPercent', () => {
  const testFile = '/tmp/test-promo.json';
  const content = JSON.stringify([
    {
      name: 'Summer Special',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      discountPercent: 15
    }
  ]);

  fs.writeFileSync(testFile, content);

  const promos = parsePromo(testFile);

  assert.strictEqual(promos.length, 1);
  assert.strictEqual(promos[0].name, 'Summer Special');
  assert.strictEqual(promos[0].startDate, '2024-12-01');
  assert.strictEqual(promos[0].endDate, '2024-12-31');
  assert.strictEqual(promos[0].discountPercent, 15);
  assert.strictEqual(promos[0].discountAmount, undefined);

  fs.unlinkSync(testFile);
});

test('parsePromo - parses JSON with discountAmount', () => {
  const testFile = '/tmp/test-promo-amount.json';
  const content = JSON.stringify([
    {
      name: 'Holiday Deal',
      startDate: '2024-12-15',
      endDate: '2024-12-25',
      discountAmount: 500
    }
  ]);

  fs.writeFileSync(testFile, content);

  const promos = parsePromo(testFile);

  assert.strictEqual(promos.length, 1);
  assert.strictEqual(promos[0].discountAmount, 500);
  assert.strictEqual(promos[0].discountPercent, undefined);

  fs.unlinkSync(testFile);
});

test('parsePromo - parses JSON without discount (draft)', () => {
  const testFile = '/tmp/test-promo-draft.json';
  const content = JSON.stringify([
    {
      name: 'Future Promo',
      startDate: '2025-01-01',
      endDate: '2025-01-31'
    }
  ]);

  fs.writeFileSync(testFile, content);

  const promos = parsePromo(testFile);

  assert.strictEqual(promos.length, 1);
  assert.strictEqual(promos[0].name, 'Future Promo');
  assert.strictEqual(promos[0].discountPercent, undefined);
  assert.strictEqual(promos[0].discountAmount, undefined);

  fs.unlinkSync(testFile);
});

test('parsePromo - parses CSV format', () => {
  const testFile = '/tmp/test-promo.csv';
  const content = `name,startDate,endDate,discountPercent
Spring Sale,2024-03-01,2024-03-31,20
Summer Sale,2024-06-01,2024-06-30,`;

  fs.writeFileSync(testFile, content);

  const promos = parsePromo(testFile);

  assert.strictEqual(promos.length, 2);
  assert.strictEqual(promos[0].name, 'Spring Sale');
  assert.strictEqual(promos[0].discountPercent, 20);
  assert.strictEqual(promos[1].name, 'Summer Sale');
  assert.strictEqual(promos[1].discountPercent, undefined);

  fs.unlinkSync(testFile);
});

test('parsePromo - throws on missing required fields in JSON', () => {
  const testFile = '/tmp/test-promo-bad.json';
  const content = JSON.stringify([
    {
      name: 'Incomplete Promo',
      startDate: '2024-01-01'
    }
  ]);

  fs.writeFileSync(testFile, content);

  assert.throws(
    () => parsePromo(testFile),
    /missing required fields/
  );

  fs.unlinkSync(testFile);
});

test('parsePromo - throws on invalid file type', () => {
  const testFile = '/tmp/test-promo.txt';
  fs.writeFileSync(testFile, 'some content');

  assert.throws(
    () => parsePromo(testFile),
    /must be .json or .csv/
  );

  fs.unlinkSync(testFile);
});
