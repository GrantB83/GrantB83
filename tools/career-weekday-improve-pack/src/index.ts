#!/usr/bin/env node

/**
 * Career Weekday Improve Pack - CLI Entry Point
 */

import { parseArgs } from 'node:util';
import type { CliOptions } from './types.js';
import { assemblePack } from './assembler.js';

const HELP_TEXT = `
Career Weekday Improve Pack

Usage:
  npm run pack -- --outdir <dir> [options]

Options:
  --outdir <dir>           Output directory (required)
  --log <path>             Path to runs.jsonl (from career-hunt-run-log)
  --summary <path>         Path to runs.md (from career-hunt-run-log)
  --since <YYYY-MM-DD>     Optional date filter
  --run-digest             Shell out to career-live-improve-digest (requires --log or --summary)
  --digest-outdir <path>   Path to prebuilt career-live-improve-digest output directory
  --help, -h               Show this help message

Examples:
  # Use prebuilt digest
  npm run pack -- --outdir pack-out/ --digest-outdir ../career-live-improve-digest/out/

  # Run digest tool during pack
  npm run pack -- --outdir pack-out/ --run-digest --log runs.jsonl

  # With time filter
  npm run pack -- --outdir pack-out/ --run-digest --log runs.jsonl --since 2026-08-01

Safety Notes:
  - Offline only - No job board APIs
  - Never invents scores or employers
  - Career owns apply + fold-in to learning.md
  - Never auto-updates learning.md
  - Facts-only
`;

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({
      options: {
        outdir: { type: 'string' },
        log: { type: 'string' },
        summary: { type: 'string' },
        since: { type: 'string' },
        'run-digest': { type: 'boolean' },
        'digest-outdir': { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: false,
      allowPositionals: false,
    });

    if (values.help) {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    const options: CliOptions = {
      outdir: values.outdir as string,
      log: values.log as string | undefined,
      summary: values.summary as string | undefined,
      since: values.since as string | undefined,
      runDigest: values['run-digest'] as boolean | undefined,
      digestOutdir: values['digest-outdir'] as string | undefined,
    };

    // Validate
    if (!options.outdir) {
      console.error('[ERROR] --outdir is required');
      console.error(HELP_TEXT);
      process.exit(1);
    }

    if (options.runDigest && !options.log && !options.summary) {
      console.error('[ERROR] --run-digest requires --log or --summary');
      process.exit(1);
    }

    if (!options.runDigest && !options.digestOutdir) {
      console.error('[ERROR] Either --digest-outdir or --run-digest is required');
      process.exit(1);
    }

    if (options.digestOutdir && options.runDigest) {
      console.error('[ERROR] Cannot use both --digest-outdir and --run-digest');
      process.exit(1);
    }

    console.error('[INFO] Assembling career weekday improve pack...');
    const result = await assemblePack(options);

    if (result.warnings.length > 0) {
      console.error(`[WARN] ${result.warnings.length} warning(s):`);
      result.warnings.forEach((w) => console.error(`  - ${w}`));
    }

    console.error(`[SUCCESS] Pack assembled: ${result.outdir}`);
    console.error(`[INFO] ${result.outputs.length} files generated`);
    console.error('[INFO] Review APPROVAL.md before folding into learning.md');

    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Failed to assemble pack:', error);
    process.exit(1);
  }
}

main();
