import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractDueDateSignals, parseInputFile } from './parser.js';

test('extractDueDateSignals - ISO date', () => {
  const text = 'Early dismissal on 2026-09-20';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.dueDate, '2026-09-20');
  assert.equal(result.confidence, 'high');
  assert.ok(result.signals.includes('iso-date:2026-09-20'));
});

test('extractDueDateSignals - US date MM/DD/YYYY', () => {
  const text = 'Permission slip due 09/15/2026';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.dueDate, '2026-09-15');
  assert.equal(result.confidence, 'high');
  assert.ok(result.signals.some(s => s.startsWith('us-date:')));
});

test('extractDueDateSignals - US date M/D with current year', () => {
  const text = 'Form deadline 9/6';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.dueDate, '2026-09-06');
  assert.equal(result.confidence, 'high');
});

test('extractDueDateSignals - due Friday', () => {
  const text = 'Permission slip due Friday';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.ok(result.dueDate);
  assert.equal(result.confidence, 'medium');
  assert.ok(result.signals.some(s => s.includes('friday')));
});

test('extractDueDateSignals - permission slip keyword', () => {
  const text = 'Permission slip for field trip';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.confidence, 'medium');
  assert.ok(result.signals.some(s => s.includes('permission slip')));
});

test('extractDueDateSignals - RSVP keyword', () => {
  const text = 'RSVP for school assembly';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.confidence, 'medium');
  assert.ok(result.signals.some(s => s.includes('rsvp')));
});

test('extractDueDateSignals - form keyword', () => {
  const text = 'Emergency contact form';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.confidence, 'medium');
  assert.ok(result.signals.some(s => s.includes('form')));
});

test('extractDueDateSignals - no signals', () => {
  const text = 'School newsletter for parents';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.signals.length, 0);
  assert.equal(result.confidence, 'low');
  assert.equal(result.dueDate, undefined);
});

test('extractDueDateSignals - detects filename source', () => {
  const text = 'permission-slip.pdf';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.source, 'filename');
});

test('extractDueDateSignals - detects subject source', () => {
  const text = 'Permission slip due Friday';
  const asOf = new Date('2026-09-02');
  const result = extractDueDateSignals(text, asOf);
  
  assert.equal(result.source, 'subject');
});

test('parseInputFile - filters empty lines and comments', () => {
  const content = `
# Comment line
valid line 1

valid line 2
  # Another comment
  
valid line 3
`;
  const result = parseInputFile(content);
  
  assert.equal(result.length, 3);
  assert.deepEqual(result, ['valid line 1', 'valid line 2', 'valid line 3']);
});

test('parseInputFile - handles empty file', () => {
  const content = '';
  const result = parseInputFile(content);
  
  assert.equal(result.length, 0);
});
