/**
 * Assembler logic for career-weekday-improve-pack
 */

import { existsSync } from 'node:fs';
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import type { CliOptions, PackResult, PackManifest, DigestStats } from './types.js';

export async function assemblePack(options: CliOptions): Promise<PackResult> {
  const outdir = resolve(options.outdir);
  const warnings: string[] = [];
  const outputs: string[] = [];

  // Create output directory
  await mkdir(outdir, { recursive: true });

  // Resolve digest outdir
  let digestOutdir: string;
  if (options.runDigest) {
    digestOutdir = await runDigestTool(options, warnings);
  } else {
    digestOutdir = resolve(options.digestOutdir!);
    if (!existsSync(digestOutdir)) {
      throw new Error(`Digest output directory not found: ${digestOutdir}`);
    }
  }

  // Check for digest outputs
  const learningDraftPath = join(digestOutdir, 'LEARNING-DRAFT.md');
  const statsPath = join(digestOutdir, 'stats.json');
  
  const hasLearningDraft = existsSync(learningDraftPath);
  const hasStats = existsSync(statsPath);

  if (!hasLearningDraft) {
    warnings.push('LEARNING-DRAFT.md not found in digest output');
  }

  if (!hasStats) {
    warnings.push('stats.json not found in digest output');
  }

  // Copy digest outputs
  if (hasLearningDraft) {
    const destPath = join(outdir, 'LEARNING-DRAFT.md');
    await copyFile(learningDraftPath, destPath);
    outputs.push(destPath);
  }

  if (hasStats) {
    const destPath = join(outdir, 'stats.json');
    await copyFile(statsPath, destPath);
    outputs.push(destPath);
  }

  // Copy runs.md if available
  if (options.summary && existsSync(options.summary)) {
    const destPath = join(outdir, 'runs.md');
    await copyFile(resolve(options.summary), destPath);
    outputs.push(destPath);
  } else if (options.log) {
    // Look for runs.md in same directory as runs.jsonl
    const logDir = resolve(options.log, '..');
    const runsMdPath = join(logDir, 'runs.md');
    if (existsSync(runsMdPath)) {
      const destPath = join(outdir, 'runs.md');
      await copyFile(runsMdPath, destPath);
      outputs.push(destPath);
    }
  }

  // Load stats for PACK.md
  let stats: DigestStats | null = null;
  if (hasStats) {
    const statsContent = await readFile(statsPath, 'utf-8');
    stats = JSON.parse(statsContent);
  }

  // Generate PACK.md
  const packMd = generatePackMd(stats, hasLearningDraft, options);
  const packPath = join(outdir, 'PACK.md');
  await writeFile(packPath, packMd, 'utf-8');
  outputs.push(packPath);

  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd();
  const approvalPath = join(outdir, 'APPROVAL.md');
  await writeFile(approvalPath, approvalMd, 'utf-8');
  outputs.push(approvalPath);

  // Generate manifest.json
  const manifest: PackManifest = {
    tool: 'career-weekday-improve-pack',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: {
      logPath: options.log,
      summaryPath: options.summary,
      digestOutdir: options.runDigest ? undefined : options.digestOutdir,
      since: options.since,
      runDigest: options.runDigest,
    },
    outputs: outputs.map(p => basename(p)),
    checks: {
      hasLearningDraft,
      hasStats,
      hasRunsSummary: outputs.some(o => basename(o) === 'runs.md'),
    },
  };

  const manifestPath = join(outdir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  outputs.push(manifestPath);

  return {
    outdir,
    outputs,
    warnings,
    manifest,
  };
}

async function runDigestTool(options: CliOptions, warnings: string[]): Promise<string> {
  const digestOutdir = join(options.outdir, 'digest-temp');
  
  // Build command
  const parts = ['npm', 'run', 'digest', '--'];
  
  if (options.log) {
    parts.push('--log', resolve(options.log));
  }
  
  if (options.summary) {
    parts.push('--summary', resolve(options.summary));
  }
  
  if (options.since) {
    parts.push('--since', options.since);
  }
  
  parts.push('--outdir', digestOutdir);
  
  const cmd = parts.join(' ');
  
  try {
    const cwd = resolve(import.meta.url.replace('file://', '').replace(/\/dist\/.*$/, ''), '../career-live-improve-digest');
    
    if (!existsSync(cwd)) {
      throw new Error(`career-live-improve-digest not found at ${cwd}`);
    }
    
    console.error(`[INFO] Running: ${cmd}`);
    console.error(`[INFO] Working directory: ${cwd}`);
    
    execSync(cmd, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    
    return digestOutdir;
  } catch (error) {
    throw new Error(`Failed to run career-live-improve-digest: ${error}`);
  }
}

function generatePackMd(stats: DigestStats | null, hasLearningDraft: boolean, options: CliOptions): string {
  const parts = [
    '# Career Weekday Improve Pack',
    '',
    '## Overview',
    '',
    'This pack orchestrates career-hunt-run-log outputs into career-live-improve-digest results for Career to fold into learning.md.',
    '',
    '**Generated:** ' + new Date().toISOString(),
    '',
  ];

  // Add period info if available
  if (stats?.period) {
    parts.push('## Period');
    parts.push('');
    if (stats.period.since) parts.push(`- **Since:** ${stats.period.since}`);
    if (stats.period.until) parts.push(`- **Until:** ${stats.period.until}`);
    if (stats.period.totalDays) parts.push(`- **Days:** ${stats.period.totalDays}`);
    parts.push('');
  } else if (options.since) {
    parts.push('## Period');
    parts.push('');
    parts.push(`- **Since:** ${options.since}`);
    parts.push('');
  }

  // Add counts if available
  if (stats?.totals) {
    parts.push('## Summary');
    parts.push('');
    parts.push(`- **Total Entries:** ${stats.totals.entries}`);
    parts.push(`- **Scored:** ${stats.totals.scored}`);
    parts.push(`- **Applied:** ${stats.totals.applied}`);
    parts.push(`- **Skipped:** ${stats.totals.skipped}`);
    parts.push(`- **Rejected:** ${stats.totals.rejected}`);
    parts.push('');
  }

  // Add score bands if available
  if (stats?.scoreBands && Object.keys(stats.scoreBands).length > 0) {
    parts.push('## Score Distribution');
    parts.push('');
    for (const [band, count] of Object.entries(stats.scoreBands)) {
      const bandLabel = band.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      parts.push(`- **${bandLabel}:** ${count}`);
    }
    parts.push('');
  }

  // Pack contents
  parts.push('## Pack Contents');
  parts.push('');
  parts.push('- `PACK.md` - This index file');
  
  if (hasLearningDraft) {
    parts.push('- `LEARNING-DRAFT.md` - Numbered patterns from career-live-improve-digest');
  } else {
    parts.push('- ⚠️ `LEARNING-DRAFT.md` - **MISSING**');
  }
  
  if (stats) {
    parts.push('- `stats.json` - Machine-readable statistics');
  } else {
    parts.push('- ⚠️ `stats.json` - **MISSING**');
  }
  
  parts.push('- `runs.md` - Hunt runs summary (if available)');
  parts.push('- `APPROVAL.md` - Safety gates and ownership notice');
  parts.push('- `manifest.json` - Tool metadata');
  parts.push('');

  parts.push('## Next Steps');
  parts.push('');
  parts.push('1. Review `LEARNING-DRAFT.md` for patterns');
  parts.push('2. Validate patterns against source data');
  parts.push('3. **Career manually folds selected insights into learning.md**');
  parts.push('4. Never auto-update learning.md');
  parts.push('');

  parts.push('## Safety Notes');
  parts.push('');
  parts.push('- ✅ **Offline only** - No job board APIs');
  parts.push('- ✅ **Never invents employers** - Only quotes from logs');
  parts.push('- ✅ **Never invents scores** - Facts-only');
  parts.push('- ✅ **Career owns apply** - This is learning input only');
  parts.push('- ⚠️ **Manual fold-in required** - Never auto-updates learning.md');
  parts.push('');

  return parts.join('\n');
}

function generateApprovalMd(): string {
  return `# Career Weekday Improve Pack Approval

## Critical Rules

1. **Career owns apply decisions** - This pack is learning input only
2. **Never invents employers** - Only quotes from runs.jsonl
3. **Never invents scores** - Only processes provided scores
4. **Offline only** - No job board APIs or live data
5. **Never auto-updates learning.md** - Career reviews and folds in manually

## Review Checklist

- [ ] LEARNING-DRAFT.md patterns match source data
- [ ] No invented companies, scores, or gate outcomes
- [ ] Stats totals are accurate
- [ ] Period filter applied correctly (if --since used)
- [ ] Patterns are actionable for future hunts

## Next Steps

1. Review LEARNING-DRAFT.md
2. Validate patterns against runs.jsonl
3. **Career manually folds selected insights into learning.md**
4. Career bot uses updated learning.md for future decisions

## Never

- ❌ Auto-apply insights without Career review
- ❌ Invent companies or roles not in log
- ❌ Fabricate skip reasons or patterns
- ❌ Write directly to learning.md
- ❌ Apply to jobs from this tool

## Ownership

- **Career bot** owns apply decisions
- **Career / CoS** owns fold-in to learning.md
- **This tool** only packages digest outputs
- **Offline only** - No external APIs
`;
}
