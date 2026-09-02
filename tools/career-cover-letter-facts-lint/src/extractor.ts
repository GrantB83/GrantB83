/**
 * Extract claims from cover letter draft
 */

import { ExtractedClaim } from './types.js';

/**
 * Extract sentence-level claims from draft text
 */
export function extractClaims(draftText: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  
  // Split into sentences
  const sentences = draftText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10); // Skip very short fragments
  
  sentences.forEach((sentence, index) => {
    const normalized = normalizeClaim(sentence);
    
    // Classify claim type
    const type = classifyClaimType(sentence);
    
    claims.push({
      text: sentence,
      normalized,
      index,
      type,
    });
  });
  
  return claims;
}

/**
 * Normalize text for matching (lowercase, remove punctuation, extra spaces)
 */
export function normalizeClaim(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s$%]/g, ' ') // Keep $ and % for amounts
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classify claim type based on content
 */
function classifyClaimType(text: string): ExtractedClaim['type'] {
  const lower = text.toLowerCase();
  
  // Check for metrics (numbers with units, percentages, dollar amounts)
  if (/\d+(\.\d+)?[%$kmb]|\d+\s*(percent|percentage|million|thousand|days|hours|teams|people)/i.test(text)) {
    return 'metric';
  }
  
  // Check for employer mentions
  if (/\b(at|with|for)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\b/.test(text) || /\bcompany\b/i.test(text)) {
    return 'employer';
  }
  
  // Check for title/role mentions
  if (/\b(as|role|position|manager|director|lead|engineer|analyst)\b/i.test(lower)) {
    return 'title';
  }
  
  return 'sentence';
}

/**
 * Extract all number/currency tokens from text
 */
export function extractNumericTokens(text: string): string[] {
  const tokens: string[] = [];
  
  // Match dollar amounts: $X, $XM, $XK, $X.XM, etc.
  const dollarMatches = text.match(/\$[\d,]+(\.\d+)?[kmb]?/gi);
  if (dollarMatches) {
    tokens.push(...dollarMatches.map(t => t.toLowerCase()));
  }
  
  // Match percentages: X%, XX.X%
  const percentMatches = text.match(/\d+(\.\d+)?%/g);
  if (percentMatches) {
    tokens.push(...percentMatches);
  }
  
  // Match standalone numbers with context (days, people, teams, etc.)
  const numberContextMatches = text.match(/\d+\s*(days?|people|teams?|hours?|years?|months?)/gi);
  if (numberContextMatches) {
    tokens.push(...numberContextMatches.map(t => t.toLowerCase().replace(/\s+/g, ' ')));
  }
  
  return tokens;
}

/**
 * Extract employer names from text
 */
export function extractEmployerTokens(text: string): string[] {
  const tokens: string[] = [];
  
  // Match capitalized phrases after "at", "with", "for", "joining"
  const employerMatches = text.match(/\b(?:at|with|for|joining)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  if (employerMatches) {
    tokens.push(...employerMatches.map(m => {
      const parts = m.split(/\s+/);
      return parts.slice(1).join(' ').toLowerCase(); // Remove "at/with/for/joining"
    }));
  }
  
  return tokens;
}

/**
 * Extract title/role keywords from text
 */
export function extractTitleTokens(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();
  
  const titleKeywords = [
    'manager', 'director', 'lead', 'head', 'vp', 'vice president',
    'engineer', 'analyst', 'specialist', 'coordinator', 'consultant',
    'operations', 'product', 'strategy', 'finance', 'marketing'
  ];
  
  titleKeywords.forEach(keyword => {
    if (lower.includes(keyword)) {
      tokens.push(keyword);
    }
  });
  
  return tokens;
}

/**
 * Tokenize text into meaningful words (skip common stopwords)
 */
export function tokenize(text: string): string[] {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'i', 'my', 'me', 'we', 'our'
  ]);
  
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word));
}
