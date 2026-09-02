#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';
import { parseCSV } from './csv-parser.js';
import {
  generateDiff,
  generateDiffJSON,
  generateDiffMarkdown,
  generateMissingKeysReport,
  generateApprovalDoc,
  generateManifest
} from './diff-generator.js';

interface CLIArgs {
  orderedPath: string;
  soldPath: string;
  outputDir: string;
  keyCol: string;
  qtyCol: string;
  storeCol?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let orderedPath = '';
  let soldPath = '';
  let outputDir = './out';
  let keyCol = 'Item';
  let qtyCol = 'Quantity';
  let storeCol: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--ordered') {
      orderedPath = args[++i];
    } else if (arg === '--sold') {
      soldPath = args[++i];
    } else if (arg === '--outdir') {
      outputDir = args[++i];
    } else if (arg === '--key-col') {
      keyCol = args[++i];
    } else if (arg === '--qty-col') {
      qtyCol = args[++i];
    } else if (arg === '--store-col') {
      storeCol = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!orderedPath || !soldPath) {
    console.error('Error: Both --ordered and --sold arguments are required.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return { orderedPath, soldPath, outputDir, keyCol, qtyCol, storeCol };
}

function printHelp(): void {
  console.log(`
Perfect Water Ordered vs Sold Diff CLI

Usage:
  npm run diff -- --ordered <file> --sold <file> [options]

Required:
  --ordered <file>    Path to ordered CSV export
  --sold <file>       Path to sold/Loyverse CSV export

Optional:
  --outdir <dir>      Output directory (default: ./out)
  --key-col <name>    Item/SKU column name (default: Item)
  --qty-col <name>    Quantity column name (default: Quantity)
  --store-col <name>  Store column name (optional, for per-store diff)
  --help, -h          Show this help message

Example:
  npm run diff -- --ordered ordered.csv --sold sold.csv --outdir out/

Example with Store:
  npm run diff -- \\
    --ordered ordered.csv \\
    --sold sold.csv \\
    --outdir out/ \\
    --store-col Store

Output Files:
  - diff.json         Structured diff data
  - diff.md           Human-readable diff with ordered/sold/delta
  - missing-keys.md   Items missing in one CSV or rejected rows
  - APPROVAL.md       Safety gates and approval workflow
  - manifest.json     Run metadata

Safety:
  ✅ Offline only - No Loyverse API
  ✅ No invented quantities - All amounts from source CSVs only
  ✅ Read-only - Never modifies source CSV files
  ✅ Blank/unparseable qty → rejected in missing-keys.md
  ✅ Exit 1 on bad input
  `);
}

function main(): void {
  console.log('Perfect Water Ordered vs Sold Diff CLI\n');

  const args = parseArgs();

  if (!existsSync(args.orderedPath)) {
    console.error(`Error: Ordered CSV file not found: ${args.orderedPath}`);
    process.exit(1);
  }

  if (!existsSync(args.soldPath)) {
    console.error(`Error: Sold CSV file not found: ${args.soldPath}`);
    process.exit(1);
  }

  console.log(`Reading ordered CSV: ${args.orderedPath}`);
  
  let orderedResult;
  try {
    orderedResult = parseCSV(args.orderedPath, {
      keyCol: args.keyCol,
      qtyCol: args.qtyCol,
      storeCol: args.storeCol
    });
  } catch (error) {
    console.error(`\n❌ Error parsing ordered CSV: ${(error as Error).message}`);
    process.exit(1);
  }

  console.log(`  ✓ Loaded ${orderedResult.rows.length} valid row(s)`);
  if (orderedResult.rejected.length > 0) {
    console.log(`  ⚠️  ${orderedResult.rejected.length} rejected row(s)`);
  }

  console.log(`\nReading sold CSV: ${args.soldPath}`);
  
  let soldResult;
  try {
    soldResult = parseCSV(args.soldPath, {
      keyCol: args.keyCol,
      qtyCol: args.qtyCol,
      storeCol: args.storeCol
    });
  } catch (error) {
    console.error(`\n❌ Error parsing sold CSV: ${(error as Error).message}`);
    process.exit(1);
  }

  console.log(`  ✓ Loaded ${soldResult.rows.length} valid row(s)`);
  if (soldResult.rejected.length > 0) {
    console.log(`  ⚠️  ${soldResult.rejected.length} rejected row(s)`);
  }

  if (orderedResult.rows.length === 0 && soldResult.rows.length === 0) {
    console.error('\n❌ No valid rows found in either CSV. Check missing-keys.md for details.');
    process.exit(1);
  }

  console.log('\nGenerating diff...');
  const diff = generateDiff(orderedResult.rows, soldResult.rows, !!args.storeCol);
  
  console.log(`  ✓ Compared ${diff.items.length} item(s)`);
  console.log(`  ✓ Total ordered: ${diff.totalOrdered}`);
  console.log(`  ✓ Total sold: ${diff.totalSold}`);
  console.log(`  ✓ Total delta: ${diff.totalDelta}`);

  console.log(`\nGenerating reports in: ${args.outputDir}`);

  const diffJSONPath = join(args.outputDir, 'diff.json');
  generateDiffJSON(diff, diffJSONPath);
  console.log(`  ✓ diff.json`);

  const diffMDPath = join(args.outputDir, 'diff.md');
  generateDiffMarkdown(diff, diffMDPath);
  console.log(`  ✓ diff.md`);

  const missingKeysPath = join(args.outputDir, 'missing-keys.md');
  generateMissingKeysReport(diff, orderedResult.rejected, soldResult.rejected, missingKeysPath);
  console.log(`  ✓ missing-keys.md`);

  const approvalPath = join(args.outputDir, 'APPROVAL.md');
  generateApprovalDoc(approvalPath);
  console.log(`  ✓ APPROVAL.md`);

  const manifestPath = join(args.outputDir, 'manifest.json');
  generateManifest(diff, orderedResult.rejected, soldResult.rejected, args.orderedPath, args.soldPath, manifestPath);
  console.log(`  ✓ manifest.json`);

  console.log('\n✅ Diff generation complete!');
  
  const totalRejected = orderedResult.rejected.length + soldResult.rejected.length;
  if (totalRejected > 0) {
    console.log(`\n⚠️  ${totalRejected} total rejected row(s) found. See missing-keys.md for details.`);
  }

  if (diff.missingInOrdered.length > 0 || diff.missingInSold.length > 0) {
    console.log(`\n⚠️  ${diff.missingInOrdered.length} item(s) missing in ordered, ${diff.missingInSold.length} missing in sold. See missing-keys.md.`);
  }

  process.exit(0);
}

main();
