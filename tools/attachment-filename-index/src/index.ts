#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { parseFilename } from './filename-parser.js';
import { matchSubjects, parseSubjectsCSV, parseSubjectsTXT } from './subject-matcher.js';
import { buildIndexResult, generateCSV, generateMarkdown } from './index-generator.js';
import { FileIndexEntry, MailSubject } from './types.js';

interface CLIArgs {
  dirPath?: string;
  filesPath?: string;
  subjectsPath?: string;
  outputDir: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let dirPath: string | undefined;
  let filesPath: string | undefined;
  let subjectsPath: string | undefined;
  let outputDir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dir' || arg === '-d') {
      dirPath = args[++i];
    } else if (arg === '--files' || arg === '-f') {
      filesPath = args[++i];
    } else if (arg === '--subjects' || arg === '-s') {
      subjectsPath = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      outputDir = args[++i];
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

  return { dirPath, filesPath, subjectsPath, outputDir };
}

function printHelp(): void {
  console.log(`
Attachment Filename Index CLI

Usage:
  index --dir <directory> [--subjects <file>] [--output <dir>]
  index --files <file> [--subjects <file>] [--output <dir>]

Options:
  --dir, -d        Path to directory to scan (basenames only, no file body reads)
  --files, -f      Path to text/CSV file with filename list (one per line or Filename column)
  --subjects, -s   Optional: Path to CSV/TXT file with mail subjects (Subject and optional Date columns)
  --output, -o     Output directory for index files (default: ./out)
  --help, -h       Show this help message

Modes:
  Directory scan   Recursively scan a directory and index all file basenames
  Filename list    Read filenames from a text or CSV file

Entity Tags:
  plimmer, charisse, tax-emigration, sars, cipc, share-sale, xero, loyverse,
  budget, monarch, aisd, wesbank, fnb, standard-bank, eskom, municipal,
  nightsbridge, perfect-water, heavy-metal, hospitality, unknown

Examples:
  # Scan a directory
  index --dir /vault/documents --output out/

  # Index from a filename list
  index --files filenames.txt --output out/

  # Include mail subject matching
  index --files filenames.txt --subjects mail-subjects.csv --output out/

Output:
  - index.csv      CSV with all indexed files
  - index.md       Markdown report with summary and entity counts
  `);
}

function scanDirectory(dirPath: string): FileIndexEntry[] {
  const entries: FileIndexEntry[] = [];
  
  function scan(currentPath: string): void {
    const items = readdirSync(currentPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(currentPath, item.name);
      
      if (item.isDirectory()) {
        scan(fullPath);
      } else if (item.isFile()) {
        const entry = parseFilename(item.name, fullPath);
        entries.push(entry);
      }
    }
  }
  
  scan(dirPath);
  return entries;
}

function readFilenameList(filesPath: string): FileIndexEntry[] {
  const content = readFileSync(filesPath, 'utf-8');
  const ext = filesPath.toLowerCase();
  
  let filenames: string[];
  
  if (ext.endsWith('.csv')) {
    const lines = content.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const filenameIdx = headers.indexOf('filename');
    
    if (filenameIdx === -1) {
      filenames = lines.slice(1).map(line => line.trim()).filter(line => line.length > 0);
    } else {
      filenames = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length > filenameIdx && parts[filenameIdx].trim()) {
          filenames.push(parts[filenameIdx].trim());
        }
      }
    }
  } else {
    filenames = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }
  
  return filenames.map(filename => parseFilename(filename));
}

function readSubjects(subjectsPath: string): MailSubject[] {
  const content = readFileSync(subjectsPath, 'utf-8');
  const ext = subjectsPath.toLowerCase();
  
  if (ext.endsWith('.csv')) {
    return parseSubjectsCSV(content);
  } else {
    return parseSubjectsTXT(content);
  }
}

function main(): void {
  console.log('Attachment Filename Index CLI\n');

  const args = parseArgs();

  let entries: FileIndexEntry[];

  if (args.dirPath) {
    console.log(`Mode: Directory scan\n`);
    
    if (!existsSync(args.dirPath)) {
      console.error(`Error: Directory not found: ${args.dirPath}`);
      process.exit(1);
    }

    if (!statSync(args.dirPath).isDirectory()) {
      console.error(`Error: Path is not a directory: ${args.dirPath}`);
      process.exit(1);
    }

    console.log(`Scanning directory: ${args.dirPath}`);
    entries = scanDirectory(args.dirPath);
    console.log(`  ✓ Found ${entries.length} files`);
  } else if (args.filesPath) {
    console.log(`Mode: Filename list\n`);
    
    if (!existsSync(args.filesPath)) {
      console.error(`Error: File not found: ${args.filesPath}`);
      process.exit(1);
    }

    console.log(`Reading filename list: ${args.filesPath}`);
    entries = readFilenameList(args.filesPath);
    console.log(`  ✓ Loaded ${entries.length} filenames`);
  } else {
    console.error('Error: No input specified');
    process.exit(1);
  }

  if (args.subjectsPath) {
    if (!existsSync(args.subjectsPath)) {
      console.error(`Error: Subjects file not found: ${args.subjectsPath}`);
      process.exit(1);
    }

    console.log(`\nReading mail subjects: ${args.subjectsPath}`);
    const subjects = readSubjects(args.subjectsPath);
    console.log(`  ✓ Loaded ${subjects.length} subjects`);

    console.log('\nMatching subjects with filenames...');
    entries = matchSubjects(entries, subjects);
    const matchCount = entries.filter(e => e.matchedSubjects.length > 0).length;
    console.log(`  ✓ Matched ${matchCount} files`);
  }

  console.log('\nBuilding index...');
  const result = buildIndexResult(entries);
  console.log(`  ✓ Indexed ${result.summary.totalFiles} files`);
  console.log(`  ✓ Files with dates: ${result.summary.filesWithDates}`);
  console.log(`  ✓ Files with subjects: ${result.summary.filesWithSubjects}`);

  const csvPath = join(args.outputDir, 'index.csv');
  const mdPath = join(args.outputDir, 'index.md');

  console.log(`\nGenerating reports in: ${args.outputDir}`);
  generateCSV(result, csvPath);
  console.log(`  ✓ CSV index: ${csvPath}`);

  generateMarkdown(result, mdPath);
  console.log(`  ✓ Markdown index: ${mdPath}`);

  console.log('\n✅ Indexing complete!');
  console.log(`\n📊 Entity breakdown:`);
  
  const sortedEntities = Object.entries(result.summary.byEntity)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  for (const [entity, count] of sortedEntities) {
    console.log(`   ${entity}: ${count}`);
  }
  
  process.exit(0);
}

main();
