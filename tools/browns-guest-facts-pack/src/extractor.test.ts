import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseMarkdown, extractFacts } from './parser.js';

test('parseMarkdown extracts sections with headings', () => {
  const markdown = `# Main Title
Some content here.

## Section One
Content for section one.

## Section Two
Content for section two.`;

  const sections = parseMarkdown(markdown);

  assert.equal(sections.length, 3);
  assert.equal(sections[0].heading, 'Main Title');
  assert.equal(sections[1].heading, 'Section One');
  assert.equal(sections[2].heading, 'Section Two');
});

test('extractFacts finds directions', () => {
  const markdown = `## Directions
From Johannesburg, take the N4 highway towards Nelspruit.`;

  const sections = parseMarkdown(markdown);
  const facts = extractFacts(sections);

  assert.ok(facts.directions);
  assert.ok(facts.directions.includes('N4 highway'));
});

test('extractFacts finds wifi information', () => {
  const markdown = `## Wi-Fi
Network: BrownsGuest
Password: welcome2026`;

  const sections = parseMarkdown(markdown);
  const facts = extractFacts(sections);

  assert.equal(facts.wifi, 'BrownsGuest');
  assert.equal(facts.wifiPassword, 'welcome2026');
});

test('extractFacts finds check-in time', () => {
  const markdown = `## Check-in
Check-in time is 2:00 PM.`;

  const sections = parseMarkdown(markdown);
  const facts = extractFacts(sections);

  assert.ok(facts.checkInTime);
  assert.ok(facts.checkInTime.includes('2:00'));
});

test('extractFacts does not invent missing fields', () => {
  const markdown = `## Some Section
Just some content without specific facts.`;

  const sections = parseMarkdown(markdown);
  const facts = extractFacts(sections);

  assert.equal(facts.wifi, undefined);
  assert.equal(facts.directions, undefined);
  assert.equal(facts.checkInTime, undefined);
});

test('extractFacts finds Blue Crane restaurant info', () => {
  const markdown = `## Blue Crane Restaurant
The Blue Crane is our on-site restaurant serving breakfast daily.`;

  const sections = parseMarkdown(markdown);
  const facts = extractFacts(sections);

  assert.ok(facts.blueCrane);
  assert.ok(facts.blueCrane.includes('breakfast'));
});

test('extractFacts finds late check-in info', () => {
  const markdown = `## Late Check-in
For arrivals after 6 PM, please call ahead.`;

  const sections = parseMarkdown(markdown);
  const facts = extractFacts(sections);

  assert.ok(facts.lateCheckIn);
  assert.ok(facts.lateCheckIn.includes('6 PM'));
});
