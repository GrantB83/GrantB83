/**
 * Career JD Hard Gates Score - Scoring Logic
 * Scores job descriptions on 5 dimensions (0-2 each, total /10)
 */

import { Scores, ParsedJD, HardGatesEvaluation, Scorecard, Verdict } from './types.js';

/**
 * Score job description across all dimensions
 */
export function scoreJD(parsed: ParsedJD, gates: HardGatesEvaluation): Scores {
  const titleMatch = scoreTitleMatch(parsed);
  const proofPointMatch = scoreProofPointMatch(parsed);
  const seniority = scoreSeniority(parsed);
  const payConfidence = scorePayConfidence(parsed);
  const commuteOrWfhFit = scoreCommuteOrWfhFit(parsed);
  
  const total = titleMatch + proofPointMatch + seniority + payConfidence + commuteOrWfhFit;
  
  return {
    titleMatch,
    proofPointMatch,
    seniority,
    payConfidence,
    commuteOrWfhFit,
    total,
  };
}

/**
 * Score title match (0-2)
 * How well does the title match target functions and levels?
 */
function scoreTitleMatch(parsed: ParsedJD): number {
  if (!parsed.title) return 0;
  
  const titleLower = parsed.title.toLowerCase();
  let score = 0;
  
  // Strong title keywords
  const strongKeywords = ['director', 'head of', 'vp', 'vice president'];
  const goodKeywords = ['operations manager', 'product manager', 'strategy', 'senior manager'];
  
  for (const keyword of strongKeywords) {
    if (titleLower.includes(keyword)) {
      score = 2;
      break;
    }
  }
  
  if (score === 0) {
    for (const keyword of goodKeywords) {
      if (titleLower.includes(keyword)) {
        score = 1;
        break;
      }
    }
  }
  
  // Boost for operations/product/strategy
  if (parsed.functionKeywords.length >= 2) {
    score = Math.min(2, score + 0.5);
  }
  
  return Math.round(score);
}

/**
 * Score proof point match (0-2)
 * How well do the requirements match resume proof points?
 */
function scoreProofPointMatch(parsed: ParsedJD): number {
  const proofCount = parsed.proofKeywords.length;
  
  if (proofCount === 0) return 0;
  if (proofCount >= 6) return 2;
  if (proofCount >= 3) return 1;
  
  return 0;
}

/**
 * Score seniority (0-2)
 * How senior is the role?
 */
function scoreSeniority(parsed: ParsedJD): number {
  const seniorityCount = parsed.seniorityKeywords.length;
  
  const hasDirector = parsed.seniorityKeywords.some(k => 
    k.includes('director') || k.includes('vp') || k.includes('head')
  );
  
  if (hasDirector) return 2;
  if (seniorityCount >= 2) return 1;
  if (seniorityCount >= 1) return 1;
  
  return 0;
}

/**
 * Score pay confidence (0-2)
 * How confident are we about the compensation?
 */
function scorePayConfidence(parsed: ParsedJD): number {
  if (!parsed.compensation) return 0;
  
  // Has explicit dollar amounts
  if (/\$\s*\d{2,3}[,k]/.test(parsed.compensation)) {
    return 2;
  }
  
  // Has some compensation info
  return 1;
}

/**
 * Score commute/WFH fit (0-2)
 * How good is the location fit?
 */
function scoreCommuteOrWfhFit(parsed: ParsedJD): number {
  // Tesla or Remote = perfect
  if (parsed.isTesla || parsed.isRemote || parsed.isWFH) {
    return 2;
  }
  
  // Austin with some proximity indicators
  if (parsed.location?.toLowerCase().includes('austin')) {
    const locLower = parsed.location.toLowerCase();
    if (locLower.includes('south') || locLower.includes('southwest')) {
      return 2;
    }
    return 1;
  }
  
  return 0;
}

/**
 * Determine final verdict
 */
export function determineVerdict(gates: HardGatesEvaluation, scores: Scores): Verdict {
  // If any hard gate fails, skip
  if (!gates.overallPass) {
    return 'skip';
  }
  
  // Based on total score
  if (scores.total >= 8) {
    return 'apply';
  }
  
  if (scores.total >= 6) {
    return 'watch';
  }
  
  return 'discard';
}

/**
 * Build complete scorecard
 */
export function buildScorecard(
  parsed: ParsedJD,
  gates: HardGatesEvaluation,
  scores: Scores,
  verdict: Verdict
): Scorecard {
  return {
    company: parsed.company,
    title: parsed.title,
    gates,
    scores,
    verdict,
    factsOnlyReminder: 'Resume claims must already exist in career-os. Do not invent metrics or proof points.',
  };
}
