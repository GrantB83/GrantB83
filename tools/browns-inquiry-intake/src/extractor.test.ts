/**
 * Tests for inquiry extraction logic
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { extractInquiry, validateExtraction } from './extractor.js';

test('extractInquiry: extracts guest name from labeled field', () => {
  const text = `Name: John Smith
Check-in: 2026-09-15
Check-out: 2026-09-17`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.guestName, 'John Smith');
});

test('extractInquiry: extracts dates in YYYY-MM-DD format', () => {
  const text = `Booking inquiry
Check-in: 2026-09-15
Check-out: 2026-09-17`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.checkInDate, '2026-09-15');
  assert.strictEqual(result.booking.checkOutDate, '2026-09-17');
});

test('extractInquiry: extracts adults and children', () => {
  const text = `2 adults and 1 child`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.adults, 2);
  assert.strictEqual(result.booking.children, 1);
});

test('extractInquiry: detects late check-in', () => {
  const text = `We will be arriving late, around 9pm`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.lateCheckIn, true);
});

test('extractInquiry: detects email channel', () => {
  const text = `From: guest@example.com
Subject: Booking inquiry`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.channel, 'email');
});

test('extractInquiry: detects WhatsApp channel', () => {
  const text = `WhatsApp message from +27 82 123 4567`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.channel, 'whatsapp');
});

test('extractInquiry: extracts deposit amount with currency', () => {
  const text = `Deposit: R2500
Total: R5000`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.depositAmount, 2500);
  assert.strictEqual(result.booking.totalAmount, 5000);
  assert.strictEqual(result.booking.currency, 'ZAR');
});

test('extractInquiry: does NOT invent amounts when missing', () => {
  const text = `Check-in: 2026-09-15
Check-out: 2026-09-17
2 adults`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.depositAmount, undefined);
  assert.strictEqual(result.booking.totalAmount, undefined);
  assert.strictEqual(result.quote.quoteAmount, undefined);
});

test('extractInquiry: extracts quote amount', () => {
  const text = `Quote: R3500 per night`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.quote.quoteAmount, 3500);
});

test('extractInquiry: tracks missing required fields', () => {
  const text = `Just a vague inquiry about availability`;
  
  const result = extractInquiry(text);
  assert.ok(result.missingFields.includes('guestName'));
  assert.ok(result.missingFields.includes('checkInDate'));
  assert.ok(result.missingFields.includes('checkOutDate'));
  assert.ok(result.missingFields.includes('adults'));
});

test('extractInquiry: extracts suite/unit information', () => {
  const text = `Suite: Garden Suite
Check-in: 2026-09-15`;
  
  const result = extractInquiry(text);
  assert.strictEqual(result.booking.suiteOrUnit, 'Garden Suite');
});

test('validateExtraction: warns when amounts are present', () => {
  const text = `Deposit: R2500`;
  const result = extractInquiry(text);
  const validation = validateExtraction(result);
  
  const hasAmountWarning = validation.warnings.some(w => 
    w.includes('Amounts were extracted')
  );
  assert.ok(hasAmountWarning);
});

test('validateExtraction: warns about missing fields', () => {
  const text = `Just checking availability`;
  const result = extractInquiry(text);
  const validation = validateExtraction(result);
  
  const hasMissingFieldsWarning = validation.warnings.some(w => 
    w.includes('Missing required fields')
  );
  assert.ok(hasMissingFieldsWarning);
});

test('extractInquiry: handles DD/MM/YYYY date format', () => {
  const text = `Check-in: 15/09/2026
Check-out: 17/09/2026`;
  
  const result = extractInquiry(text);
  assert.ok(result.booking.checkInDate);
  assert.ok(result.booking.checkOutDate);
});

test('extractInquiry: handles text date format', () => {
  const text = `Arriving September 15, 2026
Leaving September 17`;
  
  const result = extractInquiry(text);
  assert.ok(result.booking.checkInDate?.includes('September'));
  assert.ok(result.booking.checkOutDate?.includes('September'));
});

test('extractInquiry: never invents rates - safety test', () => {
  const text = `Name: Test Guest
Check-in: 2026-09-15
Check-out: 2026-09-17
2 adults
Garden Suite`;
  
  const result = extractInquiry(text);
  
  // CRITICAL: No amounts should be present
  assert.strictEqual(result.booking.depositAmount, undefined, 'Must not invent deposit');
  assert.strictEqual(result.booking.totalAmount, undefined, 'Must not invent total');
  assert.strictEqual(result.quote.quoteAmount, undefined, 'Must not invent quote amount');
  
  // All other fields should be present
  assert.ok(result.booking.guestName);
  assert.ok(result.booking.checkInDate);
  assert.ok(result.booking.checkOutDate);
  assert.ok(result.booking.adults);
});
