import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateCSV } from './validator.js';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './test-temp';

test('validateCSV - passes with valid CSV', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'valid.csv');
  
  const csv = `Date,Amount,Merchant
2024-01-15,100.00,Store A
2024-01-16,50.00,Store B
2024-01-17,75.00,Store C`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = validateCSV({
      csvPath: testFile,
      requireHeaders: ['Date', 'Amount'],
      minRows: 2,
      outdir: './out',
    });
    
    assert.equal(result.passed, true);
    assert.equal(result.totalRows, 3);
    assert.equal(result.errors.length, 0);
  } finally {
    unlinkSync(testFile);
  }
});

test('validateCSV - fails on missing required headers', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'missing-headers.csv');
  
  const csv = `Date,Merchant
2024-01-15,Store A`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = validateCSV({
      csvPath: testFile,
      requireHeaders: ['Date', 'Amount', 'Category'],
      outdir: './out',
    });
    
    assert.equal(result.passed, false);
    assert.deepEqual(result.missingHeaders, ['Amount', 'Category']);
    assert.ok(result.errors.some(e => e.includes('Missing required headers')));
  } finally {
    unlinkSync(testFile);
  }
});

test('validateCSV - fails on insufficient rows', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'few-rows.csv');
  
  const csv = `Date,Amount
2024-01-15,100.00`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = validateCSV({
      csvPath: testFile,
      minRows: 5,
      outdir: './out',
    });
    
    assert.equal(result.passed, false);
    assert.equal(result.minRowsCheck.passed, false);
    assert.ok(result.errors.some(e => e.includes('Insufficient rows')));
  } finally {
    unlinkSync(testFile);
  }
});

test('validateCSV - detects blank columns', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'blanks.csv');
  
  const csv = `A,B,C
1,,3
2,,4
3,,5
4,,6`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = validateCSV({
      csvPath: testFile,
      outdir: './out',
    });
    
    const colBStats = result.columnStats.find(s => s.columnName === 'B');
    assert.ok(colBStats);
    assert.equal(colBStats.blankPercentage, 100);
    assert.ok(result.warnings.some(w => w.includes('Column "B"') && w.includes('100.0% blank')));
  } finally {
    unlinkSync(testFile);
  }
});

test('validateCSV - detects currency violations', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'currency.csv');
  
  const csv = `Date,Notes,Amount
2024-01-15,Should be empty,100.00
2024-01-16,$50 here,200.00
2024-01-17,R75 payment,300.00
2024-01-18,ZAR 100,400.00`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = validateCSV({
      csvPath: testFile,
      forbidCurrencyIn: ['Notes'],
      outdir: './out',
    });
    
    assert.equal(result.passed, false);
    
    const notesStats = result.columnStats.find(s => s.columnName === 'Notes');
    assert.ok(notesStats);
    assert.ok(notesStats.currencyViolations);
    assert.equal(notesStats.currencyViolations.length, 3);
    
    assert.ok(result.errors.some(e => e.includes('Column "Notes"') && e.includes('currency-like values')));
  } finally {
    unlinkSync(testFile);
  }
});

test('validateCSV - currency check ignores empty cells', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'currency-empty.csv');
  
  const csv = `Date,Notes
2024-01-15,
2024-01-16,
2024-01-17,Valid text`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = validateCSV({
      csvPath: testFile,
      forbidCurrencyIn: ['Notes'],
      outdir: './out',
    });

    assert.equal(result.passed, true);
    
    const notesStats = result.columnStats.find(s => s.columnName === 'Notes');
    assert.ok(notesStats);
    assert.equal(notesStats.currencyViolations, undefined);
  } finally {
    unlinkSync(testFile);
  }
});

test('validateCSV - case-insensitive header matching', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'case.csv');
  
  const csv = `date,AMOUNT,Merchant
2024-01-15,100.00,Store`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = validateCSV({
      csvPath: testFile,
      requireHeaders: ['Date', 'Amount'],
      outdir: './out',
    });

    assert.equal(result.passed, true);
    assert.equal(result.missingHeaders.length, 0);
  } finally {
    unlinkSync(testFile);
  }
});
