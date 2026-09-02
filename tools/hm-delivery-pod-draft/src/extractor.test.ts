/**
 * Tests for Heavy Metal delivery POD extractor
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { extractFromText } from './extractor.js';

test('extractFromText - full delivery with signature', () => {
  const text = `Customer: Johan Botha
Phone: 0827654321

Material: Stone
Volume: 15 m³
Location: 45 Industrial Drive, Dullstroom
Date: 2026-09-02 10:15

Vehicle: MP 456 XYZ
Driver: Thabo Mbeki

Signed by: J. Botha`;

  const result = extractFromText(text);

  assert.strictEqual(result.pod.customer, 'Johan Botha');
  assert.strictEqual(result.pod.phone, '0827654321');
  assert.strictEqual(result.pod.material, 'Stone');
  assert.strictEqual(result.pod.volume, 15);
  assert.strictEqual(result.pod.unit, 'm³');
  assert.strictEqual(result.pod.deliveryLocation, '45 Industrial Drive, Dullstroom');
  assert.strictEqual(result.pod.deliveredAt, '2026-09-02 10:15');
  assert.strictEqual(result.pod.vehicle, 'MP 456 XYZ');
  assert.strictEqual(result.pod.driver, 'Thabo Mbeki');
  assert.strictEqual(result.pod.signedBy, 'J. Botha');
  assert.strictEqual(result.missingFields.length, 0);
});

test('extractFromText - unsigned delivery', () => {
  const text = `Maria Fernandes
0834567890

Gravel - 10 tons
Delivered to: 78 Church Street, Lydenburg
2026-08-30

Driver: David Nkosi`;

  const result = extractFromText(text);

  assert.strictEqual(result.pod.customer, 'Maria Fernandes');
  assert.strictEqual(result.pod.phone, '0834567890');
  assert.strictEqual(result.pod.material, 'Gravel');
  assert.strictEqual(result.pod.volume, 10);
  assert.strictEqual(result.pod.unit, 'tons');
  assert.strictEqual(result.pod.deliveryLocation, '78 Church Street, Lydenburg');
  assert.strictEqual(result.pod.driver, 'David Nkosi');
  
  // CRITICAL: signature must be undefined, not invented
  assert.strictEqual(result.pod.signedBy, undefined);
});

test('extractFromText - minimal fields', () => {
  const text = `Customer: Test Customer

Sand 5 m³
Delivered to Dullstroom
2026-09-01`;

  const result = extractFromText(text);

  assert.strictEqual(result.pod.customer, 'Test Customer');
  assert.strictEqual(result.pod.material, 'Sand');
  assert.strictEqual(result.pod.volume, 5);
  assert.strictEqual(result.pod.unit, 'm³');
  assert.strictEqual(result.missingFields.includes('deliveryLocation'), false);
  assert.strictEqual(result.pod.signedBy, undefined); // Not invented
});

test('extractFromText - various volume units', () => {
  const testCases = [
    { text: '12 m³ of sand', expected: { volume: 12, unit: 'm³' } },
    { text: '8 tons of stone', expected: { volume: 8, unit: 'tons' } },
    { text: '3 loads gravel', expected: { volume: 3, unit: 'loads' } },
    { text: '15.5 m3 crusher dust', expected: { volume: 15.5, unit: 'm³' } },
  ];

  for (const tc of testCases) {
    const result = extractFromText(tc.text);
    assert.strictEqual(result.pod.volume, tc.expected.volume, `Failed for: ${tc.text}`);
    assert.strictEqual(result.pod.unit, tc.expected.unit, `Failed for: ${tc.text}`);
  }
});

test('extractFromText - phone number formats', () => {
  const testCases = [
    '+27 82 345 6789',
    '0823456789',
    '+27823456789',
    '082 345 6789',
  ];

  for (const phone of testCases) {
    const result = extractFromText(`Customer: Test\nPhone: ${phone}\nSand 5m³`);
    assert.ok(result.pod.phone, `Failed to extract: ${phone}`);
    assert.ok(result.pod.phone?.includes('82'), `Failed to extract: ${phone}`);
  }
});

test('extractFromText - never invents signature', () => {
  const textsWithoutSignature = [
    'Customer: Test\nSand 5 m³\nDelivered to Dullstroom\n2026-09-01',
    'Delivery: 10 tons stone\nLocation: Farm\nDate: 2026-09-01',
    'Material: Gravel 8m³\nCustomer: John\nDriver: Tom',
  ];

  for (const text of textsWithoutSignature) {
    const result = extractFromText(text);
    assert.strictEqual(result.pod.signedBy, undefined, `Signature must not be invented for: ${text}`);
  }
});
