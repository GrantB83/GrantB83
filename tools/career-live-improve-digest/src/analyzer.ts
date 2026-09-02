import { RunEntry, Stats, PatternCounts, ScoreBands } from './types';

export function analyzeEntries(entries: RunEntry[], sinceDate?: string): Stats {
  const totals = {
    entries: entries.length,
    scored: 0,
    applied: 0,
    skipped: 0,
    rejected: 0
  };

  const scoreBands: ScoreBands = {
    excellent_9_10: 0,
    good_7_8: 0,
    medium_5_6: 0,
    low_0_4: 0
  };

  const gateFails: { total: number; patterns: PatternCounts } = {
    total: 0,
    patterns: {}
  };

  const skipReasons: PatternCounts = {};
  const rejectReasons: PatternCounts = {};
  const sources: PatternCounts = {};

  let earliestDate = '';
  let latestDate = '';

  for (const entry of entries) {
    // Update date range
    if (!earliestDate || entry.date < earliestDate) {
      earliestDate = entry.date;
    }
    if (!latestDate || entry.date > latestDate) {
      latestDate = entry.date;
    }

    // Count by action
    totals[entry.action]++;

    // Score bands
    if (entry.score !== undefined) {
      if (entry.score >= 9) {
        scoreBands.excellent_9_10++;
      } else if (entry.score >= 7) {
        scoreBands.good_7_8++;
      } else if (entry.score >= 5) {
        scoreBands.medium_5_6++;
      } else {
        scoreBands.low_0_4++;
      }

      // Gate fails
      if (entry.gatePass === false) {
        gateFails.total++;
        const pattern = inferGateFailPattern(entry);
        gateFails.patterns[pattern] = (gateFails.patterns[pattern] || 0) + 1;
      }
    }

    // Skip reasons
    if (entry.action === 'skipped' && entry.reason) {
      const normalized = normalizeReason(entry.reason);
      skipReasons[normalized] = (skipReasons[normalized] || 0) + 1;
    }

    // Reject reasons
    if (entry.action === 'rejected' && entry.reason) {
      const normalized = normalizeReason(entry.reason);
      rejectReasons[normalized] = (rejectReasons[normalized] || 0) + 1;
    }

    // Sources
    if (entry.source) {
      sources[entry.source] = (sources[entry.source] || 0) + 1;
    }
  }

  // Calculate period
  const since = sinceDate || earliestDate;
  const until = latestDate;
  const sinceMs = new Date(since).getTime();
  const untilMs = new Date(until).getTime();
  const totalDays = Math.ceil((untilMs - sinceMs) / (1000 * 60 * 60 * 24)) + 1;

  return {
    period: {
      since: sinceDate || earliestDate,
      until: latestDate,
      totalDays
    },
    totals,
    scoreBands,
    gateFails,
    skipReasons,
    rejectReasons,
    sources
  };
}

function normalizeReason(reason: string): string {
  // Lowercase and trim
  let normalized = reason.toLowerCase().trim();
  
  // Common normalizations
  if (normalized.includes('junior') || normalized.includes('too early')) {
    return 'Too junior';
  }
  if (normalized.includes('dnc') || normalized.includes('do not contact')) {
    return 'DNC list company';
  }
  if (normalized.includes('comp') || normalized.includes('salary') || normalized.includes('below floor')) {
    return 'Comp below floor';
  }
  if (normalized.includes('remote') || normalized.includes('location')) {
    return 'Remote/location mismatch';
  }
  if (normalized.includes('team size') || normalized.includes('too small')) {
    return 'Team size gate';
  }
  
  // Return original if no match
  return reason;
}

function inferGateFailPattern(entry: RunEntry): string {
  // Use reason if available
  if (entry.reason) {
    return normalizeReason(entry.reason);
  }
  
  // Infer from title/company patterns
  const title = entry.title.toLowerCase();
  if (title.includes('remote') || title.includes('hybrid')) {
    return 'Remote policy';
  }
  if (title.includes('startup') || title.includes('small team')) {
    return 'Team size';
  }
  
  return 'Gate fail (unspecified)';
}

export function sortPatternsByCount(patterns: PatternCounts): [string, number][] {
  return Object.entries(patterns).sort((a, b) => b[1] - a[1]);
}
