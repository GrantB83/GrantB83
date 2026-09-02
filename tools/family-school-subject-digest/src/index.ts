#!/usr/bin/env node
/**
 * Family School Subject Digest CLI
 * Offline tool to generate school/admin digest from email subjects
 */

import * as fs from 'fs';
import { CliOptions } from './types.js';
import { parseInput } from './parser.js';
import { generateOutputs } from './generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Family School Subject Digest CLI - Generate digest from email subjects

USAGE:
  npm run digest -- --input <path> [options]

OPTIONS:
  --input, -i       Path to subjects file [REQUIRED]
  --outdir, -o      Output directory [default: ./out]
  --date, -d        Date label (YYYY-MM-DD) [default: today UTC]
  --timezone, -t    Timezone for date label [default: America/Chicago]
  --help, -h        Show this help message

INPUT FORMAT:
  Flexible input - supports multiple formats:
  
  1. One subject per line:
     AISD School Closure Notice
     Parent-Teacher Conference Sign Up
  
  2. Subject with snippet:
     AISD Bus Schedule | Route changes effective Monday
     Report Card Available | View on Skyward
  
  3. Markdown bullet list:
     - AISD School Closure Notice
     - Parent-Teacher Conference Sign Up

CLASSIFICATION:
  Items are tagged as: school | forms | calendar | payment | sports | other
  
  School keywords: AISD, school, teacher, homework, report card, PTA, bus, etc.
  
  Due dates and amounts are NEVER invented - only extracted if explicitly present.

OUTPUT FILES:
  - digest.md           (Grant/Liana-facing full sentences)
  - items.json          (structured data)
  - missing-fields.md   (items needing clarification)
  - APPROVAL.md         (approval document - DRAFT ONLY)
  - manifest.json       (metadata)

EXAMPLES:
  # Basic usage
  npm run digest -- --input subjects.txt

  # With custom output directory
  npm run digest -- --input subjects.txt --outdir out/

  # With custom date and timezone
  npm run digest -- --input subjects.txt --date 2026-09-15 --timezone America/Chicago

  # Test with fixtures
  npm run test:fixtures

SAFETY:
  - Offline only - no API calls
  - No LLM - keyword classification only
  - No invented due dates or amounts
  - DRAFT ONLY - never sends
  - Family bot owns WhatsApp send path
  `);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--input' || arg === '-i') {
      options.input = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i];
    } else if (arg === '--timezone' || arg === '-t') {
      options.timezone = args[++i];
    }
  }
  
  return options;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
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
  if (!options.input) {
    console.error('❌ Error: --input is required\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Family School Subject Digest CLI\n');
    console.log('⚠️  Offline processing only - no API calls');
    console.log('⚠️  No LLM - keyword classification only');
    console.log('⚠️  No invented due dates or amounts');
    console.log('⚠️  DRAFT ONLY - never sends\n');
    
    // Read input file
    const inputPath = options.input;
    console.log(`Reading from: ${inputPath}`);
    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`File not found: ${inputPath}`);
    }
    
    const content = fs.readFileSync(inputPath, 'utf-8');
    console.log(`  ✓ Loaded ${content.length} characters\n`);
    
    // Parse subjects
    console.log('Parsing subjects...');
    const items = parseInput(content);
    console.log(`  ✓ Parsed ${items.length} items\n`);
    
    if (items.length === 0) {
      throw new Error('No valid subjects found in input');
    }
    
    // Count by tag
    const schoolCount = items.filter(i => i.tag === 'school').length;
    const adminCount = items.length - schoolCount;
    
    console.log(`Classification breakdown:`);
    console.log(`  - School: ${schoolCount}`);
    console.log(`  - Admin: ${adminCount}`);
    console.log('');
    
    // Generate outputs
    const date = options.date || getTodayDate();
    const timezone = options.timezone || 'America/Chicago';
    const outdir = options.outdir || './out';
    
    console.log('Generating output files...');
    const outputDir = await generateOutputs(items, { date, timezone, outdir });
    console.log(`  ✓ Output directory: ${outputDir}\n`);
    
    // Print summary
    console.log('✅ Digest generation complete!\n');
    console.log('Generated files:');
    console.log('  - digest.md');
    console.log('  - items.json');
    console.log('  - missing-fields.md');
    console.log('  - APPROVAL.md');
    console.log('  - manifest.json');
    console.log('');
    console.log('⚠️  IMPORTANT: Review APPROVAL.md before using this digest!\n');
    console.log('Next steps:');
    console.log(`  1. cd ${outputDir}`);
    console.log('  2. cat APPROVAL.md');
    console.log('  3. Review digest.md for accuracy');
    console.log('  4. Check missing-fields.md for items needing clarification');
    console.log('  5. Family bot owns WhatsApp send workflow\n');
    
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
