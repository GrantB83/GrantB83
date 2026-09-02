#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { extractDocNo, parseKnownIndex } from './doc-no-extractor.js';
import { buildIndexResult, generateIndexJSON, generateIndexMarkdown, generateDupesMarkdown, generateAlreadyKnownMarkdown, generateNewMarkdown, generateManifest } from './output-generator.js';
import { InvoiceEntry } from './types.js';

interface CLIArgs {
  dirPath?: string;
  filesPath?: string;
  knownPath?: string;
  outDir: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let dirPath: string | undefined;
  let filesPath: string | undefined;
  let knownPath: string | undefined;
  let outDir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dir') {
      dirPath = args[++i];
    } else if (arg === '--files') {
      filesPath = args[++i];
    } else if (arg === '--known') {
      knownPath = args[++i];
    } else if (arg === '--outdir') {
      outDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!dirPath && !filesPath) {
    console.error('Error: Either --dir or --files argument is required.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (dirPath && filesPath) {
    console.error('Error: Cannot use both --dir and --files. Choose one mode.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return { dirPath, filesPath, knownPath, outDir };
}

function printHelp(): void {
  console.log(`
Perfect Water / CoS Invoice Doc No Index CLI

Purpose:
  Extract invoice Doc Nos (e.g., IN236058) from filenames to prevent duplicate uploads.
  Never opens PDF bodies - basenames only.

Usage:
  npm run index -- --dir ./pdfs/ --outdir out/
  npm run index -- --files names.txt --outdir out/
  npm run index -- --dir ./pdfs/ --known known-index.md --outdir out/

Options:
  --dir          Path to directory containing PDFs (basenames only, never opens files)
  --files        Path to text file with one filename per line
  --known        Optional: Path to known index file (markdown/CSV) for comparison
  --outdir       Output directory for index files (default: ./out)
  --help, -h     Show this help message

Outputs:
  - index.json          Doc No → filenames mapping
  - index.md            Human-readable index
  - dupes-in-batch.md   Duplicate Doc Nos in this batch (if any)
  - already-known.md    Doc Nos already in known index (if --known provided)
  - new.md              New Doc Nos not in known index (if --known provided)
  - manifest.json       Run metadata

Pattern:
  /IN\\d+/i  (e.g., IN236058, in123456)

Examples:
  # Scan directory
  npm run index -- --dir ./invoices --outdir reports/

  # From filename list
  npm run index -- --files invoice-names.txt --outdir reports/

  # Compare against known index
  npm run index -- --dir ./invoices --known uploaded.md --outdir reports/
  `);
}

function scanDirectory(dirPath: string): string[] {
  const filenames: string[] = [];
  
  function walk(dir: string): void {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        filenames.push(fullPath);
      }
    }
  }
  
  walk(dirPath);
  return filenames;
}

function readFilenameList(filesPath: string): string[] {
  const content = readFileSync(filesPath, 'utf-8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    console.error('Error: Filename list is empty.');
    process.exit(1);
  }
  
  return lines;
}

async function main(): Promise<void> {
  const args = parseArgs();
  
  console.log('');
  console.log('Perfect Water / CoS Invoice Doc No Index CLI');
  console.log('');
  
  // Determine mode
  const mode: 'directory' | 'files' = args.dirPath ? 'directory' : 'files';
  const inputPath = (args.dirPath || args.filesPath)!;
  
  console.log(`Mode: ${mode === 'directory' ? 'Directory scan' : 'Filename list'}`);
  console.log('');
  
  // Read filenames
  let filenames: string[];
  if (args.dirPath) {
    if (!existsSync(args.dirPath)) {
      console.error(`Error: Directory not found: ${args.dirPath}`);
      process.exit(1);
    }
    
    console.log(`Scanning directory: ${args.dirPath}`);
    filenames = scanDirectory(args.dirPath);
    console.log(`  ✓ Found ${filenames.length} files`);
  } else {
    if (!existsSync(args.filesPath!)) {
      console.error(`Error: File not found: ${args.filesPath}`);
      process.exit(1);
    }
    
    console.log(`Reading filename list: ${args.filesPath}`);
    filenames = readFilenameList(args.filesPath!);
    console.log(`  ✓ Loaded ${filenames.length} filenames`);
  }
  
  console.log('');
  
  // Read known index if provided
  let knownDocNos = new Set<string>();
  if (args.knownPath) {
    if (!existsSync(args.knownPath)) {
      console.error(`Error: Known index file not found: ${args.knownPath}`);
      process.exit(1);
    }
    
    console.log(`Reading known index: ${args.knownPath}`);
    const knownContent = readFileSync(args.knownPath, 'utf-8');
    knownDocNos = parseKnownIndex(knownContent);
    console.log(`  ✓ Loaded ${knownDocNos.size} known Doc Nos`);
    console.log('');
  }
  
  // Extract Doc Nos
  console.log('Extracting Doc Nos from filenames...');
  const entries: InvoiceEntry[] = [];
  const noMatchFilenames: string[] = [];
  
  for (const filename of filenames) {
    const docNo = extractDocNo(filename);
    
    if (docNo) {
      entries.push({
        docNo,
        filename: basename(filename),
        path: mode === 'directory' ? filename : undefined
      });
    } else {
      noMatchFilenames.push(basename(filename));
    }
  }
  
  console.log(`  ✓ Extracted ${entries.length} Doc Nos`);
  if (noMatchFilenames.length > 0) {
    console.log(`  ⚠ ${noMatchFilenames.length} files had no Doc No match`);
  }
  console.log('');
  
  // Build result
  console.log('Building index...');
  const result = buildIndexResult(entries, knownDocNos);
  result.noMatch = noMatchFilenames;
  
  console.log(`  ✓ Unique Doc Nos: ${result.uniqueDocNos}`);
  if (result.duplicatesInBatch.size > 0) {
    console.log(`  ⚠ Duplicates in batch: ${result.duplicatesInBatch.size}`);
  }
  if (args.knownPath) {
    console.log(`  ✓ Already known: ${result.alreadyKnown.size}`);
    console.log(`  ✓ New Doc Nos: ${result.newDocNos.size}`);
  }
  console.log('');
  
  // Create output directory
  if (!existsSync(args.outDir)) {
    mkdirSync(args.outDir, { recursive: true });
  }
  
  // Generate outputs
  console.log(`Generating reports in: ${args.outDir}`);
  
  // index.json
  const indexJSON = generateIndexJSON(result);
  writeFileSync(join(args.outDir, 'index.json'), indexJSON);
  console.log(`  ✓ index.json`);
  
  // index.md
  const indexMarkdown = generateIndexMarkdown(result);
  writeFileSync(join(args.outDir, 'index.md'), indexMarkdown);
  console.log(`  ✓ index.md`);
  
  // dupes-in-batch.md
  const dupesMarkdown = generateDupesMarkdown(result);
  if (dupesMarkdown) {
    writeFileSync(join(args.outDir, 'dupes-in-batch.md'), dupesMarkdown);
    console.log(`  ✓ dupes-in-batch.md`);
  }
  
  // already-known.md
  if (args.knownPath) {
    const alreadyKnownMarkdown = generateAlreadyKnownMarkdown(result);
    if (alreadyKnownMarkdown) {
      writeFileSync(join(args.outDir, 'already-known.md'), alreadyKnownMarkdown);
      console.log(`  ✓ already-known.md`);
    }
    
    // new.md
    const newMarkdown = generateNewMarkdown(result);
    if (newMarkdown) {
      writeFileSync(join(args.outDir, 'new.md'), newMarkdown);
      console.log(`  ✓ new.md`);
    }
  }
  
  // manifest.json
  const manifest = generateManifest(mode, inputPath, result, !!args.knownPath, noMatchFilenames);
  writeFileSync(join(args.outDir, 'manifest.json'), manifest);
  console.log(`  ✓ manifest.json`);
  
  console.log('');
  console.log('✅ Indexing complete!');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
