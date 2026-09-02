#!/usr/bin/env node

/**
 * Heavy Metal Quote Intake CLI
 * 
 * Offline tool to extract structured quote data from WhatsApp inquiry text.
 * Never invents volume, price, or delivery location.
 */

import { readFile } from 'fs/promises';
import { stdin } from 'process';
import { extractQuote } from './extractor.js';
import { generateOutputs } from './generator.js';
import type { CliOptions } from './types.js';

const HELP_TEXT = `
Heavy Metal Quote Intake CLI

Usage:
  npm run intake -- --text <file>     Extract from text file
  npm run intake -- --stdin           Extract from stdin
  npm run intake -- --help            Show this help

Options:
  --text, -t <file>    Path to inquiry text file
  --stdin              Read from stdin instead of file
  --outdir, -o <dir>   Output directory (default: ./out/intake-<date>)
  --help, -h           Show this help message

Examples:
  npm run intake -- --text inquiry.txt
  cat inquiry.txt | npm run intake -- --stdin
  npm run intake -- --text inquiry.txt --outdir out/

Safety:
  ✅ Offline only - no API calls
  ✅ Never invents rates or volumes
  ✅ Tracks missing fields
  ✅ DRAFT only - never auto-sends
  ⚠️  Always review APPROVAL.md before use
`;

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--text':
      case '-t':
        options.text = args[++i];
        break;
      case '--stdin':
        options.stdin = true;
        break;
      case '--outdir':
      case '-o':
        options.outdir = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Read from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  
  for await (const chunk of stdin) {
    chunks.push(chunk as Buffer);
  }
  
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Show help
  if (options.help || args.length === 0) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Validate input source
  if (!options.text && !options.stdin) {
    console.error('❌ Error: Must specify --text or --stdin');
    console.log(HELP_TEXT);
    process.exit(1);
  }

  if (options.text && options.stdin) {
    console.error('❌ Error: Cannot use both --text and --stdin');
    process.exit(1);
  }

  try {
    // Read input
    let text: string;
    let source: string;

    if (options.stdin) {
      console.log('📖 Reading from stdin...');
      text = await readStdin();
      source = 'stdin';
    } else {
      console.log(`📖 Reading from: ${options.text}`);
      text = await readFile(options.text!, 'utf-8');
      source = options.text!;
    }

    if (!text.trim()) {
      console.error('❌ Error: Input text is empty');
      process.exit(1);
    }

    // Extract quote data
    console.log('🔍 Extracting quote data...');
    const result = extractQuote(text);

    // Determine output directory
    const timestamp = new Date().toISOString().split('T')[0];
    const outdir = options.outdir || `./out/intake-${timestamp}`;

    // Generate output files
    console.log('📝 Generating output files...');
    await generateOutputs(result.quote, result.missingFields, outdir, source);

    // Summary
    console.log('\n📊 Extraction Summary:');
    console.log(`   Customer: ${result.quote.customerName || '❌ NOT FOUND'}`);
    console.log(`   Phone: ${result.quote.customerPhone || '❌ NOT FOUND'}`);
    console.log(`   Materials: ${result.quote.materials?.join(', ') || '❌ NOT FOUND'}`);
    console.log(`   Volume: ${result.quote.volume || '❌'} ${result.quote.volumeUnit || ''}`);
    console.log(`   Location: ${result.quote.deliveryLocation || '❌ NOT FOUND'}`);
    console.log(`   Date: ${result.quote.dateNeeded || '❌ NOT FOUND'}`);
    
    if (result.quote.pricePerUnit || result.quote.totalPrice) {
      console.log(`   ⚠️  Pricing extracted - verify against price card`);
    } else {
      console.log(`   ✅ No pricing in inquiry - check price card`);
    }

    if (result.missingFields.length > 0) {
      console.log(`\n⚠️  Missing ${result.missingFields.length} field(s): ${result.missingFields.join(', ')}`);
      console.log(`   Review missing-fields.md and fill quote.json`);
    } else {
      console.log(`\n✅ All fields extracted`);
      console.log(`   Still verify accuracy in APPROVAL.md`);
    }

    console.log(`\n📂 Output: ${outdir}`);
    console.log(`📄 Next: Review APPROVAL.md before use`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
