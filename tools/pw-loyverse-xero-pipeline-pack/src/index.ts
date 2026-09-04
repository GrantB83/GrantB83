#!/usr/bin/env node
/**
 * Perfect Water Loyverse↔Xero Reconciliation Pipeline Pack CLI
 * 
 * Offline orchestrator: Loyverse CSV + Xero CSV → gap report pack with PACK.md + APPROVAL.md
 * 
 * Never invents amounts or matches. Offline CSV only. Perfect Water owns ops.
 */

import * as path from 'path';
import type { CliOptions } from './types.js';
import { assemblePipelinePack } from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Perfect Water Loyverse↔Xero Reconciliation Pipeline Pack CLI

Offline pipeline orchestrator combining:
  1. loyverse-xero-recon (default ON)

PURPOSE:
  One dated pipeline pack for Perfect Water / CoS cash integrity: Loyverse CSV + Xero CSV → gap report (CSV + Markdown) + PACK.md + APPROVAL.md.
  
SAFETY:
  ✅ Offline CSV only - No Loyverse/Xero API, no network
  ✅ Never invents amounts or forced matches
  ✅ Never writes to Loyverse/Xero
  ✅ Never sends mail
  ✅ Perfect Water owns all CoS decisions

USAGE:
  npm run pack -- --loyverse-csv <path> --xero-csv <path> [options]

REQUIRED INPUTS:
  --loyverse-csv <path>   Loyverse CSV file (receipts or sales summary)
  --xero-csv <path>       Xero CSV file (bank transactions or P&L)

OPTIONAL INPUTS:
  --mode <type>           Reconciliation mode: receipt | summary [default: receipt]
  --outdir <path>         Output directory [default: ./out]
  --as-of <YYYY-MM-DD>    Date label for pack naming [default: today]

STAGE CONTROL (PR #114 boolean patterns):
  --run-recon             Run loyverse-xero-recon [default: true]
                          Accepts: --run-recon, --run-recon=true/false,
                          --run-recon true/false, --no-run-recon

OTHER:
  --help, -h              Show this help message

OUTPUT:
  Creates: <outdir>/pw-loyverse-xero-pack-<date>/
    - PACK.md              (pipeline pack index with counts only)
    - APPROVAL.md          (approval gates, never invents, never writes live systems)
    - gap-report.csv       (from loyverse-xero-recon, if ran)
    - gap-report.md        (from loyverse-xero-recon, if ran)
    - manifest.json        (pipeline metadata, PR #116 - only present files)

EXAMPLES:
  # Basic: receipt mode reconciliation (default)
  npm run pack -- \\
    --loyverse-csv loyverse.csv \\
    --xero-csv xero.csv

  # Summary mode reconciliation
  npm run pack -- \\
    --loyverse-csv loyverse-summary.csv \\
    --xero-csv xero-pl.csv \\
    --mode summary

  # Skip reconciliation (only pack structure)
  npm run pack -- \\
    --loyverse-csv loyverse.csv \\
    --xero-csv xero.csv \\
    --no-run-recon

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runRecon: true,  // default ON
    mode: 'receipt'  // default receipt mode
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--loyverse-csv') {
      options.loyverseCsv = args[++i];
    } else if (arg === '--xero-csv') {
      options.xeroCsv = args[++i];
    } else if (arg === '--mode') {
      const modeValue = args[++i];
      if (modeValue === 'receipt' || modeValue === 'summary') {
        options.mode = modeValue;
      } else {
        console.error(`❌ Error: Invalid mode "${modeValue}". Must be "receipt" or "summary"\n`);
        process.exit(1);
      }
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--as-of') {
      options.asOf = args[++i];
    } else if (arg === '--no-run-recon') {
      // Handle negative flag: --no-run-recon (PR #114)
      options.runRecon = false;
    } else if (arg === '--run-recon' || arg.startsWith('--run-recon=')) {
      // Handle --run-recon[=value] (PR #114)
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runRecon = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runRecon = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runRecon = true;
          i++;
        } else {
          options.runRecon = true;
        }
      }
    }
  }
  
  return options;
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate inputs
  if (!options.loyverseCsv) {
    console.error('❌ Error: Must provide --loyverse-csv\n');
    printHelp();
    process.exit(1);
  }
  
  if (!options.xeroCsv) {
    console.error('❌ Error: Must provide --xero-csv\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Perfect Water Loyverse↔Xero Reconciliation Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline orchestrator - no Loyverse/Xero API');
    console.log('⚠️  Never invents amounts or forced matches');
    console.log('⚠️  Perfect Water owns all CoS decisions');
    console.log('⚠️  Never writes to live systems or sends mail\n');
    
    const outdir = options.outdir || './out';
    const asOf = options.asOf || new Date().toISOString().split('T')[0];
    const mode = options.mode || 'receipt';
    
    const result = assemblePipelinePack({
      loyverseCsv: options.loyverseCsv,
      xeroCsv: options.xeroCsv,
      mode,
      asOf,
      runRecon: options.runRecon ?? true,
      outdir
    });
    
    if (!result) {
      console.error('❌ Error: No result from pipeline builder\n');
      process.exit(1);
    }
    
    if (!result.success) {
      console.error(`❌ Error: ${result.message}\n`);
      process.exit(1);
    }
    
    console.log(`\n✅ ${result.message}\n`);
    console.log(`📁 Files generated: ${result.files.length}`);
    result.files.forEach(f => console.log(`   - ${f}`));
    console.log('');
    
    console.log('Next steps:');
    console.log(`  1. Review ${result.outdir}/PACK.md for pipeline pack contents`);
    console.log('  2. Open gap-report.md for reconciliation gaps (if ran)');
    console.log('  3. Check gap-report.csv for machine-readable data');
    console.log('  4. Review APPROVAL.md - never invents, never writes live systems');
    console.log('  5. Perfect Water team makes CoS reconciliation decisions');
    console.log('  6. Archive pack in Drive: 30_PerfectWater/CoS/YYYY-MM/\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
