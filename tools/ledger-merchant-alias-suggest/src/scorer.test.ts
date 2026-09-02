import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { normalizeText, tokenize, jaccardSimilarity, scoreAgainstAlias, suggestAliases } from './scorer.js';
import { AliasPattern } from './types.js';

describe('normalizeText', () => {
  it('lowercases text', () => {
    assert.strictEqual(normalizeText('AMAZON.COM'), 'amazon com');
  });

  it('removes punctuation', () => {
    assert.strictEqual(normalizeText('Amazon.com-Store'), 'amazon com store');
  });

  it('collapses whitespace', () => {
    assert.strictEqual(normalizeText('Amazon   Store'), 'amazon store');
  });

  it('trims whitespace', () => {
    assert.strictEqual(normalizeText('  Amazon  '), 'amazon');
  });
});

describe('tokenize', () => {
  it('splits into tokens', () => {
    const tokens = tokenize('Amazon Store');
    assert.strictEqual(tokens.size, 2);
    assert.ok(tokens.has('amazon'));
    assert.ok(tokens.has('store'));
  });

  it('handles punctuation', () => {
    const tokens = tokenize('Amazon.com-Store');
    assert.strictEqual(tokens.size, 3);
    assert.ok(tokens.has('amazon'));
    assert.ok(tokens.has('com'));
    assert.ok(tokens.has('store'));
  });

  it('removes empty tokens', () => {
    const tokens = tokenize('   ');
    assert.strictEqual(tokens.size, 0);
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical sets', () => {
    const setA = new Set(['amazon', 'store']);
    const setB = new Set(['amazon', 'store']);
    assert.strictEqual(jaccardSimilarity(setA, setB), 1.0);
  });

  it('returns 0.0 for disjoint sets', () => {
    const setA = new Set(['amazon']);
    const setB = new Set(['walmart']);
    assert.strictEqual(jaccardSimilarity(setA, setB), 0.0);
  });

  it('returns 0.333 for partial overlap', () => {
    const setA = new Set(['amazon', 'store']);
    const setB = new Set(['amazon', 'prime']);
    // Intersection: {amazon} = 1, Union: {amazon, store, prime} = 3
    assert.strictEqual(Math.round(jaccardSimilarity(setA, setB) * 1000) / 1000, 0.333);
  });

  it('returns 0 for empty sets', () => {
    const setA = new Set<string>();
    const setB = new Set<string>();
    assert.strictEqual(jaccardSimilarity(setA, setB), 0);
  });
});

describe('scoreAgainstAlias', () => {
  it('scores against single pattern', () => {
    const alias: AliasPattern = {
      alias: 'Amazon',
      patterns: ['Amazon.com']
    };
    const result = scoreAgainstAlias('AMAZON.COM STORE', alias);
    assert.ok(result.score > 0);
    assert.strictEqual(result.matchedPattern, 'Amazon.com');
  });

  it('returns best score from multiple patterns', () => {
    const alias: AliasPattern = {
      alias: 'Amazon',
      patterns: ['Amazon.com', 'Amazon Prime', 'Amazon Store']
    };
    const result = scoreAgainstAlias('AMAZON STORE', alias);
    assert.ok(result.score >= 0.6);
    assert.strictEqual(result.matchedPattern, 'Amazon Store');
  });

  it('returns 0 for no match', () => {
    const alias: AliasPattern = {
      alias: 'Amazon',
      patterns: ['Amazon.com']
    };
    const result = scoreAgainstAlias('WALMART', alias);
    assert.strictEqual(result.score, 0);
  });
});

describe('suggestAliases', () => {
  const aliases: AliasPattern[] = [
    { alias: 'Amazon', patterns: ['Amazon.com', 'Amazon Prime'] },
    { alias: 'Walmart', patterns: ['Walmart', 'Walmart.com'] }
  ];

  it('returns suggestion above minScore', () => {
    const result = suggestAliases('AMAZON.COM STORE', aliases, 0.3);
    assert.ok(result !== null);
    assert.strictEqual(result?.topMatch.alias, 'Amazon');
  });

  it('returns null below minScore', () => {
    const result = suggestAliases('TARGET', aliases, 0.4);
    assert.strictEqual(result, null);
  });

  it('sorts matches by score', () => {
    const result = suggestAliases('AMAZON WALMART', aliases, 0.1);
    assert.ok(result !== null);
    assert.ok(result!.allMatches.length >= 2);
    assert.ok(result!.allMatches[0].score >= result!.allMatches[1].score);
  });

  it('assigns high confidence for score >= 0.7', () => {
    const result = suggestAliases('Amazon.com', aliases, 0.3);
    assert.ok(result !== null);
    assert.ok(result!.topMatch.score >= 0.7);
    assert.strictEqual(result!.confidence, 'high');
  });

  it('assigns medium confidence for score 0.5-0.7', () => {
    const result = suggestAliases('Amazon Store', aliases, 0.3);
    assert.ok(result !== null);
    const score = result!.topMatch.score;
    if (score >= 0.5 && score < 0.7) {
      assert.strictEqual(result!.confidence, 'medium');
    }
  });

  it('assigns low confidence for score < 0.5', () => {
    const result = suggestAliases('Amazon-ish', aliases, 0.2);
    assert.ok(result !== null);
    if (result!.topMatch.score < 0.5) {
      assert.strictEqual(result!.confidence, 'low');
    }
  });
});
