/**
 * Career Application Packet Assemble - Type Definitions
 */

/**
 * CLI options
 */
export interface CliOptions {
  outdir?: string;
  score?: string;
  coverLint?: string;
  facts?: string;
  jd?: string;
  runScore?: boolean;
  runCoverLint?: boolean;
  draft?: string;
  help?: boolean;
}

/**
 * Assembled packet manifest
 */
export interface PacketManifest {
  tool: string;
  version: string;
  timestamp: string;
  packetDate: string;
  inputs: {
    scoreReportPath: string | null;
    coverLintReportPath: string | null;
    factsPath: string | null;
    jdPath: string | null;
  };
  runOptions: {
    ranScore: boolean;
    ranCoverLint: boolean;
  };
  outputs: string[];
  checks: {
    hasScoreReport: boolean;
    hasCoverLintReport: boolean;
    hasFacts: boolean;
    hasApproval: boolean;
  };
}

/**
 * Packet assembly result
 */
export interface PacketResult {
  success: boolean;
  outdir: string;
  manifest: PacketManifest;
  warnings: string[];
}

/**
 * Simplified score summary (extracted from score report)
 */
export interface ScoreSummary {
  company: string | null;
  title: string | null;
  totalScore: number;
  verdict: string;
  gatesPassed: boolean;
}

/**
 * Simplified lint summary (extracted from lint report)
 */
export interface LintSummary {
  totalClaims: number;
  matched: number;
  unmatched: number;
  suspicious: number;
  safeToApply: boolean;
}
