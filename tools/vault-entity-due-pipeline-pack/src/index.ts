#!/usr/bin/env node
/**
 * vault-entity-due-pipeline-pack CLI
 * 
 * Offline orchestrator: vault-filename-due-queue (optional) → vault-entity-due-pack (default ON)
 * 
 * SAFETY:
 * - Never opens file bodies
 * - Never invents dates/amounts/legal positions
 * - Never submits to SARS/CIPC
 * - Vault owns all research and filings (N2 gate)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CliOptions } from './types.js';
import { buildPipelineFromQueue, buildPipelineFromFilenames } from './pipeline-builder.js';

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Vault Entity Due Pipeline Pack - Offline orchestrator

USAGE:
  npm run pack -- --queue <queue.json> [options]
  npm run pack -- --filenames <list.txt> [options]

REQUIRED (one of):
  --queue <file>             Path to existing vault-filename-due-queue output [preferred]
  --filenames <file>         Path to filename list (one per line)

OPTIONS:
  --entity-map <file>        Path to custom entity mappings JSON
  --run-queue                Run vault-filename-due-queue [default: false]
                             Accepts: --run-queue, --run-queue=true/false,
                             --run-queue true/false, --no-run-queue
  --run-entity-pack          Run vault-entity-due-pack [default: true]
                             Accepts: --run-entity-pack, --run-entity-pack=true/false,
                             --run-entity-pack true/false, --no-run-entity-pack
  --as-of <YYYY-MM-DD>       As-of date label for the pack
  --outdir, -o               Output directory [default: ./out]
  --help, -h                 Show this help message

BEHAVIOR:
  Input Modes:
  1. --queue path to existing queue.json (preferred) - fastest, most reliable
  2. --filenames path + optionally runs vault-filename-due-queue

  Stage Control:
  - vault-filename-due-queue: default OFF unless --run-queue or needs queue for entity pack
  - vault-entity-due-pack: default ON unless --run-entity-pack=false / --no-run-entity-pack

  Pipeline Pack Assembly:
  - Copies queue.json, queue.md, missing-signals.md from queue stage (if run)
  - Copies by-entity/, master.md, unknown.md from entity pack stage (if run)
  - Generates PACK.md index, APPROVAL.md, manifest.json
  - manifest.json lists only files actually present / stages that ran

EXIT CODES:
  0 - Pipeline pack assembled successfully
  1 - Queue path missing/invalid, filenames missing, or stages failed

SAFETY:
  - ✅ Offline only - no API calls, no file body reads
  - ✅ Never submits to SARS/CIPC - Vault owns filings (N2 gate)
  - ✅ Never invents dates/amounts/legal positions - source data only
  - ⚠️ Manual review required - Vault reviews all research packs before action
  - ⚠️ Entity classification is heuristic guidance only

EXAMPLES:

  # Use existing queue.json (preferred)
  npm run pack -- --queue ../vault-filename-due-queue/out/queue.json

  # From filename list with both stages
  npm run pack -- --filenames vault-filenames.txt --run-queue

  # From filename list, entity pack only (no queue stage)
  npm run pack -- --filenames vault-filenames.txt

  # Skip entity pack (queue stage only)
  npm run pack -- --filenames vault-filenames.txt --run-queue --no-run-entity-pack

  # With custom entity mappings and as-of date
  npm run pack -- --queue queue.json --entity-map entities.json --as-of 2026-09-02

  # Test with fixtures
  npm run test:fixtures
`);
}

/**
 * Parse boolean flag with flexible formats (PR #114 pattern)
 */
function parseBooleanFlag(args: string[], flagName: string, defaultValue: boolean): boolean {
  const negatedFlag = `--no-${flagName.replace(/^--/, '')}`;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Handle --no-flag
    if (arg === negatedFlag) {
      return false;
    }
    
    // Handle --flag[=value]
    if (arg === flagName || arg.startsWith(`${flagName}=`)) {
      if (arg.includes('=')) {
        // Parse --flag=false or --flag=true
        const value = arg.split('=')[1].toLowerCase();
        return !(value === 'false' || value === '0' || value === 'no');
      } else {
        // Check next argument for false/0/no
        if (i + 1 < args.length) {
          const nextArg = args[i + 1];
          if (nextArg === 'false' || nextArg === '0' || nextArg === 'no') {
            return false;
          } else if (nextArg === 'true' || nextArg === '1' || nextArg === 'yes') {
            return true;
          }
        }
        // Bare --flag means true
        return true;
      }
    }
  }
  
  return defaultValue;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--queue' && i + 1 < args.length) {
      options.queue = args[++i];
    } else if (arg === '--filenames' && i + 1 < args.length) {
      options.filenames = args[++i];
    } else if (arg === '--entity-map' && i + 1 < args.length) {
      options.entityMap = args[++i];
    } else if (arg === '--as-of' && i + 1 < args.length) {
      options.asOf = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      if (i + 1 < args.length) {
        options.outdir = args[++i];
      }
    }
  }
  
  // Parse boolean flags with flexible syntax (PR #114 pattern)
  options.runQueue = parseBooleanFlag(args, '--run-queue', false);
  options.runEntityPack = parseBooleanFlag(args, '--run-entity-pack', true);
  
  return options;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  // Validate inputs
  if (!options.queue && !options.filenames) {
    console.error('❌ Error: Either --queue or --filenames is required\n');
    showHelp();
    process.exit(1);
  }
  
  if (options.queue && options.filenames) {
    console.error('❌ Error: Cannot use both --queue and --filenames\n');
    showHelp();
    process.exit(1);
  }
  
  const outdir = options.outdir || './out';
  
  try {
    console.log('\n🔒 Vault Entity Due Pipeline Pack\n');
    console.log('⚠️  Offline only - no file body reads, no network calls');
    console.log('⚠️  Never submits to SARS/CIPC');
    console.log('⚠️  Never invents dates/amounts/legal positions');
    console.log('⚠️  Vault owns all research and filings (N2 gate)\n');
    
    let result;
    
    if (options.queue) {
      // Mode 1: Use existing queue.json
      const queuePath = path.resolve(options.queue);
      console.log(`📦 Using existing queue: ${queuePath}\n`);
      
      result = buildPipelineFromQueue(
        queuePath,
        options.entityMap,
        options.runEntityPack ?? true,
        options.asOf,
        outdir
      );
      
    } else if (options.filenames) {
      // Mode 2: Run stages from filenames
      const filenamesPath = path.resolve(options.filenames);
      console.log(`📁 Processing filename list: ${filenamesPath}\n`);
      
      result = buildPipelineFromFilenames(
        filenamesPath,
        options.entityMap,
        options.runQueue ?? false,
        options.runEntityPack ?? true,
        options.asOf,
        outdir
      );
    }
    
    if (!result) {
      console.error('❌ Error: No result from pipeline builder\n');
      process.exit(1);
    }
    
    if (!result.success) {
      console.error(`\n❌ Error: ${result.message}\n`);
      process.exit(1);
    }
    
    console.log(`\n✅ ${result.message}\n`);
    
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
      console.log('');
    }
    
    console.log('📋 Pipeline Summary:');
    console.log(`   - Filename Queue: ${result.manifest.runOptions.ranFilenameQueue ? '✅ Run' : '⏭️ Skipped'}`);
    console.log(`   - Entity Pack: ${result.manifest.runOptions.ranEntityPack ? '✅ Run' : '⏭️ Skipped'}`);
    console.log('');
    
    console.log('Next steps:');
    console.log(`  1. Review ${outdir}/PACK.md for pipeline overview`);
    
    if (result.manifest.runOptions.ranEntityPack) {
      console.log(`  2. Review ${outdir}/master.md for entity-scoped overview`);
      console.log(`  3. Check ${outdir}/by-entity/ for detailed research packs`);
      console.log(`  4. Check ${outdir}/unknown.md for unmatched filenames`);
    }
    
    if (result.manifest.runOptions.ranFilenameQueue) {
      console.log(`  5. Review ${outdir}/queue.md for due date queue`);
      console.log(`  6. Check ${outdir}/missing-signals.md for files without date hints`);
    }
    
    console.log('  7. Review APPROVAL.md for Vault workflow gates');
    console.log('  8. Vault owns all research and filings - never auto-submit\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
