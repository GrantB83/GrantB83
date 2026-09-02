/**
 * Tests for gates module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { evaluateGates } from './gates.js';
import { DEFAULT_HARD_GATES, ParsedJD } from './types.js';

function createBasicParsedJD(): ParsedJD {
  return {
    company: 'TestCo',
    title: 'Operations Manager',
    location: 'Austin, TX',
    compensation: '$150,000',
    description: 'Test job description',
    isTesla: false,
    isRemote: false,
    isWFH: false,
    seniorityKeywords: ['manager'],
    functionKeywords: ['operations'],
    titleKeywords: ['operations', 'manager'],
    proofKeywords: ['p&l', 'team'],
  };
}

test('evaluateGates passes for good JD', () => {
  const parsed = createBasicParsedJD();
  parsed.isRemote = true;
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.dnc.status, 'pass');
  assert.strictEqual(gates.location.status, 'pass');
  assert.strictEqual(gates.function.status, 'pass');
  assert.strictEqual(gates.seniority.status, 'pass');
});

test('evaluateGates fails DNC for J.D. Abrams', () => {
  const parsed = createBasicParsedJD();
  parsed.company = 'J.D. Abrams Construction';
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.dnc.status, 'fail');
  assert.strictEqual(gates.overallPass, false);
});

test('evaluateGates fails DNC for Zachry', () => {
  const parsed = createBasicParsedJD();
  parsed.company = 'Zachry Group';
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.dnc.status, 'fail');
});

test('evaluateGates passes location for Tesla', () => {
  const parsed = createBasicParsedJD();
  parsed.isTesla = true;
  parsed.company = 'Tesla';
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.location.status, 'pass');
  assert.ok(gates.location.reason.includes('Tesla'));
});

test('evaluateGates passes location for remote', () => {
  const parsed = createBasicParsedJD();
  parsed.isRemote = true;
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.location.status, 'pass');
});

test('evaluateGates fails seniority for coordinator', () => {
  const parsed = createBasicParsedJD();
  parsed.title = 'Operations Coordinator';
  parsed.seniorityKeywords = [];
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.seniority.status, 'fail');
});

test('evaluateGates passes seniority for director', () => {
  const parsed = createBasicParsedJD();
  parsed.title = 'Director of Operations';
  parsed.seniorityKeywords = ['director'];
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.seniority.status, 'pass');
});

test('evaluateGates passes function for operations', () => {
  const parsed = createBasicParsedJD();
  parsed.functionKeywords = ['operations'];
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.function.status, 'pass');
});

test('evaluateGates fails function for recruiter', () => {
  const parsed = createBasicParsedJD();
  parsed.title = 'Recruiter';
  parsed.functionKeywords = [];
  
  const gates = evaluateGates(parsed, DEFAULT_HARD_GATES);
  
  assert.strictEqual(gates.function.status, 'fail');
});
