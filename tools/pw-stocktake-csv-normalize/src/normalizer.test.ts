import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeRows } from './normalizer.js';
import { getProfile } from './profiles.js';
import { RawRow } from './types.js';

test('normalizeRows - valid generic row', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: '100', Unit: 'bottles' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.normalized[0].Store, 'Main');
  assert.equal(result.normalized[0]['SKU/Item'], 'Water 500ml');
  assert.equal(result.normalized[0].CountedQty, '100');
  assert.equal(result.normalized[0].Unit, 'bottles');
});

test('normalizeRows - missing store', () => {
  const rows: RawRow[] = [
    { Store: '', Item: 'Water 500ml', Qty: '100', Unit: 'bottles' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'missing store');
});

test('normalizeRows - missing sku/item', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: '', Qty: '100', Unit: 'bottles' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'missing sku/item');
});

test('normalizeRows - missing quantity', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: '', Unit: 'bottles' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'missing or blank quantity');
});

test('normalizeRows - unparseable quantity', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: 'abc', Unit: 'bottles' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'unparseable quantity');
});

test('normalizeRows - missing unit', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: '100', Unit: '' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'missing unit');
});

test('normalizeRows - with optional date', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: '100', Unit: 'bottles', Date: '01/09/2026' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.normalized[0].CountedAt, '2026-09-01');
});

test('normalizeRows - with optional notes', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: '100', Unit: 'bottles', Notes: 'Checked twice' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.normalized[0].Notes, 'Checked twice');
});

test('normalizeRows - quantity with commas', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: '1,234', Unit: 'bottles' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.normalized[0].CountedQty, '1234');
});

test('normalizeRows - decimal quantity', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Juice Box', Qty: '12.5', Unit: 'boxes' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.normalized[0].CountedQty, '12.5');
});

test('normalizeRows - unparseable date', () => {
  const rows: RawRow[] = [
    { Store: 'Main', Item: 'Water 500ml', Qty: '100', Unit: 'bottles', Date: 'invalid-date' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'unparseable date');
});
