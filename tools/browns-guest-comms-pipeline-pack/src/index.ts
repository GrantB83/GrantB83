#!/usr/bin/env node
/**
 * Browns Guest Comms Pipeline Pack CLI Entry Point
 * 
 * Orchestrates Browns guest communication drafts for SA Ops / CoS:
 * optional browns-guest-facts-pack + browns-guest-comms-draft (default ON)
 * 
 * SAFETY:
 * - Never auto-sends WhatsApp/email
 * - Never invents rates, Wi-Fi passwords, phones, or amenities
 * - Offline only
 * - Drafts for Grant approval only
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
Browns Guest Comms Pipeline Pack - Orchestrator

Usage:
  npm run pack -- --booking <path> [options]

Required:
  --booking, --bookings <path>    Path to booking JSON file

Optional:
  --facts-md <path>               Markdown knowledge file (triggers --run-facts if present)
  --facts-json <path>             Existing facts JSON file (skips facts stage)
  --seeds <path>                  Directory with seed tone samples
  --outdir <dir>                  Output directory for pack (default: ./out)
  --as-of <YYYY-MM-DD>            Date for pack timestamp
  
  --run-facts                     Run browns-guest-facts-pack [default: false]
  --run-facts=true                Enable facts pack
  --no-run-facts                  Disable facts pack explicitly
  
  --run-comms                     Run browns-guest-comms-draft [default: true]
  --run-comms=false               Disable comms draft
  --no-run-comms                  Disable comms draft
  
  --help, -h                      Show this help

Examples:

  # Basic (comms only, no facts stage):
  npm run pack -- \\
    --booking booking.json

  # With existing facts JSON:
  npm run pack -- \\
    --booking booking.json \\
    --facts-json guest-facts.json

  # With markdown (auto-runs facts stage):
  npm run pack -- \\
    --booking booking.json \\
    --facts-md the-browns.md

  # Explicit facts stage + comms:
  npm run pack -- \\
    --booking booking.json \\
    --run-facts \\
    --facts-md the-browns.md

  # Test with fixtures:
  npm run test:fixtures

Safety:
  - Never auto-sends WhatsApp/email
  - Never invents rates, Wi-Fi passwords, phones, or amenities
  - Offline only
  - Drafts for Grant approval only
`);
}

/**
 * Parse boolean flag with flexible formats (PR #114 pattern):
 * --run-facts (true)
 * --run-facts=true (true)
 * --run-facts=false (false)
 * --run-facts true (true)
 * --run-facts false (false)
 * --no-run-facts (false)
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
    } else if ((arg === '--booking' || arg === '--bookings') && i + 1 < args.length) {
      options.booking = args[++i];
    } else if (arg === '--facts-md' && i + 1 < args.length) {
      options.factsMd = args[++i];
    } else if (arg === '--facts-json' && i + 1 < args.length) {
      options.factsJson = args[++i];
    } else if (arg === '--seeds' && i + 1 < args.length) {
      options.seeds = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    } else if (arg === '--as-of' && i + 1 < args.length) {
      options.asOf = args[++i];
    }
  }

  // Parse boolean flags with defaults
  // Default: facts OFF unless --facts-md given or explicit --run-facts
  const hasFactsMd = !!options.factsMd;
  const explicitRunFacts = parseBooleanFlag(args, '--run-facts', false);
  options.runFacts = hasFactsMd || explicitRunFacts;
  
  // Default: comms ON
  options.runComms = parseBooleanFlag(args, '--run-comms', true);

  return options;
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

  if (!options.booking) {
    console.error('Error: --booking or --bookings is required\\n');
    showHelp();
    process.exit(1);
  }

  try {
    console.log(`\n🚀 Browns Guest Comms Pipeline Pack\n`);
    console.log(`Booking: ${options.booking}`);
    if (options.factsMd) {
      console.log(`Facts MD: ${options.factsMd}`);
    }
    if (options.factsJson) {
      console.log(`Facts JSON: ${options.factsJson}`);
    }
    if (options.seeds) {
      console.log(`Seeds: ${options.seeds}`);
    }
    console.log(`Output: ${options.outdir || './out'}\n`);

    const result = await assemblePipeline(options);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log(`\n✅ Pipeline pack assembled: ${result.outdir}`);
    console.log(`\n📋 Pipeline Summary:`);
    console.log(`   - Guest Facts Pack: ${result.manifest.runOptions.ranFacts ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - Guest Comms Draft: ${result.manifest.runOptions.ranComms ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`\n📄 Review PACK.md and APPROVAL.md before posting\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
