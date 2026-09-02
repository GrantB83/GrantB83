/**
 * Tests for classifier module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { classifySubject, extractDueDate, hasActionVerb } from './classifier.js';

test('classifySubject - school items', () => {
  assert.strictEqual(classifySubject('AISD School Closure Notice'), 'school');
  assert.strictEqual(classifySubject('Homework due Friday'), 'school');
  assert.strictEqual(classifySubject('PTA Meeting Reminder'), 'school');
  assert.strictEqual(classifySubject('Report Card Available on Skyward'), 'school');
  assert.strictEqual(classifySubject('Bus route changes'), 'school');
});

test('classifySubject - forms items', () => {
  assert.strictEqual(classifySubject('Permission form required'), 'forms');
  assert.strictEqual(classifySubject('Consent form needed'), 'forms');
  assert.strictEqual(classifySubject('Sign and return document'), 'forms');
});

test('classifySubject - calendar items', () => {
  assert.strictEqual(classifySubject('Calendar reminder for appointment'), 'calendar');
  assert.strictEqual(classifySubject('RSVP for event'), 'calendar');
  assert.strictEqual(classifySubject('Meeting scheduled for Monday'), 'calendar');
});

test('classifySubject - payment items', () => {
  assert.strictEqual(classifySubject('Payment due for camp'), 'payment');
  assert.strictEqual(classifySubject('Invoice #1234'), 'payment');
  assert.strictEqual(classifySubject('Balance of $50 due'), 'payment');
});

test('classifySubject - sports items', () => {
  assert.strictEqual(classifySubject('Soccer practice schedule'), 'sports');
  assert.strictEqual(classifySubject('Basketball game on Saturday'), 'sports');
  assert.strictEqual(classifySubject('Team photo day'), 'sports');
});

test('classifySubject - other items', () => {
  assert.strictEqual(classifySubject('General announcement'), 'other');
  assert.strictEqual(classifySubject('Newsletter for September'), 'other');
});

test('classifySubject - school takes priority', () => {
  // School keyword should take priority over other categories
  assert.strictEqual(classifySubject('School payment due'), 'school');
  assert.strictEqual(classifySubject('AISD calendar update'), 'school');
});

test('extractDueDate - finds dates', () => {
  assert.strictEqual(extractDueDate('Due by 9/15/2026'), '9/15/2026');
  assert.strictEqual(extractDueDate('Payment due 9/15'), '9/15');
  assert.strictEqual(extractDueDate('Deadline: 9/15/26'), '9/15/26');
  assert.strictEqual(extractDueDate('9/15/2026 deadline'), '9/15/2026');
});

test('extractDueDate - no date present', () => {
  assert.strictEqual(extractDueDate('General announcement'), undefined);
  assert.strictEqual(extractDueDate('Payment required'), undefined);
});

test('hasActionVerb - detects action verbs', () => {
  assert.strictEqual(hasActionVerb('Submit your form'), true);
  assert.strictEqual(hasActionVerb('Sign and return'), true);
  assert.strictEqual(hasActionVerb('Pay by Friday'), true);
  assert.strictEqual(hasActionVerb('Complete the survey'), true);
  assert.strictEqual(hasActionVerb('RSVP for event'), true);
});

test('hasActionVerb - no action verb', () => {
  assert.strictEqual(hasActionVerb('General announcement'), false);
  assert.strictEqual(hasActionVerb('Newsletter for September'), false);
  assert.strictEqual(hasActionVerb('Information about schedule'), false);
});
