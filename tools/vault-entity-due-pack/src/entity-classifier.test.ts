import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyEntity } from './entity-classifier.js';

test('classifyEntity - GAB Trust keywords', () => {
  assert.equal(classifyEntity('CIPC-Annual-Return-2024-GABTrust.pdf'), 'gab-trust');
  assert.equal(classifyEntity('Trust-Distribution-GAB-2024.pdf'), 'gab-trust');
  assert.equal(classifyEntity('gab-trust-resolution.pdf'), 'gab-trust');
});

test('classifyEntity - B Group keywords', () => {
  assert.equal(classifyEntity('SARS-VAT-BGroup-Holdings-2024.pdf'), 'b-group');
  assert.equal(classifyEntity('CIPC-Certificate-B-Group-Holdings.pdf'), 'b-group');
  assert.equal(classifyEntity('BVR-Enterprises-Invoice.pdf'), 'b-group');
});

test('classifyEntity - CIPC keyword', () => {
  assert.equal(classifyEntity('CIPC-Annual-Return-2024.pdf'), 'cipc');
  assert.equal(classifyEntity('cipc-certificate.pdf'), 'cipc');
});

test('classifyEntity - SARS keywords', () => {
  assert.equal(classifyEntity('SARS-Tax-Clearance-Letter.pdf'), 'sars');
  assert.equal(classifyEntity('Tax-Return-2024.pdf'), 'sars');
});

test('classifyEntity - Plimmer keyword', () => {
  assert.equal(classifyEntity('Attorney-Letter-Plimmer-Estate.pdf'), 'plimmer');
  assert.equal(classifyEntity('plimmer-property-rates.pdf'), 'plimmer');
});

test('classifyEntity - Charisse keyword', () => {
  assert.equal(classifyEntity('Municipal-Rates-Charisse-Property.pdf'), 'charisse');
  assert.equal(classifyEntity('charisse-invoice.pdf'), 'charisse');
});

test('classifyEntity - Unknown (no matches)', () => {
  assert.equal(classifyEntity('random-document-xyz.pdf'), 'unknown');
  assert.equal(classifyEntity('invoice-12345.pdf'), 'unknown');
});

test('classifyEntity - Case insensitive', () => {
  assert.equal(classifyEntity('GAB-TRUST-DOCUMENT.PDF'), 'gab-trust');
  assert.equal(classifyEntity('sars-tax-return.PDF'), 'sars');
});

test('classifyEntity - First match wins (priority)', () => {
  // "trust" and "gab" should match gab-trust
  assert.equal(classifyEntity('GAB-Trust-CIPC-Filing.pdf'), 'gab-trust');
  
  // If only "sars" appears, should match sars
  assert.equal(classifyEntity('SARS-Letter.pdf'), 'sars');
});

test('classifyEntity - Custom mappings', () => {
  const customMappings: Record<string, 'gab-trust' | 'b-group' | 'unknown'> = {
    'acme': 'gab-trust',
    'widgets': 'b-group'
  };
  
  assert.equal(classifyEntity('Acme-Corporation-Invoice.pdf', customMappings as any), 'gab-trust');
  assert.equal(classifyEntity('Widgets-Ltd-Statement.pdf', customMappings as any), 'b-group');
  assert.equal(classifyEntity('Random-Document.pdf', customMappings as any), 'unknown');
});
