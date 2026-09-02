#!/usr/bin/env node
/**
 * browns-ct-pack-pipeline-pack CLI Entry Point
 * 
 * Orchestrates Browns CT pack pipeline:
 * booking-change-check → ct-pack-assemble → optional ct-pack-post-checklist
 * 
 * SAFETY:
 * - Never auto-sends WhatsApp
 * - Never invents guest phones/rates/ETAs
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
Browns CT Pack Pipeline Pack - Orchestrator

Usage:
  npm run pipeline -- --date YYYY-MM-DD --outdir <dir> [options]

Required:
  --date <YYYY-MM-DD>        Target date for the pack
  --outdir <dir>             Output directory for pipeline pack

Options:
  --bookings <path>          Path to bookings.json file
  --change-check <path>      Path to existing change-check output
  --before <path>            Path to before.json (for change-check)
  --after <path>             Path to after.json (for change-check)
  --run-change-check         Run browns-booking-change-check
  --pack <path>              Use existing ct-pack-assemble output
  
  --run-post-checklist       Run post-checklist (default: true)
  --run-post-checklist=false Disable post-checklist
  --run-post-checklist false Disable post-checklist
  --no-run-post-checklist    Disable post-checklist
  
  --help, -h                 Show this help

Examples:

  # Minimal: Use existing pack, skip post-checklist:
  npm run pipeline -- \\
    --date 2026-09-20 \\
    --pack ../browns-ct-pack-assemble/out/ct-2026-09-20 \\
    --outdir pipeline-out/ \\
    --no-run-post-checklist

  # Full pipeline with all stages:
  npm run pipeline -- \\
    --date 2026-09-20 \\
    --bookings bookings.json \\
    --before before.json \\
    --after after.json \\
    --run-change-check \\
    --outdir pipeline-out/

  # Default (post-checklist runs):
  npm run pipeline -- \\
    --date 2026-09-20 \\
    --bookings bookings.json \\
    --outdir pipeline-out/

Safety:
  - Never auto-sends WhatsApp
  - Never invents guest phones/rates/ETAs
  - Offline only
  - Drafts for CoS approval only
`);
}

/**
 * Parse boolean flag with flexible formats:
 * --run-post-checklist (true)
 * --run-post-checklist=true (true)
 * --run-post-checklist=false (false)
 * --run-post-checklist true (true)
 * --run-post-checklist false (false)
 * --no-run-post-checklist (false)
 */
function parseBooleanFlag(
  args: string[],
  flagName: string,
  defaultValue: boolean
): boolean {
  const negatedFlag = `--no-${flagName.replace(/^--/, '')}`;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === negatedFlag) {
      return false;
    }
    
    if (arg === flagName) {
      if (i + 1 < args.length) {
        const next = args[i + 1];
        if (next === 'true' || next === 'false') {
          return next === 'true';
        }
      }
      return true;
    }
    
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
    } else if (arg === '--date' && i + 1 < args.length) {
      options.date = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    } else if (arg === '--bookings' && i + 1 < args.length) {
      options.bookings = args[++i];
    } else if (arg === '--change-check' && i + 1 < args.length) {
      options.changeCheck = args[++i];
    } else if (arg === '--before' && i + 1 < args.length) {
      options.before = args[++i];
    } else if (arg === '--after' && i + 1 < args.length) {
      options.after = args[++i];
    } else if (arg === '--run-change-check') {
      options.runChangeCheck = true;
    } else if (arg === '--pack' && i + 1 < args.length) {
      options.pack = args[++i];
    }
  }

  options.runPostChecklist = parseBooleanFlag(args, '--run-post-checklist', true);

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

  if (!options.date) {
    console.error('Error: --date is required\n');
    showHelp();
    process.exit(1);
  }

  if (!isValidDate(options.date)) {
    console.error(`Error: --date must be in YYYY-MM-DD format, got: ${options.date}\n`);
    process.exit(1);
  }

  if (!options.outdir) {
    console.error('Error: --outdir is required\n');
    showHelp();
    process.exit(1);
  }

  if (!options.pack && !options.bookings) {
    console.error('Error: Either --pack or --bookings is required\n');
    showHelp();
    process.exit(1);
  }

  if (options.runChangeCheck && (!options.before || !options.after)) {
    console.error('Error: --run-change-check requires --before and --after\n');
    process.exit(1);
  }

  try {
    console.log(`\n🚀 Browns CT Pack Pipeline\n`);
    console.log(`Date: ${options.date}`);
    console.log(`Output: ${options.outdir}\n`);

    const result = await assemblePipeline(options);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log(`\n✅ Pipeline pack assembled: ${result.outdir}`);
    console.log(`\n📋 Pipeline Summary:`);
    console.log(`   - Booking Change Check: ${result.manifest.runOptions.ranChangeCheck ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - CT Pack Assemble: ${result.manifest.runOptions.ranAssemble ? '✅ Run' : '📦 Used existing'}`);
    console.log(`   - Post-Checklist: ${result.manifest.runOptions.ranPostChecklist ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`\n📄 Review ${result.manifest.runOptions.ranPostChecklist ? 'POST-CHECKLIST.md and ' : ''}PACK.md before posting\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
