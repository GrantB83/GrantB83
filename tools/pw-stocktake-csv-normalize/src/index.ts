#!/usr/bin/env node

import { existsSync, mkdirSync } from 'fs';
import { parseCSV } from './csv-parser.js';
import { normalizeRows } from './normalizer.js';
import { generateReports } from './report-generator.js';
import { getProfile, detectProfile } from './profiles.js';
import { Profile, NormalizationReport } from './types.js';

function showHelp(): void {
  console.log(`
Stocktake CSV Normalizer for Perfect Water / CoS

Usage:
  npm run normalize -- --input <stocktake.csv> --outdir <output-dir> [--profile <profile>]

Options:
  --input, -i      Input stocktake CSV file (required)
  --outdir, -o     Output directory (required)
  --profile, -p    Profile: auto|generic|loyverse (default: auto)
  --help, -h       Show help message

Profiles:
  auto          Auto-detect format from headers (default)
  generic       Generic stocktake CSV
  loyverse      Loyverse inventory export format

Output Files:
  stocktake-normalized.csv  - Standard schema: Store, SKU/Item, CountedQty, Unit, CountedAt, Notes
  rejected.csv              - Rows that failed validation
  missing-fields.md         - Missing field analysis
  APPROVAL.md               - Safety checklist
  manifest.json             - Machine-readable metadata
  report.md                 - Summary report (row counts only)

Schema:
  Store         - Store/location name (required)
  SKU/Item      - SKU or item name (required)
  CountedQty    - Counted quantity (required, must be parseable number)
  Unit          - Unit of measure (required)
  CountedAt     - Date counted (optional, YYYY-MM-DD)
  Notes         - Additional notes (optional)

Safety:
  ✅ Never invents quantities - blank/unparseable → rejected.csv
  ✅ Offline only - no API calls
  ✅ File-based - all amounts stay in files

Example:
  npm run normalize -- --input stocktake.csv --outdir out/ --profile auto
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
      if (!['auto', 'generic', 'loyverse'].includes(next)) {
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
  console.log('Stocktake CSV Normalizer for Perfect Water / CoS\n');

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

  // Auto-detect profile if needed
  let finalProfile = profileName;
  if (profileName === 'auto' && rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const detected = detectProfile(headers);
    if (detected !== 'auto') {
      finalProfile = detected;
    } else {
      finalProfile = 'generic';
    }
  } else if (profileName === 'auto') {
    finalProfile = 'generic';
  }

  const profile = getProfile(finalProfile);
  console.log(`  ✓ Using profile: ${finalProfile}`);

  console.log('\nNormalizing rows...');
  const result = normalizeRows(rows, profile);
  console.log(`  ✓ Normalized: ${result.normalized.length}`);
  console.log(`  ✓ Rejected: ${result.rejected.length}`);

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
  console.log(`  ✓ stocktake-normalized.csv`);
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
