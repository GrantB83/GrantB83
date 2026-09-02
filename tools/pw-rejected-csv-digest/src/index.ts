#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { basename, join } from 'path';
import { parseCSV } from './csv-parser.js';
import { classifyRejectionReasons, detectMissingHeaders } from './classifier.js';
import { generateReports } from './report-generator.js';
import { FileDigest, DigestReport } from './types.js';

function showHelp(): void {
  console.log(`
Rejected CSV Digest Tool for Perfect Water / CoS

Digest rejected.csv files into a human review pack WITHOUT pasting quantities/amounts into prose.

Usage:
  npm run digest -- --csv <rejected.csv> [--csv <rejected2.csv>] --outdir <output-dir>
  npm run digest -- --dir <directory> --outdir <output-dir>

Required (one of):
  --csv            Path to rejected CSV file (repeatable)
  --dir            Directory containing rejected*.csv files

Output:
  --outdir         Output directory (default: out/)

Options:
  --label          Custom label for a specific CSV (use immediately after --csv)
  --require-headers Comma-separated list of required headers for blank detection

Help:
  --help, -h       Show this help message

Output Files:
  DIGEST.md           - Numbered findings with row counts and reason buckets (no amounts)
  reasons.json        - Machine-readable reason → count + sample indices
  missing-headers.md  - Files with unexpected/empty headers
  APPROVAL.md         - Safety checklist
  manifest.json       - Machine-readable metadata

Behavior:
  - Parse CSV headers and rows
  - Classify rejection reasons from common columns or blank required fields
  - NEVER print monetary amounts or quantities in DIGEST.md
  - Exit 1 on unreadable CSV or zero inputs

Safety:
  ✅ Offline only - no API calls
  ✅ Amounts stay in files - never in prose
  ✅ Read-only - no invented amounts
  ✅ Perfect Water owns inventory/recon decisions

Examples:
  # Single file
  npm run digest -- --csv fixtures/grv-rejected.csv --outdir out/

  # Multiple files with custom labels
  npm run digest -- \\
    --csv fixtures/grv-rejected.csv --label "GRV August" \\
    --csv fixtures/stocktake-rejected.csv --label "Stocktake LT" \\
    --outdir out/

  # Directory scan
  npm run digest -- --dir exports/ --outdir out/

  # Required headers check
  npm run digest -- --csv rejected.csv --outdir out/ \\
    --require-headers "Store,SKU,ReceivedQty,Unit"
`);
}

interface ParsedArgs {
  csvFiles: Array<{ path: string; label?: string }>;
  dir?: string;
  outdir: string;
  requireHeaders?: string[];
}

function parseArgs(): ParsedArgs | null {
  const args = process.argv.slice(2);

  const csvFiles: Array<{ path: string; label?: string }> = [];
  let dir: string | undefined;
  let outdir = 'out/';
  let requireHeaders: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }

    if (arg === '--csv' && next) {
      const path = next;
      i++;
      // Check if next arg is --label
      if (args[i + 1] === '--label' && args[i + 2]) {
        csvFiles.push({ path, label: args[i + 2] });
        i += 2;
      } else {
        csvFiles.push({ path });
      }
    } else if (arg === '--dir' && next) {
      dir = next;
      i++;
    } else if (arg === '--outdir' && next) {
      outdir = next;
      i++;
    } else if (arg === '--require-headers' && next) {
      requireHeaders = next.split(',').map(h => h.trim());
      i++;
    }
  }

  if (csvFiles.length === 0 && !dir) {
    console.error('Error: Either --csv or --dir is required\n');
    showHelp();
    return null;
  }

  return { csvFiles, dir, outdir, requireHeaders };
}

function collectCsvFiles(args: ParsedArgs): Array<{ path: string; label: string }> {
  const files: Array<{ path: string; label: string }> = [];

  // Add explicit CSV files
  args.csvFiles.forEach(({ path, label }) => {
    if (!existsSync(path)) {
      console.error(`Error: CSV file not found: ${path}`);
      process.exit(1);
    }
    files.push({ path, label: label || basename(path, '.csv') });
  });

  // Scan directory if provided
  if (args.dir) {
    if (!existsSync(args.dir)) {
      console.error(`Error: Directory not found: ${args.dir}`);
      process.exit(1);
    }

    const entries = readdirSync(args.dir);
    const rejectedFiles = entries.filter(e => {
      const fullPath = join(args.dir!, e);
      return statSync(fullPath).isFile() && 
             (e.startsWith('rejected') && e.endsWith('.csv'));
    });

    rejectedFiles.forEach(file => {
      const path = join(args.dir!, file);
      files.push({ path, label: basename(file, '.csv') });
    });
  }

  return files;
}

function main(): void {
  console.log('Rejected CSV Digest Tool for Perfect Water / CoS\n');

  const parsed = parseArgs();
  if (!parsed) {
    process.exit(1);
  }

  const files = collectCsvFiles(parsed);

  if (files.length === 0) {
    console.error('Error: No rejected CSV files found');
    process.exit(1);
  }

  if (!existsSync(parsed.outdir)) {
    mkdirSync(parsed.outdir, { recursive: true });
  }

  console.log(`Processing ${files.length} file(s)...\n`);

  const digests: FileDigest[] = [];

  files.forEach(({ path, label }) => {
    console.log(`Reading: ${path}`);
    try {
      const { rows } = parseCSV(path);
      console.log(`  ✓ Loaded ${rows.length} rows`);

      const reasonBuckets = classifyRejectionReasons(rows, parsed.requireHeaders);
      const missingHeaders = detectMissingHeaders(rows);

      const digest: FileDigest = {
        filename: basename(path),
        label,
        totalRows: rows.length,
        reasonBuckets,
        missingHeaders,
      };

      digests.push(digest);
      console.log(`  ✓ Classified ${reasonBuckets.length} rejection reason(s)`);

    } catch (err) {
      console.error(`  ✗ Error reading file: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

  const report: DigestReport = {
    timestamp: new Date().toISOString(),
    filesProcessed: digests,
    outputDir: parsed.outdir,
  };

  console.log('\nGenerating reports...');
  generateReports(digests, report, parsed.outdir);
  console.log(`  ✓ DIGEST.md`);
  console.log(`  ✓ reasons.json`);
  console.log(`  ✓ missing-headers.md`);
  console.log(`  ✓ APPROVAL.md`);
  console.log(`  ✓ manifest.json`);

  console.log('\n✅ Digest generation complete!');
  console.log(`\n⚠️  Amounts and quantities are in the source files. Do not paste them into prose.`);
}

main();
