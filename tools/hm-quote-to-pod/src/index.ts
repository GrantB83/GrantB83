#!/usr/bin/env node
/**
 * Heavy Metal Quote-to-POD Mapper CLI
 *
 * Maps quote.json (from hm-quote-intake) to pod.json (for hm-delivery-pod-draft)
 *
 * Usage:
 *   npm run map -- --quote path/to/quote.json
 *   npm run map -- --quote quote.json --outdir out/ --notes "Extra notes"
 */

import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CliOptions, Quote } from './types.js';
import { mapQuoteToPod } from './mapper.js';
import { generateOutputs } from './generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--quote':
        options.quote = args[++i];
        break;
      case '--outdir':
        options.outdir = args[++i];
        break;
      case '--notes':
        options.notes = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

function showHelp(): void {
  const help = `
Heavy Metal Quote-to-POD Mapper

Map quote.json (from hm-quote-intake) to pod.json stub (for hm-delivery-pod-draft).
Field bridge only. Never invents volume, signature, or price. Never sends WhatsApp.

Usage:
  npm run map -- --quote <path> [options]

Required:
  --quote <path>        Path to quote.json from hm-quote-intake

Optional:
  --outdir <path>       Output directory (default: ./out/map-<timestamp>)
  --notes <text>        Additional notes to append to pod notes field
  --help, -h            Show this help

Examples:
  npm run map -- --quote fixtures/sample-quote.json
  npm run map -- --quote quote.json --outdir out/
  npm run map -- --quote quote.json --notes "Rush delivery"

Outputs:
  pod.json              Mapped POD stub for hm-delivery-pod-draft
  mapping.md            Field mapping report
  APPROVAL.md           Review document
  manifest.json         Metadata

Next step:
  hm-delivery-pod-draft --pod pod.json

Entity: Heavy Metal Sand & Stone, Dullstroom
Lane: heavy-metal
CoS owns WhatsApp send. Never auto-send.
`;
  console.log(help);
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.quote) {
    console.error('Error: --quote is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  const quotePath = resolve(options.quote);
  if (!existsSync(quotePath)) {
    console.error(`Error: Quote file not found: ${quotePath}`);
    process.exit(1);
  }

  // Read quote.json
  let quote: Quote;
  try {
    const quoteContent = readFileSync(quotePath, 'utf-8');
    quote = JSON.parse(quoteContent);
  } catch (error) {
    console.error(`Error: Failed to read or parse quote.json: ${(error as Error).message}`);
    process.exit(1);
  }

  // Validate quote is an object
  if (typeof quote !== 'object' || quote === null || Array.isArray(quote)) {
    console.error('Error: quote.json must be a JSON object');
    process.exit(1);
  }

  // Set output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outdir = options.outdir || join(process.cwd(), `out/map-${timestamp}`);

  // Create output directory
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  // Map quote to pod
  const { pod, report } = mapQuoteToPod(quote, options.notes);

  // Generate outputs
  const manifest = generateOutputs(outdir, pod, report, quotePath, !!options.notes);

  // Success message
  console.log('✅ Quote mapped to POD stub successfully');
  console.log('');
  console.log(`📂 Output directory: ${outdir}`);
  console.log('');
  console.log('Generated files:');
  console.log(`  - pod.json           (POD stub for hm-delivery-pod-draft)`);
  console.log(`  - mapping.md         (Field mapping report)`);
  console.log(`  - APPROVAL.md        (Review document)`);
  console.log(`  - manifest.json      (Metadata)`);
  console.log('');
  console.log(`✅ Carried: ${report.carried.length} fields`);
  console.log(`❌ Missing: ${report.missing.length} fields`);
  if (report.notes.length > 0) {
    console.log(`📝 Notes: ${report.notes.length} mapping notes`);
  }
  console.log('');
  console.log('⚠️  Review APPROVAL.md before using pod.json');
  console.log('');
  console.log('Next step:');
  console.log(`  cd ${dirname(outdir)}`);
  console.log(`  hm-delivery-pod-draft --pod ${join(outdir, 'pod.json')}`);
  console.log('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
