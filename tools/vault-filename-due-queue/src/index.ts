#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { parseFilename } from './filename-parser.js';
import { 
  buildQueueResult, 
  generateQueueJSON, 
  generateQueueMarkdown, 
  generateMissingSignalsMarkdown,
  generateApprovalMarkdown,
  generateManifest 
} from './queue-generator.js';
import { QueueEntry } from './types.js';

interface CLIArgs {
  filesPath?: string;
  dirPath?: string;
  outputDir: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let filesPath: string | undefined;
  let dirPath: string | undefined;
  let outputDir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--files' || arg === '-f') {
      filesPath = args[++i];
    } else if (arg === '--dir' || arg === '-d') {
      dirPath = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      outputDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!filesPath && !dirPath) {
    console.error('Error: Either --files or --dir argument is required.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (filesPath && dirPath) {
    console.error('Error: Cannot use both --files and --dir. Choose one mode.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return { filesPath, dirPath, outputDir };
}

function printHelp(): void {
  console.log(`
Vault Filename Due Queue CLI

Purpose:
  Extract due date and category hints from CIPC/SARS/trust filenames.
  Never opens file bodies. Never invents dates or legal positions.

Usage:
  npm run queue -- --files <filenames.txt> --outdir <dir>
  npm run queue -- --dir <directory> --outdir <dir>

Options:
  --files, -f      Path to text file with filenames (one per line)
  --dir, -d        Path to directory (basenames only, no file body reads)
  --outdir, -o     Output directory (default: ./out)
  --help, -h       Show this help message

Document Categories:
  CIPC:  annual-return, change-form, certificate
  SARS:  annual-tax-return, provisional-tax, vat-return, emp-return, correspondence
  BEE:   affidavit, certificate
  Trust: distribution, resolution, compliance
  Other: property-rates, levies, insurance-renewal, forex-application, attorney-letter

Output Files:
  - queue.json               Structured queue data
  - queue.md                 Numbered list with categories and dates
  - missing-signals.md       Files without category or date hints
  - APPROVAL.md              Safety gates and Vault ownership notice
  - manifest.json            Run metadata

Examples:
  npm run queue -- --files vault-filenames.txt --outdir out/
  npm run queue -- --dir /vault/documents --outdir reports/
  `);
}

function readFilenamesFromFile(filePath: string): string[] {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    console.error('Error: Empty filename list.');
    process.exit(1);
  }

  return lines;
}

function scanDirectory(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    console.error(`Error: Directory not found: ${dirPath}`);
    process.exit(1);
  }

  if (!statSync(dirPath).isDirectory()) {
    console.error(`Error: Path is not a directory: ${dirPath}`);
    process.exit(1);
  }

  const filenames: string[] = [];

  function scanRecursive(currentPath: string): void {
    const items = readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = join(currentPath, item);
      const stat = statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanRecursive(itemPath);
      } else if (stat.isFile()) {
        filenames.push(basename(itemPath));
      }
    }
  }

  scanRecursive(dirPath);

  if (filenames.length === 0) {
    console.error('Error: No files found in directory.');
    process.exit(1);
  }

  return filenames;
}

function main(): void {
  console.log('');
  console.log('Vault Filename Due Queue CLI');
  console.log('');

  const args = parseArgs();

  let filenames: string[] = [];
  let mode: 'files' | 'dir' = 'files';
  let inputPath = '';

  if (args.filesPath) {
    console.log(`Mode: Filename list`);
    console.log('');
    console.log(`Reading filename list: ${args.filesPath}`);
    filenames = readFilenamesFromFile(args.filesPath);
    console.log(`  ✓ Loaded ${filenames.length} filenames`);
    mode = 'files';
    inputPath = args.filesPath;
  } else if (args.dirPath) {
    console.log(`Mode: Directory scan`);
    console.log('');
    console.log(`Scanning directory: ${args.dirPath}`);
    filenames = scanDirectory(args.dirPath);
    console.log(`  ✓ Found ${filenames.length} files`);
    mode = 'dir';
    inputPath = args.dirPath;
  }

  console.log('');
  console.log('Parsing filenames...');
  
  const entries: QueueEntry[] = filenames.map(filename => parseFilename(filename));
  const result = buildQueueResult(entries);
  
  console.log(`  ✓ Parsed ${result.summary.totalFiles} files`);
  console.log(`  ✓ Files with dates: ${result.summary.filesWithDates}`);
  console.log(`  ✓ Files with unknown due: ${result.summary.filesUnknownDue}`);
  console.log(`  ✓ Files with no signals: ${result.summary.filesNoDatePattern}`);

  console.log('');
  console.log(`Generating reports in: ${args.outputDir}`);
  
  if (!existsSync(args.outputDir)) {
    mkdirSync(args.outputDir, { recursive: true });
  }

  generateQueueJSON(result, args.outputDir);
  generateQueueMarkdown(result, args.outputDir);
  generateMissingSignalsMarkdown(result, args.outputDir);
  generateApprovalMarkdown(args.outputDir);
  generateManifest(result, args.outputDir, mode, inputPath);

  console.log('');
  console.log('✅ Queue generation complete!');
  console.log('');
  
  console.log('📊 Category breakdown:');
  Object.entries(result.summary.byCategory)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
  
  console.log('');
}

main();
