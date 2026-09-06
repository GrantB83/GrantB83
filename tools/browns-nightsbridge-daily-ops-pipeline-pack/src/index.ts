#!/usr/bin/env node
/**
 * Browns Nightsbridge Daily Ops Pipeline Pack CLI Entry Point
 * 
 * Orchestrates Browns Dullstroom daily ops from Nightsbridge exports:
 * browns-nightsbridge-bookings-adapter (default ON) → browns-daily-ops-brief (default ON) → optional browns-booking-change-check → optional browns-late-checkin-queue
 * 
 * SAFETY:
 * - Never auto-sends WhatsApp/email
 * - Never invents guest phone/ETA/rates/amounts
 * - Offline only
 * - Drafts for SA Ops / CoS approval only
 */

import type { CliOptions } from './types.js';
import { assemblePipeline } from './assembler.js';

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Browns Nightsbridge Daily Ops Pipeline Pack - Orchestrator

Usage:
  npm run pack -- --input <file> --day YYYY-MM-DD [options]
  or
  cat file.txt | npm run pack -- --paste --day YYYY-MM-DD [options]

Required:
  --day <YYYY-MM-DD>         Target date for the pack
  --input <path>             Path to Nightsbridge CSV/TSV file
  OR
  --paste                    Read from stdin (pasted text)

Optional:
  --as-of <YYYY-MM-DD>       Alternative to --day (same meaning)
  --prior-bookings <path>    Path to prior bookings.json for change check
  --facts <path>             Path to daily facts JSON file
  --outdir <dir>             Output directory for pack (default: ./out)
  
  --run-adapter              Run browns-nightsbridge-bookings-adapter [default: true]
  --run-adapter=false        Disable adapter
  --no-run-adapter           Disable adapter
  
  --run-brief                Run browns-daily-ops-brief [default: true]
  --run-brief=false          Disable daily ops brief
  --no-run-brief             Disable daily ops brief
  
  --run-change-check         Run browns-booking-change-check [default: true if --prior-bookings given]
  --run-change-check=false   Disable change check
  --no-run-change-check      Disable change check
  
  --run-late                 Run browns-late-checkin-queue [default: false]
  --run-late=true            Enable late checkin queue
  
  --help, -h                 Show this help

Pipeline Stages:

  1. browns-nightsbridge-bookings-adapter (DEFAULT ON)
     • Nightsbridge CSV/TSV → bookings.json

  2. browns-daily-ops-brief (DEFAULT ON)
     • bookings.json → daily ops WhatsApp draft

  3. browns-booking-change-check (DEFAULT ON when --prior-bookings given; OFF otherwise)
     • Diff prior vs current bookings snapshot

  4. browns-late-checkin-queue (DEFAULT OFF; opt-in --run-late)
     • After-hours check-in queue from bookings

Examples:

  # Basic (adapter + brief, no change check, no late queue):
  npm run pack -- \\
    --input nightsbridge.csv \\
    --day 2026-09-20

  # With prior bookings for change check:
  npm run pack -- \\
    --input nightsbridge.csv \\
    --day 2026-09-20 \\
    --prior-bookings bookings-yesterday.json

  # All stages including late queue:
  npm run pack -- \\
    --input nightsbridge.csv \\
    --day 2026-09-20 \\
    --prior-bookings bookings-yesterday.json \\
    --run-late

  # From stdin (pasted table):
  cat table.txt | npm run pack -- \\
    --paste \\
    --day 2026-09-20

  # Test with fixtures:
  npm run test:fixtures

Safety:
  - Never auto-sends WhatsApp/email
  - Never invents guest phone/ETA/rates/amounts
  - Offline only
  - Drafts for SA Ops / CoS approval only
  - Prefer node dist/ over npm exec (avoids hang on shared box)
`);
}

/**
 * Parse boolean flag with flexible formats (PR #114 pattern):
 * --run-late (true)
 * --run-late=true (true)
 * --run-late=false (false)
 * --run-late true (true)
 * --run-late false (false)
 * --no-run-late (false)
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
    } else if (arg === '--input' && i + 1 < args.length) {
      options.input = args[++i];
    } else if (arg === '--paste') {
      options.paste = true;
    } else if (arg === '--day' && i + 1 < args.length) {
      options.day = args[++i];
    } else if (arg === '--as-of' && i + 1 < args.length) {
      options.asOf = args[++i];
    } else if (arg === '--prior-bookings' && i + 1 < args.length) {
      options.priorBookings = args[++i];
    } else if (arg === '--facts' && i + 1 < args.length) {
      options.facts = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    }
  }

  // Parse boolean flags with defaults
  options.runAdapter = parseBooleanFlag(args, '--run-adapter', true);
  options.runBrief = parseBooleanFlag(args, '--run-brief', true);
  
  // Change check: default ON if --prior-bookings given, OFF otherwise
  // But can be explicitly overridden
  const hasExplicitChangeCheck = args.some(a => 
    a === '--run-change-check' || 
    a === '--no-run-change-check' || 
    a.startsWith('--run-change-check=')
  );
  
  if (hasExplicitChangeCheck) {
    options.runChangeCheck = parseBooleanFlag(args, '--run-change-check', true);
  } else {
    options.runChangeCheck = !!options.priorBookings;
  }
  
  options.runLate = parseBooleanFlag(args, '--run-late', false);

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

  if (!options.input && !options.paste) {
    console.error('Error: Either --input or --paste is required\n');
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
    console.log(`\n🚀 Browns Nightsbridge Daily Ops Pipeline Pack\n`);
    console.log(`Date: ${day}`);
    if (options.input) {
      console.log(`Input: ${options.input}`);
    } else {
      console.log(`Input: stdin (pasted)`);
    }
    if (options.priorBookings) {
      console.log(`Prior Bookings: ${options.priorBookings}`);
    }
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
    console.log(`   - Nightsbridge Adapter: ${result.manifest.runOptions.ranAdapter ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - Daily Ops Brief: ${result.manifest.runOptions.ranBrief ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - Booking Change Check: ${result.manifest.runOptions.ranChangeCheck ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - Late Checkin Queue: ${result.manifest.runOptions.ranLate ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`\n📄 Review PACK.md and APPROVAL.md before posting to WhatsApp\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
