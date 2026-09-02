#!/usr/bin/env node
/**
 * hm-quote-pipeline-pack CLI Entry Point
 * 
 * Orchestrates Heavy Metal quote pipeline tools into one pack:
 * hm-quote-intake → hm-quote-to-pod → optional hm-delivery-pod-draft
 * 
 * SAFETY:
 * - Never invents volume/price/location/signature
 * - Never sends WhatsApp
 * - Offline only
 * - H1 gate reminder in APPROVAL.md
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
Heavy Metal Quote Pipeline Pack - Orchestrator

Usage:
  npm run pack -- --outdir <dir> [options]

Options:
  --text <path>              Input inquiry text file (for --run-intake)
  --quote <path>             Existing quote.json file
  --run-intake               Run hm-quote-intake (requires --text)
  --run-map                  Run hm-quote-to-pod (requires --quote or --quote-outdir)
  --run-pod                  Run hm-delivery-pod-draft (requires --pod-outdir)
  --quote-outdir <path>      Prebuilt quote output directory
  --pod-outdir <path>        Prebuilt pod output directory  
  --pod-draft-outdir <path>  Prebuilt pod draft output directory
  --notes <text>             Additional notes for map step
  --outdir <path>            Output directory (required)
  --help, -h                 Show this help

Examples:

  # Use prebuilt outputs (recommended):
  npm run pack -- \\
    --outdir out/pack-20260902/ \\
    --quote-outdir ../hm-quote-intake/out/intake-20260902/ \\
    --pod-outdir ../hm-quote-to-pod/out/map-20260902/

  # Run intake and map:
  npm run pack -- \\
    --outdir out/pack-20260902/ \\
    --run-intake --text inquiry.txt \\
    --run-map

  # Full pipeline:
  npm run pack -- \\
    --outdir out/pack-20260902/ \\
    --run-intake --text inquiry.txt \\
    --run-map \\
    --run-pod

Safety:
  - Never invents volume/price/location/signature
  - Never sends WhatsApp
  - Offline only
  - H1 gate reminder before quote send
`);
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
    } else if (arg === '--text' && i + 1 < args.length) {
      options.text = args[++i];
    } else if (arg === '--quote' && i + 1 < args.length) {
      options.quote = args[++i];
    } else if (arg === '--run-intake') {
      options.runIntake = true;
    } else if (arg === '--run-map') {
      options.runMap = true;
    } else if (arg === '--run-pod') {
      options.runPod = true;
    } else if (arg === '--quote-outdir' && i + 1 < args.length) {
      options.quoteOutdir = args[++i];
    } else if (arg === '--pod-outdir' && i + 1 < args.length) {
      options.podOutdir = args[++i];
    } else if (arg === '--pod-draft-outdir' && i + 1 < args.length) {
      options.podDraftOutdir = args[++i];
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

  try {
    const result = await assemblePack(options);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log(`\n✅ Pack assembled: ${result.outdir}`);
    console.log(`📄 Review APPROVAL.md before proceeding\n`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
