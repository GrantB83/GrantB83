/**
 * Basic tests for checker module
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkRequiredFiles,
  checkContentFiles,
  checkDuplicateItems,
  checkApprovalFile,
  runAllChecks
} from './checker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDir = path.resolve(__dirname, '../fixtures');

test('checkRequiredFiles should pass for healthy pack', () => {
  const packPath = path.join(fixturesDir, 'healthy-pack');
  const result = checkRequiredFiles(packPath);
  assert.strictEqual(result.passed, true);
});

test('checkRequiredFiles should fail for missing school.md', () => {
  const packPath = path.join(fixturesDir, 'missing-school-pack');
  const result = checkRequiredFiles(packPath);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /school\.md/);
});

test('checkContentFiles should pass for healthy pack', () => {
  const packPath = path.join(fixturesDir, 'healthy-pack');
  const result = checkContentFiles(packPath);
  assert.strictEqual(result.passed, true);
});

test('checkDuplicateItems should pass for healthy pack', () => {
  const packPath = path.join(fixturesDir, 'healthy-pack');
  const result = checkDuplicateItems(packPath);
  assert.strictEqual(result.passed, true);
});

test('checkDuplicateItems should fail for duplicate pack', () => {
  const packPath = path.join(fixturesDir, 'duplicate-item-pack');
  const result = checkDuplicateItems(packPath);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /duplicate/i);
});

test('checkApprovalFile should pass for healthy pack', () => {
  const packPath = path.join(fixturesDir, 'healthy-pack');
  const result = checkApprovalFile(packPath);
  assert.strictEqual(result.passed, true);
});

test('runAllChecks should pass for healthy pack', () => {
  const packPath = path.join(fixturesDir, 'healthy-pack');
  const output = runAllChecks(packPath);
  assert.strictEqual(output.allPassed, true);
  assert.strictEqual(output.failures.length, 0);
});

test('runAllChecks should fail for missing school pack', () => {
  const packPath = path.join(fixturesDir, 'missing-school-pack');
  const output = runAllChecks(packPath);
  assert.strictEqual(output.allPassed, false);
  assert.ok(output.failures.length > 0);
});

test('runAllChecks should fail for duplicate pack', () => {
  const packPath = path.join(fixturesDir, 'duplicate-item-pack');
  const output = runAllChecks(packPath);
  assert.strictEqual(output.allPassed, false);
  assert.ok(output.failures.length > 0);
});
