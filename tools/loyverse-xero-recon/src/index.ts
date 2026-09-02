#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';
import { parseLoyverseCSV, parseXeroCSV } from './csv-parser.js';
import { reconcile } from './reconciliation.js';
import { generateCSVReport, generateMarkdownReport } from './report-generator.js';

interface CLIArgs {
  loyverseFile: string;
  xeroFile: string;
  outputDir: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let loyverseFile = '';
  let xeroFile = '';
  let outputDir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--loyverse' || arg === '-l') {
      loyverseFile = args[++i];
    } else if (arg === '--xero' || arg === '-x') {
      xeroFile = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      outputDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!loyverseFile || !xeroFile) {
    console.error('Error: Both --loyverse and --xero arguments are required.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return { loyverseFile, xeroFile, outputDir };
}

function printHelp(): void {
  console.log(`
Loyverse ↔ Xero Reconciliation Gap CLI

Usage:
  recon --loyverse <path> --xero <path> [--output <dir>]

Options:
  --loyverse, -l   Path to Loyverse CSV export file (required)
  --xero, -x       Path to Xero CSV export file (required)
  --output, -o     Output directory for reports (default: ./out)
  --help, -h       Show this help message

Example:
  recon --loyverse sales.csv --xero bank.csv --output reports/

Output:
  - gap-report.csv       CSV file with all gaps
  - gap-report.md        Markdown report with detailed analysis
  `);
}

function main(): void {
  console.log('Loyverse ↔ Xero Reconciliation CLI\n');

  const args = parseArgs();

  if (!existsSync(args.loyverseFile)) {
    console.error(`Error: Loyverse file not found: ${args.loyverseFile}`);
    process.exit(1);
  }

  if (!existsSync(args.xeroFile)) {
    console.error(`Error: Xero file not found: ${args.xeroFile}`);
    process.exit(1);
  }

  console.log(`Reading Loyverse file: ${args.loyverseFile}`);
  const loyverseRecords = parseLoyverseCSV(args.loyverseFile);
  console.log(`  ✓ Loaded ${loyverseRecords.length} Loyverse records`);

  console.log(`Reading Xero file: ${args.xeroFile}`);
  const xeroRecords = parseXeroCSV(args.xeroFile);
  console.log(`  ✓ Loaded ${xeroRecords.length} Xero records`);

  console.log('\nReconciling records...');
  const result = reconcile(loyverseRecords, xeroRecords);
  console.log(`  ✓ Matched: ${result.matchedCount}`);
  console.log(`  ✓ Gaps found: ${result.gaps.length}`);

  const csvPath = join(args.outputDir, 'gap-report.csv');
  const mdPath = join(args.outputDir, 'gap-report.md');

  console.log(`\nGenerating reports in: ${args.outputDir}`);
  generateCSVReport(result, csvPath);
  console.log(`  ✓ CSV report: ${csvPath}`);

  generateMarkdownReport(result, mdPath);
  console.log(`  ✓ Markdown report: ${mdPath}`);

  console.log('\n✅ Reconciliation complete!');
  
  if (result.gaps.length > 0) {
    console.log(`\n⚠️  Found ${result.gaps.length} gap(s) that need attention.`);
    process.exit(0);
  } else {
    console.log('\n🎉 No gaps found - all records reconcile!');
    process.exit(0);
  }
}

main();
