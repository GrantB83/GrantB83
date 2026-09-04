#!/usr/bin/env node
/**
 * Browns OTA Rate Pipeline Pack CLI Entry Point
 * 
 * Orchestrates Browns OTA rate worksheet packing for SA Ops / CoS:
 * browns-ota-rate-worksheet (default ON) + optional light post-checklist verification
 * 
 * SAFETY:
 * - Offline only - no Booking.com / Nightsbridge APIs
 * - Never invents rates, promos, or amounts
 * - Never auto-sends
 * - Drafts + APPROVAL.md only
 * - Dullstroom The Browns Luxury Guest Suites only
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CliOptions } from './types.js';
import { assemblePipeline } from './assembler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Browns OTA Rate Pipeline Pack - Orchestrator

Usage:
  npm run pack -- --rates <path> [options]

Required:
  --rates <path>             Path to rates CSV file (rate card)
  --rate-card <path>         Alternative to --rates (same meaning)

Optional:
  --promo <path>             Path to promo JSON or CSV file
  --as-of <YYYY-MM-DD>       Pack date for naming (default: today)
  --outdir <dir>             Output directory for pack (default: ./out)
  
  --run-worksheet            Run browns-ota-rate-worksheet [default: true]
  --run-worksheet=false      Disable worksheet generation
  --no-run-worksheet         Disable worksheet generation
  
  --help, -h                 Show this help

Examples:

  # Basic (rates only):
  npm run pack -- \\
    --rates browns-rates-2024.csv \\
    --as-of 2026-09-20

  # With promotions:
  npm run pack -- \\
    --rates browns-rates-2024.csv \\
    --promo summer-promos.json \\
    --as-of 2026-09-20

  # Using --rate-card alias:
  npm run pack -- \\
    --rate-card browns-rates-2024.csv \\
    --outdir packs/

  # Test with fixtures:
  npm run test:fixtures

Safety:
  - Offline only
  - Never invents rates, promos, or amounts
  - Never writes to Nightsbridge/Booking.com
  - Never auto-sends
  - Dullstroom The Browns only
`);
}

/**
 * Parse boolean flag with flexible formats (PR #114 pattern):
 * --run-worksheet (true)
 * --run-worksheet=true (true)
 * --run-worksheet=false (false)
 * --run-worksheet true (true)
 * --run-worksheet false (false)
 * --no-run-worksheet (false)
 */
function parseBooleanFlag(
  args: string[],
  flagName: string,
  defaultValue: boolean
): boolean {
  const negatedFlag = `--no-${flagName.replace(/^--/, '')}`;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Check negative flag first
    if (arg === negatedFlag) {
      return false;
    }
    
    // Check positive flag
    if (arg === flagName) {
      // Check for next arg being true/false
      if (i + 1 < args.length) {
        const next = args[i + 1];
        if (next === 'true' || next === 'false') {
          return next === 'true';
        }
      }
      return true;
    }
    
    // Check --flag=value format
    if (arg.startsWith(`${flagName}=`)) {
      const value = arg.split('=')[1];
      return value === 'true';
    }
  }
  
  return defaultValue;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--rates' && i + 1 < args.length) {
      options.rates = args[++i];
    } else if (arg === '--rate-card' && i + 1 < args.length) {
      options.rateCard = args[++i];
    } else if (arg === '--promo' && i + 1 < args.length) {
      options.promo = args[++i];
    } else if (arg === '--as-of' && i + 1 < args.length) {
      options.asOf = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    }
  }

  // Parse boolean flags with defaults
  options.runWorksheet = parseBooleanFlag(args, '--run-worksheet', true);

  return options;
}

/**
 * Validate date format
 */
function isValidDate(dateString: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Main CLI
 */
async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const ratesPath = options.rates || options.rateCard;
  if (!ratesPath) {
    console.error('Error: --rates or --rate-card is required\n');
    showHelp();
    process.exit(1);
  }

  // Set rates for assembler
  options.rates = ratesPath;

  // Validate date if provided
  if (options.asOf && !isValidDate(options.asOf)) {
    console.error(`Error: Date must be in YYYY-MM-DD format, got: ${options.asOf}\n`);
    process.exit(1);
  }

  try {
    console.log(`\n🚀 Browns OTA Rate Pipeline Pack\n`);
    if (options.asOf) {
      console.log(`Date: ${options.asOf}`);
    }
    console.log(`Rates: ${options.rates}`);
    if (options.promo) {
      console.log(`Promo: ${options.promo}`);
    }
    console.log(`Output: ${options.outdir || './out'}\n`);

    const result = await assemblePipeline(options);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log(`\n✅ Pipeline pack assembled: ${result.outdir}`);
    console.log(`\n📋 Pipeline Summary:`);
    console.log(`   - OTA Rate Worksheet: ${result.manifest.runOptions.ranWorksheet ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`\n📄 Review PACK.md and APPROVAL.md before any Nightsbridge/OTA changes\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
