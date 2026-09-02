#!/usr/bin/env node

import { existsSync, mkdirSync } from 'fs';
import { parseCSV } from './csv-parser.js';
import { normalizeRows } from './normalizer.js';
import { generateReports } from './report-generator.js';
import { getProfile } from './profiles.js';
import { Profile, NormalizationReport } from './types.js';

function showHelp(): void {
  console.log(`
Bank CSV Normalizer for Perfect Water

Usage:
  npm run normalize -- --input <bank.csv> --outdir <output-dir> [--profile <profile>]

Options:
  --input, -i      Input bank CSV file (required)
  --outdir, -o     Output directory (required)
  --profile, -p    Profile: auto|fnb|standard|absa|nedbank|payfast|yoco|generic|xero-import (default: auto)
  --help, -h       Show this help message

Profiles:
  auto          Auto-detect format from headers (default)
  fnb           FNB bank statement format
  standard      Standard Bank format
  absa          ABSA bank statement format
  nedbank       Nedbank statement format
  payfast       PayFast settlement export
  yoco          Yoco settlement export
  generic       Generic bank CSV
  xero-import   Existing Xero import format (Date, Amount, Payee, Description, Reference)

Output Files:
  xero-bank-normalized.csv  - Ready for loyverse-xero-recon --mode receipt
  rejected.csv              - Rows that failed validation
  missing-fields.md         - Missing field analysis
  APPROVAL.md               - Safety checklist
  manifest.json             - Machine-readable metadata
  report.md                 - Summary report

Sign Convention:
  - Credits (money-in / sales settlements): positive amounts
  - Debits (money-out / fees): negative amounts
  - If separate Debit/Credit columns: Amount = Credit - Debit

Example:
  npm run normalize -- --input bank-statement.csv --outdir out/ --profile fnb
`);
}

function parseArgs(): { input: string; outdir: string; profile: Profile } | null {
  const args = process.argv.slice(2);

  let input: string | null = null;
  let outdir: string | null = null;
  let profile: Profile = 'auto';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }

    if ((arg === '--input' || arg === '-i') && next) {
      input = next;
      i++;
    } else if ((arg === '--outdir' || arg === '-o') && next) {
      outdir = next;
      i++;
    } else if ((arg === '--profile' || arg === '-p') && next) {
      if (!['auto', 'fnb', 'standard', 'absa', 'nedbank', 'payfast', 'yoco', 'generic', 'xero-import'].includes(next)) {
        console.error(`Error: Invalid profile "${next}"`);
        return null;
      }
      profile = next as Profile;
      i++;
    }
  }

  if (!input || !outdir) {
    console.error('Error: --input and --outdir are required\n');
    showHelp();
    return null;
  }

  return { input, outdir, profile };
}

function main(): void {
  console.log('Bank CSV Normalizer for Perfect Water\n');

  const parsed = parseArgs();
  if (!parsed) {
    process.exit(1);
  }

  const { input, outdir, profile: profileName } = parsed;

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

  const profile = getProfile(profileName);
  console.log(`  ✓ Using profile: ${profileName}`);

  console.log('\nNormalizing rows...');
  const result = normalizeRows(rows, profile);
  console.log(`  ✓ Normalized: ${result.normalized.length}`);
  console.log(`  ✓ Rejected: ${result.rejected.length}`);

  const report: NormalizationReport = {
    totalRows: rows.length,
    normalizedRows: result.normalized.length,
    rejectedRows: result.rejected.length,
    profile: profileName,
    delimiter: delimiter === ',' ? 'comma' : delimiter === ';' ? 'semicolon' : 'tab',
    inputFile: input,
    outputDir: outdir,
    timestamp: new Date().toISOString(),
  };

  console.log('\nGenerating reports...');
  generateReports(result.normalized, result.rejected, result.missingFields, report, outdir);
  console.log(`  ✓ xero-bank-normalized.csv`);
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
