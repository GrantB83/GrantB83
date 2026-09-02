import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { detectDelimiter } from './csv-parser.js';

test('detectDelimiter - comma', () => {
  const line = 'Store,SKU/Item,ReceivedQty,Unit';
  assert.equal(detectDelimiter(line), ',');
});

test('detectDelimiter - semicolon', () => {
  const line = 'Store;SKU/Item;ReceivedQty;Unit';
  assert.equal(detectDelimiter(line), ';');
});

test('detectDelimiter - tab', () => {
  const line = 'Store\tSKU/Item\tReceivedQty\tUnit';
  assert.equal(detectDelimiter(line), '\t');
});

test('detectDelimiter - defaults to comma', () => {
  const line = 'Store SKU/Item ReceivedQty Unit';
  assert.equal(detectDelimiter(line), ',');
});
