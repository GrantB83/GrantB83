import { AliasPattern, MerchantSuggestion } from './types.js';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): Set<string> {
  const normalized = normalizeText(text);
  return new Set(normalized.split(' ').filter(t => t.length > 0));
}

export function jaccardSimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  
  if (union.size === 0) {
    return 0;
  }
  
  return intersection.size / union.size;
}

export function scoreAgainstAlias(
  merchant: string,
  alias: AliasPattern
): { score: number; matchedPattern?: string } {
  const merchantTokens = tokenize(merchant);
  let bestScore = 0;
  let bestPattern: string | undefined;

  for (const pattern of alias.patterns) {
    const patternTokens = tokenize(pattern);
    const score = jaccardSimilarity(merchantTokens, patternTokens);
    
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  return { score: bestScore, matchedPattern: bestPattern };
}

export function suggestAliases(
  merchant: string,
  aliases: AliasPattern[],
  minScore: number
): MerchantSuggestion | null {
  const allMatches: Array<{
    alias: string;
    score: number;
    matchedPattern?: string;
  }> = [];

  for (const alias of aliases) {
    const { score, matchedPattern } = scoreAgainstAlias(merchant, alias);
    
    if (score >= minScore) {
      allMatches.push({
        alias: alias.alias,
        score,
        matchedPattern
      });
    }
  }

  if (allMatches.length === 0) {
    return null;
  }

  allMatches.sort((a, b) => b.score - a.score);

  const topScore = allMatches[0].score;
  let confidence: 'high' | 'medium' | 'low';
  
  if (topScore >= 0.7) {
    confidence = 'high';
  } else if (topScore >= 0.5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    merchant,
    topMatch: allMatches[0],
    allMatches,
    confidence
  };
}
