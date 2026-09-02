#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { parseLoyverseCSV, parseXeroCSV } from './csv-parser.js';
import { reconcile } from './reconciliation.js';
import { generateCSVReport, generateMarkdownReport } from './report-generator.js';
import { parseLoyverseSalesSummary, parseXeroProfitAndLoss } from './summary-parser.js';
import { reconcileSummaries } from './summary-reconciliation.js';
import { generateSummaryCSVReport, generateSummaryMarkdownReport } from './summary-report-generator.js';

type ReconMode = 'receipt' | 'summary';

interface CLIArgs {
  mode: ReconMode;
  loyverseFile: string;
  xeroFile: string;
  outputDir: string;
  threshold: number;
  loyverseFiles?: string[];
  xeroFiles?: string[];
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let mode: ReconMode = 'receipt';
  let loyverseFile = '';
  let xeroFile = '';
  let outputDir = './out';
  let threshold = 1.00;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--mode' || arg === '-m') {
      const modeValue = args[++i];
      if (modeValue !== 'receipt' && modeValue !== 'summary') {
        console.error(`Error: Invalid mode "${modeValue}". Must be "receipt" or "summary".`);
        process.exit(1);
      }
      mode = modeValue;
    } else if (arg === '--loyverse' || arg === '-l') {
      loyverseFile = args[++i];
    } else if (arg === '--xero' || arg === '-x') {
      xeroFile = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      outputDir = args[++i];
    } else if (arg === '--threshold' || arg === '-t') {
      threshold = parseFloat(args[++i]);
      if (isNaN(threshold) || threshold < 0) {
        console.error('Error: Threshold must be a non-negative number.');
        process.exit(1);
      }
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

  return { mode, loyverseFile, xeroFile, outputDir, threshold };
}

function printHelp(): void {
  console.log(`
Loyverse ↔ Xero Reconciliation Gap CLI

Usage:
  recon --mode <mode> --loyverse <path> --xero <path> [--output <dir>] [--threshold <n>]

Options:
  --mode, -m       Reconciliation mode: "receipt" or "summary" (default: receipt)
  --loyverse, -l   Path to Loyverse CSV file or directory (required)
  --xero, -x       Path to Xero CSV file or directory (required)
  --output, -o     Output directory for reports (default: ./out)
  --threshold, -t  Difference threshold for summary mode (default: 1.00)
  --help, -h       Show this help message

Modes:
  receipt          Reconcile receipt-level Loyverse sales vs Xero bank transactions
  summary          Reconcile Loyverse Sales Summary vs Xero Profit & Loss reports

Examples:
  Receipt mode:
    recon --mode receipt --loyverse sales.csv --xero bank.csv --output reports/

  Summary mode (single store):
    recon --mode summary --loyverse ltt-summary.csv --xero ltt-pl.csv --output reports/

  Summary mode (multiple stores):
    recon --mode summary --loyverse summaries/ --xero p-and-l/ --output reports/

Output:
  - gap-report.csv       CSV file with all gaps
  - gap-report.md        Markdown report with detailed analysis
  `);
}

function findCSVFiles(path: string, pattern?: string): string[] {
  try {
    const stats = readdirSync(path, { withFileTypes: true });
    return stats
      .filter(dirent => {
        if (!dirent.isFile() || !dirent.name.endsWith('.csv')) {
          return false;
        }
        if (pattern) {
          return dirent.name.includes(pattern);
        }
        return true;
      })
      .map(dirent => join(path, dirent.name));
  } catch {
    return [];
  }
}

function main(): void {
  console.log('Loyverse ↔ Xero Reconciliation CLI\n');

  const args = parseArgs();

  if (args.mode === 'receipt') {
    runReceiptMode(args);
  } else {
    runSummaryMode(args);
  }
}

function runReceiptMode(args: CLIArgs): void {
  console.log('Mode: Receipt-level reconciliation\n');

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

function runSummaryMode(args: CLIArgs): void {
  console.log('Mode: Summary/P&L reconciliation\n');

  const loyverseFiles = existsSync(args.loyverseFile) && statSync(args.loyverseFile).isDirectory()
    ? findCSVFiles(args.loyverseFile, 'loyverse')
    : [args.loyverseFile];

  const xeroFiles = existsSync(args.xeroFile) && statSync(args.xeroFile).isDirectory()
    ? findCSVFiles(args.xeroFile, 'xero')
    : [args.xeroFile];

  if (loyverseFiles.length === 0) {
    console.error(`Error: No Loyverse CSV files found in: ${args.loyverseFile}`);
    process.exit(1);
  }

  if (xeroFiles.length === 0) {
    console.error(`Error: No Xero CSV files found in: ${args.xeroFile}`);
    process.exit(1);
  }

  console.log(`Reading ${loyverseFiles.length} Loyverse Sales Summary file(s)...`);
  const loyverseSummaries = loyverseFiles.map(file => {
    console.log(`  Reading: ${file}`);
    return parseLoyverseSalesSummary(file);
  });

  console.log(`\nReading ${xeroFiles.length} Xero P&L file(s)...`);
  const xeroPLs = xeroFiles.map(file => {
    console.log(`  Reading: ${file}`);
    return parseXeroProfitAndLoss(file);
  });

  console.log(`\nReconciling summaries (threshold: ${args.threshold})...`);
  const result = reconcileSummaries(loyverseSummaries, xeroPLs, args.threshold);
  console.log(`  ✓ Stores analyzed: ${result.storeCount}`);
  console.log(`  ✓ Gaps found: ${result.gaps.length}`);

  const csvPath = join(args.outputDir, 'gap-report.csv');
  const mdPath = join(args.outputDir, 'gap-report.md');

  console.log(`\nGenerating reports in: ${args.outputDir}`);
  generateSummaryCSVReport(result, csvPath);
  console.log(`  ✓ CSV report: ${csvPath}`);

  generateSummaryMarkdownReport(result, mdPath);
  console.log(`  ✓ Markdown report: ${mdPath}`);

  console.log('\n✅ Reconciliation complete!');
  
  if (result.gaps.length > 0) {
    console.log(`\n⚠️  Found ${result.gaps.length} gap(s) that need attention.`);
    console.log(`   Total difference: ${result.totalDifference.toFixed(2)}`);
    process.exit(0);
  } else {
    console.log('\n🎉 No gaps found - all summaries reconcile!');
    process.exit(0);
  }
}

main();
