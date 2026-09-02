import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseCSV } from './csv-parser.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './test-temp';

test('parseCSV - parses valid CSV with Item and Quantity', () => {
  const csvContent = `Item,Quantity
Water Bottle,10
Filter,5`;
  
  const testFile = join(TEST_DIR, 'test1.csv');
  writeFileSync(testFile, csvContent, 'utf-8');

  const result = parseCSV(testFile, { keyCol: 'Item', qtyCol: 'Quantity' });

  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].item, 'Water Bottle');
  assert.equal(result.rows[0].quantity, 10);
  assert.equal(result.rows[1].item, 'Filter');
  assert.equal(result.rows[1].quantity, 5);
  assert.equal(result.rejected.length, 0);

  unlinkSync(testFile);
});

test('parseCSV - parses valid CSV with Store column', () => {
  const csvContent = `Item,Quantity,Store
Water Bottle,10,Louis Trichardt
Filter,5,Thohoyandou`;
  
  const testFile = join(TEST_DIR, 'test2.csv');
  writeFileSync(testFile, csvContent, 'utf-8');

  const result = parseCSV(testFile, {
    keyCol: 'Item',
    qtyCol: 'Quantity',
    storeCol: 'Store'
  });

  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].store, 'Louis Trichardt');
  assert.equal(result.rows[1].store, 'Thohoyandou');
  assert.equal(result.rejected.length, 0);

  unlinkSync(testFile);
});

test('parseCSV - rejects rows with blank item', () => {
  const csvContent = `Item,Quantity
Water Bottle,10
,5`;
  
  const testFile = join(TEST_DIR, 'test3.csv');
  writeFileSync(testFile, csvContent, 'utf-8');

  const result = parseCSV(testFile, { keyCol: 'Item', qtyCol: 'Quantity' });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'Missing item/key');

  unlinkSync(testFile);
});

test('parseCSV - rejects rows with blank quantity', () => {
  const csvContent = `Item,Quantity
Water Bottle,10
Filter,`;
  
  const testFile = join(TEST_DIR, 'test4.csv');
  writeFileSync(testFile, csvContent, 'utf-8');

  const result = parseCSV(testFile, { keyCol: 'Item', qtyCol: 'Quantity' });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'Missing quantity');

  unlinkSync(testFile);
});

test('parseCSV - rejects rows with unparseable quantity', () => {
  const csvContent = `Item,Quantity
Water Bottle,10
Filter,ABC`;
  
  const testFile = join(TEST_DIR, 'test5.csv');
  writeFileSync(testFile, csvContent, 'utf-8');

  const result = parseCSV(testFile, { keyCol: 'Item', qtyCol: 'Quantity' });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'Unparseable quantity');

  unlinkSync(testFile);
});

test('parseCSV - throws error for missing key column', () => {
  const csvContent = `Product,Quantity
Water Bottle,10`;
  
  const testFile = join(TEST_DIR, 'test6.csv');
  writeFileSync(testFile, csvContent, 'utf-8');

  assert.throws(
    () => parseCSV(testFile, { keyCol: 'Item', qtyCol: 'Quantity' }),
    /Required column 'Item' not found/
  );

  unlinkSync(testFile);
});

test('parseCSV - throws error for missing quantity column', () => {
  const csvContent = `Item,Amount
Water Bottle,10`;
  
  const testFile = join(TEST_DIR, 'test7.csv');
  writeFileSync(testFile, csvContent, 'utf-8');

  assert.throws(
    () => parseCSV(testFile, { keyCol: 'Item', qtyCol: 'Quantity' }),
    /Required column 'Quantity' not found/
  );

  unlinkSync(testFile);
});
