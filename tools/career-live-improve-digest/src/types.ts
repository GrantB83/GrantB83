// Type definitions for career-live-improve-digest

export interface RunEntry {
  company: string;
  title: string;
  action: 'scored' | 'applied' | 'skipped' | 'rejected';
  date: string;
  score?: number;
  gatePass?: boolean;
  reason?: string;
  source?: string;
}

export interface ScoreBands {
  excellent_9_10: number;
  good_7_8: number;
  medium_5_6: number;
  low_0_4: number;
}

export interface PatternCounts {
  [key: string]: number;
}

export interface Stats {
  period: {
    since?: string;
    until: string;
    totalDays: number;
  };
  totals: {
    entries: number;
    scored: number;
    applied: number;
    skipped: number;
    rejected: number;
  };
  scoreBands: ScoreBands;
  gateFails: {
    total: number;
    patterns: PatternCounts;
  };
  skipReasons: PatternCounts;
  rejectReasons: PatternCounts;
  sources: PatternCounts;
}

export interface DigestOptions {
  logPath?: string;
  summaryPath?: string;
  since?: string;
  outdir: string;
}
