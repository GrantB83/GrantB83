/**
 * Career Cover Letter Facts Lint - Type Definitions
 */

/**
 * Allowed facts from career-os (flexible schema)
 */
export interface AllowedFacts {
  claims?: string[];
  bullets?: string[];
  [key: string]: any; // Allow flexible structure
}

/**
 * Extracted claim from draft
 */
export interface ExtractedClaim {
  /** Original text of the claim */
  text: string;
  /** Normalized text for matching */
  normalized: string;
  /** Sentence/paragraph index in draft */
  index: number;
  /** Type: sentence, metric, employer, title */
  type: 'sentence' | 'metric' | 'employer' | 'title';
}

/**
 * Match result for a claim
 */
export interface MatchResult {
  claim: ExtractedClaim;
  status: 'matched' | 'unmatched' | 'suspicious';
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedFact: string | null;
  reason: string;
  flagged: string[]; // Specific tokens/patterns flagged
}

/**
 * Full lint report
 */
export interface LintReport {
  draft: string;
  totalClaims: number;
  matched: MatchResult[];
  unmatched: MatchResult[];
  suspicious: MatchResult[];
  summary: {
    matchedCount: number;
    unmatchedCount: number;
    suspiciousCount: number;
    safeToApply: boolean;
  };
  factsOnlyReminder: string;
}

/**
 * CLI options
 */
export interface CliOptions {
  draft?: string;
  facts?: string;
  outdir?: string;
  strict?: boolean;
  help?: boolean;
}

/**
 * Output manifest
 */
export interface Manifest {
  tool: string;
  version: string;
  timestamp: string;
  inputs: {
    draftPath: string;
    factsPath: string;
    strictMode: boolean;
  };
  outputs: string[];
  summary: {
    totalClaims: number;
    matched: number;
    unmatched: number;
    suspicious: number;
  };
}
