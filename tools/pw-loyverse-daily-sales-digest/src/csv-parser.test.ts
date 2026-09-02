import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseLoyverseCSV } from './csv-parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './test-csv-parser';

test('parseLoyverseCSV - valid CSV with default columns', () => {
  const csvContent = `Store,Item,Quantity,Gross Sales
Louis Trichardt,5L Bottle,10,150.00
Louis Trichardt,10L Bottle,5,200.00
Thohoyandou,5L Bottle,8,120.00`;

  const csvPath = join(TEST_DIR, 'valid.csv');
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(csvPath, csvContent, 'utf-8');

  const result = parseLoyverseCSV(csvPath);

  assert.equal(result.sales.length, 3);
  assert.equal(result.sales[0].store, 'Louis Trichardt');
  assert.equal(result.sales[0].item, '5L Bottle');
  assert.equal(result.sales[0].quantity, 10);
  assert.equal(result.sales[0].grossSales, 150.00);
  assert.equal(result.missingFields.invalidRows.length, 0);

  rmSync(TEST_DIR, { recursive: true, force: true });
});

test('parseLoyverseCSV - custom column names', () => {
  const csvContent = `Location,Product,Qty,Total
Louis Trichardt,5L Bottle,10,150.00`;

  const csvPath = join(TEST_DIR, 'custom.csv');
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(csvPath, csvContent, 'utf-8');

  const result = parseLoyverseCSV(csvPath, {
    storeCol: 'Location',
    itemCol: 'Product',
    qtyCol: 'Qty',
    amountCol: 'Total'
  });

  assert.equal(result.sales.length, 1);
  assert.equal(result.sales[0].store, 'Louis Trichardt');
  assert.equal(result.sales[0].item, '5L Bottle');

  rmSync(TEST_DIR, { recursive: true, force: true });
});

test('parseLoyverseCSV - missing required columns', () => {
  const csvContent = `Store,Item,Quantity
Louis Trichardt,5L Bottle,10`;

  const csvPath = join(TEST_DIR, 'missing-cols.csv');
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(csvPath, csvContent, 'utf-8');

  assert.throws(
    () => parseLoyverseCSV(csvPath),
    /Missing required columns: Gross Sales/
  );

  rmSync(TEST_DIR, { recursive: true, force: true });
});

test('parseLoyverseCSV - rows with missing fields', () => {
  const csvContent = `Store,Item,Quantity,Gross Sales
Louis Trichardt,5L Bottle,10,150.00
,10L Bottle,5,200.00
Louis Trichardt,,8,120.00
Louis Trichardt,Filter,,50.00`;

  const csvPath = join(TEST_DIR, 'missing-fields.csv');
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(csvPath, csvContent, 'utf-8');

  const result = parseLoyverseCSV(csvPath);

  assert.equal(result.sales.length, 1);
  assert.equal(result.missingFields.invalidRows.length, 3);
  assert.equal(result.missingFields.missingStores, 1);
  assert.equal(result.missingFields.missingItems, 1);
  assert.equal(result.missingFields.missingQuantities, 1);

  rmSync(TEST_DIR, { recursive: true, force: true });
});

test('parseLoyverseCSV - CSV with quoted fields', () => {
  const csvContent = `Store,Item,Quantity,Gross Sales
"Louis Trichardt","5L Bottle, Premium",10,150.00
"Thohoyandou","Filter ""Pro""",5,200.00`;

  const csvPath = join(TEST_DIR, 'quoted.csv');
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(csvPath, csvContent, 'utf-8');

  const result = parseLoyverseCSV(csvPath);

  assert.equal(result.sales.length, 2);
  assert.equal(result.sales[0].item, '5L Bottle, Premium');
  assert.equal(result.sales[1].item, 'Filter "Pro"');

  rmSync(TEST_DIR, { recursive: true, force: true });
});

test('parseLoyverseCSV - empty CSV throws error', () => {
  const csvPath = join(TEST_DIR, 'empty.csv');
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(csvPath, '', 'utf-8');

  assert.throws(
    () => parseLoyverseCSV(csvPath),
    /Empty CSV file/
  );

  rmSync(TEST_DIR, { recursive: true, force: true });
});
