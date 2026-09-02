import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import ICAL from 'ical.js';
import { extractEvents } from './parser.js';

test('extractEvents filters by date range', () => {
  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@test
DTSTART:20260902T100000Z
DTEND:20260902T110000Z
SUMMARY:Event in range
END:VEVENT
BEGIN:VEVENT
UID:event2@test
DTSTART:20260910T100000Z
DTEND:20260910T110000Z
SUMMARY:Event out of range
END:VEVENT
END:VCALENDAR`;

  const jcalData = ICAL.parse(icsData);
  const vcalendar = new ICAL.Component(jcalData);
  
  const fromDate = new Date('2026-09-01');
  const toDate = new Date('2026-09-05');
  toDate.setHours(23, 59, 59, 999);
  
  const events = extractEvents(vcalendar, fromDate, toDate, 'America/Chicago');
  
  assert.equal(events.length, 1);
  assert.equal(events[0].summary, 'Event in range');
});

test('extractEvents sorts by start date', () => {
  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@test
DTSTART:20260903T100000Z
SUMMARY:Second event
END:VEVENT
BEGIN:VEVENT
UID:event2@test
DTSTART:20260902T100000Z
SUMMARY:First event
END:VEVENT
END:VCALENDAR`;

  const jcalData = ICAL.parse(icsData);
  const vcalendar = new ICAL.Component(jcalData);
  
  const fromDate = new Date('2026-09-01');
  const toDate = new Date('2026-09-05');
  toDate.setHours(23, 59, 59, 999);
  
  const events = extractEvents(vcalendar, fromDate, toDate, 'America/Chicago');
  
  assert.equal(events.length, 2);
  assert.equal(events[0].summary, 'First event');
  assert.equal(events[1].summary, 'Second event');
});

test('extractEvents flags missing fields', () => {
  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@test
DTSTART:20260902T100000Z
END:VEVENT
END:VCALENDAR`;

  const jcalData = ICAL.parse(icsData);
  const vcalendar = new ICAL.Component(jcalData);
  
  const fromDate = new Date('2026-09-01');
  const toDate = new Date('2026-09-05');
  toDate.setHours(23, 59, 59, 999);
  
  const events = extractEvents(vcalendar, fromDate, toDate, 'America/Chicago');
  
  assert.equal(events.length, 1);
  assert.ok(events[0].missingFields.includes('SUMMARY'));
  assert.ok(events[0].missingFields.includes('LOCATION'));
});

test('extractEvents handles all-day events', () => {
  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@test
DTSTART;VALUE=DATE:20260902
SUMMARY:All day event
END:VEVENT
END:VCALENDAR`;

  const jcalData = ICAL.parse(icsData);
  const vcalendar = new ICAL.Component(jcalData);
  
  const fromDate = new Date('2026-09-01');
  const toDate = new Date('2026-09-05');
  toDate.setHours(23, 59, 59, 999);
  
  const events = extractEvents(vcalendar, fromDate, toDate, 'America/Chicago');
  
  assert.equal(events.length, 1);
  assert.equal(events[0].allDay, true);
  assert.equal(events[0].summary, 'All day event');
});
