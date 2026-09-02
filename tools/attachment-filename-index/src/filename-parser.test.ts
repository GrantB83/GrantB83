import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractEntities, extractDates, getExtension, parseFilename } from './filename-parser.js';

test('extractEntities - plimmer', () => {
  const entities = extractEntities('Plimmer-invoice-2024.pdf');
  assert.ok(entities.includes('plimmer'));
});

test('extractEntities - charisse', () => {
  const entities = extractEntities('Charisse_statement.pdf');
  assert.ok(entities.includes('charisse'));
});

test('extractEntities - tax-emigration', () => {
  const entities = extractEntities('Tax-Emigration-Clearance-2024.pdf');
  assert.ok(entities.includes('tax-emigration'));
});

test('extractEntities - sars', () => {
  const entities = extractEntities('SARS-notice-2024-01.pdf');
  assert.ok(entities.includes('sars'));
});

test('extractEntities - cipc', () => {
  const entities = extractEntities('CIPC-annual-return.pdf');
  assert.ok(entities.includes('cipc'));
});

test('extractEntities - share-sale', () => {
  const entities = extractEntities('Share-Sale-Agreement-2024.pdf');
  assert.ok(entities.includes('share-sale'));
});

test('extractEntities - xero', () => {
  const entities = extractEntities('xero-export-jan-2024.csv');
  assert.ok(entities.includes('xero'));
});

test('extractEntities - loyverse', () => {
  const entities = extractEntities('loyverse-sales-summary.csv');
  assert.ok(entities.includes('loyverse'));
});

test('extractEntities - multiple entities', () => {
  const entities = extractEntities('Perfect-Water-Xero-Reconciliation-2024.pdf');
  assert.ok(entities.includes('perfect-water'));
  assert.ok(entities.includes('xero'));
});

test('extractEntities - unknown when no keywords', () => {
  const entities = extractEntities('random-file-123.pdf');
  assert.deepEqual(entities, ['unknown']);
});

test('extractDates - ISO format YYYY-MM-DD', () => {
  const dates = extractDates('invoice-2024-01-15.pdf');
  assert.deepEqual(dates, ['2024-01-15']);
});

test('extractDates - compact format YYYYMMDD', () => {
  const dates = extractDates('statement-20240315.pdf');
  assert.deepEqual(dates, ['2024-03-15']);
});

test('extractDates - year-month YYYY-MM', () => {
  const dates = extractDates('report-2024-06.pdf');
  assert.deepEqual(dates, ['2024-06']);
});

test('extractDates - DD-MM-YYYY format', () => {
  const dates = extractDates('bill-15-03-2024.pdf');
  assert.deepEqual(dates, ['2024-03-15']);
});

test('extractDates - multiple dates', () => {
  const dates = extractDates('contract-2024-01-15-to-2024-12-31.pdf');
  assert.equal(dates.length, 2);
  assert.ok(dates.includes('2024-01-15'));
  assert.ok(dates.includes('2024-12-31'));
});

test('extractDates - no dates', () => {
  const dates = extractDates('document-without-date.pdf');
  assert.deepEqual(dates, []);
});

test('getExtension - pdf', () => {
  assert.equal(getExtension('file.pdf'), '.pdf');
});

test('getExtension - csv', () => {
  assert.equal(getExtension('data.csv'), '.csv');
});

test('getExtension - no extension', () => {
  assert.equal(getExtension('noextension'), '');
});

test('parseFilename - complete entry', () => {
  const entry = parseFilename('Plimmer-Invoice-2024-03-15.pdf', '/vault/plimmer/');
  assert.equal(entry.filename, 'Plimmer-Invoice-2024-03-15.pdf');
  assert.ok(entry.inferredEntities.includes('plimmer'));
  assert.ok(entry.inferredDates.includes('2024-03-15'));
  assert.equal(entry.extension, '.pdf');
  assert.equal(entry.path, '/vault/plimmer/');
  assert.deepEqual(entry.matchedSubjects, []);
});

test('parseFilename - unknown with notes', () => {
  const entry = parseFilename('random-file.txt');
  assert.deepEqual(entry.inferredEntities, ['unknown']);
  assert.ok(entry.notes.includes('No entity keywords'));
});
