/**
 * Tests for appender module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import {
  readExistingEntries,
  appendEntries,
  countLines,
} from './appender.js';
import { RunEntry } from './types.js';

const testDir = './test-out-appender';

test('setup test directory', () => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
  mkdirSync(testDir, { recursive: true });
});

test('readExistingEntries - returns empty array for missing file', () => {
  const entries = readExistingEntries(`${testDir}/missing.jsonl`);
  assert.strictEqual(entries.length, 0);
});

test('appendEntries - creates file and appends entries', () => {
  const jsonlPath = `${testDir}/test.jsonl`;
  const entries: RunEntry[] = [
    { company: 'Tesla', title: 'Manager', action: 'scored', date: '2026-09-02', score: 9 },
    { company: 'SpaceX', title: 'Director', action: 'applied', date: '2026-09-02' },
  ];

  appendEntries(jsonlPath, entries);

  assert.ok(existsSync(jsonlPath));
  const content = readFileSync(jsonlPath, 'utf-8');
  const lines = content.trim().split('\n');
  assert.strictEqual(lines.length, 2);

  const parsed1 = JSON.parse(lines[0]);
  assert.strictEqual(parsed1.company, 'Tesla');
  assert.strictEqual(parsed1.score, 9);

  const parsed2 = JSON.parse(lines[1]);
  assert.strictEqual(parsed2.company, 'SpaceX');
  assert.strictEqual(parsed2.action, 'applied');
});

test('appendEntries - appends to existing file without rewriting', () => {
  const jsonlPath = `${testDir}/append-test.jsonl`;
  
  // Create initial file
  const initial: RunEntry[] = [
    { company: 'First', title: 'Manager', action: 'scored', date: '2026-09-01' },
  ];
  appendEntries(jsonlPath, initial);

  // Append new entries
  const newEntries: RunEntry[] = [
    { company: 'Second', title: 'Director', action: 'applied', date: '2026-09-02' },
  ];
  appendEntries(jsonlPath, newEntries);

  // Verify both entries exist
  const entries = readExistingEntries(jsonlPath);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].company, 'First');
  assert.strictEqual(entries[1].company, 'Second');
});

test('readExistingEntries - parses jsonl correctly', () => {
  const jsonlPath = `${testDir}/read-test.jsonl`;
  const entries: RunEntry[] = [
    { company: 'Tesla', title: 'Manager', action: 'scored', date: '2026-09-02' },
    { company: 'SpaceX', title: 'Director', action: 'applied', date: '2026-09-02' },
  ];
  appendEntries(jsonlPath, entries);

  const read = readExistingEntries(jsonlPath);
  assert.strictEqual(read.length, 2);
  assert.strictEqual(read[0].company, 'Tesla');
  assert.strictEqual(read[1].company, 'SpaceX');
});

test('readExistingEntries - throws on malformed JSON', () => {
  const jsonlPath = `${testDir}/malformed.jsonl`;
  writeFileSync(jsonlPath, 'not valid json\n', 'utf-8');

  assert.throws(() => {
    readExistingEntries(jsonlPath);
  }, /Malformed JSON/);
});

test('countLines - returns 0 for missing file', () => {
  const count = countLines(`${testDir}/missing.jsonl`);
  assert.strictEqual(count, 0);
});

test('countLines - counts lines correctly', () => {
  const jsonlPath = `${testDir}/count-test.jsonl`;
  const entries: RunEntry[] = [
    { company: 'Tesla', title: 'Manager', action: 'scored', date: '2026-09-02' },
    { company: 'SpaceX', title: 'Director', action: 'applied', date: '2026-09-02' },
    { company: 'Third', title: 'VP', action: 'skipped', date: '2026-09-02', reason: 'Location' },
  ];
  appendEntries(jsonlPath, entries);

  const count = countLines(jsonlPath);
  assert.strictEqual(count, 3);
});

test('cleanup test directory', () => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
});
