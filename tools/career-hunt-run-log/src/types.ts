/**
 * Career Hunt Run Log - Type Definitions
 */

/**
 * Action taken on a job listing
 */
export type Action = 'scored' | 'applied' | 'skipped' | 'rejected';

/**
 * Normalized run entry
 */
export interface RunEntry {
  /** Company name [REQUIRED] */
  company: string;
  /** Job title [REQUIRED] */
  title: string;
  /** Score from career-jd-hard-gates-score (0-10, optional) */
  score?: number;
  /** Whether hard gates passed (optional) */
  gatePass?: boolean;
  /** Action taken [REQUIRED] */
  action: Action;
  /** Reason for skip/reject (optional) */
  reason?: string;
  /** Source of the listing (optional) */
  source?: string;
  /** Date of this entry (YYYY-MM-DD) */
  date: string;
}

/**
 * Hunt run summary (for --run flag)
 */
export interface HuntRunSummary {
  date: string;
  scored?: ScoredEntry[];
  applied?: AppliedEntry[];
  skipped?: SkippedEntry[];
  rejected?: SkippedEntry[];
}

/**
 * Scored entry from career-jd-hard-gates-score
 */
export interface ScoredEntry {
  company: string;
  title: string;
  score: number;
  gatePass: boolean;
  source?: string;
}

/**
 * Applied entry
 */
export interface AppliedEntry {
  company: string;
  title: string;
  source?: string;
}

/**
 * Skipped/rejected entry with reason
 */
export interface SkippedEntry {
  company: string;
  title: string;
  reason: string;
  source?: string;
}

/**
 * CLI options
 */
export interface CliOptions {
  run?: string;
  date?: string;
  scored?: string;
  applied?: string;
  skipped?: string;
  outdir?: string;
  notes?: string;
  help?: boolean;
}

/**
 * Runs summary for runs.md
 */
export interface RunsSummary {
  totalRuns: number;
  totalEntries: number;
  byAction: Record<Action, number>;
  latestRun: {
    date: string;
    entries: RunEntry[];
  } | null;
}

/**
 * Manifest for this invocation
 */
export interface Manifest {
  tool: string;
  version: string;
  timestamp: string;
  inputs: {
    runPath?: string;
    scoredPath?: string;
    appliedPath?: string;
    skippedPath?: string;
    notesPath?: string;
    date: string;
  };
  outputs: {
    runsJsonlPath: string;
    runsMarkdownPath: string;
    approvalPath: string;
    manifestPath: string;
  };
  summary: {
    entriesAdded: number;
    totalLines: number;
  };
}
