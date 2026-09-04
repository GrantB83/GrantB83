#!/usr/bin/env node
/**
 * browns-inquiry-quote-pipeline-pack CLI Entry Point
 * 
 * Orchestrates Browns inquiry → quote draft into one pack:
 * browns-inquiry-intake (optional) → browns-quote-invoice-draft (default ON)
 * 
 * SAFETY:
 * - Never invents rates or amounts
 * - Never sends mail/WhatsApp
 * - Offline only
 * - H7 gate reminder in APPROVAL.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CliOptions } from './types.js';
import { assemblePack } from './assembler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Browns Inquiry Quote Pipeline Pack - Orchestrator

Usage:
  npm run pack -- --outdir <dir> [options]

Options:
  --text <path>              Input inquiry text file (for --run-intake)
  --inquiry <path>           Existing inquiry JSON file (booking.json or quote.json)
  --run-intake               Run browns-inquiry-intake (requires --text)
  --run-quote                Run browns-quote-invoice-draft [default: true]
                             Use --run-quote=false or --no-run-quote to skip
  --intake-outdir <path>     Custom intake output directory
  --notes <text>             Additional notes
  --outdir <path>            Output directory (required)
  --help, -h                 Show this help

Boolean Flag Syntax (PR #114 pattern):
  --run-quote                Enable (default)
  --run-quote=false          Disable with equals
  --run-quote false          Disable with space
  --no-run-quote             Disable with negative flag

Examples:

  # Use existing inquiry JSON:
  npm run pack -- \\
    --outdir out/pack-20260902/ \\
    --inquiry ../browns-inquiry-intake/out/intake-20260902/booking.json

  # Run intake from text:
  npm run pack -- \\
    --outdir out/pack-20260902/ \\
    --run-intake --text inquiry.txt

  # Run intake + skip quote:
  npm run pack -- \\
    --outdir out/pack-20260902/ \\
    --run-intake --text inquiry.txt \\
    --run-quote=false

  # Test with fixtures:
  npm run test:fixtures

Safety:
  - Never invents rates or amounts
  - Never sends mail/WhatsApp
  - Offline only
  - H7 gate reminder before quote send
  - [RATE CARD REQUIRED] when amounts missing
`);
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    runQuote: true // default ON per requirements
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--text' && i + 1 < args.length) {
      options.text = args[++i];
    } else if (arg === '--inquiry' && i + 1 < args.length) {
      options.inquiry = args[++i];
    } else if (arg === '--run-intake') {
      options.runIntake = true;
    } else if (arg === '--no-run-quote') {
      // Handle negative flag: --no-run-quote
      options.runQuote = false;
    } else if (arg === '--run-quote' || arg.startsWith('--run-quote=')) {
      // Handle --run-quote[=value] (PR #114 pattern)
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runQuote = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runQuote = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runQuote = true;
          i++;
        } else {
          options.runQuote = true;
        }
      }
    } else if (arg === '--intake-outdir' && i + 1 < args.length) {
      options.intakeOutdir = args[++i];
    } else if (arg === '--notes' && i + 1 < args.length) {
      options.notes = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    }
  }

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

  if (!options.outdir) {
    console.error('Error: --outdir is required\n');
    showHelp();
    process.exit(1);
  }

  // Validate input
  if (options.runIntake && !options.text) {
    console.error('Error: --text is required when using --run-intake\n');
    showHelp();
    process.exit(1);
  }

  if (!options.runIntake && !options.inquiry) {
    console.error('Error: Either --run-intake --text or --inquiry is required\n');
    showHelp();
    process.exit(1);
  }

  try {
    console.log('Browns Inquiry Quote Pipeline Pack\n');
    console.log('⚠️  Offline pipeline assembler - no API calls');
    console.log('⚠️  Never sends mail/WhatsApp');
    console.log('⚠️  Never invents rates or amounts');
    console.log('⚠️  H7 approval required before any send\n');

    const result = await assemblePack(options);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log(`\n✅ Pack assembled: ${result.outdir}`);
    console.log(`📄 Review APPROVAL.md before proceeding`);
    console.log(`⚠️  [RATE CARD REQUIRED] if amounts missing\n`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
