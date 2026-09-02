/**
 * Match claims against allowed facts
 */

import { AllowedFacts, ExtractedClaim, MatchResult } from './types.js';
import {
  normalizeClaim,
  tokenize,
  extractNumericTokens,
  extractEmployerTokens,
  extractTitleTokens,
} from './extractor.js';

/**
 * Flatten facts from flexible JSON structure into normalized strings
 */
export function flattenFacts(facts: AllowedFacts): string[] {
  const flattened: string[] = [];
  
  // Handle common structures
  if (facts.claims && Array.isArray(facts.claims)) {
    flattened.push(...facts.claims);
  }
  
  if (facts.bullets && Array.isArray(facts.bullets)) {
    flattened.push(...facts.bullets);
  }
  
  // Handle flat string array at root
  if (Array.isArray(facts)) {
    return facts.map(f => String(f));
  }
  
  // Recursively extract strings from nested objects
  Object.entries(facts).forEach(([key, value]) => {
    if (key === 'claims' || key === 'bullets') return; // Already handled
    
    if (Array.isArray(value)) {
      flattened.push(...value.map(v => String(v)));
    } else if (typeof value === 'string') {
      flattened.push(value);
    }
  });
  
  return flattened;
}

/**
 * Match a single claim against all facts
 */
export function matchClaim(claim: ExtractedClaim, facts: string[]): MatchResult {
  const normalizedFacts = facts.map(f => normalizeClaim(f));
  
  // Extract tokens from claim
  const claimTokens = tokenize(claim.normalized);
  const claimNumerics = extractNumericTokens(claim.text);
  const claimEmployers = extractEmployerTokens(claim.text);
  const claimTitles = extractTitleTokens(claim.text);
  
  // Check for numeric tokens in claim
  const hasNumerics = claimNumerics.length > 0;
  const hasEmployers = claimEmployers.length > 0;
  const hasTitles = claimTitles.length > 0;
  
  // Try to find a matching fact
  interface BestMatch {
    fact: string;
    overlap: number;
    index: number;
  }
  
  let bestMatch: BestMatch | null = null;
  let bestOverlap = 0;
  
  normalizedFacts.forEach((fact, index) => {
    const factTokens = tokenize(fact);
    const overlap = computeTokenOverlap(claimTokens, factTokens);
    
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = { fact: facts[index], overlap, index };
    }
  });
  
  // Determine match status
  const flagged: string[] = [];
  
  // High confidence match: >60% token overlap
  if (bestMatch !== null && bestOverlap >= 0.6) {
    const match: { fact: string; overlap: number; index: number } = bestMatch;
    
    // If claim has numerics, verify they appear in the matched fact
    if (hasNumerics) {
      const matchedFactNumerics = extractNumericTokens(match.fact);
      const numericsMissing = claimNumerics.filter(n => 
        !matchedFactNumerics.some(fn => fn.includes(n) || n.includes(fn))
      );
      
      if (numericsMissing.length > 0) {
        flagged.push(...numericsMissing);
        return {
          claim,
          status: 'suspicious',
          confidence: 'low',
          matchedFact: match.fact,
          reason: `Claim contains numbers not in matched fact: ${numericsMissing.join(', ')}`,
          flagged,
        };
      }
    }
    
    // If claim has employers, verify they appear in facts
    if (hasEmployers) {
      const allFactsText = facts.join(' ').toLowerCase();
      const employersMissing = claimEmployers.filter(e => !allFactsText.includes(e));
      
      if (employersMissing.length > 0) {
        flagged.push(...employersMissing);
        return {
          claim,
          status: 'suspicious',
          confidence: 'low',
          matchedFact: match.fact,
          reason: `Claim mentions employers not in facts: ${employersMissing.join(', ')}`,
          flagged,
        };
      }
    }
    
    return {
      claim,
      status: 'matched',
      confidence: 'high',
      matchedFact: match.fact,
      reason: `High token overlap (${Math.round(bestOverlap * 100)}%)`,
      flagged: [],
    };
  }
  
  // Medium confidence match: 40-60% overlap
  if (bestMatch !== null && bestOverlap >= 0.4) {
    const match: { fact: string; overlap: number; index: number } = bestMatch;
    
    // Check for suspicious patterns
    if (hasNumerics) {
      flagged.push(...claimNumerics);
    }
    if (hasEmployers) {
      flagged.push(...claimEmployers);
    }
    
    if (flagged.length > 0) {
      return {
        claim,
        status: 'suspicious',
        confidence: 'medium',
        matchedFact: match.fact,
        reason: `Medium overlap (${Math.round(bestOverlap * 100)}%), but contains unverified tokens`,
        flagged,
      };
    }
    
    return {
      claim,
      status: 'matched',
      confidence: 'medium',
      matchedFact: match.fact,
      reason: `Medium token overlap (${Math.round(bestOverlap * 100)}%)`,
      flagged: [],
    };
  }
  
  // Low/no match: flag as unmatched
  if (hasNumerics) flagged.push(...claimNumerics);
  if (hasEmployers) flagged.push(...claimEmployers);
  if (hasTitles) flagged.push(...claimTitles);
  
  return {
    claim,
    status: 'unmatched',
    confidence: 'none',
    matchedFact: null,
    reason: `No sufficient token overlap (best: ${bestMatch !== null ? Math.round(bestOverlap * 100) : 0}%)`,
    flagged,
  };
}

/**
 * Compute token overlap between two token sets (Jaccard similarity)
 */
function computeTokenOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }
  
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

/**
 * Match all claims against facts
 */
export function matchAllClaims(
  claims: ExtractedClaim[],
  facts: AllowedFacts
): MatchResult[] {
  const flatFacts = flattenFacts(facts);
  return claims.map(claim => matchClaim(claim, flatFacts));
}
