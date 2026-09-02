import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseCSV } from './csv-parser.js';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './test-temp';

test('parseCSV - basic CSV parsing', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'basic.csv');
  
  const csv = `Date,Amount,Merchant
2024-01-15,100.00,Store A
2024-01-16,50.00,Store B`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = parseCSV(testFile);
    
    assert.deepEqual(result.headers, ['Date', 'Amount', 'Merchant']);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].Date, '2024-01-15');
    assert.equal(result.rows[0].Amount, '100.00');
    assert.equal(result.rows[1].Merchant, 'Store B');
  } finally {
    unlinkSync(testFile);
  }
});

test('parseCSV - handles quoted fields with commas', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'quoted.csv');
  
  const csv = `Name,Description
"Smith, John","Senior Manager, Sales"
"Doe, Jane","Developer, Backend"`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = parseCSV(testFile);
    
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].Name, 'Smith, John');
    assert.equal(result.rows[0].Description, 'Senior Manager, Sales');
  } finally {
    unlinkSync(testFile);
  }
});

test('parseCSV - handles empty cells', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'empty.csv');
  
  const csv = `A,B,C
1,,3
,2,
,,`;
  
  writeFileSync(testFile, csv);
  
  try {
    const result = parseCSV(testFile);
    
    assert.equal(result.rows.length, 3);
    assert.equal(result.rows[0].B, '');
    assert.equal(result.rows[1].A, '');
    assert.equal(result.rows[2].C, '');
  } finally {
    unlinkSync(testFile);
  }
});

test('parseCSV - throws on empty file', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'empty-file.csv');
  
  writeFileSync(testFile, '');
  
  try {
    assert.throws(() => {
      parseCSV(testFile);
    }, /CSV file is empty/);
  } finally {
    unlinkSync(testFile);
  }
});

test('parseCSV - handles Windows line endings', () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, 'windows.csv');
  
  const csv = 'A,B\r\n1,2\r\n3,4';
  
  writeFileSync(testFile, csv);
  
  try {
    const result = parseCSV(testFile);
    
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].A, '1');
    assert.equal(result.rows[1].B, '4');
  } finally {
    unlinkSync(testFile);
  }
});
