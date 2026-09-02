/**
 * Normalize hunt run entries from various input formats
 */

import {
  RunEntry,
  HuntRunSummary,
  ScoredEntry,
  AppliedEntry,
  SkippedEntry,
  Action,
} from './types.js';

/**
 * Validate that a run entry has required fields
 */
export function validateEntry(entry: RunEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entry.company || entry.company.trim() === '') {
    errors.push('Missing required field: company');
  }

  if (!entry.title || entry.title.trim() === '') {
    errors.push('Missing required field: title');
  }

  const validActions: Action[] = ['scored', 'applied', 'skipped', 'rejected'];
  if (!entry.action || !validActions.includes(entry.action)) {
    errors.push(`Invalid or missing action: ${entry.action || 'undefined'}`);
  }

  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push(`Invalid or missing date: ${entry.date || 'undefined'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize a scored entry
 */
function normalizeScoredEntry(entry: ScoredEntry, date: string): RunEntry {
  return {
    company: entry.company.trim(),
    title: entry.title.trim(),
    score: entry.score,
    gatePass: entry.gatePass,
    action: 'scored',
    source: entry.source?.trim(),
    date,
  };
}

/**
 * Normalize an applied entry
 */
function normalizeAppliedEntry(entry: AppliedEntry, date: string): RunEntry {
  return {
    company: entry.company.trim(),
    title: entry.title.trim(),
    action: 'applied',
    source: entry.source?.trim(),
    date,
  };
}

/**
 * Normalize a skipped/rejected entry
 */
function normalizeSkippedEntry(
  entry: SkippedEntry,
  date: string,
  action: 'skipped' | 'rejected'
): RunEntry {
  return {
    company: entry.company.trim(),
    title: entry.title.trim(),
    action,
    reason: entry.reason.trim(),
    source: entry.source?.trim(),
    date,
  };
}

/**
 * Normalize entries from a hunt run summary
 */
export function normalizeFromSummary(summary: HuntRunSummary): RunEntry[] {
  const entries: RunEntry[] = [];
  const date = summary.date;

  if (summary.scored) {
    for (const scored of summary.scored) {
      entries.push(normalizeScoredEntry(scored, date));
    }
  }

  if (summary.applied) {
    for (const applied of summary.applied) {
      entries.push(normalizeAppliedEntry(applied, date));
    }
  }

  if (summary.skipped) {
    for (const skipped of summary.skipped) {
      entries.push(normalizeSkippedEntry(skipped, date, 'skipped'));
    }
  }

  if (summary.rejected) {
    for (const rejected of summary.rejected) {
      entries.push(normalizeSkippedEntry(rejected, date, 'rejected'));
    }
  }

  return entries;
}

/**
 * Normalize entries from individual flag files
 */
export function normalizeFromFlags(opts: {
  date: string;
  scored?: ScoredEntry[];
  applied?: AppliedEntry[];
  skipped?: SkippedEntry[];
}): RunEntry[] {
  const entries: RunEntry[] = [];

  if (opts.scored) {
    for (const scored of opts.scored) {
      entries.push(normalizeScoredEntry(scored, opts.date));
    }
  }

  if (opts.applied) {
    for (const applied of opts.applied) {
      entries.push(normalizeAppliedEntry(applied, opts.date));
    }
  }

  if (opts.skipped) {
    for (const skipped of opts.skipped) {
      entries.push(normalizeSkippedEntry(skipped, opts.date, 'skipped'));
    }
  }

  return entries;
}

/**
 * Validate all entries in a batch
 */
export function validateAll(entries: RunEntry[]): {
  valid: RunEntry[];
  invalid: Array<{ entry: RunEntry; errors: string[] }>;
} {
  const valid: RunEntry[] = [];
  const invalid: Array<{ entry: RunEntry; errors: string[] }> = [];

  for (const entry of entries) {
    const result = validateEntry(entry);
    if (result.valid) {
      valid.push(entry);
    } else {
      invalid.push({ entry, errors: result.errors });
    }
  }

  return { valid, invalid };
}
