/**
 * Tests for extractor.ts
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  extractClaims,
  normalizeClaim,
  extractNumericTokens,
  extractEmployerTokens,
  extractTitleTokens,
  tokenize,
} from './extractor.js';

test('normalizeClaim removes punctuation and lowercases', () => {
  const input = 'I led a team of 15 engineers at Tesla, Inc.';
  const result = normalizeClaim(input);
  
  assert.strictEqual(result, 'i led a team of 15 engineers at tesla inc');
});

test('extractClaims extracts sentences from text', () => {
  const draft = `Dear Hiring Manager,

I am excited to apply for this role. I have 5 years of experience in operations management. At Tesla, I led a team of 15 engineers.

Thank you for your consideration.`;

  const claims = extractClaims(draft);
  
  assert.ok(claims.length >= 3, 'Should extract at least 3 claims');
  assert.ok(claims.some(c => c.text.includes('excited')));
  assert.ok(claims.some(c => c.text.includes('5 years')));
  assert.ok(claims.some(c => c.text.includes('Tesla')));
});

test('extractNumericTokens finds dollar amounts', () => {
  const text = 'I increased revenue by $2.5M and saved $150K annually.';
  const tokens = extractNumericTokens(text);
  
  assert.ok(tokens.includes('$2.5m'));
  assert.ok(tokens.includes('$150k'));
});

test('extractNumericTokens finds percentages', () => {
  const text = 'Improved efficiency by 25% and reduced costs by 15.5%.';
  const tokens = extractNumericTokens(text);
  
  assert.ok(tokens.includes('25%'));
  assert.ok(tokens.includes('15.5%'));
});

test('extractNumericTokens finds contextual numbers', () => {
  const text = 'Led 15 people across 3 teams for 180 days.';
  const tokens = extractNumericTokens(text);
  
  assert.ok(tokens.some(t => t.includes('15') && t.includes('people')));
  assert.ok(tokens.some(t => t.includes('3') && t.includes('teams')));
  assert.ok(tokens.some(t => t.includes('180') && t.includes('days')));
});

test('extractEmployerTokens finds company names after prepositions', () => {
  const text = 'I worked at Tesla and consulted for Microsoft before joining Amazon.';
  const tokens = extractEmployerTokens(text);
  
  assert.ok(tokens.includes('tesla'));
  assert.ok(tokens.includes('microsoft'));
  assert.ok(tokens.includes('amazon'));
});

test('extractTitleTokens finds role keywords', () => {
  const text = 'As Operations Manager and Product Lead, I directed strategy.';
  const tokens = extractTitleTokens(text);
  
  assert.ok(tokens.includes('operations'));
  assert.ok(tokens.includes('manager'));
  assert.ok(tokens.includes('product'));
  assert.ok(tokens.includes('lead'));
  assert.ok(tokens.includes('strategy'));
});

test('tokenize filters stopwords', () => {
  const text = 'I am the manager of operations at the company';
  const tokens = tokenize(text);
  
  assert.ok(tokens.includes('manager'));
  assert.ok(tokens.includes('operations'));
  assert.ok(tokens.includes('company'));
  
  // Stopwords should be filtered
  assert.ok(!tokens.includes('am'));
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('of'));
  assert.ok(!tokens.includes('at'));
});
