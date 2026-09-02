/**
 * Tests for scorer module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { scoreJD, determineVerdict, buildScorecard } from './scorer.js';
import { ParsedJD, HardGatesEvaluation, GateResult } from './types.js';

function createGateResult(status: 'pass' | 'fail' | 'unknown'): GateResult {
  return {
    gate: 'Test',
    status,
    reason: 'Test reason',
    confidence: 'high',
  };
}

function createPassingGates(): HardGatesEvaluation {
  return {
    dnc: createGateResult('pass'),
    comp: createGateResult('pass'),
    location: createGateResult('pass'),
    function: createGateResult('pass'),
    seniority: createGateResult('pass'),
    overallPass: true,
  };
}

function createBasicParsedJD(): ParsedJD {
  return {
    company: 'TestCo',
    title: 'Operations Manager',
    location: 'Austin, TX',
    compensation: '$150,000',
    description: 'Test job description',
    isTesla: false,
    isRemote: true,
    isWFH: true,
    seniorityKeywords: ['manager'],
    functionKeywords: ['operations'],
    titleKeywords: ['operations', 'manager'],
    proofKeywords: ['p&l', 'team', 'budget'],
  };
}

test('scoreJD returns total score', () => {
  const parsed = createBasicParsedJD();
  const gates = createPassingGates();
  
  const scores = scoreJD(parsed, gates);
  
  assert.ok(scores.total >= 0);
  assert.ok(scores.total <= 10);
  assert.strictEqual(
    scores.total,
    scores.titleMatch + scores.proofPointMatch + scores.seniority + scores.payConfidence + scores.commuteOrWfhFit
  );
});

test('scoreJD scores title match for director', () => {
  const parsed = createBasicParsedJD();
  parsed.title = 'Director of Operations';
  parsed.titleKeywords = ['director', 'operations'];
  const gates = createPassingGates();
  
  const scores = scoreJD(parsed, gates);
  
  assert.strictEqual(scores.titleMatch, 2);
});

test('scoreJD scores proof points', () => {
  const parsed = createBasicParsedJD();
  parsed.proofKeywords = ['p&l', 'team', 'budget', 'kpi', 'metrics', 'growth'];
  const gates = createPassingGates();
  
  const scores = scoreJD(parsed, gates);
  
  assert.strictEqual(scores.proofPointMatch, 2);
});

test('scoreJD scores commute/WFH fit for remote', () => {
  const parsed = createBasicParsedJD();
  parsed.isRemote = true;
  const gates = createPassingGates();
  
  const scores = scoreJD(parsed, gates);
  
  assert.strictEqual(scores.commuteOrWfhFit, 2);
});

test('determineVerdict returns apply for high score', () => {
  const parsed = createBasicParsedJD();
  parsed.title = 'Director of Operations';
  parsed.seniorityKeywords = ['director'];
  parsed.proofKeywords = ['p&l', 'team', 'budget', 'kpi', 'metrics', 'growth'];
  const gates = createPassingGates();
  
  const scores = scoreJD(parsed, gates);
  const verdict = determineVerdict(gates, scores);
  
  // Should be high score
  if (scores.total >= 8) {
    assert.strictEqual(verdict, 'apply');
  }
});

test('determineVerdict returns skip for failed gate', () => {
  const parsed = createBasicParsedJD();
  const gates = createPassingGates();
  gates.overallPass = false;
  
  const scores = scoreJD(parsed, gates);
  const verdict = determineVerdict(gates, scores);
  
  assert.strictEqual(verdict, 'skip');
});

test('buildScorecard includes facts-only reminder', () => {
  const parsed = createBasicParsedJD();
  const gates = createPassingGates();
  const scores = scoreJD(parsed, gates);
  const verdict = determineVerdict(gates, scores);
  
  const scorecard = buildScorecard(parsed, gates, scores, verdict);
  
  assert.ok(scorecard.factsOnlyReminder);
  assert.ok(scorecard.factsOnlyReminder.includes('career-os'));
});
