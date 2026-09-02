#!/usr/bin/env node

import { existsSync, mkdirSync } from 'fs';
import { parseCSV } from './csv-parser.js';
import { normalizeRows } from './normalizer.js';
import { generateReports } from './report-generator.js';
import { getProfile, detectProfile } from './profiles.js';
import { Profile, NormalizationReport } from './types.js';

function showHelp(): void {
  console.log(`
GRV CSV Normalizer for Perfect Water / CoS

Normalize messy goods-received CSVs into standard schema for Perfect Water inventory operations.
Never invents quantities. Offline only.

Usage:
  npm run normalize -- --in <grv.csv> --outdir <output-dir> [options]

Required:
  --in             Input GRV CSV file

Output:
  --outdir         Output directory (default: out/)

Profile:
  --profile        Profile: auto|generic|loyverse (default: auto)

Column Overrides (optional):
  --store-col      Store/location column name
  --item-col       SKU/Item column name
  --qty-col        ReceivedQty column name
  --unit-col       Unit column name
  --date-col       ReceivedAt date column name
  --supplier-col   Supplier column name
  --docno-col      Document number column name

Help:
  --help, -h       Show this help message

Standard Output Columns:
  Store            Store/location name (required)
  SKU/Item         SKU or item name (required)
  ReceivedQty      Received quantity (required, must be parseable number)
  Unit             Unit of measure (required)
  ReceivedAt       Date received (optional, YYYY-MM-DD)
  Supplier         Supplier name (optional)
  DocNo            Document/GRV number (optional)
  Notes            Additional notes (optional)

Behavior:
  1. Auto-detect delimiter (comma, semicolon, tab)
  2. Map headers heuristically (GRV, goods received, qty, supplier, doc no, etc.)
  3. Blank/unparseable qty → rejected.csv with reason
  4. Never invents quantities or other data

Output Files:
  grv-normalized.csv   - Standard schema
  rejected.csv         - Rows with missing/unparseable fields
  report.md            - Summary (row counts only)
  APPROVAL.md          - Safety checklist
  manifest.json        - Machine-readable metadata

Exit Codes:
  0    Success
  1    Error (missing input, unreadable file, or zero valid + zero rejected rows)

Safety:
  ✅ Never invents quantities
  ✅ Offline only - no API calls
  ✅ File-based - all amounts stay in files

Examples:
  # Auto-detect format
  npm run normalize -- --in grv.csv --outdir out/

  # Specific profile
  npm run normalize -- --in loyverse-export.csv --outdir out/ --profile loyverse

  # Custom column names
  npm run normalize -- --in grv.csv --outdir out/ \\
    --store-col "Location" --item-col "Product" --qty-col "Qty Received"
`);
}

function parseArgs(): {
  input: string;
  outdir: string;
  profile: Profile;
  storeCol?: string;
  itemCol?: string;
  qtyCol?: string;
  unitCol?: string;
  dateCol?: string;
  supplierCol?: string;
  docnoCol?: string;
} | null {
  const args = process.argv.slice(2);

  let input: string | null = null;
  let outdir = 'out/';
  let profile: Profile = 'auto';
  let storeCol: string | undefined;
  let itemCol: string | undefined;
  let qtyCol: string | undefined;
  let unitCol: string | undefined;
  let dateCol: string | undefined;
  let supplierCol: string | undefined;
  let docnoCol: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }

    if (arg === '--in' && next) {
      input = next;
      i++;
    } else if (arg === '--outdir' && next) {
      outdir = next;
      i++;
    } else if (arg === '--profile' && next) {
      if (!['auto', 'generic', 'loyverse'].includes(next)) {
        console.error(`Error: Invalid profile "${next}"`);
        return null;
      }
      profile = next as Profile;
      i++;
    } else if (arg === '--store-col' && next) {
      storeCol = next;
      i++;
    } else if (arg === '--item-col' && next) {
      itemCol = next;
      i++;
    } else if (arg === '--qty-col' && next) {
      qtyCol = next;
      i++;
    } else if (arg === '--unit-col' && next) {
      unitCol = next;
      i++;
    } else if (arg === '--date-col' && next) {
      dateCol = next;
      i++;
    } else if (arg === '--supplier-col' && next) {
      supplierCol = next;
      i++;
    } else if (arg === '--docno-col' && next) {
      docnoCol = next;
      i++;
    }
  }

  if (!input) {
    console.error('Error: --in is required\n');
    showHelp();
    return null;
  }

  return { input, outdir, profile, storeCol, itemCol, qtyCol, unitCol, dateCol, supplierCol, docnoCol };
}

function main(): void {
  console.log('GRV CSV Normalizer for Perfect Water / CoS\n');

  const parsed = parseArgs();
  if (!parsed) {
    process.exit(1);
  }

  const { input, outdir, profile: profileName, storeCol, itemCol, qtyCol, unitCol, dateCol, supplierCol, docnoCol } = parsed;

  if (!existsSync(input)) {
    console.error(`Error: Input file not found: ${input}`);
    process.exit(1);
  }

  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  console.log(`Reading input file: ${input}`);
  const { rows, delimiter } = parseCSV(input);
  console.log(`  ✓ Loaded ${rows.length} rows`);
  console.log(`  ✓ Detected delimiter: ${delimiter === ',' ? 'comma' : delimiter === ';' ? 'semicolon' : 'tab'}`);

  if (rows.length === 0) {
    console.error('Error: Input file is empty or contains no data rows');
    process.exit(1);
  }

  // Auto-detect profile if needed
  let finalProfile = profileName;
  if (profileName === 'auto') {
    const headers = Object.keys(rows[0]);
    const detected = detectProfile(headers);
    if (detected !== 'auto') {
      finalProfile = detected;
    } else {
      finalProfile = 'generic';
    }
  }

  const profile = getProfile(finalProfile);
  console.log(`  ✓ Using profile: ${finalProfile}`);

  console.log('\nNormalizing rows...');
  const result = normalizeRows(rows, profile, {
    storeCol,
    itemCol,
    qtyCol,
    unitCol,
    dateCol,
    supplierCol,
    docnoCol,
  });
  console.log(`  ✓ Normalized: ${result.normalized.length}`);
  console.log(`  ✓ Rejected: ${result.rejected.length}`);

  // Exit 1 if zero valid and zero rejected (empty file case handled above)
  if (result.normalized.length === 0 && result.rejected.length === 0) {
    console.error('\nError: No rows were processed (zero valid, zero rejected)');
    process.exit(1);
  }

  const report: NormalizationReport = {
    totalRows: rows.length,
    normalizedRows: result.normalized.length,
    rejectedRows: result.rejected.length,
    profile: finalProfile,
    delimiter: delimiter === ',' ? 'comma' : delimiter === ';' ? 'semicolon' : 'tab',
    inputFile: input,
    outputDir: outdir,
    timestamp: new Date().toISOString(),
  };

  console.log('\nGenerating reports...');
  generateReports(result.normalized, result.rejected, result.missingFields, report, outdir);
  console.log(`  ✓ grv-normalized.csv`);
  console.log(`  ✓ rejected.csv`);
  console.log(`  ✓ missing-fields.md`);
  console.log(`  ✓ APPROVAL.md`);
  console.log(`  ✓ manifest.json`);
  console.log(`  ✓ report.md`);

  console.log('\n✅ Normalization complete!');
  if (result.rejected.length > 0) {
    console.log(`\n⚠️  ${result.rejected.length} row(s) were rejected. See rejected.csv for details.`);
  }
}

main();
