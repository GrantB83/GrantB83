#!/usr/bin/env node
/**
 * Studio Suno Package Validate CLI
 * Offline validator for suno-package-prep job folders
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions, ValidationReport } from './types.js';
import {
  checkRequiredFiles,
  checkMetaJsonShape,
  checkLyricsNotEmpty,
  checkNoPiiPatterns,
  checkChecklistManualPaste
} from './validators.js';
import { writeReports } from './report-generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Studio Suno Package Validate CLI - Validator for Suno job packages

USAGE:
  npm run validate -- --dir <job-folder> --outdir <output-dir>

OPTIONS:
  --dir, -d         Path to job folder created by suno-package-prep [REQUIRED]
  --outdir, -o      Output directory for validation reports [default: ./out]
  --strict          Exit with code 1 if any validation check fails [default: false]
  --help, -h        Show this help message

EXAMPLES:
  # Basic validation
  npm run validate -- --dir path/to/job-folder

  # With custom output directory
  npm run validate -- --dir path/to/job-folder --outdir reports/

  # Strict mode (fail on any validation failure)
  npm run validate -- --dir path/to/job-folder --strict

  # Test with fixtures
  npm run test:fixtures

VALIDATION CHECKS:
  1. Required files present (lyrics, meta, checklist)
  2. Metadata JSON shape valid
  3. Lyrics not empty
  4. No PII patterns (emails/phones) in lyrics
  5. Checklist mentions manual paste only

EXIT CODES:
  0 - Validation ran successfully (default)
  1 - Bad input OR (strict mode AND validation failures)

OUTPUT FILES:
  - report.json      Machine-readable validation results
  - report.md        Human-readable numbered pass/fail report
  - APPROVAL.md      Safety gates and workflow document
  - manifest.json    Tool metadata and output inventory
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
    } else if (arg === '--dir' || arg === '-d') {
      options.dir = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    } else if (arg === '--strict') {
      options.strict = true;
    }
  }
  
  return options;
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
  if (!options.dir) {
    console.error('❌ Error: --dir is required\n');
    printHelp();
    process.exit(1);
  }
  
  // Check that job directory exists
  if (!fs.existsSync(options.dir)) {
    console.error(`❌ Error: Job directory not found: ${options.dir}\n`);
    process.exit(1);
  }
  
  const jobDir = path.resolve(options.dir);
  const outdir = options.outdir ? path.resolve(options.outdir) : path.join(process.cwd(), 'out');
  
  try {
    console.log('Studio Suno Package Validate CLI\n');
    console.log(`Validating job folder: ${jobDir}`);
    console.log(`Output directory: ${outdir}\n`);
    
    // Run all validation checks
    console.log('Running validation checks...');
    
    const checks = {
      required_files: checkRequiredFiles(jobDir),
      meta_json_shape: checkMetaJsonShape(jobDir),
      lyrics_not_empty: checkLyricsNotEmpty(jobDir),
      no_pii_patterns: checkNoPiiPatterns(jobDir),
      checklist_manual_paste: checkChecklistManualPaste(jobDir)
    };
    
    // Calculate summary
    const totalChecks = Object.keys(checks).length;
    const passed = Object.values(checks).filter(c => c.passed).length;
    const failed = totalChecks - passed;
    const allPassed = failed === 0;
    
    // Build report
    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      job_dir: jobDir,
      checks,
      summary: {
        total_checks: totalChecks,
        passed,
        failed,
        all_passed: allPassed
      }
    };
    
    // Print check results
    console.log('');
    for (const [key, check] of Object.entries(checks)) {
      const status = check.passed ? '✅' : '❌';
      const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(`${status} ${title}: ${check.message}`);
      if (check.details && !check.passed) {
        console.log(`   Details: ${check.details}`);
      }
    }
    
    console.log('');
    console.log(`Summary: ${passed}/${totalChecks} checks passed`);
    
    // Write output files
    console.log('\nGenerating reports...');
    await writeReports(report, outdir);
    
    console.log(`  ✓ report.json`);
    console.log(`  ✓ report.md`);
    console.log(`  ✓ APPROVAL.md`);
    console.log(`  ✓ manifest.json`);
    
    console.log(`\n✅ Validation complete!`);
    console.log(`\nReports written to: ${outdir}`);
    console.log(`Review report.md for details.\n`);
    
    // Exit with appropriate code
    if (options.strict && !allPassed) {
      console.log('⚠️  Strict mode enabled and validation failures detected.');
      console.log('Exiting with code 1.\n');
      process.exit(1);
    }
    
    process.exit(0);
    
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
