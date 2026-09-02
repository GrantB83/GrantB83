/**
 * Tests for pack generator
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { generatePackIndex } from './pack-generator.js';
import type { CliOptions } from './types.js';

test('generatePackIndex creates valid pack index', () => {
  const options: CliOptions = {
    day: '2026-09-20',
    outdir: './test-out',
  };
  
  const ranFlags = {
    ranAdapter: false,
    ranChangeCheck: false,
    ranDailyOps: true,
    ranGuestComms: true,
  };
  
  const sourcesProvided = {
    bookings: true,
    beforeAfter: false,
    facts: false,
    guestBooking: true,
  };
  
  const result = generatePackIndex(options, ranFlags, sourcesProvided);
  
  assert.ok(result.includes('# Browns CT Pack'));
  assert.ok(result.includes('Date: 2026-09-20'));
  assert.ok(result.includes('20:00 CT'));
  assert.ok(result.includes('09:00 CT'));
  assert.ok(result.includes('21:00 CT'));
  assert.ok(result.includes('DRAFT'));
  assert.ok(result.includes('CoS'));
});

test('generatePackIndex includes correct sections based on flags', () => {
  const options: CliOptions = {
    day: '2026-09-20',
    outdir: './test-out',
  };
  
  const ranFlags = {
    ranAdapter: false,
    ranChangeCheck: true,
    ranDailyOps: true,
    ranGuestComms: false,
  };
  
  const sourcesProvided = {
    bookings: true,
    beforeAfter: true,
    facts: true,
    guestBooking: false,
  };
  
  const result = generatePackIndex(options, ranFlags, sourcesProvided);
  
  assert.ok(result.includes('changes.md'));
  assert.ok(result.includes('daily-ops.md'));
  assert.ok(result.includes('Ran change-check: Yes'));
  assert.ok(result.includes('Ran daily-ops: Yes'));
  assert.ok(result.includes('Ran guest-comms: No'));
});

test('generatePackIndex handles minimal pack', () => {
  const options: CliOptions = {
    day: '2026-09-20',
    outdir: './test-out',
  };
  
  const ranFlags = {
    ranAdapter: false,
    ranChangeCheck: false,
    ranDailyOps: false,
    ranGuestComms: false,
  };
  
  const sourcesProvided = {
    bookings: false,
    beforeAfter: false,
    facts: false,
    guestBooking: false,
  };
  
  const result = generatePackIndex(options, ranFlags, sourcesProvided);
  
  assert.ok(result.includes('# Browns CT Pack'));
  assert.ok(result.includes('(No guest drafts in this pack)'));
  assert.ok(result.includes('(No change check in this pack)'));
  assert.ok(result.includes('(No daily ops brief in this pack)'));
});
