/**
 * Tests for pack-builder
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { splitSections, formatItem, generateSchoolMarkdown, generateFamilyMarkdown, generatePackIndex } from './pack-builder.js';
import { DigestItem } from './types.js';

test('splitSections separates school and family items', () => {
  const items: DigestItem[] = [
    { n: 1, tag: 'school', subject: 'AISD Bus Schedule' },
    { n: 2, tag: 'payment', subject: 'Credit Card Bill Due' },
    { n: 3, tag: 'school', subject: 'Parent Teacher Conference' },
    { n: 4, tag: 'other', subject: 'Package Delivery' },
  ];

  const { school, family } = splitSections(items);

  assert.strictEqual(school.length, 2);
  assert.strictEqual(family.length, 2);
  assert.strictEqual(school[0].subject, 'AISD Bus Schedule');
  assert.strictEqual(family[0].subject, 'Credit Card Bill Due');
});

test('formatItem creates numbered line', () => {
  const item: DigestItem = {
    n: 1,
    tag: 'school',
    subject: 'AISD School Closure',
  };

  const line = formatItem(item);
  assert.strictEqual(line, '1. AISD School Closure');
});

test('formatItem includes snippet', () => {
  const item: DigestItem = {
    n: 2,
    tag: 'school',
    subject: 'Bus Schedule',
    snippet: 'Route changes Monday',
  };

  const line = formatItem(item);
  assert.strictEqual(line, '2. Bus Schedule — Route changes Monday');
});

test('formatItem includes due date', () => {
  const item: DigestItem = {
    n: 3,
    tag: 'payment',
    subject: 'Credit Card Bill',
    dueDate: '9/15/2026',
  };

  const line = formatItem(item);
  assert.strictEqual(line, '3. Credit Card Bill (Due: 9/15/2026)');
});

test('formatItem includes both snippet and due date', () => {
  const item: DigestItem = {
    n: 4,
    tag: 'school',
    subject: 'Permission Slip',
    snippet: 'Sign by Friday',
    dueDate: '9/20/2026',
  };

  const line = formatItem(item);
  assert.strictEqual(line, '4. Permission Slip — Sign by Friday (Due: 9/20/2026)');
});

test('generateSchoolMarkdown creates heading and items', () => {
  const items: DigestItem[] = [
    { n: 1, tag: 'school', subject: 'AISD Closure' },
    { n: 2, tag: 'school', subject: 'Teacher Conference', dueDate: '9/15' },
  ];

  const markdown = generateSchoolMarkdown(items, '2026-09-02');
  
  assert.ok(markdown.includes('# Kids School — 2026-09-02'));
  assert.ok(markdown.includes('1. AISD Closure'));
  assert.ok(markdown.includes('2. Teacher Conference (Due: 9/15)'));
});

test('generateFamilyMarkdown creates heading and items', () => {
  const items: DigestItem[] = [
    { n: 3, tag: 'payment', subject: 'Bill Due', dueDate: '9/10' },
    { n: 4, tag: 'other', subject: 'Package Delivery' },
  ];

  const markdown = generateFamilyMarkdown(items, '2026-09-02');
  
  assert.ok(markdown.includes('# Family Admin — 2026-09-02'));
  assert.ok(markdown.includes('3. Bill Due (Due: 9/10)'));
  assert.ok(markdown.includes('4. Package Delivery'));
});

test('generateSchoolMarkdown handles empty list', () => {
  const markdown = generateSchoolMarkdown([], '2026-09-02');
  assert.ok(markdown.includes('No school items'));
});

test('generateFamilyMarkdown handles empty list', () => {
  const markdown = generateFamilyMarkdown([], '2026-09-02');
  assert.ok(markdown.includes('No family admin items'));
});

test('generatePackIndex includes calendar when calendarEventCount provided', () => {
  const packMd = generatePackIndex('2026-09-02', 2, 3, 4);
  
  assert.ok(packMd.includes('# Family Morning Digest Pack — 2026-09-02'));
  assert.ok(packMd.includes('Kids School items (2 items)'));
  assert.ok(packMd.includes('Family Admin items (3 items'));
  assert.ok(packMd.includes('Calendar events from ICS digest (4 events)'));
  assert.ok(packMd.includes('calendar-events.json'));
  assert.ok(packMd.includes('Review calendar.md for accuracy'));
  assert.ok(packMd.includes('No invented events or times in calendar digest'));
  assert.ok(packMd.includes('Calendar events are pass-through from ICS file only'));
});

test('generatePackIndex excludes calendar when calendarEventCount not provided', () => {
  const packMd = generatePackIndex('2026-09-02', 2, 3);
  
  assert.ok(packMd.includes('# Family Morning Digest Pack — 2026-09-02'));
  assert.ok(packMd.includes('Kids School items (2 items)'));
  assert.ok(packMd.includes('Family Admin items (3 items'));
  assert.ok(!packMd.includes('Calendar events'));
  assert.ok(!packMd.includes('calendar-events.json'));
  assert.ok(!packMd.includes('Review calendar.md'));
});

test('generatePackIndex includes school due queue when schoolDueItemCount provided', () => {
  const packMd = generatePackIndex('2026-09-02', 2, 3, undefined, 5);
  
  assert.ok(packMd.includes('# Family Morning Digest Pack — 2026-09-02'));
  assert.ok(packMd.includes('School due queue from family-school-due-queue (5 items)'));
  assert.ok(packMd.includes('school-due-queue.md'));
  assert.ok(packMd.includes('Review school-due-queue.md for accuracy'));
  assert.ok(packMd.includes('No invented due dates in school due queue'));
  assert.ok(packMd.includes('School due queue extracted from subjects/filenames only (never opens email bodies)'));
});

test('generatePackIndex includes both calendar and school due queue', () => {
  const packMd = generatePackIndex('2026-09-02', 2, 3, 4, 5);
  
  assert.ok(packMd.includes('Calendar events from ICS digest (4 events)'));
  assert.ok(packMd.includes('School due queue from family-school-due-queue (5 items)'));
  assert.ok(packMd.includes('Review calendar.md for accuracy'));
  assert.ok(packMd.includes('Review school-due-queue.md for accuracy'));
});
