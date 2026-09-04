#!/usr/bin/env node
/**
 * Attachment Filename Index Pipeline Pack CLI
 * Offline pipeline pack orchestrator: attachment-filename-index → structured pack
 */

import * as path from 'path';
import type { CliOptions } from './types.js';
import { buildPipelineFromFiles, buildPipelineFromDirectory } from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Attachment Filename Index Pipeline Pack CLI - Offline filename indexing orchestrator

USAGE:
  npm run pack -- --files <path> [options]
  npm run pack -- --dir <path> [options]

REQUIRED (one of):
  --files <path>              Path to filename list (text or CSV)
  --dir <path>                Path to directory listing file or directory to scan

OPTIONS:
  --subjects <path>           Optional: Path to CSV/TXT file with mail subjects
  --run-index                 Run attachment-filename-index [default: true]
                              Accepts: --run-index, --run-index=true/false,
                              --run-index true/false, --no-run-index
  --as-of <YYYY-MM-DD>        As-of date label for the pack
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

BEHAVIOR:
  Input Modes:
  - --files: Read filenames from text or CSV file
  - --dir: Scan directory for filenames (basenames only, no file body reads)

  Pipeline Pack Assembly:
  - Runs attachment-filename-index (default ON)
  - Copies index.csv, index.md to pipeline pack
  - Generates PACK.md (pipeline pack index)
  - Generates APPROVAL.md (review gates)
  - Generates manifest.json (metadata, PR #116 pattern - only lists files actually present)

  Exit 1 if index stage fails or inputs missing/invalid.

OUTPUT:
  Creates: <outdir>/attachment-index-pack[-YYYY-MM-DD]/
    - PACK.md                    (pipeline pack index)
    - index.csv                  (from attachment-filename-index)
    - index.md                   (from attachment-filename-index)
    - APPROVAL.md                (review workflow gates)
    - manifest.json              (metadata)

EXIT CODES:
  0 - Pipeline pack created successfully
  1 - Index stage failed or inputs missing/invalid

SAFETY:
  - Offline only - no Google Drive/Gmail API
  - No file body reads - filename heuristics only
  - Never invents dates/amounts/legal positions
  - Read-only - never modifies source files
  - Manual review required before action

EXAMPLES:
  # From filename list (default: run index)
  npm run pack -- --files filenames.txt

  # From directory listing
  npm run pack -- --dir /vault/documents

  # With mail subject matching
  npm run pack -- --files filenames.txt --subjects mail-subjects.csv

  # Skip index stage
  npm run pack -- --files filenames.txt --no-run-index

  # With as-of date
  npm run pack -- --files filenames.txt --as-of 2026-09-04

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runIndex: true // default to true
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--files' || arg === '-f') {
      options.files = args[++i];
    } else if (arg === '--dir' || arg === '-d') {
      options.dir = args[++i];
    } else if (arg === '--subjects' || arg === '-s') {
      options.subjects = args[++i];
    } else if (arg === '--no-run-index') {
      options.runIndex = false;
    } else if (arg === '--run-index' || arg.startsWith('--run-index=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runIndex = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runIndex = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runIndex = true;
          i++;
        } else {
          options.runIndex = true;
        }
      }
    } else if (arg === '--as-of') {
      options.asOf = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    }
  }
  
  return options;
}

/**
 * Validate as-of date format (YYYY-MM-DD)
 */
function validateAsOfDate(asOf: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(asOf);
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate input mode
  if (!options.files && !options.dir) {
    console.error('❌ Error: Either --files or --dir is required\n');
    printHelp();
    process.exit(1);
  }
  
  if (options.files && options.dir) {
    console.error('❌ Error: Cannot use both --files and --dir\n');
    printHelp();
    process.exit(1);
  }
  
  // Validate as-of date format if provided
  if (options.asOf && !validateAsOfDate(options.asOf)) {
    console.error('❌ Error: --as-of must be in YYYY-MM-DD format (e.g., 2026-09-04)\n');
    process.exit(1);
  }
  
  try {
    console.log('Attachment Filename Index Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline orchestrator - no Google Drive/Gmail API');
    console.log('⚠️  No file body reads - filename heuristics only');
    console.log('⚠️  Never invents dates/amounts/legal positions');
    console.log('⚠️  Manual review required before action\n');
    
    const outdir = options.outdir || './out';
    
    let result;
    
    if (options.files) {
      const filesPath = path.resolve(options.files);
      console.log(`📦 Using filename list: ${filesPath}\n`);
      
      result = buildPipelineFromFiles(
        filesPath,
        options.subjects || null,
        options.runIndex ?? true,
        outdir,
        options.asOf || null
      );
      
    } else if (options.dir) {
      const dirPath = path.resolve(options.dir);
      console.log(`📦 Using directory: ${dirPath}\n`);
      
      result = buildPipelineFromDirectory(
        dirPath,
        options.subjects || null,
        options.runIndex ?? true,
        outdir,
        options.asOf || null
      );
    }
    
    if (!result) {
      console.error('❌ Error: No result from pipeline builder\n');
      process.exit(1);
    }
    
    if (!result.success) {
      console.error(`❌ Error: ${result.message}\n`);
      process.exit(1);
    }
    
    console.log(`\n✅ ${result.message}\n`);
    
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
      console.log('');
    }
    
    console.log(`📁 Files generated: ${result.files.length}`);
    result.files.forEach(f => console.log(`   - ${f}`));
    console.log('');
    
    console.log('Next steps:');
    console.log(`  1. Review ${result.outdir}/PACK.md for pipeline pack contents`);
    console.log('  2. Check index.md for human-readable index report');
    console.log('  3. Review APPROVAL.md for workflow gates');
    console.log('  4. Use index.csv for spreadsheet operations\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
