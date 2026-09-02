import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { groupByStatus, generateTeamBrief, generateGuestWelcomeStub } from './brief-generator.js';
import type { BookingRecord } from './types.js';

test('groupByStatus - correctly groups bookings', () => {
  const bookings: BookingRecord[] = [
    { guestName: 'Guest A', suiteOrUnit: 'Suite 1', status: 'arriving' },
    { guestName: 'Guest B', suiteOrUnit: 'Suite 2', status: 'inhouse' },
    { guestName: 'Guest C', suiteOrUnit: 'Suite 3', status: 'departing' },
    { guestName: 'Guest D', suiteOrUnit: 'Suite 4', status: 'arriving' },
  ];
  
  const sections = groupByStatus(bookings);
  
  assert.equal(sections.arrivals.length, 2);
  assert.equal(sections.inhouse.length, 1);
  assert.equal(sections.departures.length, 1);
});

test('generateTeamBrief - contains required sections', () => {
  const sections = {
    arrivals: [
      { guestName: 'John Doe', suiteOrUnit: 'Suite 1', status: 'arriving' as const },
    ],
    inhouse: [],
    departures: [],
  };
  
  const brief = generateTeamBrief('2026-09-20', sections);
  
  assert.ok(brief.includes('THE BROWNS DAILY OPS BRIEF'));
  assert.ok(brief.includes('ARRIVALS'));
  assert.ok(brief.includes('IN-HOUSE'));
  assert.ok(brief.includes('DEPARTURES'));
  assert.ok(brief.includes('John Doe'));
  assert.ok(brief.includes('Suite 1'));
  assert.ok(brief.includes('DRAFT ONLY'));
});

test('generateTeamBrief - includes late check-in warning', () => {
  const sections = {
    arrivals: [
      {
        guestName: 'Late Guest',
        suiteOrUnit: 'Suite 5',
        status: 'arriving' as const,
        lateCheckIn: true,
      },
    ],
    inhouse: [],
    departures: [],
  };
  
  const brief = generateTeamBrief('2026-09-20', sections);
  
  assert.ok(brief.includes('LATE CHECK-IN'));
});

test('generateTeamBrief - includes facts when provided', () => {
  const sections = {
    arrivals: [],
    inhouse: [],
    departures: [],
  };
  
  const facts = {
    weather: 'Sunny',
    temperature: '22°C',
  };
  
  const brief = generateTeamBrief('2026-09-20', sections, facts);
  
  assert.ok(brief.includes('TODAY\'S FACTS'));
  assert.ok(brief.includes('weather: Sunny'));
  assert.ok(brief.includes('temperature: 22°C'));
});

test('generateGuestWelcomeStub - contains required elements', () => {
  const booking: BookingRecord = {
    guestName: 'Jane Smith',
    suiteOrUnit: 'Suite 2',
    status: 'arriving',
  };
  
  const stub = generateGuestWelcomeStub(booking);
  
  assert.ok(stub.includes('Jane Smith'));
  assert.ok(stub.includes('Suite 2'));
  assert.ok(stub.includes('STUB ONLY'));
  assert.ok(stub.includes('browns-guest-comms-draft'));
});
