#!/usr/bin/env node

import { existsSync, readFileSync, mkdirSync } from 'fs';
import { classifyEntity, groupByEntity } from './entity-classifier.js';
import { 
  buildPackResult,
  generateEntityPacks,
  generateMasterMarkdown,
  generateUnknownMarkdown,
  generateApprovalMarkdown,
  generateManifest
} from './pack-generator.js';
import { QueueItem, EntityPackItem, EntityMappings } from './types.js';

interface CLIArgs {
  queuePath?: string;
  filenamesPath?: string;
  entitiesPath?: string;
  outputDir: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let queuePath: string | undefined;
  let filenamesPath: string | undefined;
  let entitiesPath: string | undefined;
  let outputDir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--queue') {
      queuePath = args[++i];
    } else if (arg === '--filenames') {
      filenamesPath = args[++i];
    } else if (arg === '--entities') {
      entitiesPath = args[++i];
    } else if (arg === '--outdir') {
      outputDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!queuePath && !filenamesPath) {
    console.error('Error: Either --queue or --filenames argument is required.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  if (queuePath && filenamesPath) {
    console.error('Error: Cannot use both --queue and --filenames. Choose one mode.');
    console.error('');
    printHelp();
    process.exit(1);
  }

  return { queuePath, filenamesPath, entitiesPath, outputDir };
}

function printHelp(): void {
  console.log(`
Vault Entity Due Pack CLI

Purpose:
  Group filename-due-queue items (or raw filename lists) into per-entity
  research packs for Vault weekday ops. Never opens file bodies.

Usage:
  npm run pack -- --queue <queue.json> --outdir <dir>
  npm run pack -- --filenames <list.txt> --outdir <dir>
  npm run pack -- --queue <queue.json> --entities <entities.json> --outdir <dir>

Options:
  --queue          Path to queue.json from vault-filename-due-queue
  --filenames      Path to text file with filenames (one per line)
  --entities       Path to custom entity mappings JSON (optional)
  --outdir         Output directory (default: ./out)
  --help, -h       Show this help message

Default Entity Heuristics:
  gab-trust   - GAB, Trust, GABTrust
  b-group     - B Group, BGroup, Holdings, BVR
  cipc        - CIPC
  sars        - SARS, Tax
  plimmer     - Plimmer
  charisse    - Charisse
  unknown     - No matches found

Custom Entity Mappings (--entities format):
  {
    "keyword": "entity-slug",
    "example-keyword": "gab-trust"
  }

Output Structure:
  by-entity/<slug>/pack.md       - Entity-specific research pack
  by-entity/<slug>/items.json    - Structured item data
  master.md                       - Overview with counts per entity
  unknown.md                      - Unmatched basenames
  APPROVAL.md                     - H-gate safety rules
  manifest.json                   - Run metadata

Examples:
  npm run pack -- --queue ../vault-filename-due-queue/out/queue.json --outdir out/
  npm run pack -- --filenames filenames.txt --outdir research-packs/
  npm run pack -- --queue queue.json --entities custom-entities.json --outdir out/
  `);
}

function loadQueueItems(queuePath: string): QueueItem[] {
  if (!existsSync(queuePath)) {
    console.error(`Error: Queue file not found: ${queuePath}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(queuePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (data.entries && Array.isArray(data.entries)) {
      return data.entries;
    }
    
    console.error('Error: Invalid queue.json format. Expected { entries: [...] }');
    process.exit(1);
  } catch (error) {
    console.error(`Error parsing queue.json: ${error}`);
    process.exit(1);
  }
}

function loadFilenames(filenamesPath: string): string[] {
  if (!existsSync(filenamesPath)) {
    console.error(`Error: Filenames file not found: ${filenamesPath}`);
    process.exit(1);
  }

  const content = readFileSync(filenamesPath, 'utf-8');
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    console.error('Error: Empty filenames list.');
    process.exit(1);
  }

  return lines;
}

function loadCustomEntityMappings(entitiesPath: string): EntityMappings | undefined {
  if (!existsSync(entitiesPath)) {
    console.error(`Error: Entities file not found: ${entitiesPath}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(entitiesPath, 'utf-8');
    return JSON.parse(content) as EntityMappings;
  } catch (error) {
    console.error(`Error parsing entities.json: ${error}`);
    process.exit(1);
  }
}

function main(): void {
  console.log('');
  console.log('Vault Entity Due Pack CLI');
  console.log('');

  const args = parseArgs();

  let items: EntityPackItem[] = [];
  let mode: 'queue' | 'filenames' = 'queue';
  let inputPath = '';

  if (args.queuePath) {
    console.log(`Mode: Queue JSON`);
    console.log('');
    console.log(`Loading queue: ${args.queuePath}`);
    const queueItems = loadQueueItems(args.queuePath);
    
    // Convert QueueItem to EntityPackItem
    items = queueItems.map(qi => ({
      filename: qi.filename,
      category: qi.category,
      dateTokens: qi.dateTokens,
      dueStatus: qi.dueStatus,
      confidence: qi.confidence,
      signals: qi.signals,
      notes: qi.notes
    }));
    
    console.log(`  ✓ Loaded ${items.length} queue items`);
    mode = 'queue';
    inputPath = args.queuePath;
  } else if (args.filenamesPath) {
    console.log(`Mode: Filename list`);
    console.log('');
    console.log(`Loading filenames: ${args.filenamesPath}`);
    const filenames = loadFilenames(args.filenamesPath);
    
    // Convert plain filenames to EntityPackItem
    items = filenames.map(filename => ({
      filename
    }));
    
    console.log(`  ✓ Loaded ${items.length} filenames`);
    mode = 'filenames';
    inputPath = args.filenamesPath;
  }

  let customMappings: EntityMappings | undefined;
  if (args.entitiesPath) {
    console.log('');
    console.log(`Loading custom entity mappings: ${args.entitiesPath}`);
    customMappings = loadCustomEntityMappings(args.entitiesPath);
    console.log(`  ✓ Loaded custom mappings`);
  }

  console.log('');
  console.log('Classifying items by entity...');
  
  const groups = groupByEntity(items, customMappings);
  const result = buildPackResult(groups);
  
  console.log(`  ✓ Classified ${result.summary.totalItems} items`);

  console.log('');
  console.log(`Generating entity packs in: ${args.outputDir}`);
  
  if (!existsSync(args.outputDir)) {
    mkdirSync(args.outputDir, { recursive: true });
  }

  generateEntityPacks(result, args.outputDir);
  generateMasterMarkdown(result, args.outputDir);
  generateUnknownMarkdown(result, args.outputDir);
  generateApprovalMarkdown(args.outputDir);
  generateManifest(result, args.outputDir, mode, inputPath);

  console.log('');
  console.log('✅ Entity pack generation complete!');
  console.log('');
  
  console.log('📊 Entity breakdown:');
  Object.entries(result.summary.byEntity)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([entity, count]) => {
      console.log(`   ${entity}: ${count}`);
    });
  
  console.log('');
}

main();
