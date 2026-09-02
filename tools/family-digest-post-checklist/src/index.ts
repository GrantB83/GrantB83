#!/usr/bin/env node
/**
 * Family Digest Post Checklist CLI
 * Offline pre-WhatsApp post checklist for family-morning-digest-pack outputs
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions } from './types.js';
import { runAllChecks } from './checker.js';
import {
  generatePostChecklist,
  generateIssues,
  generateApproval,
  generateManifest
} from './generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Family Digest Post Checklist CLI - Pre-WhatsApp validation for digest packs

USAGE:
  npm run check -- --pack <path-to-pack> [options]

OPTIONS:
  --pack, -p            Path to pack folder (from family-morning-digest-pack) [REQUIRED]
  --date, -d            Date label (YYYY-MM-DD) [optional, extracted from pack if not provided]
  --outdir, -o          Output directory [default: ./out]
  --help, -h            Show this help message

BEHAVIOR:
  Checks (heuristic, read-only):
  - Required files present (PACK.md, school.md, family.md)
  - school.md and family.md are non-empty OR explicitly empty-with-header
  - No obvious duplicate line items between school.md and family.md
  - APPROVAL.md present in pack
  - Warn if calendar/due sections referenced in PACK.md but files missing

OUTPUT:
  Creates: <outdir>/
    - POST-CHECKLIST.md   (numbered go/no-go ticks for Family)
    - ISSUES.md           (failures/warnings only)
    - APPROVAL.md         (Family/CoS owns send; full sentences; offline only)
    - manifest.json       (metadata)

EXIT CODES:
  0 - All checks passed
  1 - Pack path missing, required files absent, or checks failed

SAFETY:
  - Offline only - no API calls
  - Never sends to WhatsApp
  - Never invents school facts
  - Read-only checks

EXAMPLES:
  # Basic usage
  npm run check -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

  # With explicit date and output directory
  npm run check -- --pack path/to/pack --date 2026-09-02 --outdir reports/

  # Test with fixtures
  npm run test:fixtures
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
    } else if (arg === '--pack' || arg === '-p') {
      options.pack = args[++i];
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    }
  }
  
  return options;
}

/**
 * Extract date from pack path (e.g., pack-2026-09-02)
 */
function extractDateFromPackPath(packPath: string): string | null {
  const basename = path.basename(packPath);
  const match = basename.match(/pack-(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate required arguments
  if (!options.pack) {
    console.error('❌ Error: --pack is required\n');
    printHelp();
    process.exit(1);
  }
  
  const packPath = path.resolve(options.pack);
  
  // Check if pack path exists
  if (!fs.existsSync(packPath)) {
    console.error(`❌ Error: Pack path does not exist: ${packPath}\n`);
    process.exit(1);
  }
  
  if (!fs.statSync(packPath).isDirectory()) {
    console.error(`❌ Error: Pack path is not a directory: ${packPath}\n`);
    process.exit(1);
  }
  
  try {
    console.log('Family Digest Post Checklist CLI\n');
    console.log('⚠️  Offline checks only - no API calls');
    console.log('⚠️  Never sends to WhatsApp');
    console.log('⚠️  Never invents school facts');
    console.log('⚠️  Family / CoS owns send workflow\n');
    
    // Extract or use provided date
    let packDate = options.date;
    if (!packDate) {
      const extracted = extractDateFromPackPath(packPath);
      if (extracted) {
        packDate = extracted;
        console.log(`📅 Extracted date from pack path: ${packDate}\n`);
      } else {
        console.warn('⚠️  No date provided or extracted, using placeholder\n');
        packDate = 'UNKNOWN';
      }
    }
    
    const outdir = options.outdir || './out';
    
    // Run all checks
    console.log('Running checks...\n');
    const checklistOutput = runAllChecks(packPath);
    
    // Create output directory
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }
    
    // Generate outputs
    console.log('Generating outputs...\n');
    
    const postChecklistMd = generatePostChecklist(packDate, checklistOutput);
    fs.writeFileSync(path.join(outdir, 'POST-CHECKLIST.md'), postChecklistMd);
    
    const issuesMd = generateIssues(packDate, checklistOutput);
    fs.writeFileSync(path.join(outdir, 'ISSUES.md'), issuesMd);
    
    const approvalMd = generateApproval(packDate);
    fs.writeFileSync(path.join(outdir, 'APPROVAL.md'), approvalMd);
    
    const manifest = generateManifest(packPath, packDate, checklistOutput);
    fs.writeFileSync(
      path.join(outdir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log(`✅ Output directory: ${outdir}\n`);
    console.log('Generated files:');
    console.log('  - POST-CHECKLIST.md');
    console.log('  - ISSUES.md');
    console.log('  - APPROVAL.md');
    console.log('  - manifest.json');
    console.log('');
    
    // Print summary
    if (checklistOutput.allPassed) {
      console.log('✅ All checks PASSED!\n');
      console.log('Pack is ready for Family / CoS review before posting to WhatsApp Admin.\n');
    } else {
      console.log('❌ Some checks FAILED!\n');
      console.log('Issues detected:');
      checklistOutput.failures.forEach(failure => {
        console.log(`  ${failure}`);
      });
      console.log('');
    }
    
    if (checklistOutput.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      checklistOutput.warnings.forEach(warning => {
        console.log(`  ${warning}`);
      });
      console.log('');
    }
    
    console.log('Next steps:');
    console.log(`  1. Review ${path.join(outdir, 'POST-CHECKLIST.md')}`);
    console.log(`  2. Check ${path.join(outdir, 'ISSUES.md')} for any failures/warnings`);
    console.log(`  3. Review ${path.join(outdir, 'APPROVAL.md')} before posting`);
    console.log('  4. Family / CoS posts to WhatsApp Admin - Grant & Liana Private\n');
    
    // Exit with appropriate code
    if (checklistOutput.allPassed) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
