import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeRows } from './normalizer.js';
import { getProfile } from './profiles.js';
import { RawRow } from './types.js';

test('normalizeRows - generic profile with single amount column', () => {
  const rows: RawRow[] = [
    {
      Date: '15/01/2024',
      Reference: 'REF001',
      Amount: '1,234.56',
      Description: 'Payment received',
    },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.normalized[0].Date, '2024-01-15');
  assert.equal(result.normalized[0].Amount, '1234.56');
  assert.equal(result.normalized[0].Reference, 'REF001');
  assert.equal(result.normalized[0].Description, 'Payment received');
});

test('normalizeRows - debit/credit split columns', () => {
  const rows: RawRow[] = [
    {
      Date: '2024-01-15',
      Reference: 'REF001',
      Debit: '100.00',
      Credit: '',
      Description: 'Fee charged',
    },
    {
      Date: '2024-01-16',
      Reference: 'REF002',
      Debit: '',
      Credit: '500.00',
      Description: 'Payment received',
    },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 2);
  assert.equal(result.normalized[0].Amount, '-100.00'); // Debit is negative
  assert.equal(result.normalized[1].Amount, '500.00'); // Credit is positive
});

test('normalizeRows - xero-import profile with Payee', () => {
  const rows: RawRow[] = [
    {
      Date: '2024-01-15',
      Amount: '1000.00',
      Payee: 'ACME Corp',
      Description: 'Invoice payment',
      Reference: 'INV-001',
    },
    {
      Date: '2024-01-16',
      Amount: '500.00',
      Payee: 'Yoko',
      Description: '',
      Reference: 'YOC-123',
    },
  ];

  const profile = getProfile('xero-import');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 2);
  assert.equal(result.normalized[0].Description, 'ACME Corp | Invoice payment');
  assert.equal(result.normalized[0].Payee, 'ACME Corp');
  assert.equal(result.normalized[1].Description, 'Yoko');
  assert.equal(result.normalized[1].Payee, 'Yoko');
});

test('normalizeRows - missing date rejects row', () => {
  const rows: RawRow[] = [
    {
      Reference: 'REF001',
      Amount: '100.00',
      Description: 'Test',
    },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.ok(result.rejected[0].reason.includes('missing date'));
});

test('normalizeRows - missing amount rejects row', () => {
  const rows: RawRow[] = [
    {
      Date: '2024-01-15',
      Reference: 'REF001',
      Description: 'Test',
    },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.ok(result.rejected[0].reason.includes('missing or unparseable amount'));
});

test('normalizeRows - fallback reference from description', () => {
  const rows: RawRow[] = [
    {
      Date: '2024-01-15',
      Amount: '100.00',
      Description: 'This is a very long description that will be truncated',
    },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 1);
  assert.ok(result.normalized[0].Reference.length <= 50);
  assert.ok(result.normalized[0].Reference.includes('This is a very long'));
});

test('normalizeRows - date format variations', () => {
  const rows: RawRow[] = [
    { Date: '2024-01-15', Amount: '100', Description: 'Test 1' },
    { Date: '15/01/2024', Amount: '100', Description: 'Test 2' },
    { Date: '15-01-2024', Amount: '100', Description: 'Test 3' },
    { Date: '2024/01/15', Amount: '100', Description: 'Test 4' },
  ];

  const profile = getProfile('generic');
  const result = normalizeRows(rows, profile);

  assert.equal(result.normalized.length, 4);
  result.normalized.forEach(row => {
    assert.equal(row.Date, '2024-01-15');
  });
});
