#!/usr/bin/env node

/**
 * ledger-month-close-pack CLI entry point
 */

import { parseArgs } from 'util';
import { buildPack } from './src/pack-builder.js';
import type { CLIOptions } from './src/types.js';

const USAGE = `
ledger-month-close-pack - Offline USA Budget month-end close pack builder

Usage:
  npm run pack -- --month YYYY-MM --exports-dir ./exports/ --outdir out/ [options]

Required:
  --month YYYY-MM           Month for close pack (e.g., 2024-01)
  --exports-dir <path>      Directory containing CSV exports
  --outdir <path>           Output directory for pack files

Optional:
  --unmatched-queue <path>  Path to unmatched-queue.md to include
  --require-headers <list>  Comma-separated list of required headers (e.g., "Date,Amount,Merchant")
  --help, -h                Show this help message

Examples:
  npm run pack -- --month 2024-01 --exports-dir ./exports/ --outdir out/
  npm run pack -- --month 2024-01 --exports-dir ./exports/ --outdir out/ --unmatched-queue queue.md
  npm run pack -- --month 2024-01 --exports-dir ./exports/ --outdir out/ --require-headers Date,Amount,Merchant

Safety:
  ✅ Offline only - No APIs or network calls
  ✅ Read-only - Never modifies source CSVs
  ✅ No amounts in markdown - Headers and filenames only
  ✅ Amounts stay in files - Never printed in digest prose
`;

async function main() {
  try {
    const { values } = parseArgs({
      options: {
        month: { type: 'string' },
        'exports-dir': { type: 'string' },
        outdir: { type: 'string' },
        'unmatched-queue': { type: 'string' },
        'require-headers': { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });

    if (values.help) {
      console.log(USAGE);
      process.exit(0);
    }

    // Validate required args
    if (!values.month || !values['exports-dir'] || !values.outdir) {
      console.error('❌ Error: Missing required arguments\n');
      console.log(USAGE);
      process.exit(1);
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(values.month)) {
      console.error('❌ Error: Month must be in YYYY-MM format (e.g., 2024-01)');
      process.exit(1);
    }

    const options: CLIOptions = {
      month: values.month,
      exportsDir: values['exports-dir'],
      outdir: values.outdir,
      unmatchedQueue: values['unmatched-queue'],
      requireHeaders: values['require-headers'],
    };

    await buildPack(options);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error('❌ Unknown error occurred');
    }
    process.exit(1);
  }
}

main();
