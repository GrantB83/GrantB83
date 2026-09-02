#!/usr/bin/env node

import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { parseGRV, parseStocktake } from './csv-parser.js';
import {
  generateDiff,
  generateDiffJSON,
  generateDiffMarkdown,
  generateMissingKeysReport,
  generateApprovalDoc,
  generateManifest
} from './diff-generator.js';

interface CLIArgs {
  grvPath: string;
  stocktakePath: string;
  outputDir: string;
  storeCol: string;
  keyCol: string;
  grvQtyCol: string;
  stockQtyCol: string;
  runGrvNormalize: boolean;
  grvRaw?: string;
  runStocktakeNormalize: boolean;
  stockRaw?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let grvPath = '';
  let stocktakePath = '';
  let outputDir = './out';
  let storeCol = 'Store';
  let keyCol = 'SKU/Item';
  let grvQtyCol = 'ReceivedQty';
  let stockQtyCol = 'CountedQty';
  let runGrvNormalize = false;
  let grvRaw: string | undefined = undefined;
  let runStocktakeNormalize = false;
  let stockRaw: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--grv') {
      grvPath = args[++i];
    } else if (arg === '--stocktake') {
      stocktakePath = args[++i];
    } else if (arg === '--outdir') {
      outputDir = args[++i];
    } else if (arg === '--store-col') {
      storeCol = args[++i];
    } else if (arg === '--key-col') {
      keyCol = args[++i];
    } else if (arg === '--grv-qty-col') {
      grvQtyCol = args[++i];
    } else if (arg === '--stock-qty-col') {
      stockQtyCol = args[++i];
    } else if (arg === '--run-grv-normalize') {
      runGrvNormalize = true;
    } else if (arg === '--grv-raw') {
      grvRaw = args[++i];
    } else if (arg === '--run-stocktake-normalize') {
      runStocktakeNormalize = true;
    } else if (arg === '--stock-raw') {
      stockRaw = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (runGrvNormalize && !grvRaw) {
    console.error('Error: --grv-raw is required when --run-grv-normalize is set.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (runStocktakeNormalize && !stockRaw) {
    console.error('Error: --stock-raw is required when --run-stocktake-normalize is set.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (!runGrvNormalize && !grvPath) {
    console.error('Error: --grv is required (or use --run-grv-normalize --grv-raw).');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (!runStocktakeNormalize && !stocktakePath) {
    console.error('Error: --stocktake is required (or use --run-stocktake-normalize --stock-raw).');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return {
    grvPath,
    stocktakePath,
    outputDir,
    storeCol,
    keyCol,
    grvQtyCol,
    stockQtyCol,
    runGrvNormalize,
    grvRaw,
    runStocktakeNormalize,
    stockRaw
  };
}

function printHelp(): void {
  console.log(`
Perfect Water GRV vs Stocktake Diff CLI

Usage:
  npm run diff -- --grv <file> --stocktake <file> [options]

Required:
  --grv <file>           Path to normalized GRV CSV (grv-normalized.csv)
  --stocktake <file>     Path to normalized stocktake CSV (stocktake-normalized.csv)

Optional:
  --outdir <dir>         Output directory (default: ./out)
  --store-col <name>     Store column name (default: Store)
  --key-col <name>       SKU/Item column name (default: SKU/Item)
  --grv-qty-col <name>   GRV quantity column name (default: ReceivedQty)
  --stock-qty-col <name> Stocktake quantity column name (default: CountedQty)
  --help, -h             Show this help message

Orchestrator Mode (run sibling tools):
  --run-grv-normalize           Run pw-grv-csv-normalize first
  --grv-raw <file>              Raw GRV CSV to normalize (requires --run-grv-normalize)
  --run-stocktake-normalize     Run pw-stocktake-csv-normalize first
  --stock-raw <file>            Raw stocktake CSV to normalize (requires --run-stocktake-normalize)

Example:
  npm run diff -- --grv grv-normalized.csv --stocktake stocktake-normalized.csv --outdir out/

Example with orchestration:
  npm run diff -- \\
    --run-grv-normalize --grv-raw raw-grv.csv \\
    --run-stocktake-normalize --stock-raw raw-stocktake.csv \\
    --outdir out/

Output Files:
  - diff.json         Structured diff data (Store, Item, Received, Counted, Delta)
  - diff.md           Human-readable diff with deltas
  - missing-keys.md   Items missing in one side or rejected rows
  - APPROVAL.md       Safety gates and approval workflow
  - manifest.json     Run metadata

Safety:
  - Offline only (no APIs)
  - Never invents quantities
  - Amounts stay in files (not chat)
  - Perfect Water owns inventory decisions
  `);
}

function runSiblingTool(toolName: string, args: string[], workDir: string): string {
  const toolPath = resolve(workDir, '..', toolName);
  
  if (!existsSync(toolPath)) {
    throw new Error(`Sibling tool not found: ${toolPath}`);
  }

  console.log(`\n  Running ${toolName}...`);
  
  try {
    const cmd = `cd "${toolPath}" && npm run normalize -- ${args.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', encoding: 'utf-8' });
    return toolPath;
  } catch (error) {
    throw new Error(`Failed to run ${toolName}: ${error}`);
  }
}

async function main() {
  console.log('Perfect Water GRV vs Stocktake Diff CLI\n');

  const args = parseArgs();
  const cwd = process.cwd();

  let finalGrvPath = args.grvPath;
  let finalStocktakePath = args.stocktakePath;

  if (args.runGrvNormalize && args.grvRaw) {
    const tempDir = join(args.outputDir, 'temp-grv-normalized');
    mkdirSync(tempDir, { recursive: true });
    
    runSiblingTool(
      'pw-grv-csv-normalize',
      ['--in', resolve(args.grvRaw), '--outdir', resolve(tempDir)],
      cwd
    );
    
    finalGrvPath = join(tempDir, 'grv-normalized.csv');
    console.log(`  ✓ GRV normalized: ${finalGrvPath}\n`);
  }

  if (args.runStocktakeNormalize && args.stockRaw) {
    const tempDir = join(args.outputDir, 'temp-stocktake-normalized');
    mkdirSync(tempDir, { recursive: true });
    
    runSiblingTool(
      'pw-stocktake-csv-normalize',
      ['--input', resolve(args.stockRaw), '--outdir', resolve(tempDir)],
      cwd
    );
    
    finalStocktakePath = join(tempDir, 'stocktake-normalized.csv');
    console.log(`  ✓ Stocktake normalized: ${finalStocktakePath}\n`);
  }

  if (!existsSync(finalGrvPath)) {
    console.error(`Error: GRV CSV file not found: ${finalGrvPath}`);
    process.exit(1);
  }

  if (!existsSync(finalStocktakePath)) {
    console.error(`Error: Stocktake CSV file not found: ${finalStocktakePath}`);
    process.exit(1);
  }

  console.log(`Reading GRV CSV: ${finalGrvPath}`);
  const grvResult = parseGRV(finalGrvPath, args.storeCol, args.keyCol, args.grvQtyCol);
  console.log(`  ✓ Loaded ${grvResult.rows.length} valid row(s)`);
  if (grvResult.rejectedRows.length > 0) {
    console.log(`  ⚠  ${grvResult.rejectedRows.length} rejected row(s)`);
  }

  console.log(`\nReading stocktake CSV: ${finalStocktakePath}`);
  const stockResult = parseStocktake(finalStocktakePath, args.storeCol, args.keyCol, args.stockQtyCol);
  console.log(`  ✓ Loaded ${stockResult.rows.length} valid row(s)`);
  if (stockResult.rejectedRows.length > 0) {
    console.log(`  ⚠  ${stockResult.rejectedRows.length} rejected row(s)`);
  }

  console.log('\nGenerating diff...');
  const diff = generateDiff(
    grvResult.rows,
    stockResult.rows,
    grvResult.rejectedRows,
    stockResult.rejectedRows
  );

  console.log(`  ✓ Compared ${diff.items.length} item(s)`);
  console.log(`  ✓ Total received: ${diff.totalReceived}`);
  console.log(`  ✓ Total counted: ${diff.totalCounted}`);
  console.log(`  ✓ Total delta (counted - received): ${diff.totalDelta}`);

  mkdirSync(args.outputDir, { recursive: true });

  console.log(`\nGenerating reports in: ${args.outputDir}`);
  generateDiffJSON(diff, args.outputDir);
  console.log('  ✓ diff.json');

  generateDiffMarkdown(diff, args.outputDir);
  console.log('  ✓ diff.md');

  generateMissingKeysReport(diff, args.outputDir);
  console.log('  ✓ missing-keys.md');

  generateApprovalDoc(args.outputDir);
  console.log('  ✓ APPROVAL.md');

  generateManifest(finalGrvPath, finalStocktakePath, diff, args.outputDir);
  console.log('  ✓ manifest.json');

  console.log('\n✅ Diff generation complete!\n');

  const missingCount = diff.missingInGRV.length + diff.missingInStocktake.length;
  if (missingCount > 0) {
    console.log(`⚠️  ${diff.missingInStocktake.length} item(s) missing in stocktake, ${diff.missingInGRV.length} missing in GRV. See missing-keys.md.`);
  }

  if (grvResult.rejectedRows.length > 0 || stockResult.rejectedRows.length > 0) {
    console.log(`⚠️  ${grvResult.rejectedRows.length + stockResult.rejectedRows.length} total rejected row(s). See missing-keys.md.`);
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
