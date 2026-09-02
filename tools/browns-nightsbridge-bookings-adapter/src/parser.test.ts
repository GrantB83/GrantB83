import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectDelimiter, normalizeHeader, parseText } from './parser.js';

describe('detectDelimiter', () => {
  it('should detect comma delimiter', () => {
    const text = 'name,suite,date\nJohn,Suite 1,2026-09-20';
    assert.strictEqual(detectDelimiter(text), ',');
  });
  
  it('should detect tab delimiter', () => {
    const text = 'name\tsuite\tdate\nJohn\tSuite 1\t2026-09-20';
    assert.strictEqual(detectDelimiter(text), '\t');
  });
  
  it('should default to comma when ambiguous', () => {
    const text = 'name';
    assert.strictEqual(detectDelimiter(text), ',');
  });
});

describe('normalizeHeader', () => {
  it('should normalize guest name aliases', () => {
    assert.strictEqual(normalizeHeader('Guest Name'), 'guestName');
    assert.strictEqual(normalizeHeader('guest'), 'guestName');
    assert.strictEqual(normalizeHeader('NAME'), 'guestName');
  });
  
  it('should normalize suite aliases', () => {
    assert.strictEqual(normalizeHeader('Suite'), 'suiteOrUnit');
    assert.strictEqual(normalizeHeader('room'), 'suiteOrUnit');
    assert.strictEqual(normalizeHeader('Unit'), 'suiteOrUnit');
  });
  
  it('should normalize date aliases', () => {
    assert.strictEqual(normalizeHeader('Check-in'), 'checkInDate');
    assert.strictEqual(normalizeHeader('arrive'), 'checkInDate');
    assert.strictEqual(normalizeHeader('Check-out'), 'checkOutDate');
    assert.strictEqual(normalizeHeader('depart'), 'checkOutDate');
  });
  
  it('should normalize notes aliases', () => {
    assert.strictEqual(normalizeHeader('notes'), 'notes');
    assert.strictEqual(normalizeHeader('comments'), 'notes');
    assert.strictEqual(normalizeHeader('Special Requests'), 'notes');
  });
  
  it('should normalize late check-in aliases', () => {
    assert.strictEqual(normalizeHeader('late'), 'lateCheckIn');
    assert.strictEqual(normalizeHeader('Late Arrival'), 'lateCheckIn');
  });
  
  it('should return original if no alias match', () => {
    assert.strictEqual(normalizeHeader('unknownField'), 'unknownField');
  });
});

describe('parseText', () => {
  it('should parse CSV with headers and data', () => {
    const text = `name,suite,status
John Doe,Suite 1,arriving
Jane Smith,Suite 2,departing`;
    
    const result = parseText(text);
    
    assert.strictEqual(result.delimiter, ',');
    assert.strictEqual(result.headers.length, 3);
    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(result.rows[0].guestName, 'John Doe');
    assert.strictEqual(result.rows[0].suiteOrUnit, 'Suite 1');
    assert.strictEqual(result.rows[1].guestName, 'Jane Smith');
  });
  
  it('should parse TSV with headers and data', () => {
    const text = `name\tsuite\tstatus
John Doe\tSuite 1\tarriving`;
    
    const result = parseText(text);
    
    assert.strictEqual(result.delimiter, '\t');
    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(result.rows[0].guestName, 'John Doe');
  });
  
  it('should skip empty lines', () => {
    const text = `name,suite

John Doe,Suite 1

Jane Smith,Suite 2`;
    
    const result = parseText(text);
    
    assert.strictEqual(result.rows.length, 2);
  });
  
  it('should throw on empty input', () => {
    assert.throws(() => parseText(''), /Input is empty/);
    assert.throws(() => parseText('   \n\n  '), /Input is empty/);
  });
});
