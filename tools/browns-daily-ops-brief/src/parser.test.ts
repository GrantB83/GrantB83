import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseBookings, parseFacts } from './parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const testDir = './test-parser-temp';

test('parseBookings - valid JSON array', () => {
  mkdirSync(testDir, { recursive: true });
  const testFile = join(testDir, 'bookings.json');
  
  const data = [
    {
      guestName: 'John Doe',
      suiteOrUnit: 'Suite 1',
      status: 'arriving',
      checkInDate: '2026-09-20',
      lateCheckIn: true,
    },
  ];
  
  writeFileSync(testFile, JSON.stringify(data), 'utf-8');
  
  const result = parseBookings(testFile);
  
  assert.equal(result.length, 1);
  assert.equal(result[0].guestName, 'John Doe');
  assert.equal(result[0].status, 'arriving');
  assert.equal(result[0].lateCheckIn, true);
  
  rmSync(testDir, { recursive: true });
});

test('parseBookings - valid CSV', () => {
  mkdirSync(testDir, { recursive: true });
  const testFile = join(testDir, 'bookings.csv');
  
  const csv = `guestName,suiteOrUnit,status,checkInDate,lateCheckIn
Jane Smith,Suite 2,inhouse,2026-09-19,false`;
  
  writeFileSync(testFile, csv, 'utf-8');
  
  const result = parseBookings(testFile);
  
  assert.equal(result.length, 1);
  assert.equal(result[0].guestName, 'Jane Smith');
  assert.equal(result[0].status, 'inhouse');
  assert.equal(result[0].lateCheckIn, false);
  
  rmSync(testDir, { recursive: true });
});

test('parseBookings - throws on invalid status', () => {
  mkdirSync(testDir, { recursive: true });
  const testFile = join(testDir, 'bookings.json');
  
  const data = [
    {
      guestName: 'Bad Status',
      suiteOrUnit: 'Suite 1',
      status: 'invalid-status',
    },
  ];
  
  writeFileSync(testFile, JSON.stringify(data), 'utf-8');
  
  assert.throws(() => {
    parseBookings(testFile);
  }, /Booking status must be one of/);
  
  rmSync(testDir, { recursive: true });
});

test('parseBookings - throws on missing guestName', () => {
  mkdirSync(testDir, { recursive: true });
  const testFile = join(testDir, 'bookings.json');
  
  const data = [
    {
      suiteOrUnit: 'Suite 1',
      status: 'arriving',
    },
  ];
  
  writeFileSync(testFile, JSON.stringify(data), 'utf-8');
  
  assert.throws(() => {
    parseBookings(testFile);
  }, /must have a guestName/);
  
  rmSync(testDir, { recursive: true });
});

test('parseFacts - valid JSON object', () => {
  mkdirSync(testDir, { recursive: true });
  const testFile = join(testDir, 'facts.json');
  
  const facts = {
    weather: 'Sunny',
    temperature: '22°C',
  };
  
  writeFileSync(testFile, JSON.stringify(facts), 'utf-8');
  
  const result = parseFacts(testFile);
  
  assert.equal(result.weather, 'Sunny');
  assert.equal(result.temperature, '22°C');
  
  rmSync(testDir, { recursive: true });
});

test('parseFacts - throws on array', () => {
  mkdirSync(testDir, { recursive: true });
  const testFile = join(testDir, 'facts.json');
  
  writeFileSync(testFile, JSON.stringify(['not', 'an', 'object']), 'utf-8');
  
  assert.throws(() => {
    parseFacts(testFile);
  }, /must be a JSON object/);
  
  rmSync(testDir, { recursive: true });
});
