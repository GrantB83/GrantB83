import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import { generateWorksheet } from './worksheet-generator.js';
import { RateRecord, PromoRecord } from './types.js';

test('generateWorksheet - base rates only (no promos)', () => {
  const rates: RateRecord[] = [
    {
      suiteOrUnit: 'Suite A',
      seasonOrLabel: 'Summer',
      currency: 'ZAR',
      nightlyRate: 2500,
      minStay: '2 nights',
      occupancy: '2 adults'
    }
  ];

  const promos: PromoRecord[] = [];

  const output = generateWorksheet(rates, promos);

  assert.strictEqual(output.worksheetRows.length, 1);
  assert.strictEqual(output.worksheetRows[0].baseRate, '2500.00');
  assert.strictEqual(output.worksheetRows[0].promoName, undefined);
  assert.strictEqual(output.hasIncompletePricing, false);
  assert.strictEqual(output.warnings.length, 0);
});

test('generateWorksheet - rates with promo (percent discount)', () => {
  const rates: RateRecord[] = [
    {
      suiteOrUnit: 'Suite A',
      seasonOrLabel: 'Summer',
      currency: 'ZAR',
      nightlyRate: 2000
    }
  ];

  const promos: PromoRecord[] = [
    {
      name: 'Summer Special',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      discountPercent: 20
    }
  ];

  const output = generateWorksheet(rates, promos);

  assert.strictEqual(output.worksheetRows.length, 1);
  assert.strictEqual(output.worksheetRows[0].baseRate, '2000.00');
  assert.strictEqual(output.worksheetRows[0].promoName, 'Summer Special');
  assert.strictEqual(output.worksheetRows[0].discountType, 'percent');
  assert.strictEqual(output.worksheetRows[0].discountValue, '20');
  assert.strictEqual(output.worksheetRows[0].promoRate, '1600.00');
  assert.strictEqual(output.hasIncompletePricing, false);
});

test('generateWorksheet - rates with promo (amount discount)', () => {
  const rates: RateRecord[] = [
    {
      suiteOrUnit: 'Suite A',
      seasonOrLabel: 'Summer',
      currency: 'ZAR',
      nightlyRate: 2000
    }
  ];

  const promos: PromoRecord[] = [
    {
      name: 'Holiday Deal',
      startDate: '2024-12-15',
      endDate: '2024-12-25',
      discountAmount: 500
    }
  ];

  const output = generateWorksheet(rates, promos);

  assert.strictEqual(output.worksheetRows.length, 1);
  assert.strictEqual(output.worksheetRows[0].baseRate, '2000.00');
  assert.strictEqual(output.worksheetRows[0].promoName, 'Holiday Deal');
  assert.strictEqual(output.worksheetRows[0].discountType, 'amount');
  assert.strictEqual(output.worksheetRows[0].discountValue, '500.00');
  assert.strictEqual(output.worksheetRows[0].promoRate, '1500.00');
  assert.strictEqual(output.hasIncompletePricing, false);
});

test('generateWorksheet - missing base rate leaves blank', () => {
  const rates: RateRecord[] = [
    {
      suiteOrUnit: 'Suite A',
      seasonOrLabel: 'Summer',
      currency: 'ZAR',
      nightlyRate: undefined
    }
  ];

  const promos: PromoRecord[] = [];

  const output = generateWorksheet(rates, promos);

  assert.strictEqual(output.worksheetRows.length, 1);
  assert.strictEqual(output.worksheetRows[0].baseRate, '');
  assert.strictEqual(output.worksheetRows[0].flags, 'MISSING_BASE_RATE');
  assert.strictEqual(output.hasIncompletePricing, true);
  assert.strictEqual(output.warnings.length, 1);
  assert.match(output.warnings[0], /Missing rate for Suite A/);
});

test('generateWorksheet - promo without discount is flagged as DRAFT', () => {
  const rates: RateRecord[] = [
    {
      suiteOrUnit: 'Suite A',
      seasonOrLabel: 'Summer',
      currency: 'ZAR',
      nightlyRate: 2000
    }
  ];

  const promos: PromoRecord[] = [
    {
      name: 'Future Promo',
      startDate: '2025-01-01',
      endDate: '2025-01-31'
    }
  ];

  const output = generateWorksheet(rates, promos);

  assert.strictEqual(output.worksheetRows.length, 1);
  assert.strictEqual(output.worksheetRows[0].baseRate, '2000.00');
  assert.strictEqual(output.worksheetRows[0].promoName, 'Future Promo');
  assert.strictEqual(output.worksheetRows[0].promoRate, undefined);
  assert.strictEqual(output.worksheetRows[0].flags, 'DRAFT_NEEDS_RATE');
  assert.strictEqual(output.hasIncompletePricing, true);
  assert.match(output.warnings[0], /missing discount value/);
});

test('generateWorksheet - multiple rates and promos create combinations', () => {
  const rates: RateRecord[] = [
    {
      suiteOrUnit: 'Suite A',
      seasonOrLabel: 'Summer',
      currency: 'ZAR',
      nightlyRate: 2000
    },
    {
      suiteOrUnit: 'Suite B',
      seasonOrLabel: 'Winter',
      currency: 'ZAR',
      nightlyRate: 1500
    }
  ];

  const promos: PromoRecord[] = [
    {
      name: 'Promo 1',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      discountPercent: 10
    },
    {
      name: 'Promo 2',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      discountPercent: 15
    }
  ];

  const output = generateWorksheet(rates, promos);

  assert.strictEqual(output.worksheetRows.length, 4);
  assert.strictEqual(output.worksheetRows[0].suiteOrUnit, 'Suite A');
  assert.strictEqual(output.worksheetRows[0].promoName, 'Promo 1');
  assert.strictEqual(output.worksheetRows[1].suiteOrUnit, 'Suite A');
  assert.strictEqual(output.worksheetRows[1].promoName, 'Promo 2');
  assert.strictEqual(output.worksheetRows[2].suiteOrUnit, 'Suite B');
  assert.strictEqual(output.worksheetRows[2].promoName, 'Promo 1');
  assert.strictEqual(output.worksheetRows[3].suiteOrUnit, 'Suite B');
  assert.strictEqual(output.worksheetRows[3].promoName, 'Promo 2');
});

test('generateWorksheet - discount never goes below zero', () => {
  const rates: RateRecord[] = [
    {
      suiteOrUnit: 'Suite A',
      seasonOrLabel: 'Summer',
      currency: 'ZAR',
      nightlyRate: 1000
    }
  ];

  const promos: PromoRecord[] = [
    {
      name: 'Huge Discount',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      discountAmount: 1500
    }
  ];

  const output = generateWorksheet(rates, promos);

  assert.strictEqual(output.worksheetRows[0].promoRate, '0.00');
});
