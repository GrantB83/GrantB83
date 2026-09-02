/**
 * Tests for parser module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { parseInput } from './parser.js';

test('parseInput - simple line format', () => {
  const input = `AISD School Closure Notice
Parent-Teacher Conference Sign Up
Payment due for summer camp`;
  
  const items = parseInput(input);
  
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].n, 1);
  assert.strictEqual(items[0].subject, 'AISD School Closure Notice');
  assert.strictEqual(items[0].tag, 'school');
  
  assert.strictEqual(items[1].n, 2);
  assert.strictEqual(items[1].subject, 'Parent-Teacher Conference Sign Up');
  
  assert.strictEqual(items[2].n, 3);
  assert.strictEqual(items[2].subject, 'Payment due for summer camp');
  assert.strictEqual(items[2].tag, 'payment');
});

test('parseInput - subject with snippet', () => {
  const input = `AISD Bus Schedule | Route changes effective Monday
Report Card Available | View on Skyward`;
  
  const items = parseInput(input);
  
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].subject, 'AISD Bus Schedule');
  assert.strictEqual(items[0].snippet, 'Route changes effective Monday');
  
  assert.strictEqual(items[1].subject, 'Report Card Available');
  assert.strictEqual(items[1].snippet, 'View on Skyward');
});

test('parseInput - markdown bullet list', () => {
  const input = `- AISD School Closure Notice
- Parent-Teacher Conference Sign Up
* Payment due for summer camp`;
  
  const items = parseInput(input);
  
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].subject, 'AISD School Closure Notice');
  assert.strictEqual(items[1].subject, 'Parent-Teacher Conference Sign Up');
  assert.strictEqual(items[2].subject, 'Payment due for summer camp');
});

test('parseInput - extracts due dates', () => {
  const input = `Payment due by 9/15/2026
Form submission | Deadline: 9/20/2026`;
  
  const items = parseInput(input);
  
  assert.strictEqual(items[0].dueDate, '9/15/2026');
  assert.strictEqual(items[1].dueDate, '9/20/2026');
});

test('parseInput - skips empty lines and headers', () => {
  const input = `# School Items

AISD School Closure Notice

Parent-Teacher Conference Sign Up

# Admin Items
Payment due for summer camp`;
  
  const items = parseInput(input);
  
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].subject, 'AISD School Closure Notice');
  assert.strictEqual(items[1].subject, 'Parent-Teacher Conference Sign Up');
  assert.strictEqual(items[2].subject, 'Payment due for summer camp');
});

test('parseInput - notes for missing action verbs', () => {
  const input = `General announcement
Submit your form`;
  
  const items = parseInput(input);
  
  assert.strictEqual(items[0].notes?.includes('No clear action verb'), true);
  assert.strictEqual(items[1].notes, undefined);
});
