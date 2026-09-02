/**
 * Tests for Heavy Metal quote extractor
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractQuote } from './extractor.js';

test('extractQuote - full inquiry with all fields', () => {
  const text = `
Name: John Smith
Phone: 0823456789

I need 10 m³ of sand delivered to Dullstroom.
Date needed: 2026-09-15

Thanks
  `;

  const result = extractQuote(text);

  assert.equal(result.quote.customerName, 'John Smith');
  assert.equal(result.quote.customerPhone, '0823456789');
  assert.ok(result.quote.materials?.includes('Sand'));
  assert.equal(result.quote.volume, 10);
  assert.equal(result.quote.volumeUnit, 'm³');
  assert.equal(result.quote.deliveryLocation, 'Dullstroom');
  assert.equal(result.quote.dateNeeded, '2026-09-15');
});

test('extractQuote - inquiry with pricing', () => {
  const text = `
Customer: Jane Doe
Contact: +27823456789

5 ton of crusher dust
Delivery: Belfast
Price: R500 per ton
Total: R2500
  `;

  const result = extractQuote(text);

  assert.equal(result.quote.customerName, 'Jane Doe');
  assert.equal(result.quote.customerPhone, '+27823456789');
  assert.ok(result.quote.materials?.includes('Crusher dust'));
  assert.equal(result.quote.volume, 5);
  assert.equal(result.quote.volumeUnit, 'ton');
  assert.equal(result.quote.deliveryLocation, 'Belfast');
  assert.equal(result.quote.pricePerUnit, 500);
  assert.equal(result.quote.totalPrice, 2500);
  assert.equal(result.quote.currency, 'ZAR');
});

test('extractQuote - minimal inquiry with missing fields', () => {
  const text = `
Need some gravel for a project
  `;

  const result = extractQuote(text);

  assert.ok(result.quote.materials?.includes('Gravel'));
  assert.ok(result.missingFields.includes('customerName'));
  assert.ok(result.missingFields.includes('customerPhone'));
  assert.ok(result.missingFields.includes('volume'));
  assert.ok(result.missingFields.includes('deliveryLocation'));
});

test('extractQuote - multiple materials', () => {
  const text = `
Name: Bob Builder
Phone: 0821234567

Need sand and stone, 15 m3 total
Deliver to Machadodorp
Date: 20/09/2026
  `;

  const result = extractQuote(text);

  assert.equal(result.quote.customerName, 'Bob Builder');
  assert.ok(result.quote.materials?.includes('Sand'));
  assert.ok(result.quote.materials?.includes('Stone'));
  assert.equal(result.quote.volume, 15);
  assert.equal(result.quote.deliveryLocation, 'Machadodorp');
});

test('extractQuote - no pricing should not invent', () => {
  const text = `
Name: Test User
Phone: 0829999999

10 loads of gravel to Lydenburg
Date needed: tomorrow
  `;

  const result = extractQuote(text);

  assert.equal(result.quote.pricePerUnit, undefined);
  assert.equal(result.quote.totalPrice, undefined);
});
