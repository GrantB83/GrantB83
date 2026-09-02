#!/usr/bin/env node
/**
 * Browns Inquiry Intake CLI
 * Offline tool to extract structured booking/quote data from freeform inquiry text
 */

import * as fs from 'fs';
import { CliOptions } from './types.js';
import { extractInquiry, validateExtraction } from './extractor.js';
import { generateOutputs } from './generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Browns Inquiry Intake CLI - Extract structured booking/quote data from inquiry text

USAGE:
  npm run intake -- --text <path> [options]
  npm run intake -- --stdin [options]

OPTIONS:
  --text, -t        Path to inquiry text file [REQUIRED unless --stdin]
  --stdin           Read inquiry text from stdin
  --mode, -m        Output mode: booking, quote, or both [default: both]
  --outdir, -o      Output directory [default: ./out/intake-<date>]
  --help, -h        Show this help message

EXAMPLES:
  # Extract from file
  npm run intake -- --text fixtures/sample-inquiry.txt

  # Extract with custom output directory
  npm run intake -- --text inquiry.txt --outdir out/

  # Quote mode only
  npm run intake -- --text inquiry.txt --mode quote

  # Read from stdin
  cat inquiry.txt | npm run intake -- --stdin

  # Test with fixtures
  npm run test:fixtures

OUTPUT FILES:
  - booking.json         (mode: booking or both)
  - quote.json           (mode: quote or both)
  - missing-fields.md    (checklist of fields to fill)
  - APPROVAL.md          (review document)
  - manifest.json        (metadata)

SAFETY:
  - Offline only - no API calls
  - No WhatsApp/Gmail/Nightsbridge integration
  - No invented rates or amounts
  - Amounts included ONLY if explicitly stated
  - For Dullstroom Browns only

COMPATIBILITY:
  - booking.json → browns-guest-comms-draft / daily-ops
  - quote.json → browns-quote-invoice-draft
  `);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    mode: 'both',
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--text' || arg === '-t') {
      options.text = args[++i];
    } else if (arg === '--stdin') {
      options.stdin = true;
    } else if (arg === '--mode' || arg === '-m') {
      const mode = args[++i];
      if (mode !== 'booking' && mode !== 'quote' && mode !== 'both') {
        throw new Error(`Invalid mode: ${mode}. Must be booking, quote, or both`);
      }
      options.mode = mode;
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    }
  }
  
  return options;
}

/**
 * Read from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate required arguments
  if (!options.text && !options.stdin) {
    console.error('❌ Error: --text or --stdin is required\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Browns Inquiry Intake CLI\n');
    console.log('⚠️  Offline extraction only - no API calls');
    console.log('⚠️  No invented rates or amounts');
    console.log('⚠️  For Dullstroom Browns only\n');
    
    // Read inquiry text
    let inquiryText: string;
    let sourcePath: string;
    
    if (options.stdin) {
      console.log('Reading from stdin...');
      inquiryText = await readStdin();
      sourcePath = 'stdin';
    } else {
      sourcePath = options.text!;
      console.log(`Reading from: ${sourcePath}`);
      
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`File not found: ${sourcePath}`);
      }
      
      inquiryText = fs.readFileSync(sourcePath, 'utf-8');
    }
    
    console.log(`  ✓ Loaded ${inquiryText.length} characters\n`);
    
    // Extract data
    console.log('Extracting structured data...');
    const result = extractInquiry(inquiryText);
    
    // Validate
    const validation = validateExtraction(result);
    
    if (validation.warnings.length > 0) {
      console.log('  ⚠️  Warnings:');
      for (const warning of validation.warnings) {
        console.log(`      - ${warning}`);
      }
    }
    
    console.log(`  ✓ Extracted ${Object.keys(result.booking).filter(k => result.booking[k as keyof typeof result.booking] !== undefined).length} fields`);
    
    if (result.missingFields.length > 0) {
      console.log(`  ⚠️  Missing ${result.missingFields.length} required fields`);
    }
    
    // Generate outputs
    console.log('\nGenerating output files...');
    const outputDir = await generateOutputs(result, {
      mode: options.mode!,
      sourcePath,
      outdir: options.outdir || './out',
    });
    
    console.log(`  ✓ Output directory: ${outputDir}\n`);
    
    // Print summary
    console.log('✅ Extraction complete!\n');
    console.log('Generated files:');
    
    if (options.mode === 'booking' || options.mode === 'both') {
      console.log('  - booking.json');
    }
    if (options.mode === 'quote' || options.mode === 'both') {
      console.log('  - quote.json');
    }
    console.log('  - missing-fields.md');
    console.log('  - APPROVAL.md');
    console.log('  - manifest.json');
    
    console.log('\n⚠️  IMPORTANT: Review APPROVAL.md before using with downstream tools!\n');
    console.log('Next steps:');
    console.log(`  1. cd ${outputDir}`);
    console.log('  2. cat APPROVAL.md');
    console.log('  3. Fill missing fields using missing-fields.md');
    console.log('  4. Use booking.json with browns-guest-comms-draft or daily-ops');
    
    if (options.mode === 'quote' || options.mode === 'both') {
      console.log('  5. Use quote.json with browns-quote-invoice-draft\n');
    } else {
      console.log('');
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
