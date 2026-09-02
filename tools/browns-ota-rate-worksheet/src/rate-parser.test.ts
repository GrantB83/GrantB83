import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseRatesCSV } from './rate-parser.js';

test('parseRatesCSV - parses valid rates file', () => {
  const testFile = '/tmp/test-rates.csv';
  const content = `suiteOrUnit,seasonOrLabel,currency,nightlyRate,minStay,occupancy,notes
Luxury Suite 1,Summer Peak,ZAR,2500.00,2 nights,2 adults,"Pool view"
Garden Suite,Winter Off-Peak,ZAR,1800.50,1 night,2 adults,""`;

  fs.writeFileSync(testFile, content);

  const rates = parseRatesCSV(testFile);

  assert.strictEqual(rates.length, 2);
  assert.strictEqual(rates[0].suiteOrUnit, 'Luxury Suite 1');
  assert.strictEqual(rates[0].seasonOrLabel, 'Summer Peak');
  assert.strictEqual(rates[0].currency, 'ZAR');
  assert.strictEqual(rates[0].nightlyRate, 2500.00);
  assert.strictEqual(rates[0].minStay, '2 nights');
  assert.strictEqual(rates[0].occupancy, '2 adults');
  assert.strictEqual(rates[0].notes, 'Pool view');

  fs.unlinkSync(testFile);
});

test('parseRatesCSV - handles missing nightlyRate', () => {
  const testFile = '/tmp/test-rates-missing.csv';
  const content = `suiteOrUnit,seasonOrLabel,currency,nightlyRate
Luxury Suite 1,Summer Peak,ZAR,2500.00
Garden Suite,Winter Off-Peak,ZAR,`;

  fs.writeFileSync(testFile, content);

  const rates = parseRatesCSV(testFile);

  assert.strictEqual(rates.length, 2);
  assert.strictEqual(rates[0].nightlyRate, 2500.00);
  assert.strictEqual(rates[1].nightlyRate, undefined);

  fs.unlinkSync(testFile);
});

test('parseRatesCSV - handles invalid nightlyRate values', () => {
  const testFile = '/tmp/test-rates-invalid.csv';
  const content = `suiteOrUnit,seasonOrLabel,currency,nightlyRate
Suite A,Season 1,ZAR,2500.00
Suite B,Season 2,ZAR,abc
Suite C,Season 3,ZAR,-100`;

  fs.writeFileSync(testFile, content);

  const rates = parseRatesCSV(testFile);

  assert.strictEqual(rates.length, 3);
  assert.strictEqual(rates[0].nightlyRate, 2500.00);
  assert.strictEqual(rates[1].nightlyRate, undefined);
  assert.strictEqual(rates[2].nightlyRate, undefined);

  fs.unlinkSync(testFile);
});

test('parseRatesCSV - throws on missing required columns', () => {
  const testFile = '/tmp/test-rates-bad.csv';
  const content = `suiteOrUnit,seasonOrLabel
Suite A,Season 1`;

  fs.writeFileSync(testFile, content);

  assert.throws(
    () => parseRatesCSV(testFile),
    /Missing required columns/
  );

  fs.unlinkSync(testFile);
});

test('parseRatesCSV - throws on empty file', () => {
  const testFile = '/tmp/test-rates-empty.csv';
  fs.writeFileSync(testFile, 'suiteOrUnit,seasonOrLabel,currency\n');

  assert.throws(
    () => parseRatesCSV(testFile),
    /must have header row and at least one data row/
  );

  fs.unlinkSync(testFile);
});
