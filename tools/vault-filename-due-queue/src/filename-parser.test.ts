import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { parseFilename } from './filename-parser.js';

describe('parseFilename', () => {
  test('CIPC annual return with date', () => {
    const result = parseFilename('CIPC-Annual-Return-2024-AR2024-GABTrust.pdf');
    
    assert.equal(result.category, 'cipc-annual-return');
    assert.equal(result.dueStatus, 'has-date');
    assert.equal(result.dateTokens.length, 1);
    assert.ok(result.dateTokens.includes('2024'));
    assert.equal(result.confidence, 'high');
  });

  test('SARS provisional tax with date', () => {
    const result = parseFilename('SARS-ITR14-Provisional-Tax-2024-06-30.pdf');
    
    assert.equal(result.category, 'sars-provisional-tax');
    assert.equal(result.dueStatus, 'has-date');
    assert.ok(result.dateTokens.includes('2024-06-30'));
    assert.equal(result.confidence, 'high');
  });

  test('Trust resolution without date', () => {
    const result = parseFilename('GAB-Trust-Resolution-Board-Meeting.pdf');
    
    assert.equal(result.category, 'trust-resolution');
    assert.equal(result.dueStatus, 'no-date-pattern');
    assert.equal(result.dateTokens.length, 0);
  });

  test('BEE affidavit with date', () => {
    const result = parseFilename('BEE-Affidavit-2024-Heavy-Metal.pdf');
    
    assert.equal(result.category, 'bee-affidavit');
    assert.equal(result.dueStatus, 'has-date');
    assert.ok(result.dateTokens.includes('2024'));
  });

  test('Property rates with due keyword but no date', () => {
    const result = parseFilename('Municipal-Rates-Due-Invoice.pdf');
    
    assert.equal(result.category, 'property-rates');
    assert.equal(result.dueStatus, 'unknown-due');
    assert.equal(result.dateTokens.length, 0);
  });

  test('Unknown category with no signals', () => {
    const result = parseFilename('random-document-xyz.pdf');
    
    assert.equal(result.category, 'unknown');
    assert.equal(result.dueStatus, 'no-date-pattern');
    assert.equal(result.dateTokens.length, 0);
    assert.equal(result.confidence, 'low');
  });

  test('VAT return with date', () => {
    const result = parseFilename('VAT201-Return-2024-03.pdf');
    
    assert.equal(result.category, 'sars-vat-return');
    assert.equal(result.dueStatus, 'has-date');
    assert.ok(result.dateTokens.includes('2024-03'));
  });

  test('Insurance renewal with compact date', () => {
    const result = parseFilename('Insurance-Renewal-Notice-20241215.pdf');
    
    assert.equal(result.category, 'insurance-renewal');
    assert.equal(result.dueStatus, 'has-date');
    assert.ok(result.dateTokens.includes('2024-12-15'));
  });

  test('Attorney letter with European date format', () => {
    const result = parseFilename('Attorney-Letter-15-03-2024-Plimmer.pdf');
    
    assert.equal(result.category, 'attorney-letter');
    assert.equal(result.dueStatus, 'has-date');
    assert.ok(result.dateTokens.includes('2024-03-15'));
  });

  test('CIPC certificate without date', () => {
    const result = parseFilename('CIPC-Certificate-Good-Standing-GABTrust.pdf');
    
    assert.equal(result.category, 'cipc-certificate');
    assert.equal(result.dueStatus, 'no-date-pattern');
  });

  test('EMP return with date', () => {
    const result = parseFilename('EMP201-Return-2024-04.pdf');
    
    assert.equal(result.category, 'sars-emp-return');
    assert.equal(result.dueStatus, 'has-date');
    assert.ok(result.dateTokens.includes('2024-04'));
  });

  test('Forex application', () => {
    const result = parseFilename('Forex-SDA-Application-2024-05.pdf');
    
    assert.equal(result.category, 'forex-application');
    assert.equal(result.dueStatus, 'has-date');
    assert.ok(result.dateTokens.includes('2024-05'));
  });
});
