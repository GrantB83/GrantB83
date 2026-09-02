#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions } from './src/types.js';
import { parseCsv } from './src/csv-parser.js';
import { buildQueue } from './src/queue-builder.js';
import {
  writeQueueJson,
  writeQueueMd,
  writeMissingFields,
  writeApproval,
  writeManifest,
} from './src/output-writer.js';

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {
    merchantCol: 'Merchant',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--input' && i + 1 < args.length) {
      options.input = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    } else if (arg === '--merchant-col' && i + 1 < args.length) {
      options.merchantCol = args[++i];
    } else if (arg === '--status-col' && i + 1 < args.length) {
      options.statusCol = args[++i];
    } else if (arg === '--unmatched-values' && i + 1 < args.length) {
      options.unmatchedValues = args[++i];
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.input) {
    console.error('Error: --input is required');
    printHelp();
    process.exit(1);
  }

  if (!options.outdir) {
    console.error('Error: --outdir is required');
    printHelp();
    process.exit(1);
  }

  return options as CliOptions;
}

function printHelp(): void {
  console.log(`
ledger-unmatched-merchant-queue

Build a research queue for unmatched merchants from budget CSV exports.

USAGE:
  npm run queue -- --input transactions.csv --outdir out/

OPTIONS:
  --input <file>              Input CSV file (required)
  --outdir <dir>              Output directory (required)
  --merchant-col <name>       Merchant column name (default: "Merchant")
  --status-col <name>         Match status column name (optional)
  --unmatched-values <csv>    Comma-separated unmatched status values
                              (default: "unmatched,unknown")
  --limit <n>                 Limit output to top N merchants (optional)
  --help, -h                  Show this help

EXAMPLES:
  # Basic usage with status column
  npm run queue -- --input transactions.csv --outdir out/

  # Custom merchant column
  npm run queue -- --input transactions.csv --outdir out/ --merchant-col Payee

  # No status column (treat all as unmatched)
  npm run queue -- --input transactions.csv --outdir out/

  # Custom unmatched values
  npm run queue -- \\
    --input transactions.csv \\
    --outdir out/ \\
    --status-col MatchStatus \\
    --unmatched-values "unmatched,unknown,pending"

  # Limit to top 50
  npm run queue -- --input transactions.csv --outdir out/ --limit 50

OUTPUT FILES:
  queue.json          - Structured merchant data with sample rows
  queue.md            - Human-readable research checklist
  missing-fields.md   - Data quality report
  APPROVAL.md         - Safety gates and next steps
  manifest.json       - Run metadata

SAFETY:
  - Offline only (no API calls)
  - Read-only (no file modifications)
  - No invented amounts or merchant identities
  - Amounts stay in files (not printed in digest prose)
`);
}

function main(): void {
  const options = parseArgs();

  console.log('🔍 Parsing CSV...');
  if (!fs.existsSync(options.input)) {
    console.error(`Error: Input file not found: ${options.input}`);
    process.exit(1);
  }

  const { rows, headers, issues } = parseCsv(
    options.input,
    options.merchantCol || 'Merchant',
    options.statusCol
  );

  console.log(`   Found ${rows.length} rows`);

  const unmatchedValues = (options.unmatchedValues || 'unmatched,unknown')
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0);

  const hasStatusColumn = !!options.statusCol;
  const hasDateColumn = rows.some(r => r.date !== undefined);

  console.log('🔨 Building merchant queue...');
  const { merchants, totalUnmatched } = buildQueue(
    rows,
    unmatchedValues,
    hasStatusColumn,
    options.limit
  );

  console.log(`   Found ${totalUnmatched} unmatched rows`);
  console.log(`   Deduped to ${merchants.length} unique merchants`);

  console.log('📝 Writing output files...');
  if (!fs.existsSync(options.outdir)) {
    fs.mkdirSync(options.outdir, { recursive: true });
  }

  const outputFiles: string[] = [];

  outputFiles.push(
    writeQueueJson(options.outdir, merchants, rows.length, totalUnmatched)
  );
  outputFiles.push(writeQueueMd(options.outdir, merchants));
  outputFiles.push(
    writeMissingFields(options.outdir, issues, hasStatusColumn, hasDateColumn)
  );
  outputFiles.push(writeApproval(options.outdir));
  outputFiles.push(
    writeManifest(
      options.outdir,
      options.input,
      outputFiles,
      rows.length,
      totalUnmatched,
      merchants.length
    )
  );

  console.log('\n✅ Done!');
  console.log(`   Output written to: ${options.outdir}`);
  console.log(`   Files: ${outputFiles.map(f => path.basename(f)).join(', ')}`);
}

main();
