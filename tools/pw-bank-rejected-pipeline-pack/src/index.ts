#!/usr/bin/env node

/**
 * pw-bank-rejected-pipeline-pack
 * 
 * Offline orchestrator that wires bank CSV normalize → rejected-csv digest
 * into one pipeline pack (same pattern as pw-grv-stocktake-pipeline-pack).
 * 
 * Usage:
 *   npm run pack -- --bank-csv bank.csv --run-normalize --outdir pack-out/
 *   npm run pack -- --normalized-outdir normalized/ --outdir pack-out/
 *   npm run pack -- --normalized-outdir normalized/ --no-run-rejected-digest --outdir pack-out/
 * 
 * Input modes:
 *   1. Raw bank CSV with --run-normalize
 *   2. Prebuilt normalized output directory
 * 
 * Operations (orchestrated):
 *   1. Optionally run pw-bank-csv-normalize
 *   2. Run pw-rejected-csv-digest on rejected inputs (default ON, PR #114 boolean skip)
 *   3. Generate PACK.md + manifest.json (PR #116 accurate file list)
 *   4. Generate APPROVAL.md
 * 
 * Constraints:
 *   - Offline/CLI only. No bank login. No inventing amounts. No pay.
 *   - Never invents rands. Figures stay in files, not chat.
 *   - Perfect Water owns ops; draft digests only.
 * 
 * Exit 1 if inputs missing/invalid or sibling tools fail.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import type { CliOptions, PipelineManifest } from './types.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runNormalize: false,
    runRejectedDigest: true,          // Default ON
    outdir: './out',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--bank-csv' || arg === '--input') {
      options.bankCsv = args[++i];
    } else if (arg === '--normalized-outdir') {
      options.normalizedOutdir = args[++i];
    } else if (arg === '--run-normalize') {
      options.runNormalize = true;
    } else if (arg === '--no-run-rejected-digest') {
      // Handle negative flag: --no-run-rejected-digest (PR #114 pattern)
      options.runRejectedDigest = false;
    } else if (arg === '--run-rejected-digest' || arg.startsWith('--run-rejected-digest=')) {
      // Handle --run-rejected-digest[=value] (PR #114 pattern)
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runRejectedDigest = ['true', '1', 'yes'].includes(value);
      } else {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          const value = nextArg.toLowerCase();
          options.runRejectedDigest = ['true', '1', 'yes'].includes(value);
          i++;
        } else {
          options.runRejectedDigest = true;
        }
      }
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
pw-bank-rejected-pipeline-pack

Offline orchestrator combining pw-bank-csv-normalize and pw-rejected-csv-digest
for Perfect Water bank reconciliation pipeline.

Usage:
  npm run pack -- [options]

Input Modes:
  --bank-csv <file>           Raw bank CSV (requires --run-normalize)
  --normalized-outdir <dir>   Prebuilt normalized output directory

Orchestration Flags:
  --run-normalize             Run pw-bank-csv-normalize on raw bank CSV
  --run-rejected-digest       Run pw-rejected-csv-digest (default: true)
  --no-run-rejected-digest    Skip rejected digest

Boolean flag syntax (PR #114):
  --run-rejected-digest       (enable, default)
  --run-rejected-digest=true  (explicit enable)
  --run-rejected-digest false (disable)
  --no-run-rejected-digest    (disable)

Output:
  --outdir, -o <dir>          Output directory (default: ./out)

Help:
  --help, -h                  Show this help message

Examples:
  # Mode 1: Raw bank CSV with normalization
  npm run pack -- --bank-csv bank.csv --run-normalize --outdir pack-out/

  # Mode 2: Prebuilt normalized output (default: with rejected digest)
  npm run pack -- --normalized-outdir normalized/ --outdir pack-out/

  # Mode 2: Skip rejected digest (PR #114 boolean flags)
  npm run pack -- --normalized-outdir normalized/ --no-run-rejected-digest --outdir pack-out/
  npm run pack -- --normalized-outdir normalized/ --run-rejected-digest=false --outdir pack-out/

Constraints:
  - Offline/CLI only. No bank login. No inventing amounts. No pay.
  - Never invents rands. Figures stay in files, not chat.
  - Perfect Water owns ops; draft digests only.
`);
}

/**
 * Validate CLI options
 */
function validateOptions(options: CliOptions): void {
  // At least one input mode required
  if (!options.bankCsv && !options.normalizedOutdir) {
    throw new Error('Must provide either --bank-csv or --normalized-outdir');
  }

  // If bank CSV provided, must enable normalize
  if (options.bankCsv && !options.runNormalize) {
    throw new Error('When using --bank-csv, must also provide --run-normalize');
  }

  // If normalize enabled, must provide bank CSV
  if (options.runNormalize && !options.bankCsv) {
    throw new Error('When using --run-normalize, must also provide --bank-csv');
  }

  // Check input files/dirs exist
  if (options.bankCsv && !fs.existsSync(options.bankCsv)) {
    throw new Error(`Bank CSV file not found: ${options.bankCsv}`);
  }

  if (options.normalizedOutdir && !fs.existsSync(options.normalizedOutdir)) {
    throw new Error(`Normalized output directory not found: ${options.normalizedOutdir}`);
  }
}

/**
 * Run pw-bank-csv-normalize
 */
function runNormalize(bankCsv: string, outdir: string): void {
  console.log('\nStep 1: Running pw-bank-csv-normalize...');
  
  const normalizerPath = path.resolve(__dirname, '../../pw-bank-csv-normalize');
  if (!fs.existsSync(normalizerPath)) {
    throw new Error('Sibling tool not found: tools/pw-bank-csv-normalize');
  }

  const normalizeOutdir = path.join(outdir, 'normalized');
  fs.mkdirSync(normalizeOutdir, { recursive: true });

  try {
    execSync(
      `cd ${normalizerPath} && npm run normalize -- --input ${bankCsv} --outdir ${normalizeOutdir}`,
      { stdio: 'inherit' }
    );
    console.log('  ✓ Normalization complete');
  } catch (error) {
    throw new Error('pw-bank-csv-normalize failed');
  }
}

/**
 * Run pw-rejected-csv-digest
 */
function runRejectedDigest(normalizedOutdir: string, outdir: string): void {
  console.log('\nStep 2: Running pw-rejected-csv-digest...');
  
  const digestPath = path.resolve(__dirname, '../../pw-rejected-csv-digest');
  if (!fs.existsSync(digestPath)) {
    throw new Error('Sibling tool not found: tools/pw-rejected-csv-digest');
  }

  const rejectedCsv = path.join(normalizedOutdir, 'rejected.csv');
  if (!fs.existsSync(rejectedCsv)) {
    console.log('  ⚠️  No rejected.csv found, skipping digest');
    return;
  }

  const digestOutdir = path.join(outdir, 'rejected-digest');
  fs.mkdirSync(digestOutdir, { recursive: true });

  try {
    execSync(
      `cd ${digestPath} && npm run digest -- --csv ${rejectedCsv} --label "Bank Rejected" --outdir ${digestOutdir}`,
      { stdio: 'inherit' }
    );
    console.log('  ✓ Rejected digest complete');
  } catch (error) {
    throw new Error('pw-rejected-csv-digest failed');
  }
}

/**
 * Copy normalized outputs to pack directory
 */
function copyNormalizedOutputs(normalizedOutdir: string, packDir: string): void {
  console.log('\nCopying normalized outputs to pack...');
  
  const filesToCopy = [
    'xero-bank-normalized.csv',
    'rejected.csv',
    'missing-fields.md',
    'report.md',
    'manifest.json'
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(normalizedOutdir, file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(packDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${file}`);
    }
  }
}

/**
 * Copy rejected digest outputs to pack directory
 */
function copyRejectedDigestOutputs(digestOutdir: string, packDir: string): void {
  console.log('\nCopying rejected digest outputs to pack...');
  
  const filesToCopy = [
    'DIGEST.md',
    'reasons.json',
    'missing-headers.md',
    'APPROVAL.md'
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(digestOutdir, file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(packDir, `DIGEST-${file}`);
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ DIGEST-${file}`);
    }
  }
}

/**
 * Generate PACK.md
 */
function generatePackMd(packDir: string, options: CliOptions): void {
  console.log('\nGenerating PACK.md...');

  const files = fs.readdirSync(packDir).sort();
  const timestamp = new Date().toISOString();

  // Read summary from manifest.json if present
  let normalizedRows = 'N/A';
  let rejectedRows = 'N/A';
  const manifestPath = path.join(packDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    normalizedRows = manifest.normalizedRows?.toString() || 'N/A';
    rejectedRows = manifest.rejectedRows?.toString() || 'N/A';
  }

  const content = `# Perfect Water Bank Rejected Pipeline Pack

**Generated:** ${timestamp}

## Pipeline Overview

This pack combines:
1. **pw-bank-csv-normalize** - Normalize SA bank CSVs to Xero format
2. **pw-rejected-csv-digest** - Digest rejected rows into human review pack

## Operations Performed

- ✅ Bank CSV normalization: ${options.runNormalize ? 'Yes (from raw CSV)' : 'No (used prebuilt)'}
- ✅ Rejected digest: ${options.runRejectedDigest ? 'Yes' : 'No (skipped with --no-run-rejected-digest)'}

## Summary Statistics

- **Normalized rows:** ${normalizedRows}
- **Rejected rows:** ${rejectedRows}

## Included Files

${files.map(f => `- \`${f}\``).join('\n')}

## Usage Instructions

### 1. Review Rejection Patterns

If rejected digest was run, open \`DIGEST-DIGEST.md\` for rejection reason buckets (counts only).

### 2. Inspect Rejected Rows

Open \`rejected.csv\` to see actual amounts and rejection reasons.

### 3. Review Normalized Output

Open \`xero-bank-normalized.csv\` for successfully normalized bank transactions.

### 4. Integration with Loyverse-Xero Recon

\`\`\`bash
cd tools/loyverse-xero-recon
npm run recon -- --mode receipt \\
  --loyverse exports/loyverse.csv \\
  --xero ../pw-bank-rejected-pipeline-pack/pack-out/xero-bank-normalized.csv \\
  --output recon-reports/
\`\`\`

## Critical Reminders

⚠️ **Amounts stay in files.** Never paste rand figures into chat unless explicitly requested.

✅ **Offline only.** No bank login, no inventing amounts, no payments.

✅ **Perfect Water owns ops.** This tool generates drafts; PW makes final decisions.

✅ **H3 approval required.** Before using normalized/rejected data for bank reconciliation.

## Next Steps

1. Review \`APPROVAL.md\` checklist
2. Investigate rejected rows in \`rejected.csv\`
3. Use \`xero-bank-normalized.csv\` for receipt reconciliation
4. Archive pack in Drive \`30_PerfectWater/BankRecon/YYYY-MM/\`
`;

  fs.writeFileSync(path.join(packDir, 'PACK.md'), content);
  console.log('  ✓ PACK.md');
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(packDir: string): void {
  console.log('\nGenerating APPROVAL.md...');

  const content = `# Perfect Water Bank Rejected Pipeline Pack - Approval Checklist

## Perfect Water Ownership

✅ **Perfect Water owns all bank reconciliation decisions**

This pipeline pack is a draft only. Perfect Water CoS makes final decisions on:
- Which rejected rows require manual investigation
- Whether normalized amounts match expected bank transactions
- Receipt reconciliation approval with Loyverse

## Safety Constraints

### Offline Only

✅ **No bank login or browser automation**
✅ **No network calls or API requests**
✅ **CSV-based processing only**

### Never Invents Amounts

✅ **All amounts from source bank CSV only**
✅ **Blank/unparseable → rejected.csv (never estimated)**
✅ **No fabricated rands or transaction references**

### Figures Stay in Files

✅ **Amounts never pasted into chat or prose**
✅ **DIGEST.md shows counts only, not amount tables**
✅ **Actual amounts live in CSV files only**

### Read-Only

✅ **Never writes back to bank systems**
✅ **No payments or transfers**
✅ **No Xero/Loyverse writes**

## Approval Gates

Before using this pack's outputs:

### H3 - Perfect Water Bank Recon

- [ ] Review \`rejected.csv\` for critical missing transactions
- [ ] Verify \`xero-bank-normalized.csv\` amounts match expected deposits
- [ ] Check \`DIGEST-DIGEST.md\` rejection patterns (if digest run)
- [ ] Confirm \`missing-fields.md\` issues are acceptable

**Approval required:** Grant or Perfect Water CoS

### Bot Reminder

When referencing this pack:
- ✅ Refer to files, NOT inline amounts
- ✅ "See rejected.csv row 5" (not "R1,234.56 was rejected")
- ✅ Keep amounts in files, never in chat prose

## Post-Pack Workflow

1. **Investigation** - Open \`rejected.csv\`, investigate missing/blank rows
2. **Data quality** - Fix source bank CSV issues at origin if possible
3. **Re-run** - Re-normalize with corrected CSV if needed
4. **Reconciliation** - Use \`xero-bank-normalized.csv\` with loyverse-xero-recon
5. **Archive** - Store pack in Drive \`30_PerfectWater/BankRecon/YYYY-MM/\`

## Critical Safety

**Never invent amounts.** Only report what exists in source bank CSV.

**Perfect Water owns ops.** No auto-uploads, no auto-payments, no invented rands.
`;

  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), content);
  console.log('  ✓ APPROVAL.md');
}

/**
 * Generate manifest.json with PR #116 accuracy (only list present files)
 */
function generateManifest(packDir: string, options: CliOptions): void {
  console.log('\nGenerating manifest.json...');

  const files = fs.readdirSync(packDir).filter(f => f !== 'manifest.json').sort();

  // Read summary from normalized manifest if present
  let normalizedRows: number | undefined;
  let rejectedRows: number | undefined;
  const normalizeManifestPath = path.join(packDir, 'manifest.json');
  if (fs.existsSync(normalizeManifestPath)) {
    try {
      const normalizeManifest = JSON.parse(fs.readFileSync(normalizeManifestPath, 'utf-8'));
      normalizedRows = normalizeManifest.normalizedRows;
      rejectedRows = normalizeManifest.rejectedRows;
    } catch {
      // Ignore parse errors
    }
  }

  const manifest: PipelineManifest = {
    tool: 'pw-bank-rejected-pipeline-pack',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputMode: options.bankCsv ? 'bank-csv-with-normalize' : 'prebuilt-normalized',
    inputs: {
      bankCsv: options.bankCsv,
      normalizedOutdir: options.normalizedOutdir,
    },
    operations: {
      normalize: options.runNormalize,
      rejectedDigest: options.runRejectedDigest,
    },
    outputs: {
      packDir: packDir,
      files: files,  // PR #116: Only files actually present
    },
    summary: {
      normalizedRows,
      rejectedRows,
    },
  };

  fs.writeFileSync(
    path.join(packDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('  ✓ manifest.json');
}

/**
 * Main pipeline orchestration
 */
function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('pw-bank-rejected-pipeline-pack\n');
  console.log('Offline orchestrator: bank CSV normalize → rejected digest\n');

  try {
    // Validate options
    validateOptions(options);

    // Create output directory
    const packDir = path.resolve(options.outdir);
    fs.mkdirSync(packDir, { recursive: true });

    // Determine normalized output directory
    let normalizedOutdir: string;

    if (options.runNormalize && options.bankCsv) {
      // Mode 1: Run normalization
      runNormalize(options.bankCsv, packDir);
      normalizedOutdir = path.join(packDir, 'normalized');
    } else if (options.normalizedOutdir) {
      // Mode 2: Use prebuilt normalized outputs
      console.log('\nUsing prebuilt normalized outputs...');
      normalizedOutdir = path.resolve(options.normalizedOutdir);
    } else {
      throw new Error('Invalid input mode');
    }

    // Copy normalized outputs to pack
    copyNormalizedOutputs(normalizedOutdir, packDir);

    // Optionally run rejected digest (default ON, PR #114 skip)
    if (options.runRejectedDigest) {
      runRejectedDigest(normalizedOutdir, packDir);
    } else {
      console.log('\n⚠️  Skipping rejected digest (--no-run-rejected-digest)');
    }

    // Generate pack documentation
    generatePackMd(packDir, options);
    generateApprovalMd(packDir);
    generateManifest(packDir, options);

    console.log('\n✅ Pipeline pack complete!\n');
    console.log(`Output directory: ${packDir}`);
    console.log('\nNext steps:');
    console.log('1. Review PACK.md for pack overview');
    console.log('2. Review APPROVAL.md checklist');
    console.log('3. Investigate rejected.csv for missing transactions');
    console.log('4. Use xero-bank-normalized.csv for receipt reconciliation\n');

  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
