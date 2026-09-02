#!/usr/bin/env node
/**
 * Career Hunt Run Log CLI
 * Offline tool to append career hunt runs into durable log
 */

import { readFileSync, existsSync } from 'fs';
import { CliOptions, HuntRunSummary } from './types.js';
import {
  normalizeFromSummary,
  normalizeFromFlags,
  validateAll,
} from './normalizer.js';
import {
  readExistingEntries,
  appendEntries,
  countLines,
} from './appender.js';
import {
  buildSummary,
  generateRunsMarkdown,
  generateApprovalMarkdown,
  generateManifest,
  writeOutputs,
} from './generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Career Hunt Run Log CLI - Append career hunt runs into durable offline log

USAGE:
  npm run log -- --run <path> --outdir <dir>
  npm run log -- --date <YYYY-MM-DD> --scored <path> --applied <path> --outdir <dir>

OPTIONS:
  --run              Path to run.json (structured hunt summary) [MODE 1]
  --date             Date YYYY-MM-DD (default: today UTC) [MODE 2]
  --scored           Path to scores.json from career-jd-hard-gates-score [MODE 2]
  --applied          Path to applied.json [MODE 2]
  --skipped          Path to skipped.json [MODE 2]
  --outdir           Output directory [REQUIRED, default: ./out]
  --notes            Path to notes file (optional)
  --help, -h         Show this help message

MODES:
  1. --run: Structured hunt summary with date and arrays of scored/applied/skipped
  2. --date + flags: Build from individual JSON files

EXAMPLES:
  # From structured run.json
  npm run log -- --run path/to/run.json --outdir out/

  # From individual files
  npm run log -- \\
    --date 2026-09-02 \\
    --scored scores.json \\
    --applied applied.json \\
    --skipped skipped.json \\
    --outdir out/

  # With notes
  npm run log -- --run run.json --outdir out/ --notes notes.md

  # Test with fixtures
  npm run test:fixtures

BEHAVIOR:
  1. Normalize each entry: company, title, score?, gatePass?, action, reason?, source?
  2. Append one JSON line to runs.jsonl (create if missing). Never rewrites prior lines.
  3. Rewrite runs.md summary from full jsonl (counts by action; latest run detail).
  4. Write APPROVAL.md (Career owns apply decisions; hard gates unchanged).
  5. Write manifest.json for this invocation.
  6. Exit 1 on malformed JSON or missing required company|title on entries.

REQUIRED FIELDS:
  - company [REQUIRED]
  - title [REQUIRED]
  - action: scored|applied|skipped|rejected [REQUIRED]
  - date: YYYY-MM-DD [REQUIRED]

OPTIONAL FIELDS:
  - score: 0-10 (from career-jd-hard-gates-score)
  - gatePass: true|false
  - reason: why skipped/rejected
  - source: LinkedIn|Indeed|etc

SAFETY:
  - Offline only - No job board APIs
  - Append-only - Never rewrites existing runs.jsonl lines
  - No invented data - Only logs provided scores and facts
  - Career bot owns apply decisions - This tool never applies
  - Exit 1 on validation errors

OUTPUT FILES:
  - runs.jsonl       (append-only log, one JSON object per line)
  - runs.md          (regenerated summary with counts and latest run)
  - APPROVAL.md      (safety gates and ownership)
  - manifest.json    (this invocation metadata)

  `);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--run') {
      options.run = args[++i];
    } else if (arg === '--date') {
      options.date = args[++i];
    } else if (arg === '--scored') {
      options.scored = args[++i];
    } else if (arg === '--applied') {
      options.applied = args[++i];
    } else if (arg === '--skipped') {
      options.skipped = args[++i];
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--notes') {
      options.notes = args[++i];
    }
  }

  return options;
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Validate required arguments
  if (!options.run && !options.scored && !options.applied && !options.skipped) {
    console.error('❌ Error: Either --run or at least one of --scored/--applied/--skipped is required\n');
    printHelp();
    process.exit(1);
  }

  if (!options.outdir) {
    console.error('❌ Error: --outdir is required\n');
    printHelp();
    process.exit(1);
  }

  try {
    console.log('Career Hunt Run Log CLI\n');
    console.log('⚠️  Offline only - No job board APIs');
    console.log('⚠️  Append-only - Never rewrites existing lines');
    console.log('⚠️  Career bot owns apply decisions\n');

    // Determine date
    let date = options.date || getTodayDate();
    console.log(`Using date: ${date}\n`);

    // Normalize entries
    let entries;
    if (options.run) {
      // Mode 1: From run.json
      console.log(`Reading structured run: ${options.run}`);
      if (!existsSync(options.run)) {
        throw new Error(`Run file not found: ${options.run}`);
      }
      const runText = readFileSync(options.run, 'utf-8');
      const runSummary = JSON.parse(runText) as HuntRunSummary;
      date = runSummary.date; // Override with run date
      entries = normalizeFromSummary(runSummary);
      console.log(`  ✓ Loaded ${entries.length} entries from run\n`);
    } else {
      // Mode 2: From individual flags
      console.log('Reading individual files...');
      const scored = options.scored ? JSON.parse(readFileSync(options.scored, 'utf-8')) : undefined;
      const applied = options.applied ? JSON.parse(readFileSync(options.applied, 'utf-8')) : undefined;
      const skipped = options.skipped ? JSON.parse(readFileSync(options.skipped, 'utf-8')) : undefined;

      entries = normalizeFromFlags({ date, scored, applied, skipped });
      console.log(`  ✓ Loaded ${entries.length} entries from flags\n`);
    }

    // Validate entries
    console.log('Validating entries...');
    const validation = validateAll(entries);

    if (validation.invalid.length > 0) {
      console.error(`  ❌ Found ${validation.invalid.length} invalid entries:\n`);
      for (const { entry, errors } of validation.invalid) {
        console.error(`  Company: ${entry.company || 'MISSING'}`);
        console.error(`  Title: ${entry.title || 'MISSING'}`);
        console.error(`  Errors:`);
        for (const error of errors) {
          console.error(`    - ${error}`);
        }
        console.error('');
      }
      throw new Error('Validation failed - see errors above');
    }

    console.log(`  ✓ All ${validation.valid.length} entries valid\n`);

    // Append to runs.jsonl
    const jsonlPath = `${options.outdir}/runs.jsonl`;
    console.log(`Appending to: ${jsonlPath}`);
    appendEntries(jsonlPath, validation.valid);
    const totalLines = countLines(jsonlPath);
    console.log(`  ✓ Appended ${validation.valid.length} entries`);
    console.log(`  ✓ Total lines: ${totalLines}\n`);

    // Read all entries and regenerate runs.md
    console.log('Regenerating runs.md...');
    const allEntries = readExistingEntries(jsonlPath);
    const summary = buildSummary(allEntries);
    const runsMarkdown = generateRunsMarkdown(summary);
    const approvalMarkdown = generateApprovalMarkdown();

    // Generate manifest
    const manifest = generateManifest({
      inputs: {
        runPath: options.run,
        scoredPath: options.scored,
        appliedPath: options.applied,
        skippedPath: options.skipped,
        notesPath: options.notes,
        date,
      },
      outputs: {
        runsJsonlPath: jsonlPath,
        runsMarkdownPath: `${options.outdir}/runs.md`,
        approvalPath: `${options.outdir}/APPROVAL.md`,
        manifestPath: `${options.outdir}/manifest.json`,
      },
      entriesAdded: validation.valid.length,
      totalLines,
    });

    // Write outputs
    writeOutputs({
      outdir: options.outdir,
      runsMarkdown,
      approvalMarkdown,
      manifest,
    });

    console.log(`  ✓ runs.md generated\n`);

    // Print summary
    console.log('✅ Run logged successfully!\n');
    console.log('Generated files:');
    console.log(`  - ${jsonlPath} (${totalLines} lines)`);
    console.log(`  - ${options.outdir}/runs.md`);
    console.log(`  - ${options.outdir}/APPROVAL.md`);
    console.log(`  - ${options.outdir}/manifest.json\n`);

    console.log('Summary:');
    console.log(`  - Date: ${date}`);
    console.log(`  - Entries added: ${validation.valid.length}`);
    console.log(`  - Total runs: ${summary.totalRuns}`);
    console.log(`  - Total entries: ${summary.totalEntries}\n`);

    console.log('Next steps:');
    console.log(`  1. cd ${options.outdir}`);
    console.log('  2. cat runs.md');
    console.log('  3. Review APPROVAL.md\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
