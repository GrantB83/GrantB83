/**
 * Generate runs.md summary and other output files
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { RunEntry, RunsSummary, Manifest, Action } from './types.js';

/**
 * Build summary from all entries
 */
export function buildSummary(entries: RunEntry[]): RunsSummary {
  const byAction: Record<Action, number> = {
    scored: 0,
    applied: 0,
    skipped: 0,
    rejected: 0,
  };

  const runDates = new Set<string>();

  for (const entry of entries) {
    byAction[entry.action]++;
    runDates.add(entry.date);
  }

  // Find latest run
  let latestRun: { date: string; entries: RunEntry[] } | null = null;
  if (runDates.size > 0) {
    const sortedDates = Array.from(runDates).sort().reverse();
    const latestDate = sortedDates[0];
    const latestEntries = entries.filter(e => e.date === latestDate);
    latestRun = { date: latestDate, entries: latestEntries };
  }

  return {
    totalRuns: runDates.size,
    totalEntries: entries.length,
    byAction,
    latestRun,
  };
}

/**
 * Generate runs.md from summary
 */
export function generateRunsMarkdown(summary: RunsSummary): string {
  let md = '# Career Hunt Runs\n\n';
  md += '## Summary\n\n';
  md += `- **Total Runs:** ${summary.totalRuns}\n`;
  md += `- **Total Entries:** ${summary.totalEntries}\n`;
  md += '\n';

  md += '### By Action\n\n';
  md += `- Scored: ${summary.byAction.scored}\n`;
  md += `- Applied: ${summary.byAction.applied}\n`;
  md += `- Skipped: ${summary.byAction.skipped}\n`;
  md += `- Rejected: ${summary.byAction.rejected}\n`;
  md += '\n';

  if (summary.latestRun) {
    md += '## Latest Run\n\n';
    md += `**Date:** ${summary.latestRun.date}\n\n`;
    md += `**Entries:** ${summary.latestRun.entries.length}\n\n`;

    const byActionLatest: Record<Action, RunEntry[]> = {
      scored: [],
      applied: [],
      skipped: [],
      rejected: [],
    };

    for (const entry of summary.latestRun.entries) {
      byActionLatest[entry.action].push(entry);
    }

    for (const action of ['scored', 'applied', 'skipped', 'rejected'] as Action[]) {
      const actionEntries = byActionLatest[action];
      if (actionEntries.length > 0) {
        md += `### ${action.charAt(0).toUpperCase() + action.slice(1)}\n\n`;
        for (let i = 0; i < actionEntries.length; i++) {
          const entry = actionEntries[i];
          md += `${i + 1}. **${entry.company}** - ${entry.title}`;

          const details: string[] = [];
          if (entry.score !== undefined) {
            details.push(`score: ${entry.score}/10`);
          }
          if (entry.gatePass !== undefined) {
            details.push(`gates: ${entry.gatePass ? 'pass' : 'fail'}`);
          }
          if (entry.reason) {
            details.push(`reason: ${entry.reason}`);
          }
          if (entry.source) {
            details.push(`source: ${entry.source}`);
          }

          if (details.length > 0) {
            md += ` (${details.join(', ')})`;
          }

          md += '\n';
        }
        md += '\n';
      }
    }
  }

  return md;
}

/**
 * Generate APPROVAL.md
 */
export function generateApprovalMarkdown(): string {
  let md = '# APPROVAL - Career Hunt Run Log\n\n';
  md += '## Purpose\n\n';
  md += 'Offline durable log for career hunt tracking. Append-only, never rewrites prior lines.\n\n';

  md += '## Ownership\n\n';
  md += '- **Career bot owns apply decisions** - This tool never applies to jobs\n';
  md += '- **Hard gates unchanged** - No invented compensation or scores\n';
  md += '- **Facts-only tracking** - Never invents employer names or titles\n\n';

  md += '## Safety Gates\n\n';
  md += '1. ✅ **Offline only** - No job board APIs or network calls\n';
  md += '2. ✅ **Append-only** - Never rewrites existing runs.jsonl lines\n';
  md += '3. ✅ **No invented data** - Only logs provided scores and facts\n';
  md += '4. ✅ **Read-only tracking** - Does not apply to jobs\n';
  md += '5. ✅ **Exit 1 on bad input** - Malformed JSON or missing required fields rejected\n\n';

  md += '## Review Checklist\n\n';
  md += '- [ ] Review runs.md for latest run summary\n';
  md += '- [ ] Verify entries match intent (scored/applied/skipped/rejected)\n';
  md += '- [ ] Check for any malformed entries or validation errors\n';
  md += '- [ ] Confirm no invented scores or employer names\n\n';

  md += '## Next Steps\n\n';
  md += '1. Review runs.md\n';
  md += '2. Use data for live-improve decisions\n';
  md += '3. Career bot owns all application actions\n';

  return md;
}

/**
 * Generate manifest.json
 */
export function generateManifest(opts: {
  inputs: Manifest['inputs'];
  outputs: Manifest['outputs'];
  entriesAdded: number;
  totalLines: number;
}): Manifest {
  return {
    tool: 'career-hunt-run-log',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: opts.inputs,
    outputs: opts.outputs,
    summary: {
      entriesAdded: opts.entriesAdded,
      totalLines: opts.totalLines,
    },
  };
}

/**
 * Write all output files
 */
export function writeOutputs(opts: {
  outdir: string;
  runsMarkdown: string;
  approvalMarkdown: string;
  manifest: Manifest;
}): void {
  mkdirSync(opts.outdir, { recursive: true });

  const runsPath = `${opts.outdir}/runs.md`;
  const approvalPath = `${opts.outdir}/APPROVAL.md`;
  const manifestPath = `${opts.outdir}/manifest.json`;

  writeFileSync(runsPath, opts.runsMarkdown, 'utf-8');
  writeFileSync(approvalPath, opts.approvalMarkdown, 'utf-8');
  writeFileSync(manifestPath, JSON.stringify(opts.manifest, null, 2), 'utf-8');
}
