#!/usr/bin/env node
/**
 * Browns Welcome Late Pipeline Pack CLI Entry Point
 * 
 * Orchestrates Browns same-day guest packs:
 * browns-welcome-draft-pack (default ON) + browns-late-checkin-queue (default ON) + optional browns-daily-ops-brief
 * 
 * SAFETY:
 * - Never auto-sends WhatsApp/email
 * - Never invents guest phone/ETA/rates/amounts
 * - Offline only
 * - Drafts for CoS approval only
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
Browns Welcome Late Pipeline Pack - Orchestrator

Usage:
  npm run pack -- --bookings <path> --day YYYY-MM-DD [options]

Required:
  --bookings <path>          Path to bookings.json file
  --day <YYYY-MM-DD>         Target date for the pack

Optional:
  --as-of <YYYY-MM-DD>       Alternative to --day (same meaning)
  --facts <path>             Path to guest facts JSON file
  --outdir <dir>             Output directory for pack (default: ./out)
  
  --run-welcome              Run browns-welcome-draft-pack [default: true]
  --run-welcome=false        Disable welcome draft pack
  --no-run-welcome           Disable welcome draft pack
  
  --run-late                 Run browns-late-checkin-queue [default: true]
  --run-late=false           Disable late checkin queue
  --no-run-late              Disable late checkin queue
  
  --run-daily-ops            Run browns-daily-ops-brief [default: false]
  --run-daily-ops=true       Enable daily ops brief
  
  --help, -h                 Show this help

Examples:

  # Basic (welcome + late, no daily ops):
  npm run pack -- \\
    --bookings bookings.json \\
    --day 2026-09-20

  # With guest facts:
  npm run pack -- \\
    --bookings bookings.json \\
    --day 2026-09-20 \\
    --facts guest-facts.json

  # All stages including daily ops:
  npm run pack -- \\
    --bookings bookings.json \\
    --day 2026-09-20 \\
    --run-daily-ops

  # Skip welcome, run late only:
  npm run pack -- \\
    --bookings bookings.json \\
    --day 2026-09-20 \\
    --no-run-welcome

  # Test with fixtures:
  npm run test:fixtures

Safety:
  - Never auto-sends WhatsApp/email
  - Never invents guest phone/ETA/rates/amounts
  - Offline only
  - Drafts for CoS approval only
`);
}

/**
 * Parse boolean flag with flexible formats (PR #114 pattern):
 * --run-welcome (true)
 * --run-welcome=true (true)
 * --run-welcome=false (false)
 * --run-welcome true (true)
 * --run-welcome false (false)
 * --no-run-welcome (false)
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
    } else if (arg === '--bookings' && i + 1 < args.length) {
      options.bookings = args[++i];
    } else if (arg === '--day' && i + 1 < args.length) {
      options.day = args[++i];
    } else if (arg === '--as-of' && i + 1 < args.length) {
      options.asOf = args[++i];
    } else if (arg === '--facts' && i + 1 < args.length) {
      options.facts = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    }
  }

  // Parse boolean flags with defaults
  options.runWelcome = parseBooleanFlag(args, '--run-welcome', true);
  options.runLate = parseBooleanFlag(args, '--run-late', true);
  options.runDailyOps = parseBooleanFlag(args, '--run-daily-ops', false);

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

  if (!options.bookings) {
    console.error('Error: --bookings is required\n');
    showHelp();
    process.exit(1);
  }

  const day = options.day || options.asOf;
  if (!day) {
    console.error('Error: --day or --as-of is required\n');
    showHelp();
    process.exit(1);
  }

  if (!isValidDate(day)) {
    console.error(`Error: Date must be in YYYY-MM-DD format, got: ${day}\n`);
    process.exit(1);
  }

  // Set day for assembler
  options.day = day;

  try {
    console.log(`\n🚀 Browns Welcome Late Pipeline Pack\n`);
    console.log(`Date: ${day}`);
    console.log(`Bookings: ${options.bookings}`);
    if (options.facts) {
      console.log(`Facts: ${options.facts}`);
    }
    console.log(`Output: ${options.outdir || './out'}\n`);

    const result = await assemblePipeline(options);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log(`\n✅ Pipeline pack assembled: ${result.outdir}`);
    console.log(`\n📋 Pipeline Summary:`);
    console.log(`   - Welcome Draft Pack: ${result.manifest.runOptions.ranWelcome ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - Late Checkin Queue: ${result.manifest.runOptions.ranLate ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - Daily Ops Brief: ${result.manifest.runOptions.ranDailyOps ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`\n📄 Review PACK.md and APPROVAL.md before posting\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
