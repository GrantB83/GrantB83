#!/usr/bin/env node
/**
 * Perfect Water GRV + Stocktake Pipeline Pack CLI
 * 
 * Offline orchestrator: normalize GRV/stocktake → diff → optional inventory-recon
 * 
 * Never invents quantities. Offline only. Perfect Water owns ops.
 */

import * as path from 'path';
import type { CliOptions } from './types.js';
import {
  buildPipelineFromNormalizedCsvs,
  buildPipelineFromRawCsvs,
  buildPipelineFromDiffOutputs
} from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Perfect Water GRV + Stocktake Pipeline Pack CLI

Offline pipeline orchestrator combining:
  1. pw-grv-csv-normalize (optional, if raw GRV provided)
  2. pw-stocktake-csv-normalize (optional, if raw stocktake provided)
  3. pw-grv-vs-stocktake-diff (required for meaningful pack)
  4. pw-inventory-recon-pack (optional, default ON if sibling cleanly accepts diff outputs)

USAGE:
  npm run pipeline -- --grv-norm <path> --stock-norm <path> [options]
  npm run pipeline -- --grv-raw <path> --stock-raw <path> [options]
  npm run pipeline -- --diff-outdir <path> [options]

OPTIONS:
  --grv-norm              Path to normalized GRV CSV
  --stock-norm            Path to normalized stocktake CSV
  --grv-raw               Path to raw GRV CSV (requires normalization)
  --stock-raw             Path to raw stocktake CSV (requires normalization)
  --diff-outdir           Path to prebuilt diff output directory
  
  --run-inventory-recon   Run pw-inventory-recon-pack [default: true]
                          Accepts: --run-inventory-recon, --run-inventory-recon=true/false,
                          --run-inventory-recon true/false, --no-run-inventory-recon
  --skip-diff             Skip pw-grv-vs-stocktake-diff (only if --diff-outdir provided)
  
  --outdir, -o            Output directory [default: ./out]
  --help, -h              Show this help message

INPUT MODES:
  1. Normalized CSVs: --grv-norm + --stock-norm
  2. Raw CSVs: --grv-raw + --stock-raw (will normalize first)
  3. Prebuilt diff: --diff-outdir (skips normalize + diff)

BEHAVIOR:
  - Default: Runs diff (unless --diff-outdir provided or --skip-diff set)
  - Default: Runs pw-inventory-recon-pack if sibling tool cleanly accepts diff outputs
  - Exit 1 if required inputs missing or tools fail

OUTPUT:
  Creates: <outdir>/pw-grv-stocktake-pack/
    - PACK.md                (pipeline pack index with counts only)
    - diff.md                (from pw-grv-vs-stocktake-diff)
    - diff.json              (from pw-grv-vs-stocktake-diff)
    - missing-keys.md        (from pw-grv-vs-stocktake-diff)
    - APPROVAL.md            (from pw-grv-vs-stocktake-diff)
    - APPROVAL-RECON.md      (from pw-inventory-recon-pack, if run)
    - PACK-manifest.json     (pipeline metadata, PR #116 - only present files)

SAFETY:
  - Offline only - no Loyverse API or network calls
  - Read-only - never modifies source CSVs or inventory systems
  - Never invents quantities or amounts
  - Perfect Water owns all inventory decisions
  - H3 approval gate required

EXAMPLES:
  # From normalized CSVs (preferred)
  npm run pipeline -- \\
    --grv-norm grv-normalized.csv \\
    --stock-norm stocktake-normalized.csv

  # From raw CSVs (normalize first)
  npm run pipeline -- \\
    --grv-raw raw-grv.csv \\
    --stock-raw raw-stocktake.csv

  # From prebuilt diff outputs
  npm run pipeline -- --diff-outdir ../pw-grv-vs-stocktake-diff/out/

  # Skip inventory-recon-pack (using equals sign)
  npm run pipeline -- --grv-norm grv.csv --stock-norm stock.csv --run-inventory-recon=false

  # Skip inventory-recon-pack (using negative flag, PR #114)
  npm run pipeline -- --grv-norm grv.csv --stock-norm stock.csv --no-run-inventory-recon

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runInventoryRecon: true, // default ON
    skipDiff: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--grv-norm') {
      options.grvNorm = args[++i];
    } else if (arg === '--stock-norm') {
      options.stockNorm = args[++i];
    } else if (arg === '--grv-raw') {
      options.grvRaw = args[++i];
    } else if (arg === '--stock-raw') {
      options.stockRaw = args[++i];
    } else if (arg === '--diff-outdir') {
      options.diffOutdir = args[++i];
    } else if (arg === '--skip-diff') {
      options.skipDiff = true;
    } else if (arg === '--no-run-inventory-recon') {
      // Handle negative flag: --no-run-inventory-recon (PR #114)
      options.runInventoryRecon = false;
    } else if (arg === '--run-inventory-recon' || arg.startsWith('--run-inventory-recon=')) {
      // Handle --run-inventory-recon[=value] (PR #114)
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runInventoryRecon = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runInventoryRecon = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runInventoryRecon = true;
          i++;
        } else {
          options.runInventoryRecon = true;
        }
      }
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
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
  
  // Determine input mode
  const hasNormalizedInputs = options.grvNorm && options.stockNorm;
  const hasRawInputs = options.grvRaw && options.stockRaw;
  const hasDiffOutputs = options.diffOutdir;
  
  // Validate input mode
  if (!hasNormalizedInputs && !hasRawInputs && !hasDiffOutputs) {
    console.error('❌ Error: Must provide one of:');
    console.error('  1. --grv-norm + --stock-norm (normalized CSVs)');
    console.error('  2. --grv-raw + --stock-raw (raw CSVs)');
    console.error('  3. --diff-outdir (prebuilt diff)\n');
    printHelp();
    process.exit(1);
  }
  
  // Validate mutually exclusive modes
  const modeCount = [hasNormalizedInputs, hasRawInputs, hasDiffOutputs].filter(Boolean).length;
  if (modeCount > 1) {
    console.error('❌ Error: Cannot mix input modes. Choose one:\n');
    console.error('  1. --grv-norm + --stock-norm');
    console.error('  2. --grv-raw + --stock-raw');
    console.error('  3. --diff-outdir\n');
    process.exit(1);
  }
  
  try {
    console.log('Perfect Water GRV + Stocktake Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline orchestrator - no Loyverse API');
    console.log('⚠️  Never invents stock quantities or rand amounts');
    console.log('⚠️  Perfect Water owns all inventory decisions');
    console.log('⚠️  H3 approval required per approval-gates.md\n');
    
    const outdir = options.outdir || './out';
    
    let result;
    
    if (hasNormalizedInputs) {
      // Mode 1: Normalized CSV inputs
      console.log('📦 Mode: Normalized CSV inputs\n');
      result = buildPipelineFromNormalizedCsvs(
        path.resolve(options.grvNorm!),
        path.resolve(options.stockNorm!),
        options.runInventoryRecon ?? true,
        options.skipDiff ?? false,
        outdir
      );
    } else if (hasRawInputs) {
      // Mode 2: Raw CSV inputs (normalize first)
      console.log('📦 Mode: Raw CSV inputs (will normalize)\n');
      result = buildPipelineFromRawCsvs(
        path.resolve(options.grvRaw!),
        path.resolve(options.stockRaw!),
        options.runInventoryRecon ?? true,
        options.skipDiff ?? false,
        outdir
      );
    } else if (hasDiffOutputs) {
      // Mode 3: Prebuilt diff outputs
      console.log('📦 Mode: Prebuilt diff outputs\n');
      result = buildPipelineFromDiffOutputs(
        path.resolve(options.diffOutdir!),
        options.runInventoryRecon ?? true,
        outdir
      );
    }
    
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
    console.log('  2. Open diff.md for Store + SKU/Item deltas');
    console.log('  3. Check missing-keys.md for items in one side but not the other');
    console.log('  4. Review APPROVAL.md for H3 approval gates');
    console.log('  5. Perfect Water team makes inventory decisions');
    console.log('  6. Archive pack in Drive: 30_PerfectWater/InventoryRecon/YYYY-MM/\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
