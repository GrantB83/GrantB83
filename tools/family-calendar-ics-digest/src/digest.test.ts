import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { formatDigest, formatMissingFields } from './digest.js';
import { CalendarEvent } from './types.js';

test('formatDigest handles empty events', () => {
  const digest = formatDigest([], '2026-09-01', '2026-09-05', 'America/Chicago');
  
  assert.ok(digest.includes('No events found'));
  assert.ok(digest.includes('Family Calendar Digest'));
});

test('formatDigest formats events correctly', () => {
  const events: CalendarEvent[] = [
    {
      uid: 'event1',
      summary: 'Test Event',
      dtstart: '2026-09-02T10:00:00.000Z',
      dtend: '2026-09-02T11:00:00.000Z',
      location: 'Test Location',
      description: 'Test description',
      allDay: false,
      missingFields: []
    }
  ];
  
  const digest = formatDigest(events, '2026-09-01', '2026-09-05', 'America/Chicago');
  
  assert.ok(digest.includes('Test Event'));
  assert.ok(digest.includes('Test Location'));
  assert.ok(digest.includes('**Event Count:** 1'));
});

test('formatMissingFields reports missing data', () => {
  const events: CalendarEvent[] = [
    {
      uid: 'event1',
      summary: 'Event with missing location',
      dtstart: '2026-09-02T10:00:00.000Z',
      dtend: null,
      location: null,
      description: null,
      allDay: false,
      missingFields: ['LOCATION']
    }
  ];
  
  const report = formatMissingFields(events);
  
  assert.ok(report.includes('Found 1 event(s) with missing fields'));
  assert.ok(report.includes('LOCATION'));
});

test('formatMissingFields handles complete events', () => {
  const events: CalendarEvent[] = [
    {
      uid: 'event1',
      summary: 'Complete Event',
      dtstart: '2026-09-02T10:00:00.000Z',
      dtend: '2026-09-02T11:00:00.000Z',
      location: 'Location',
      description: 'Description',
      allDay: false,
      missingFields: []
    }
  ];
  
  const report = formatMissingFields(events);
  
  assert.ok(report.includes('All events have complete field data'));
});
