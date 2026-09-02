import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeRows } from './normalizer.js';
import { getProfile } from './profiles.js';
import { CSVRow } from './types.js';

describe('normalizeRows', () => {
  it('should normalize valid generic GRV rows', () => {
    const rows: CSVRow[] = [
      { Store: 'LT', Item: 'Water 5L', Qty: '10', Unit: 'bottle', Date: '2026-09-01', Supplier: 'Acme', 'Doc No': 'GRV001' },
      { Store: 'Tho', Item: 'Filter', Qty: '5', Unit: 'unit', Date: '2026-09-02', Supplier: 'Beta', 'Doc No': 'GRV002' },
    ];

    const profile = getProfile('generic');
    const result = normalizeRows(rows, profile);

    assert.strictEqual(result.normalized.length, 2);
    assert.strictEqual(result.rejected.length, 0);
    assert.strictEqual(result.normalized[0].Store, 'LT');
    assert.strictEqual(result.normalized[0]['SKU/Item'], 'Water 5L');
    assert.strictEqual(result.normalized[0].ReceivedQty, '10');
  });

  it('should reject rows with missing required fields', () => {
    const rows: CSVRow[] = [
      { Store: '', Item: 'Water', Qty: '10', Unit: 'bottle' }, // Missing Store
      { Store: 'LT', Item: '', Qty: '5', Unit: 'unit' }, // Missing Item
      { Store: 'LT', Item: 'Filter', Qty: '', Unit: 'unit' }, // Missing Qty
      { Store: 'LT', Item: 'Filter', Qty: '5', Unit: '' }, // Missing Unit
    ];

    const profile = getProfile('generic');
    const result = normalizeRows(rows, profile);

    assert.strictEqual(result.normalized.length, 0);
    assert.strictEqual(result.rejected.length, 4);
    assert.strictEqual(result.missingFields.missingStore, 1);
    assert.strictEqual(result.missingFields.missingItem, 1);
    assert.strictEqual(result.missingFields.missingQty, 1);
    assert.strictEqual(result.missingFields.missingUnit, 1);
  });

  it('should reject rows with unparseable quantity', () => {
    const rows: CSVRow[] = [
      { Store: 'LT', Item: 'Water', Qty: 'abc', Unit: 'bottle' },
      { Store: 'LT', Item: 'Filter', Qty: '---', Unit: 'unit' },
    ];

    const profile = getProfile('generic');
    const result = normalizeRows(rows, profile);

    assert.strictEqual(result.normalized.length, 0);
    assert.strictEqual(result.rejected.length, 2);
    assert.ok(result.rejected[0].reason.includes('Unparseable'));
  });

  it('should handle numeric quantities with currency symbols', () => {
    const rows: CSVRow[] = [
      { Store: 'LT', Item: 'Water', Qty: '10', Unit: 'bottle' }, // Clean number
      { Store: 'LT', Item: 'Filter', Qty: '5.5', Unit: 'unit' }, // Decimal
    ];

    const profile = getProfile('generic');
    const result = normalizeRows(rows, profile);

    assert.strictEqual(result.normalized.length, 2);
    assert.strictEqual(result.normalized[0].ReceivedQty, '10');
    assert.strictEqual(result.normalized[1].ReceivedQty, '5.5');
  });
});
