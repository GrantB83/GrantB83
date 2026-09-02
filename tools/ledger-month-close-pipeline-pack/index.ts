#!/usr/bin/env node

/**
 * ledger-month-close-pipeline-pack CLI entry point
 */

import { parseArgs } from 'util';
import { buildPack } from './src/pack-builder.js';
import type { CLIOptions } from './src/types.js';

const USAGE = `
ledger-month-close-pipeline-pack - Assemble month-close pipeline outputs

Usage:
  npm run pack -- --month YYYY-MM --outdir out/ [options]

Required:
  --month YYYY-MM           Month label (e.g., 2024-01)
  --outdir <path>           Output directory for assembled pack

Optional Stage Inputs (prefer prebuilt outputs):
  --unmatched-outdir <path>        ledger-unmatched-merchant-queue output directory
  --suggest-outdir <path>          ledger-merchant-alias-suggest output directory
  --alias-checklist-outdir <path>  ledger-alias-apply-checklist output directory
  --close-outdir <path>            ledger-month-close-pack output directory

Optional Run Flags (shell out to sibling tools):
  --run-unmatched              Run ledger-unmatched-merchant-queue via npm run
  --run-suggest                Run ledger-merchant-alias-suggest via npm run
  --run-alias-checklist        Run ledger-alias-apply-checklist via npm run
  --run-close                  Run ledger-month-close-pack via npm run

Raw Input Options (for --run-* flags):
  --transactions <path>        Transactions CSV for --run-unmatched
  --aliases <path>             Aliases JSON for --run-suggest
  --exports-dir <path>         Exports directory for --run-close

Other:
  --help, -h                   Show this help message

Examples:
  # Use prebuilt stage outputs (preferred)
  npm run pack -- \\
    --month 2024-01 \\
    --unmatched-outdir ../ledger-unmatched-merchant-queue/out/ \\
    --suggest-outdir ../ledger-merchant-alias-suggest/out/ \\
    --alias-checklist-outdir ../ledger-alias-apply-checklist/out/ \\
    --close-outdir ../ledger-month-close-pack/out/ \\
    --outdir pipeline-pack/

  # With fixtures (all stages prebuilt)
  npm run pack -- \\
    --month 2024-01 \\
    --unmatched-outdir fixtures/stage-outputs/unmatched \\
    --suggest-outdir fixtures/stage-outputs/suggest \\
    --alias-checklist-outdir fixtures/stage-outputs/alias-checklist \\
    --close-outdir fixtures/stage-outputs/close \\
    --outdir test-out/

Pipeline Flow:
  unmatched-merchant-queue → merchant-alias-suggest → alias-apply-checklist → month-close-pack

Safety:
  ✅ Offline only - No APIs or network calls
  ✅ Read-only - Never modifies source files
  ✅ No amounts in PACK.md - Amounts stay in stage output files
  ⚠️  H2 approval required - See APPROVAL.md before any sheet writes
`;

async function main() {
  try {
    const { values } = parseArgs({
      options: {
        month: { type: 'string' },
        outdir: { type: 'string' },
        'unmatched-outdir': { type: 'string' },
        'suggest-outdir': { type: 'string' },
        'alias-checklist-outdir': { type: 'string' },
        'close-outdir': { type: 'string' },
        'run-unmatched': { type: 'boolean' },
        'run-suggest': { type: 'boolean' },
        'run-alias-checklist': { type: 'boolean' },
        'run-close': { type: 'boolean' },
        transactions: { type: 'string' },
        aliases: { type: 'string' },
        'exports-dir': { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });

    if (values.help) {
      console.log(USAGE);
      process.exit(0);
    }

    // Validate required args
    if (!values.month || !values.outdir) {
      console.error('❌ Error: Missing required arguments (--month and --outdir)\n');
      console.log(USAGE);
      process.exit(1);
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(values.month)) {
      console.error('❌ Error: --month must be in YYYY-MM format (e.g., 2024-01)');
      process.exit(1);
    }

    // Check that at least one stage input is provided
    const hasStageInput = !!(
      values['unmatched-outdir'] ||
      values['suggest-outdir'] ||
      values['alias-checklist-outdir'] ||
      values['close-outdir']
    );

    const hasRunFlag = !!(
      values['run-unmatched'] ||
      values['run-suggest'] ||
      values['run-alias-checklist'] ||
      values['run-close']
    );

    if (!hasStageInput && !hasRunFlag) {
      console.error('❌ Error: No stage inputs provided. Specify at least one --*-outdir or --run-* flag.\n');
      console.log(USAGE);
      process.exit(1);
    }

    // Warn if --run-* flags provided (not implemented in v1)
    if (hasRunFlag) {
      console.error('❌ Error: --run-* flags not yet implemented. Use prebuilt stage outputs via --*-outdir flags.\n');
      process.exit(1);
    }

    const options: CLIOptions = {
      month: values.month,
      outdir: values.outdir,
      unmatchedOutdir: values['unmatched-outdir'],
      suggestOutdir: values['suggest-outdir'],
      aliasChecklistOutdir: values['alias-checklist-outdir'],
      closeOutdir: values['close-outdir'],
      runUnmatched: values['run-unmatched'],
      runSuggest: values['run-suggest'],
      runAliasChecklist: values['run-alias-checklist'],
      runClose: values['run-close'],
      transactions: values.transactions,
      aliases: values.aliases,
      exportsDir: values['exports-dir'],
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
