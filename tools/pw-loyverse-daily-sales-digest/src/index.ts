#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';
import { parseLoyverseCSV } from './csv-parser.js';
import {
  generateDigest,
  generateDigestJSON,
  generateDigestMarkdown,
  generateMissingFieldsReport,
  generateApprovalDoc,
  generateManifest
} from './digest-generator.js';

interface CLIArgs {
  csvPath: string;
  outputDir: string;
  storeCol: string;
  itemCol: string;
  qtyCol: string;
  amountCol: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let csvPath = '';
  let outputDir = './out';
  let storeCol = 'Store';
  let itemCol = 'Item';
  let qtyCol = 'Quantity';
  let amountCol = 'Gross Sales';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--csv') {
      csvPath = args[++i];
    } else if (arg === '--outdir') {
      outputDir = args[++i];
    } else if (arg === '--store-col') {
      storeCol = args[++i];
    } else if (arg === '--item-col') {
      itemCol = args[++i];
    } else if (arg === '--qty-col') {
      qtyCol = args[++i];
    } else if (arg === '--amount-col') {
      amountCol = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!csvPath) {
    console.error('Error: --csv argument is required.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return { csvPath, outputDir, storeCol, itemCol, qtyCol, amountCol };
}

function printHelp(): void {
  console.log(`
Perfect Water Loyverse Daily Sales Digest CLI

Usage:
  npm run digest -- --csv <file> [options]

Required:
  --csv <file>        Path to Loyverse daily sales CSV export

Optional:
  --outdir <dir>      Output directory (default: ./out)
  --store-col <name>  Store column name (default: Store)
  --item-col <name>   Item column name (default: Item)
  --qty-col <name>    Quantity column name (default: Quantity)
  --amount-col <name> Gross Sales column name (default: Gross Sales)
  --help, -h          Show this help message

Example:
  npm run digest -- --csv loyverse-day.csv --outdir out/

Output Files:
  - digest.json         Structured rollup data
  - digest.md           Human-readable digest
  - missing-fields.md   Data quality report
  - APPROVAL.md         Safety gates and ownership
  - manifest.json       Run metadata

Safety:
  ✅ Offline only - No Loyverse API
  ✅ No invented amounts - Pass-through only
  ✅ Read-only - Never modifies source CSV
  `);
}

function main(): void {
  console.log('Perfect Water Loyverse Daily Sales Digest CLI\n');

  const args = parseArgs();

  if (!existsSync(args.csvPath)) {
    console.error(`Error: CSV file not found: ${args.csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV: ${args.csvPath}`);
  
  let parseResult;
  try {
    parseResult = parseLoyverseCSV(args.csvPath, {
      storeCol: args.storeCol,
      itemCol: args.itemCol,
      qtyCol: args.qtyCol,
      amountCol: args.amountCol
    });
  } catch (error) {
    console.error(`\n❌ Error parsing CSV: ${(error as Error).message}`);
    
    const missingFieldsPath = join(args.outputDir, 'missing-fields.md');
    generateMissingFieldsReport(
      {
        missingStores: 0,
        missingItems: 0,
        missingQuantities: 0,
        missingAmounts: 0,
        totalRows: 0,
        invalidRows: []
      },
      missingFieldsPath
    );
    
    console.error(`\n⚠️  Missing fields report: ${missingFieldsPath}`);
    process.exit(1);
  }

  const { sales, missingFields } = parseResult;

  console.log(`  ✓ Loaded ${sales.length} valid sales records`);
  
  if (missingFields.invalidRows.length > 0) {
    console.log(`  ⚠️  ${missingFields.invalidRows.length} invalid row(s) skipped`);
  }

  if (sales.length === 0) {
    console.error('\n❌ No valid sales records found. Check missing-fields.md for details.');
    
    const missingFieldsPath = join(args.outputDir, 'missing-fields.md');
    generateMissingFieldsReport(missingFields, missingFieldsPath);
    console.error(`\n⚠️  Missing fields report: ${missingFieldsPath}`);
    
    process.exit(1);
  }

  console.log('\nGenerating digest...');
  const digest = generateDigest(sales);
  console.log(`  ✓ Processed ${digest.totalStores} store(s)`);
  console.log(`  ✓ ${digest.totalItems} unique item(s)`);
  console.log(`  ✓ Total quantity: ${digest.totalQuantity}`);
  console.log(`  ✓ Total gross sales: ${digest.totalGrossSales.toFixed(2)}`);

  console.log(`\nGenerating reports in: ${args.outputDir}`);

  const digestJSONPath = join(args.outputDir, 'digest.json');
  generateDigestJSON(digest, digestJSONPath);
  console.log(`  ✓ digest.json`);

  const digestMDPath = join(args.outputDir, 'digest.md');
  generateDigestMarkdown(digest, digestMDPath);
  console.log(`  ✓ digest.md`);

  const missingFieldsPath = join(args.outputDir, 'missing-fields.md');
  generateMissingFieldsReport(missingFields, missingFieldsPath);
  console.log(`  ✓ missing-fields.md`);

  const approvalPath = join(args.outputDir, 'APPROVAL.md');
  generateApprovalDoc(approvalPath);
  console.log(`  ✓ APPROVAL.md`);

  const manifestPath = join(args.outputDir, 'manifest.json');
  generateManifest(digest, missingFields, args.csvPath, manifestPath);
  console.log(`  ✓ manifest.json`);

  console.log('\n✅ Digest generation complete!');
  
  if (missingFields.invalidRows.length > 0) {
    console.log(`\n⚠️  ${missingFields.invalidRows.length} invalid row(s) found. See missing-fields.md for details.`);
  }

  process.exit(0);
}

main();
