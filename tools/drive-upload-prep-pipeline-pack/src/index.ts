#!/usr/bin/env node
/**
 * Drive Upload Prep Pipeline Pack CLI
 * Offline orchestrator for Drive handoff prep: drive-create-file-validate → drive-pdf-upload-prep
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions } from './types.js';
import { buildPipeline } from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Drive Upload Prep Pipeline Pack CLI - Offline Drive handoff prep orchestrator

USAGE:
  npm run pipeline -- --source-file <path> [options]
  npm run pipeline -- --source-pdf <path> --parent-id <id> [options]

OPTIONS:
  --source-file <path>           Path to source file (generic)
  --source-pdf <path>            Path to source PDF (for upload-prep)
  --title <string>               Title/filename for Drive upload
  --outdir <path>                Output directory [default: ./out]
  --as-of <YYYY-MM-DD>           As-of date for metadata [default: today]
  --run-validate                 Run drive-create-file-validate [default: false]
  --run-upload-prep              Run drive-pdf-upload-prep [default: true]
                                 Accepts: --run-upload-prep, --run-upload-prep=true/false,
                                 --run-upload-prep true/false, --no-run-upload-prep
  --help, -h                     Show this help message

DRIVE-CREATE-FILE-VALIDATE OPTIONS (when --run-validate is used):
  --max-b64 <number>             Max base64 bytes [default: 15500]
  --require-pdf-magic            Require %PDF magic bytes for PDFs

DRIVE-PDF-UPLOAD-PREP OPTIONS (when --run-upload-prep is used):
  --parent-id <id>               Google Drive folder ID for uploads [required for upload-prep]

BEHAVIOR:
  Pipeline stages (run by default or when enabled):
  1. drive-create-file-validate [default: OFF, enable with --run-validate]
  2. drive-pdf-upload-prep [default: ON, disable with --no-run-upload-prep]

  Output:
  - PACK.md — Index of pipeline contents (only files actually present)
  - APPROVAL.md — Drive approval reminders
  - Validation reports (if run)
  - Upload prep payloads (if run)
  - manifest.json — Accurate file inventory

EXIT CODES:
  0 - Pipeline pack created successfully
  1 - Invalid inputs or pipeline stage failed

SAFETY:
  - Offline only - no Drive API calls
  - Never uploads to Drive
  - Never invents Drive URLs or file IDs
  - Read-only assembly of metadata + checklist

EXAMPLES:
  # Default: upload-prep only
  npm run pipeline -- --source-pdf invoice.pdf --parent-id 1A2B3C4D5E6F --title "Invoice 2026"

  # With validation enabled
  npm run pipeline -- --source-pdf invoice.pdf --parent-id 1A2B3C4D5E6F --run-validate

  # Skip upload-prep (validation only)
  npm run pipeline -- --source-file data.json --no-run-upload-prep --run-validate

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runValidate: false, // default to false
    runUploadPrep: true // default to true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--source-file') {
      options.sourceFile = args[++i];
    } else if (arg === '--source-pdf') {
      options.sourcePdf = args[++i];
    } else if (arg === '--title') {
      options.title = args[++i];
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--as-of') {
      options.asOf = args[++i];
    } else if (arg === '--parent-id') {
      options.parentId = args[++i];
    } else if (arg === '--max-b64') {
      options.maxB64 = parseInt(args[++i], 10);
    } else if (arg === '--require-pdf-magic') {
      options.requirePdfMagic = true;
    } else if (arg === '--run-validate' || arg.startsWith('--run-validate=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runValidate = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runValidate = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runValidate = true;
          i++;
        } else {
          options.runValidate = true;
        }
      }
    } else if (arg === '--no-run-validate') {
      options.runValidate = false;
    } else if (arg === '--no-run-upload-prep') {
      options.runUploadPrep = false;
    } else if (arg === '--run-upload-prep' || arg.startsWith('--run-upload-prep=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runUploadPrep = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runUploadPrep = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runUploadPrep = true;
          i++;
        } else {
          options.runUploadPrep = true;
        }
      }
    }
  }

  return options;
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

  // Validate input
  const sourceFile = options.sourceFile || options.sourcePdf;
  if (!sourceFile) {
    console.error('❌ Error: Either --source-file or --source-pdf is required\n');
    printHelp();
    process.exit(1);
  }

  // Validate upload-prep requirements
  if (options.runUploadPrep && !options.parentId) {
    console.error('❌ Error: --parent-id is required when --run-upload-prep is enabled\n');
    printHelp();
    process.exit(1);
  }

  try {
    console.log('📦 Drive Upload Prep Pipeline Pack CLI\n');
    console.log('⚠️  Offline orchestrator - no Drive API calls');
    console.log('⚠️  Never uploads to Drive');
    console.log('⚠️  Never invents Drive URLs or file IDs\n');

    const outdir = options.outdir || './out';

    const result = buildPipeline(
      sourceFile,
      options.title,
      options.asOf,
      options.runValidate ?? false,
      options.runUploadPrep ?? true,
      options.maxB64,
      options.requirePdfMagic,
      options.parentId,
      outdir
    );

    if (!result.success) {
      console.error(`❌ Error: ${result.message}\n`);
      process.exit(1);
    }

    console.log(`✅ ${result.message}\n`);

    if (result.manifest) {
      console.log('📊 Pipeline Summary:');
      console.log(`  Validation Ran: ${result.manifest.validateRan ? 'Yes' : 'No'}`);
      console.log(`  Upload Prep Ran: ${result.manifest.uploadPrepRan ? 'Yes' : 'No'}`);
      console.log(`  Overall Status: ${result.manifest.allChecksPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log('');
    }

    console.log('📝 Next steps:');
    console.log(`  1. Review ${result.pipelinePackDir}/PACK.md`);
    console.log('  2. Check APPROVAL.md for workflow reminders');
    console.log('  3. Use approved connector/path for Drive upload');
    console.log('  4. Never auto-upload without human approval\n');

    process.exit(result.manifest?.allChecksPassed ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
