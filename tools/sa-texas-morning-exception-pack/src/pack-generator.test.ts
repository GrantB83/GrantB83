import { test } from 'node:test';
import assert from 'node:assert';
import { generateHospitalitySection, generateHeavyMetalSection, generateNotesSection } from './pack-generator.js';
import type { BrownsBooking, HMQuoteFile } from './types.js';

test('generateHospitalitySection - no bookings provided', () => {
  const section = generateHospitalitySection('2026-09-02', null);
  
  assert.strictEqual(section.title, 'Hospitality / The Browns');
  assert.strictEqual(section.hasData, false);
  assert.strictEqual(section.items.length, 1);
  assert.ok(section.items[0].includes('No Browns bookings data'));
});

test('generateHospitalitySection - empty bookings array', () => {
  const section = generateHospitalitySection('2026-09-02', []);
  
  assert.strictEqual(section.title, 'Hospitality / The Browns');
  assert.strictEqual(section.hasData, false);
  assert.strictEqual(section.items.length, 1);
});

test('generateHospitalitySection - no exceptional bookings', () => {
  const bookings: BrownsBooking[] = [
    {
      bookingId: 'NB-001',
      guestName: 'John Doe',
      suite: 'Suite 1',
      status: 'arriving',
      notes: '',
      specialRequests: '',
    },
  ];
  
  const section = generateHospitalitySection('2026-09-02', bookings);
  
  assert.strictEqual(section.title, 'Hospitality / The Browns');
  assert.strictEqual(section.hasData, true);
  assert.strictEqual(section.items.length, 1);
  assert.ok(section.items[0].includes('No exceptional bookings'));
});

test('generateHospitalitySection - booking with special request', () => {
  const bookings: BrownsBooking[] = [
    {
      bookingId: 'NB-001',
      guestName: 'Jane Smith',
      suite: 'Suite 2',
      status: 'arriving',
      notes: '',
      specialRequests: 'Gluten-free breakfast',
    },
  ];
  
  const section = generateHospitalitySection('2026-09-02', bookings);
  
  assert.strictEqual(section.hasData, true);
  assert.strictEqual(section.items.length, 1);
  assert.ok(section.items[0].includes('Jane Smith'));
  assert.ok(section.items[0].includes('Suite 2'));
  assert.ok(section.items[0].includes('Gluten-free breakfast'));
});

test('generateHospitalitySection - booking with late check-in note', () => {
  const bookings: BrownsBooking[] = [
    {
      bookingId: 'NB-001',
      guestName: 'Bob Johnson',
      suite: 'Suite 3',
      status: 'arriving',
      notes: 'Late check-in expected around 21:00',
      specialRequests: '',
    },
  ];
  
  const section = generateHospitalitySection('2026-09-02', bookings);
  
  assert.strictEqual(section.hasData, true);
  assert.strictEqual(section.items.length, 1);
  assert.ok(section.items[0].includes('Bob Johnson'));
  assert.ok(section.items[0].includes('Late check-in'));
});

test('generateHeavyMetalSection - no quotes directory provided', () => {
  const section = generateHeavyMetalSection('2026-09-02', null);
  
  assert.strictEqual(section.title, 'Heavy Metal Sand & Stone');
  assert.strictEqual(section.hasData, false);
  assert.strictEqual(section.items.length, 1);
  assert.ok(section.items[0].includes('No Heavy Metal open quotes directory'));
});

test('generateHeavyMetalSection - empty quotes array', () => {
  const section = generateHeavyMetalSection('2026-09-02', []);
  
  assert.strictEqual(section.title, 'Heavy Metal Sand & Stone');
  assert.strictEqual(section.hasData, true);
  assert.strictEqual(section.items.length, 1);
  assert.ok(section.items[0].includes('No open Heavy Metal quotes'));
});

test('generateHeavyMetalSection - multiple quote files', () => {
  const quotes: HMQuoteFile[] = [
    { filename: 'quote-001.txt', displayName: 'quote-001' },
    { filename: 'quote-002.txt', displayName: 'quote-002' },
  ];
  
  const section = generateHeavyMetalSection('2026-09-02', quotes);
  
  assert.strictEqual(section.hasData, true);
  assert.strictEqual(section.items.length, 3);
  assert.ok(section.items[0].includes('2 open quote(s)'));
  assert.ok(section.items[1].includes('quote-001'));
  assert.ok(section.items[2].includes('quote-002'));
});

test('generateNotesSection - no notes provided', () => {
  const section = generateNotesSection(null);
  
  assert.strictEqual(section.title, 'Exception Notes');
  assert.strictEqual(section.hasData, false);
  assert.strictEqual(section.items.length, 1);
  assert.ok(section.items[0].includes('No exception notes'));
});

test('generateNotesSection - empty notes', () => {
  const section = generateNotesSection('');
  
  assert.strictEqual(section.hasData, false);
  assert.strictEqual(section.items.length, 1);
});

test('generateNotesSection - notes with bullet points', () => {
  const notes = `- Follow up on quote
- WiFi router replacement
- CoS off-site meeting`;
  
  const section = generateNotesSection(notes);
  
  assert.strictEqual(section.hasData, true);
  assert.strictEqual(section.items.length, 3);
  assert.ok(section.items[0].includes('Follow up on quote'));
  assert.ok(section.items[1].includes('WiFi router'));
});

test('generateNotesSection - notes without bullet points', () => {
  const notes = `Follow up on quote\nWiFi router replacement`;
  
  const section = generateNotesSection(notes);
  
  assert.strictEqual(section.hasData, true);
  assert.strictEqual(section.items.length, 2);
  assert.ok(section.items[0].startsWith('- '));
  assert.ok(section.items[1].startsWith('- '));
});
