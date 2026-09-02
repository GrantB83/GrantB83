#!/usr/bin/env node
/**
 * Studio YouTube Preflight Pack CLI
 * Offline preflight checker for YouTube upload approval workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions, PreflightReport } from './types.js';
import {
  checkRequiredFiles,
  checkValidateReport,
  checkDriveUrl,
  checkVideoExists,
  checkPiiPatterns
} from './checks.js';
import { writeReports } from './report-generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Studio YouTube Preflight Pack CLI - Preflight for YouTube upload approval

USAGE:
  npm run preflight -- --dir <package-folder> [options]

OPTIONS:
  --dir <path>             Path to Studio job/package folder [REQUIRED]
  --outdir <path>          Output directory for reports [default: ./out]
  --drive-url <url>        Drive approval link URL
  --drive-url-file <path>  File containing Drive approval link URL
  --video <path>           Video file path (existence check only, no decode)
  --run-validate           Shell out to studio-suno-package-validate
  --validate-report <path> Path to prebuilt validate report.json
  --strict                 Exit code 1 if any required check fails
  --help, -h               Show this help message

EXAMPLES:
  # Basic preflight
  npm run preflight -- --dir path/to/package --drive-url "https://drive.google.com/..."

  # With video check
  npm run preflight -- --dir path/to/package --drive-url-file drive-link.txt --video video.mp4

  # With validation
  npm run preflight -- --dir path/to/package --run-validate --drive-url "https://..."

  # Strict mode
  npm run preflight -- --dir path/to/package --drive-url "https://..." --strict

CHECKS:
  1. Required files present (lyrics.cleaned.txt, checklist.md, manifest.json)
  2. Validate report pass (if --validate-report or --run-validate)
  3. Drive approval link present (BLOCKING)
  4. Video file exists (if --video)
  5. PII pattern scan on lyrics

OUTPUT FILES:
  - PREFLIGHT.md     Numbered pass/fail checks
  - APPROVAL.md      Approval gate rules and workflow
  - missing.md       What's blocking
  - manifest.json    Machine-readable report

EXIT CODES:
  0 - Preflight ran successfully (default)
  1 - Bad input OR (strict mode AND required checks failed)
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
    } else if (arg === '--dir') {
      options.dir = args[++i];
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--drive-url') {
      options.driveUrl = args[++i];
    } else if (arg === '--drive-url-file') {
      options.driveUrlFile = args[++i];
    } else if (arg === '--video') {
      options.video = args[++i];
    } else if (arg === '--run-validate') {
      options.runValidate = true;
    } else if (arg === '--validate-report') {
      options.validateReport = args[++i];
    } else if (arg === '--strict') {
      options.strict = true;
    }
  }
  
  return options;
}

/**
 * Get Drive URL from options
 */
function getDriveUrl(options: CliOptions): string | undefined {
  if (options.driveUrl) {
    return options.driveUrl;
  }
  
  if (options.driveUrlFile && fs.existsSync(options.driveUrlFile)) {
    try {
      return fs.readFileSync(options.driveUrlFile, 'utf-8').trim();
    } catch {
      return undefined;
    }
  }
  
  return undefined;
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
  
  // Check that package directory exists
  if (!fs.existsSync(options.dir)) {
    console.error(`❌ Error: Package directory not found: ${options.dir}\n`);
    process.exit(1);
  }
  
  const packageDir = path.resolve(options.dir);
  const outdir = options.outdir ? path.resolve(options.outdir) : path.join(process.cwd(), 'out');
  
  try {
    console.log('🎬 Studio YouTube Preflight Pack CLI\n');
    console.log(`Package folder: ${packageDir}`);
    console.log(`Output directory: ${outdir}\n`);
    
    // Run preflight checks
    console.log('Running preflight checks...\n');
    
    const checks: PreflightReport['checks'] = {
      required_files: checkRequiredFiles(packageDir),
      drive_url: checkDriveUrl(options.driveUrl, options.driveUrlFile),
      pii_patterns: checkPiiPatterns(packageDir)
    };
    
    // Optional: validate report check
    if (options.validateReport) {
      checks.validate_report = checkValidateReport(options.validateReport);
    } else if (options.runValidate) {
      // Shell out to studio-suno-package-validate
      console.log('⚙️  Running studio-suno-package-validate...');
      const { execSync } = await import('child_process');
      const validateOutdir = path.join(outdir, 'validate-out');
      
      try {
        execSync(
          `cd ../studio-suno-package-validate && npm run validate -- --dir "${packageDir}" --outdir "${validateOutdir}"`,
          { stdio: 'inherit' }
        );
        
        const validateReportPath = path.join(validateOutdir, 'report.json');
        if (fs.existsSync(validateReportPath)) {
          checks.validate_report = checkValidateReport(validateReportPath);
        } else {
          checks.validate_report = {
            passed: false,
            message: 'Validate command ran but report.json not found'
          };
        }
      } catch (error) {
        checks.validate_report = {
          passed: false,
          message: 'Failed to run studio-suno-package-validate',
          details: error instanceof Error ? error.message : String(error)
        };
      }
      console.log('');
    }
    
    // Optional: video check
    if (options.video) {
      checks.video_exists = checkVideoExists(options.video);
    }
    
    // Calculate summary
    const totalChecks = Object.keys(checks).length;
    const passed = Object.values(checks).filter(c => c.passed).length;
    const failed = totalChecks - passed;
    const allPassed = failed === 0;
    
    // Build report
    const report: PreflightReport = {
      timestamp: new Date().toISOString(),
      package_dir: packageDir,
      checks,
      summary: {
        total_checks: totalChecks,
        passed,
        failed,
        all_passed: allPassed
      },
      drive_url: getDriveUrl(options),
      video_path: options.video
    };
    
    // Print check results
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
    
    console.log(`  ✓ PREFLIGHT.md`);
    console.log(`  ✓ APPROVAL.md`);
    console.log(`  ✓ missing.md`);
    console.log(`  ✓ manifest.json`);
    
    console.log(`\n✅ Preflight complete!`);
    console.log(`\nReports written to: ${outdir}`);
    console.log(`Review PREFLIGHT.md for details.\n`);
    
    // Exit with appropriate code
    const driveUrlBlocking = !checks.drive_url.passed;
    
    if (options.strict && (driveUrlBlocking || !allPassed)) {
      console.log('⚠️  Strict mode enabled and required checks failed.');
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
