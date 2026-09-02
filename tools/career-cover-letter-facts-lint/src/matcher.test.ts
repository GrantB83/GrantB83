/**
 * Tests for matcher.ts
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { flattenFacts, matchClaim } from './matcher.js';
import { AllowedFacts, ExtractedClaim } from './types.js';

test('flattenFacts handles claims array structure', () => {
  const facts: AllowedFacts = {
    claims: [
      'Led operations team of 15 engineers at Tesla',
      'Improved production efficiency by 25%',
      'Managed $2.5M annual budget',
    ],
  };
  
  const flattened = flattenFacts(facts);
  
  assert.strictEqual(flattened.length, 3);
  assert.ok(flattened.includes('Led operations team of 15 engineers at Tesla'));
});

test('flattenFacts handles bullets array structure', () => {
  const facts: AllowedFacts = {
    bullets: [
      'Operations Manager at Tesla (2020-2023)',
      'Product Lead at Microsoft (2018-2020)',
    ],
  };
  
  const flattened = flattenFacts(facts);
  
  assert.strictEqual(flattened.length, 2);
  assert.ok(flattened.some(f => f.includes('Tesla')));
  assert.ok(flattened.some(f => f.includes('Microsoft')));
});

test('flattenFacts handles flat array structure', () => {
  const facts = [
    'Led team of 15 engineers',
    'Improved efficiency by 25%',
    'Managed $2.5M budget',
  ] as any;
  
  const flattened = flattenFacts(facts);
  
  assert.strictEqual(flattened.length, 3);
  assert.ok(flattened.includes('Led team of 15 engineers'));
});

test('matchClaim matches high overlap claim', () => {
  const claim: ExtractedClaim = {
    text: 'I led a team of 15 engineers at Tesla',
    normalized: 'i led a team of 15 engineers at tesla',
    index: 0,
    type: 'sentence',
  };
  
  const facts = [
    'Led operations team of 15 engineers at Tesla',
    'Managed product roadmap',
  ];
  
  const result = matchClaim(claim, facts);
  
  assert.strictEqual(result.status, 'matched');
  assert.strictEqual(result.confidence, 'high');
  assert.ok(result.matchedFact?.includes('Tesla'));
});

test('matchClaim flags unmatched numbers', () => {
  const claim: ExtractedClaim = {
    text: 'I increased revenue by $5M and led 20 people',
    normalized: 'i increased revenue by $5m and led 20 people',
    index: 0,
    type: 'metric',
  };
  
  const facts = [
    'Increased revenue and led operations team',
  ];
  
  const result = matchClaim(claim, facts);
  
  // Should be suspicious or unmatched due to specific numbers
  assert.ok(result.status === 'suspicious' || result.status === 'unmatched');
  assert.ok(result.flagged.length > 0);
  assert.ok(result.flagged.some(f => f.includes('$5m') || f.includes('20')));
});

test('matchClaim flags unmatched employers', () => {
  const claim: ExtractedClaim = {
    text: 'I worked at SpaceX as an operations manager',
    normalized: 'i worked at spacex as an operations manager',
    index: 0,
    type: 'employer',
  };
  
  const facts = [
    'Operations Manager with experience in manufacturing',
    'Led teams in automotive industry',
  ];
  
  const result = matchClaim(claim, facts);
  
  // Should be unmatched or suspicious due to SpaceX not in facts
  assert.ok(result.status === 'suspicious' || result.status === 'unmatched');
  // Should flag spacex
  assert.ok(result.flagged.length > 0, 'Should have flagged tokens');
});

test('matchClaim returns unmatched for low overlap', () => {
  const claim: ExtractedClaim = {
    text: 'I have a PhD in Quantum Physics',
    normalized: 'i have a phd in quantum physics',
    index: 0,
    type: 'sentence',
  };
  
  const facts = [
    'Operations Manager at Tesla',
    'Led product development',
  ];
  
  const result = matchClaim(claim, facts);
  
  assert.strictEqual(result.status, 'unmatched');
  assert.strictEqual(result.confidence, 'none');
  assert.strictEqual(result.matchedFact, null);
});

test('matchClaim handles empty facts', () => {
  const claim: ExtractedClaim = {
    text: 'I led a team',
    normalized: 'i led a team',
    index: 0,
    type: 'sentence',
  };
  
  const facts: string[] = [];
  
  const result = matchClaim(claim, facts);
  
  assert.strictEqual(result.status, 'unmatched');
  assert.strictEqual(result.confidence, 'none');
});
