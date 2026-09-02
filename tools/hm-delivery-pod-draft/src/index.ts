#!/usr/bin/env node

/**
 * Heavy Metal Delivery POD Draft CLI
 * 
 * Offline tool to generate DRAFT proof-of-delivery notes from structured fields or paste text.
 * NEVER invents volumes or signatures.
 */

import { readFile } from 'fs/promises';
import { extractFromText } from './extractor.js';
import { generateOutputs } from './generator.js';
import type { CliOptions, PodData, ExtractionResult } from './types.js';

const HELP_TEXT = `
Heavy Metal Delivery POD Draft CLI

Usage:
  npm run draft -- --pod pod.json --outdir out/     Generate from JSON
  npm run draft -- --text paste.txt --outdir out/   Generate from paste text
  npm run draft -- --help                           Show this help

Options:
  --pod <file>         Path to pod.json file with delivery data
  --text <file>        Path to paste text file (alternative to --pod)
  --outdir, -o <dir>   Output directory (default: ./out/pod-<date>)
  --help, -h           Show this help message

Examples:
  npm run draft -- --pod pod.json
  npm run draft -- --text delivery-paste.txt --outdir out/
  npm run test:fixtures

Safety:
  ✅ Offline only - no API calls
  ✅ Never invents volumes or signatures
  ✅ Tracks missing fields
  ✅ DRAFT only - never auto-sends
  ⚠️  Always review APPROVAL.md before use
  ⚠️  CoS owns WhatsApp send - confirm volume + location
`;

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--pod':
        options.pod = args[++i];
        break;
      case '--text':
        options.text = args[++i];
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
 * Validate POD data from JSON
 */
function validatePodData(data: any): { pod: PodData; missingFields: string[] } {
  const pod: PodData = {
    customer: data.customer,
    phone: data.phone,
    material: data.material,
    volume: data.volume,
    unit: data.unit,
    deliveryLocation: data.deliveryLocation,
    deliveredAt: data.deliveredAt,
    vehicle: data.vehicle,
    driver: data.driver,
    notes: data.notes,
    signedBy: data.signedBy, // NEVER invent this
  };

  const missingFields: string[] = [];

  // Required fields
  if (!pod.customer) missingFields.push('customer');
  if (!pod.material) missingFields.push('material');
  if (!pod.volume) missingFields.push('volume');
  if (!pod.unit) missingFields.push('unit');
  if (!pod.deliveryLocation) missingFields.push('deliveryLocation');
  if (!pod.deliveredAt) missingFields.push('deliveredAt');

  return { pod, missingFields };
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
  if (!options.pod && !options.text) {
    console.error('❌ Error: Must specify --pod or --text');
    console.log(HELP_TEXT);
    process.exit(1);
  }

  if (options.pod && options.text) {
    console.error('❌ Error: Cannot use both --pod and --text');
    process.exit(1);
  }

  try {
    let result: ExtractionResult;
    let source: string;

    if (options.pod) {
      // Load from JSON
      console.log(`📖 Reading POD data from: ${options.pod}`);
      const content = await readFile(options.pod, 'utf-8');
      const data = JSON.parse(content);
      const validated = validatePodData(data);
      result = { pod: validated.pod, missingFields: validated.missingFields };
      source = options.pod;
    } else {
      // Extract from paste text
      console.log(`📖 Reading paste text from: ${options.text}`);
      const text = await readFile(options.text!, 'utf-8');
      
      if (!text.trim()) {
        console.error('❌ Error: Input text is empty');
        process.exit(1);
      }

      console.log('🔍 Extracting POD data from text...');
      result = extractFromText(text);
      source = options.text!;
    }

    // Determine output directory
    const timestamp = new Date().toISOString().split('T')[0];
    const outdir = options.outdir || `./out/pod-${timestamp}`;

    // Generate output files
    console.log('📝 Generating output files...');
    await generateOutputs(result.pod, result.missingFields, outdir, source);

    // Summary
    console.log('\n📊 POD Summary:');
    console.log(`   Customer: ${result.pod.customer || '❌ NOT FOUND'}`);
    console.log(`   Material: ${result.pod.material || '❌ NOT FOUND'} - ${result.pod.volume || '❌'} ${result.pod.unit || ''}`);
    console.log(`   Location: ${result.pod.deliveryLocation || '❌ NOT FOUND'}`);
    console.log(`   Delivered: ${result.pod.deliveredAt || '❌ NOT FOUND'}`);
    console.log(`   Driver: ${result.pod.driver || '⚠️ Not recorded'}`);
    
    if (result.pod.signedBy) {
      console.log(`   ✅ Signed by: ${result.pod.signedBy}`);
    } else {
      console.log(`   ⚠️ No signature recorded (never invent)`);
    }

    if (result.missingFields.length > 0) {
      console.log(`\n⚠️  Missing ${result.missingFields.length} required field(s): ${result.missingFields.join(', ')}`);
      console.log(`   Review missing-fields.md and fill pod.json`);
    } else {
      console.log(`\n✅ All required fields present`);
      console.log(`   Still verify accuracy in APPROVAL.md`);
    }

    console.log(`\n📂 Output: ${outdir}`);
    console.log(`📄 Next: Review APPROVAL.md and pod.md before use`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
