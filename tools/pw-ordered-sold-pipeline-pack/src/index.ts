#!/usr/bin/env node
/**
 * Perfect Water Ordered-Sold Pipeline Pack CLI
 * 
 * Offline orchestrator: optional Loyverse sales digest → ordered-vs-sold diff → PACK.md + APPROVAL.md
 * 
 * Never invents quantities, prices, SKUs, or store names. Offline CSV only. Perfect Water owns ops.
 */

import * as path from 'path';
import type { CliOptions } from './types.js';
import { assemblePipelinePack } from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Perfect Water Ordered-Sold Pipeline Pack CLI

Offline pipeline orchestrator combining:
  1. pw-loyverse-daily-sales-digest (optional, default OFF unless --sales-csv or --run-sales)
  2. pw-ordered-vs-sold-diff (default ON)

PURPOSE:
  One dated pipeline pack for Perfect Water / CoS: optional Loyverse daily sales digest → ordered-vs-sold diff pack with PACK.md + APPROVAL.md.
  
SAFETY:
  ✅ Offline CSV only - No Loyverse/Xero API, no network
  ✅ Never invents quantities, prices, SKUs, or store names
  ✅ Never writes to Loyverse/Xero
  ✅ Never sends mail
  ✅ Perfect Water owns all CoS decisions

USAGE:
  npm run pack -- --ordered-csv <path> --sold-csv <path> [options]

REQUIRED INPUTS:
  --ordered-csv <path>    Ordered quantities CSV
  --sold-csv <path>       Sold quantities CSV (or use --sales-csv)
  --sales-csv <path>      Alternative to --sold-csv (triggers optional sales digest)

OPTIONAL INPUTS:
  --store <name>          Store name for filtering (optional)
  --outdir <path>         Output directory [default: ./out]
  --as-of <YYYY-MM-DD>    Date label for pack naming [default: today]

STAGE CONTROL (PR #114 boolean patterns):
  --run-sales             Run pw-loyverse-daily-sales-digest [default: false unless --sales-csv]
                          Accepts: --run-sales, --run-sales=true/false,
                          --run-sales true/false, --no-run-sales
  
  --run-diff              Run pw-ordered-vs-sold-diff [default: true]
                          Accepts: --run-diff, --run-diff=true/false,
                          --run-diff true/false, --no-run-diff

OTHER:
  --help, -h              Show this help message

OUTPUT:
  Creates: <outdir>/pw-ordered-sold-pack-<date>/
    - PACK.md              (pipeline pack index with counts only)
    - APPROVAL.md          (approval gates, never invents, never writes live systems)
    - diff.md              (from pw-ordered-vs-sold-diff, if ran)
    - diff.json            (from pw-ordered-vs-sold-diff, if ran)
    - missing-keys.md      (from pw-ordered-vs-sold-diff, if ran)
    - digest.md            (from pw-loyverse-daily-sales-digest, if ran)
    - digest.json          (from pw-loyverse-daily-sales-digest, if ran)
    - manifest.json        (pipeline metadata, PR #116 - only present files)

EXAMPLES:
  # Basic: ordered + sold diff only (no sales digest)
  npm run pack -- \\
    --ordered-csv ordered.csv \\
    --sold-csv sold.csv

  # With sales digest (explicit flag)
  npm run pack -- \\
    --ordered-csv ordered.csv \\
    --sales-csv loyverse-sales.csv \\
    --run-sales

  # Skip diff (only sales digest)
  npm run pack -- \\
    --sales-csv loyverse-sales.csv \\
    --run-sales \\
    --no-run-diff

  # With store filter
  npm run pack -- \\
    --ordered-csv ordered.csv \\
    --sold-csv sold.csv \\
    --store "Louis Trichardt"

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runSales: false,  // default OFF unless --sales-csv or --run-sales
    runDiff: true     // default ON
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--ordered-csv') {
      options.orderedCsv = args[++i];
    } else if (arg === '--sold-csv') {
      options.soldCsv = args[++i];
    } else if (arg === '--sales-csv') {
      options.salesCsv = args[++i];
      // Implicit: --sales-csv enables --run-sales unless explicitly disabled
      if (options.runSales === false) {
        options.runSales = true;
      }
    } else if (arg === '--store') {
      options.store = args[++i];
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--as-of') {
      options.asOf = args[++i];
    } else if (arg === '--no-run-sales') {
      // Handle negative flag: --no-run-sales (PR #114)
      options.runSales = false;
    } else if (arg === '--run-sales' || arg.startsWith('--run-sales=')) {
      // Handle --run-sales[=value] (PR #114)
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runSales = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runSales = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runSales = true;
          i++;
        } else {
          options.runSales = true;
        }
      }
    } else if (arg === '--no-run-diff') {
      // Handle negative flag: --no-run-diff (PR #114)
      options.runDiff = false;
    } else if (arg === '--run-diff' || arg.startsWith('--run-diff=')) {
      // Handle --run-diff[=value] (PR #114)
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runDiff = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runDiff = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runDiff = true;
          i++;
        } else {
          options.runDiff = true;
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
  const hasSoldInput = options.soldCsv || options.salesCsv;
  
  if (!hasSoldInput) {
    console.error('❌ Error: Must provide either --sold-csv or --sales-csv\n');
    printHelp();
    process.exit(1);
  }
  
  // If only --sales-csv given and no --ordered-csv, require --run-diff to be explicitly disabled
  if (!options.orderedCsv && options.salesCsv && options.runDiff) {
    console.error('❌ Error: Cannot run diff without --ordered-csv');
    console.error('   Either provide --ordered-csv or use --no-run-diff\n');
    process.exit(1);
  }
  
  try {
    console.log('Perfect Water Ordered-Sold Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline orchestrator - no Loyverse/Xero API');
    console.log('⚠️  Never invents quantities, prices, SKUs, or store names');
    console.log('⚠️  Perfect Water owns all CoS decisions');
    console.log('⚠️  Never writes to live systems or sends mail\n');
    
    const outdir = options.outdir || './out';
    const asOf = options.asOf || new Date().toISOString().split('T')[0];
    
    // Determine sold CSV for diff
    const soldCsv = options.soldCsv || options.salesCsv;
    
    const result = assemblePipelinePack({
      orderedCsv: options.orderedCsv || null,
      soldCsv: soldCsv || null,
      salesCsv: options.salesCsv || null,
      store: options.store || null,
      asOf,
      runSales: options.runSales ?? false,
      runDiff: options.runDiff ?? true,
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
    console.log('  2. Open diff.md for ordered vs sold deltas (if ran)');
    console.log('  3. Check missing-keys.md for items in one side but not the other');
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
