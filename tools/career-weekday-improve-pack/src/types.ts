/**
 * Types for career-weekday-improve-pack
 */

export interface CliOptions {
  outdir: string;
  log?: string;
  summary?: string;
  since?: string;
  runDigest?: boolean;
  digestOutdir?: string;
}

export interface PackResult {
  outdir: string;
  outputs: string[];
  warnings: string[];
  manifest: PackManifest;
}

export interface PackManifest {
  tool: string;
  version: string;
  timestamp: string;
  inputs: {
    logPath?: string;
    summaryPath?: string;
    digestOutdir?: string;
    since?: string;
    runDigest?: boolean;
  };
  outputs: string[];
  checks: {
    hasLearningDraft: boolean;
    hasStats: boolean;
    hasRunsSummary: boolean;
  };
}

export interface DigestStats {
  period?: {
    since?: string;
    until?: string;
    totalDays?: number;
  };
  totals: {
    entries: number;
    scored: number;
    applied: number;
    skipped: number;
    rejected: number;
  };
  scoreBands?: Record<string, number>;
  gateFails?: {
    total: number;
    patterns?: Record<string, number>;
  };
  skipReasons?: Record<string, number>;
  sources?: Record<string, number>;
}
