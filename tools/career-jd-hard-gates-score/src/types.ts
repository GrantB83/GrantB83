/**
 * Career JD Hard Gates Score - Type Definitions
 */

/**
 * Hard gates configuration
 */
export interface HardGates {
  /** Do Not Contact - companies to skip */
  dncList: string[];
  /** Annual USD compensation floor (null = unlisted OK) */
  annualUSDFloor: number | null;
  /** Handling for unknown gate values: 'skip' or 'watch' */
  unknownHandling: 'skip' | 'watch';
}

/**
 * Default hard gates
 */
export const DEFAULT_HARD_GATES: HardGates = {
  dncList: [
    'J.D. Abrams',
    'J. D. Abrams',
    'JD Abrams',
    'Zachry',
    'Capitol Aggregates',
  ],
  annualUSDFloor: null,
  unknownHandling: 'watch',
};

/**
 * Hard gate evaluation result
 */
export interface GateResult {
  /** Gate name */
  gate: string;
  /** Pass, fail, or unknown */
  status: 'pass' | 'fail' | 'unknown';
  /** Explanation */
  reason: string;
  /** Confidence: high, medium, low */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * All hard gates evaluation
 */
export interface HardGatesEvaluation {
  dnc: GateResult;
  comp: GateResult;
  location: GateResult;
  function: GateResult;
  seniority: GateResult;
  /** Overall pass (all gates pass or pass-with-caution) */
  overallPass: boolean;
}

/**
 * Score dimensions (0-2 each, total /10)
 */
export interface Scores {
  titleMatch: number;
  proofPointMatch: number;
  seniority: number;
  payConfidence: number;
  commuteOrWfhFit: number;
  total: number;
}

/**
 * Final verdict
 */
export type Verdict = 'apply' | 'watch' | 'discard' | 'skip';

/**
 * Complete scorecard
 */
export interface Scorecard {
  company: string | null;
  title: string | null;
  gates: HardGatesEvaluation;
  scores: Scores;
  verdict: Verdict;
  factsOnlyReminder: string;
}

/**
 * Parsed job description data
 */
export interface ParsedJD {
  company: string | null;
  title: string | null;
  location: string | null;
  compensation: string | null;
  description: string;
  isTesla: boolean;
  isRemote: boolean;
  isWFH: boolean;
  seniorityKeywords: string[];
  functionKeywords: string[];
  titleKeywords: string[];
  proofKeywords: string[];
}

/**
 * CLI options
 */
export interface CliOptions {
  jd?: string;
  gates?: string;
  company?: string;
  title?: string;
  outdir?: string;
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
    jdPath: string;
    gatesPath: string | null;
    companyOverride: string | null;
    titleOverride: string | null;
  };
  outputs: string[];
}
