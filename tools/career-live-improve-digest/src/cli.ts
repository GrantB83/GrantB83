#!/usr/bin/env node

import * as path from 'path';
import { parseJsonl, parseSummaryMd } from './parser';
import { analyzeEntries } from './analyzer';
import { writeOutputs } from './generator';

interface CliArgs {
  log?: string;
  summary?: string;
  since?: string;
  outdir: string;
}

function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {
    outdir: './out'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--log' && i + 1 < args.length) {
      parsed.log = args[++i];
    } else if (arg === '--summary' && i + 1 < args.length) {
      parsed.summary = args[++i];
    } else if (arg === '--since' && i + 1 < args.length) {
      parsed.since = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      parsed.outdir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return parsed;
}

function printUsage(): void {
  console.log(`
career-live-improve-digest - Generate learning digest from career-hunt-run-log

Usage:
  npm run digest -- --log <path> [--summary <path>] [--since YYYY-MM-DD] [--outdir <dir>]

Options:
  --log <path>        Path to runs.jsonl (preferred)
  --summary <path>    Path to runs.md (optional)
  --since YYYY-MM-DD  Only process entries on or after this date
  --outdir <dir>      Output directory (default: ./out)
  -h, --help          Show this help

Examples:
  npm run digest -- --log runs.jsonl
  npm run digest -- --log runs.jsonl --since 2026-08-01
  npm run digest -- --log runs.jsonl --summary runs.md --outdir reports/

Outputs:
  - LEARNING-DRAFT.md  Numbered patterns with counts
  - stats.json         Machine-readable statistics
  - APPROVAL.md        Safety gates and Career ownership
  - manifest.json      Tool metadata

Safety:
  - Offline only
  - Never invents data
  - Career owns apply
  - Never auto-updates learning.md
`);
}

function validateArgs(args: CliArgs): void {
  if (!args.log && !args.summary) {
    console.error('❌ Error: Must provide --log or --summary');
    console.error('   Run with --help for usage');
    process.exit(1);
  }

  if (args.since && !/^\d{4}-\d{2}-\d{2}$/.test(args.since)) {
    console.error(`❌ Error: Invalid date format for --since: ${args.since}`);
    console.error('   Expected: YYYY-MM-DD');
    process.exit(1);
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);

  console.log('🚀 career-live-improve-digest');
  console.log('');

  try {
    let entries: any[] = [];

    // Parse inputs
    if (args.log) {
      console.log(`📖 Parsing runs.jsonl: ${args.log}`);
      if (args.since) {
        console.log(`   Filtering: entries >= ${args.since}`);
      }
      entries = parseJsonl(args.log, args.since);
      console.log(`   Found ${entries.length} entries`);
    } else if (args.summary) {
      console.log(`📖 Parsing runs.md: ${args.summary}`);
      const summary = parseSummaryMd(args.summary);
      if (!summary) {
        console.error('❌ Error: Could not parse summary counts from runs.md');
        process.exit(1);
      }
      console.log(`   Summary: ${summary.totalEntries} total entries`);
      console.log('   ⚠️  Warning: runs.md provides limited data; prefer --log runs.jsonl');
    }

    if (entries.length === 0 && !args.summary) {
      console.error('❌ Error: No entries found to analyze');
      process.exit(1);
    }

    // Analyze
    console.log('');
    console.log('🔍 Analyzing patterns...');
    const stats = analyzeEntries(entries, args.since);
    console.log(`   Period: ${stats.period.since} to ${stats.period.until} (${stats.period.totalDays} days)`);
    console.log(`   Totals: ${stats.totals.entries} entries`);
    console.log(`   - Scored: ${stats.totals.scored}`);
    console.log(`   - Applied: ${stats.totals.applied}`);
    console.log(`   - Skipped: ${stats.totals.skipped} (${Object.keys(stats.skipReasons).length} unique reasons)`);
    console.log(`   - Rejected: ${stats.totals.rejected} (${Object.keys(stats.rejectReasons).length} unique reasons)`);
    console.log(`   Gate fails: ${stats.gateFails.total}`);

    // Generate outputs
    console.log('');
    console.log('📝 Generating outputs...');
    writeOutputs(args.outdir, stats, {
      logPath: args.log,
      summaryPath: args.summary,
      since: args.since
    });

    console.log('');
    console.log('✨ Done! Review LEARNING-DRAFT.md and fold insights into career-os learning.md manually.');
    console.log('');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error(`❌ Unexpected error: ${error}`);
    }
    process.exit(1);
  }
}

main();
