#!/usr/bin/env node

import { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import type { CLIArgs, PackMetadata } from './types.js';
import { generatePackMarkdown } from './pack-generator.js';
import { generateApprovalDoc } from './approval-generator.js';

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let grvPath: string | undefined;
  let stocktakePath: string | undefined;
  let grvRaw: string | undefined;
  let stockRaw: string | undefined;
  let runNormalize = false;
  let runDiff = true;
  let runRejectedDigest = false;
  let diffOutdir: string | undefined;
  let rejectedOutdir: string | undefined;
  let outdir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--grv') {
      grvPath = args[++i];
    } else if (arg === '--stocktake') {
      stocktakePath = args[++i];
    } else if (arg === '--grv-raw') {
      grvRaw = args[++i];
    } else if (arg === '--stock-raw') {
      stockRaw = args[++i];
    } else if (arg === '--run-normalize') {
      runNormalize = true;
    } else if (arg === '--run-diff') {
      runDiff = args[++i]?.toLowerCase() !== 'false';
    } else if (arg === '--run-rejected-digest') {
      runRejectedDigest = true;
    } else if (arg === '--diff-outdir') {
      diffOutdir = args[++i];
    } else if (arg === '--rejected-outdir') {
      rejectedOutdir = args[++i];
    } else if (arg === '--outdir') {
      outdir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!grvPath && !grvRaw && !diffOutdir) {
    console.error('Error: Must provide either --grv (normalized CSV), --grv-raw (with --run-normalize), or --diff-outdir (prebuilt diff).');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (grvRaw && !runNormalize) {
    console.error('Error: --grv-raw requires --run-normalize.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (stockRaw && !runNormalize) {
    console.error('Error: --stock-raw requires --run-normalize.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return {
    grvPath,
    stocktakePath,
    grvRaw,
    stockRaw,
    runNormalize,
    runDiff,
    runRejectedDigest,
    diffOutdir,
    rejectedOutdir,
    outdir
  };
}

function printHelp(): void {
  console.log(`
Perfect Water Inventory Recon Pack CLI

Usage:
  npm run pack -- [options]

Inputs (pick one mode):
  Mode A: Prebuilt normalized CSVs
    --grv <file>               Normalized GRV CSV
    --stocktake <file>         Normalized stocktake CSV
    --run-diff <true|false>    Run pw-grv-vs-stocktake-diff (default: true)
  
  Mode B: Raw CSVs with normalization
    --grv-raw <file>           Raw GRV CSV
    --stock-raw <file>         Raw stocktake CSV
    --run-normalize            Run pw-grv-csv-normalize + pw-stocktake-csv-normalize
    --run-diff <true|false>    Run pw-grv-vs-stocktake-diff (default: true)
  
  Mode C: Prebuilt diff outputs
    --diff-outdir <dir>        Directory containing diff.md, diff.json, missing-keys.md

Optional:
  --run-rejected-digest      Run pw-rejected-csv-digest on rejected.csv outputs
  --rejected-outdir <dir>    Prebuilt rejected digest directory
  --outdir <dir>             Output directory (default: ./out)
  --help, -h                 Show this help message

Output:
  - PACK.md              Index with row/key counts only (NO quantities in prose)
  - APPROVAL.md          H3-style gate reminder, PW ownership, offline-only
  - manifest.json        Run metadata
  - Copies/pointers:     diff.md, diff.json, missing-keys.md, rejected digests

Safety:
  - Offline only (no APIs)
  - Never invents quantities
  - Amounts stay in files (not chat)
  - Perfect Water owns inventory decisions
  - Exit 1 on missing inputs

Example:
  # Prebuilt diff
  npm run pack -- --diff-outdir ../pw-grv-vs-stocktake-diff/out --outdir pack-out/

  # Normalized CSVs
  npm run pack -- --grv grv-normalized.csv --stocktake stocktake-normalized.csv --outdir pack-out/

  # Raw CSVs with full orchestration
  npm run pack -- --grv-raw raw-grv.csv --stock-raw raw-stock.csv --run-normalize --run-rejected-digest --outdir pack-out/
  `);
}

function runSiblingTool(toolName: string, args: string[], workDir: string): string {
  const toolPath = resolve(workDir, '..', toolName);
  
  if (!existsSync(toolPath)) {
    throw new Error(`Sibling tool not found: ${toolPath}`);
  }

  console.log(`\n  Running ${toolName}...`);
  
  try {
    const cmd = `cd "${toolPath}" && npm run build >/dev/null 2>&1 && npm run ${toolName.includes('normalize') ? 'normalize' : toolName.includes('digest') ? 'digest' : 'diff'} -- ${args.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', encoding: 'utf-8' });
    return toolPath;
  } catch (error) {
    throw new Error(`Failed to run ${toolName}: ${error}`);
  }
}

function copyOrReference(sourceDir: string, destDir: string, filename: string): string {
  const sourcePath = join(sourceDir, filename);
  if (existsSync(sourcePath)) {
    const destPath = join(destDir, filename);
    copyFileSync(sourcePath, destPath);
    console.log(`  ✓ Copied ${filename}`);
    return destPath;
  }
  return '';
}

function extractSummaryFromDiffJson(diffJsonPath: string): Partial<PackMetadata['summary']> {
  if (!existsSync(diffJsonPath)) return {};
  
  try {
    const content = readFileSync(diffJsonPath, 'utf-8');
    const data = JSON.parse(content);
    return {
      totalReceivedQty: data.totalReceived,
      totalCountedQty: data.totalCounted,
      totalDelta: data.totalDelta,
      itemsCompared: data.items?.length || 0
    };
  } catch {
    return {};
  }
}

function extractRowCounts(dir: string): { rejectedGrvRows?: number; rejectedStocktakeRows?: number } {
  const counts: { rejectedGrvRows?: number; rejectedStocktakeRows?: number } = {};
  
  try {
    const files = readdirSync(dir);
    
    for (const file of files) {
      if (file.includes('grv') && file.includes('rejected') && file.endsWith('.csv')) {
        const path = join(dir, file);
        const content = readFileSync(path, 'utf-8');
        counts.rejectedGrvRows = content.split('\n').filter(line => line.trim()).length - 1;
      }
      if (file.includes('stocktake') && file.includes('rejected') && file.endsWith('.csv')) {
        const path = join(dir, file);
        const content = readFileSync(path, 'utf-8');
        counts.rejectedStocktakeRows = content.split('\n').filter(line => line.trim()).length - 1;
      }
    }
  } catch {
    // Ignore errors
  }
  
  return counts;
}

async function main() {
  console.log('Perfect Water Inventory Recon Pack CLI\n');

  const args = parseArgs();
  const cwd = process.cwd();

  mkdirSync(args.outdir, { recursive: true });

  let finalDiffOutdir = args.diffOutdir;
  let rejectedDigestOutdir = args.rejectedOutdir;

  if (args.runNormalize) {
    if (!args.grvRaw || !args.stockRaw) {
      console.error('Error: --run-normalize requires both --grv-raw and --stock-raw.');
      process.exit(1);
    }

    const grvNormDir = join(args.outdir, 'temp-grv-normalized');
    mkdirSync(grvNormDir, { recursive: true });
    
    runSiblingTool(
      'pw-grv-csv-normalize',
      ['--in', resolve(args.grvRaw), '--outdir', resolve(grvNormDir)],
      cwd
    );
    
    args.grvPath = join(grvNormDir, 'grv-normalized.csv');
    console.log(`  ✓ GRV normalized: ${args.grvPath}\n`);

    const stockNormDir = join(args.outdir, 'temp-stocktake-normalized');
    mkdirSync(stockNormDir, { recursive: true });
    
    runSiblingTool(
      'pw-stocktake-csv-normalize',
      ['--input', resolve(args.stockRaw), '--outdir', resolve(stockNormDir)],
      cwd
    );
    
    args.stocktakePath = join(stockNormDir, 'stocktake-normalized.csv');
    console.log(`  ✓ Stocktake normalized: ${args.stocktakePath}\n`);
  }

  if (args.runDiff && !finalDiffOutdir) {
    if (!args.grvPath || !args.stocktakePath) {
      console.error('Error: --run-diff requires --grv and --stocktake (or --run-normalize with raw CSVs).');
      process.exit(1);
    }

    const diffDir = join(args.outdir, 'temp-diff');
    mkdirSync(diffDir, { recursive: true });
    
    runSiblingTool(
      'pw-grv-vs-stocktake-diff',
      ['--grv', resolve(args.grvPath), '--stocktake', resolve(args.stocktakePath), '--outdir', resolve(diffDir)],
      cwd
    );
    
    finalDiffOutdir = diffDir;
    console.log(`  ✓ Diff generated: ${finalDiffOutdir}\n`);
  }

  if (!finalDiffOutdir) {
    console.error('Error: No diff outputs available. Provide --diff-outdir or enable --run-diff.');
    process.exit(1);
  }

  if (!existsSync(finalDiffOutdir)) {
    console.error(`Error: Diff output directory not found: ${finalDiffOutdir}`);
    process.exit(1);
  }

  if (args.runRejectedDigest && !rejectedDigestOutdir) {
    const digestDir = join(args.outdir, 'temp-rejected-digest');
    mkdirSync(digestDir, { recursive: true });
    
    const rejectedFiles: string[] = [];
    const searchDirs = [
      args.grvPath ? join(args.grvPath, '..') : null,
      args.stocktakePath ? join(args.stocktakePath, '..') : null,
      finalDiffOutdir
    ].filter(Boolean) as string[];

    for (const dir of searchDirs) {
      if (existsSync(dir)) {
        const files = readdirSync(dir);
        for (const file of files) {
          if (file.startsWith('rejected') && file.endsWith('.csv')) {
            rejectedFiles.push(join(dir, file));
          }
        }
      }
    }

    if (rejectedFiles.length > 0) {
      const digestArgs = rejectedFiles.flatMap(f => ['--csv', resolve(f)]).concat(['--outdir', resolve(digestDir)]);
      runSiblingTool('pw-rejected-csv-digest', digestArgs, cwd);
      rejectedDigestOutdir = digestDir;
      console.log(`  ✓ Rejected digest generated: ${rejectedDigestOutdir}\n`);
    }
  }

  console.log(`\nAssembling pack in: ${args.outdir}`);

  copyOrReference(finalDiffOutdir, args.outdir, 'diff.md');
  copyOrReference(finalDiffOutdir, args.outdir, 'diff.json');
  copyOrReference(finalDiffOutdir, args.outdir, 'missing-keys.md');

  if (rejectedDigestOutdir) {
    copyOrReference(rejectedDigestOutdir, args.outdir, 'DIGEST.md');
    copyOrReference(rejectedDigestOutdir, args.outdir, 'reasons.json');
  }

  const summary = extractSummaryFromDiffJson(join(args.outdir, 'diff.json'));
  const rejectedCounts = extractRowCounts(finalDiffOutdir);

  const metadata: PackMetadata = {
    tool: 'pw-inventory-recon-pack',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: {
      grvPath: args.grvPath,
      stocktakePath: args.stocktakePath,
      grvRaw: args.grvRaw,
      stockRaw: args.stockRaw,
      diffOutdir: finalDiffOutdir,
      rejectedOutdir: rejectedDigestOutdir
    },
    operations: {
      normalized: args.runNormalize,
      diffed: args.runDiff,
      digestedRejected: args.runRejectedDigest
    },
    outputs: {
      packMd: join(args.outdir, 'PACK.md'),
      approvalMd: join(args.outdir, 'APPROVAL.md'),
      manifestJson: join(args.outdir, 'manifest.json'),
      diffMd: existsSync(join(args.outdir, 'diff.md')) ? join(args.outdir, 'diff.md') : undefined,
      diffJson: existsSync(join(args.outdir, 'diff.json')) ? join(args.outdir, 'diff.json') : undefined,
      missingKeysMd: existsSync(join(args.outdir, 'missing-keys.md')) ? join(args.outdir, 'missing-keys.md') : undefined,
      rejectedDigestMd: rejectedDigestOutdir && existsSync(join(args.outdir, 'DIGEST.md')) ? join(args.outdir, 'DIGEST.md') : undefined
    },
    summary: {
      ...summary,
      ...rejectedCounts
    }
  };

  generatePackMarkdown(metadata, args.outdir);
  console.log('  ✓ PACK.md');

  generateApprovalDoc(args.outdir);
  console.log('  ✓ APPROVAL.md');

  writeFileSync(join(args.outdir, 'manifest.json'), JSON.stringify(metadata, null, 2));
  console.log('  ✓ manifest.json');

  console.log('\n✅ Pack assembly complete!\n');
  console.log(`📦 Review ${join(args.outdir, 'PACK.md')} for index and counts.`);
  console.log(`📋 Review ${join(args.outdir, 'APPROVAL.md')} before using outputs.\n`);
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
