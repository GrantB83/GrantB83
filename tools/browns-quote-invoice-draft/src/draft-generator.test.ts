import { test } from 'node:test';
import assert from 'node:assert';
import { generateDrafts } from './draft-generator.js';
import type { QuoteInput } from './types.js';

test('generateDrafts with full amounts', () => {
  const input: QuoteInput = {
    guestName: 'John Smith',
    checkInDate: '2026-10-15',
    checkOutDate: '2026-10-18',
    suiteOrUnit: 'Luxury Suite 1',
    adults: 2,
    nights: 3,
    nightlyRate: 2500,
    total: 7500,
    currency: 'ZAR'
  };

  const drafts = generateDrafts(input);

  assert.strictEqual(drafts.manifest.hasAmounts, true);
  assert.ok(drafts.whatsappQuote.includes('R2500.00'));
  assert.ok(drafts.whatsappQuote.includes('R7500.00'));
  assert.ok(drafts.emailQuote.includes('R2500.00'));
  assert.ok(drafts.emailQuote.includes('R7500.00'));
});

test('generateDrafts without amounts - NEVER invents numbers', () => {
  const input: QuoteInput = {
    guestName: 'Jane Doe',
    checkInDate: '2026-11-01',
    checkOutDate: '2026-11-05',
    suiteOrUnit: 'Garden Suite',
    adults: 2
  };

  const drafts = generateDrafts(input);

  assert.strictEqual(drafts.manifest.hasAmounts, false);
  
  // CRITICAL: Must NOT contain any invented amounts
  assert.ok(!drafts.whatsappQuote.match(/R\d+/), 'WhatsApp draft must not invent amounts');
  assert.ok(!drafts.emailQuote.match(/R\d+/), 'Email draft must not invent amounts');
  
  // Should indicate availability confirmation instead
  assert.ok(drafts.whatsappQuote.includes('confirm availability'));
  assert.ok(drafts.emailQuote.includes('confirm availability'));
  
  // Approval should flag missing amounts
  assert.ok(drafts.approval.includes('NO AMOUNTS PROVIDED'));
});

test('generateDrafts with partial amounts - NEVER fills missing values', () => {
  const input: QuoteInput = {
    guestName: 'Bob Johnson',
    checkInDate: '2026-12-20',
    checkOutDate: '2026-12-25',
    suiteOrUnit: 'Presidential Suite',
    adults: 4,
    nightlyRate: 3500
    // Missing: nights, total
  };

  const drafts = generateDrafts(input);

  // Has some amounts but not complete
  assert.strictEqual(drafts.manifest.hasAmounts, true);
  
  // Should not calculate total from nightlyRate
  const totalMatches = drafts.whatsappQuote.match(/Total:.*R(\d+)/);
  if (totalMatches) {
    assert.fail('Should not show total when not provided in input');
  }
});

test('generateDrafts with deposit creates proforma', () => {
  const input: QuoteInput = {
    guestName: 'Alice Brown',
    checkInDate: '2027-01-10',
    checkOutDate: '2027-01-15',
    suiteOrUnit: 'Honeymoon Suite',
    adults: 2,
    nights: 5,
    nightlyRate: 3000,
    total: 15000,
    depositRequired: 7500,
    currency: 'ZAR'
  };

  const drafts = generateDrafts(input);

  assert.ok(drafts.proformaEmail, 'Should generate proforma email when deposit is specified');
  assert.ok(drafts.proformaEmail!.includes('PROFORMA INVOICE'));
  assert.ok(drafts.proformaEmail!.includes('R7500.00'));
  assert.strictEqual(drafts.manifest.includesProforma, true);
});

test('generateDrafts without deposit and no includeProforma flag', () => {
  const input: QuoteInput = {
    guestName: 'Chris Davis',
    checkInDate: '2027-02-14',
    checkOutDate: '2027-02-16',
    suiteOrUnit: 'Standard Suite',
    adults: 2,
    nights: 2,
    nightlyRate: 2000,
    total: 4000,
    currency: 'ZAR'
  };

  const drafts = generateDrafts(input);

  assert.strictEqual(drafts.proformaEmail, undefined);
  assert.strictEqual(drafts.manifest.includesProforma, false);
});

test('generateDrafts with explicit includeProforma but no amounts', () => {
  const input: QuoteInput = {
    guestName: 'Diana Evans',
    checkInDate: '2027-03-20',
    checkOutDate: '2027-03-25',
    suiteOrUnit: 'Deluxe Suite',
    adults: 2,
    includeProforma: true
  };

  const drafts = generateDrafts(input);

  assert.ok(drafts.proformaEmail, 'Should generate proforma when explicitly requested');
  assert.ok(!drafts.proformaEmail!.match(/R\d+/), 'Proforma should not invent amounts');
  assert.ok(drafts.proformaEmail!.includes('provide the detailed pricing'));
});

test('all drafts include property name', () => {
  const input: QuoteInput = {
    guestName: 'Test Guest',
    checkInDate: '2027-04-01',
    checkOutDate: '2027-04-03',
    suiteOrUnit: 'Test Suite'
  };

  const drafts = generateDrafts(input);
  const propertyName = 'The Browns Luxury Guest Suites Dullstroom';

  assert.ok(drafts.whatsappQuote.includes(propertyName));
  assert.ok(drafts.emailQuote.includes(propertyName));
});

test('approval document always generated', () => {
  const input: QuoteInput = {
    guestName: 'Final Test',
    checkInDate: '2027-05-01',
    checkOutDate: '2027-05-05',
    suiteOrUnit: 'Final Suite'
  };

  const drafts = generateDrafts(input);

  assert.ok(drafts.approval.includes('APPROVAL REQUIRED'));
  assert.ok(drafts.approval.includes('NEVER SEND WITHOUT EXPLICIT APPROVAL'));
  assert.ok(drafts.approval.includes(input.guestName));
});
