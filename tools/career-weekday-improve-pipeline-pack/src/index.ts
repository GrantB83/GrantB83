#!/usr/bin/env node
/**
 * Career Weekday Improve Pipeline Pack CLI
 * Offline pipeline pack assembler combining career tools
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions } from './types.js';
import {
  buildPipelineFromExistingPack,
  buildPipelineWithImprovePack
} from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Career Weekday Improve Pipeline Pack CLI - Pipeline assembler for Career weekday workflow

USAGE:
  npm run pipeline -- --pack <path-to-pack> [options]
  npm run pipeline -- --run-improve-pack --date <YYYY-MM-DD> [options]

OPTIONS:
  --pack, -p                  Path to existing career-weekday-improve-pack output [preferred]
  --run-improve-pack          Run career-weekday-improve-pack first
  --run-digest                Run career-live-improve-digest [default: true]
                              Accepts: --run-digest, --run-digest=true/false,
                              --run-digest true/false, --no-run-digest
  --run-hunt-log              Append to career-hunt-run-log [default: false]
                              Accepts: --run-hunt-log, --run-hunt-log=true/false,
                              --run-hunt-log true/false, --no-run-hunt-log
  --date, -d                  Date label (YYYY-MM-DD) [required for --run-improve-pack]
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

IMPROVE PACK / DIGEST OPTIONS:
  --log                       Path to runs.jsonl (from career-hunt-run-log)
  --summary                   Path to runs.md (from career-hunt-run-log)
  --since                     Optional date filter (YYYY-MM-DD) for digest

BEHAVIOR:
  Inputs:
  - --pack path to existing improve pack (preferred), OR
  - --run-improve-pack with log/summary inputs
  
  Optional stages (flexible boolean flags):
  - --run-digest [default: ON] - Run career-live-improve-digest
  - --run-hunt-log [default: OFF] - Append to career-hunt-run-log
  
  Assemble pipeline pack:
  - PACK.md — index of improve pack + optional digest + hunt-log status
  - Copies from improve pack: LEARNING-DRAFT.md, stats.json, runs.md, APPROVAL.md
  - Copies from digest (if run): DIGEST-LEARNING-DRAFT.md, DIGEST-stats.json
  - Copies from hunt-log (if run): HUNT-LOG-runs.jsonl, HUNT-LOG-runs.md
  - manifest.json — metadata (accurate to present files)
  
  Exit 1 if improve pack missing/invalid or required tool failed.

OUTPUT:
  Creates: <outdir>/pipeline-pack-YYYY-MM-DD/
    - PACK.md                    (index of all contents)
    - LEARNING-DRAFT.md          (from improve pack)
    - stats.json                 (from improve pack, if present)
    - runs.md                    (from improve pack, if present)
    - APPROVAL.md                (Career gates and ownership)
    - DIGEST-LEARNING-DRAFT.md   (from digest, if --run-digest)
    - DIGEST-stats.json          (from digest, if --run-digest)
    - HUNT-LOG-runs.jsonl        (from hunt-log, if --run-hunt-log)
    - HUNT-LOG-runs.md           (from hunt-log, if --run-hunt-log)
    - manifest.json              (metadata)

EXIT CODES:
  0 - Pipeline pack created successfully
  1 - Pack path missing/invalid, improve pack failed, or required tool failed

SAFETY:
  - Offline only - no API calls
  - Never invents scores, employers, or compensation
  - Never auto-applies to jobs
  - Never auto-updates learning.md
  - Never loosens hard gates ($180k+, DNC, WFH)
  - Career owns apply decisions and learning.md fold-in

EXAMPLES:
  # Use existing improve pack (preferred, skip digest)
  npm run pipeline -- --pack ../career-weekday-improve-pack/out/pack-2026-09-02 --no-run-digest

  # Use existing improve pack with digest (default)
  npm run pipeline -- --pack ../career-weekday-improve-pack/out/pack-2026-09-02

  # Generate improve pack first with digest
  npm run pipeline -- --run-improve-pack --date 2026-09-02 --log runs.jsonl

  # Skip digest (using equals sign)
  npm run pipeline -- --pack path/to/pack --run-digest=false

  # Skip digest (using space)
  npm run pipeline -- --pack path/to/pack --run-digest false

  # Skip digest (using negative flag)
  npm run pipeline -- --pack path/to/pack --no-run-digest

  # Run hunt-log append (default OFF, turn ON)
  npm run pipeline -- --pack path/to/pack --run-hunt-log --log runs.jsonl

  # With time filter
  npm run pipeline -- --pack path/to/pack --since 2026-08-01

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runDigest: true,      // default to true (ON)
    runHuntLog: false     // default to false (OFF)
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--pack' || arg === '-p') {
      options.pack = args[++i];
    } else if (arg === '--run-improve-pack') {
      options.runImprovePack = true;
    } else if (arg === '--no-run-digest') {
      options.runDigest = false;
    } else if (arg === '--run-digest' || arg.startsWith('--run-digest=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runDigest = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runDigest = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runDigest = true;
          i++;
        } else {
          options.runDigest = true;
        }
      }
    } else if (arg === '--no-run-hunt-log') {
      options.runHuntLog = false;
    } else if (arg === '--run-hunt-log' || arg.startsWith('--run-hunt-log=')) {
      if (arg.includes('=')) {
        const value = arg.split('=')[1].toLowerCase();
        options.runHuntLog = !(value === 'false' || value === '0' || value === 'no');
      } else {
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runHuntLog = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runHuntLog = true;
          i++;
        } else {
          options.runHuntLog = true;
        }
      }
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    } else if (arg === '--log') {
      options.log = args[++i];
    } else if (arg === '--summary') {
      options.summary = args[++i];
    } else if (arg === '--since') {
      options.since = args[++i];
    }
  }
  
  return options;
}

/**
 * Extract date from pack path (e.g., pack-2026-09-02)
 */
function extractDateFromPackPath(packPath: string): string | null {
  const basename = path.basename(packPath);
  const match = basename.match(/pack-(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate input mode
  if (!options.pack && !options.runImprovePack) {
    console.error('❌ Error: Either --pack or --run-improve-pack is required\n');
    printHelp();
    process.exit(1);
  }
  
  if (options.pack && options.runImprovePack) {
    console.error('❌ Error: Cannot use both --pack and --run-improve-pack\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Career Weekday Improve Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline assembler - no API calls');
    console.log('⚠️  Never invents scores, employers, or compensation');
    console.log('⚠️  Career owns apply + learning.md fold-in');
    console.log('⚠️  Hard gates unchanged: $180k+ / DNC / WFH\n');
    
    const outdir = options.outdir || './out';
    
    let result;
    
    if (options.pack) {
      // Mode 1: Use existing improve pack
      const packPath = path.resolve(options.pack);
      
      console.log(`📦 Using existing improve pack: ${packPath}\n`);
      
      // Extract or use provided date
      let packDate = options.date;
      if (!packDate) {
        const extracted = extractDateFromPackPath(packPath);
        if (extracted) {
          packDate = extracted;
          console.log(`📅 Extracted date from pack path: ${packDate}\n`);
        } else {
          console.error('❌ Error: Could not extract date from pack path and --date not provided\n');
          process.exit(1);
        }
      }
      
      console.log('Building pipeline pack...\n');
      console.log(`  Digest: ${options.runDigest ? 'ON' : 'OFF'}`);
      console.log(`  Hunt Log: ${options.runHuntLog ? 'ON' : 'OFF'}\n`);
      
      result = buildPipelineFromExistingPack(
        packPath,
        options.runDigest ?? true,
        options.runHuntLog ?? false,
        outdir,
        packDate,
        options.log,
        options.summary,
        options.since
      );
      
    } else if (options.runImprovePack) {
      // Mode 2: Run improve pack first
      if (!options.date) {
        console.error('❌ Error: --date is required when using --run-improve-pack\n');
        process.exit(1);
      }
      
      if (!options.log && !options.summary) {
        console.error('❌ Error: --log or --summary is required when using --run-improve-pack\n');
        process.exit(1);
      }
      
      console.log(`📦 Running improve pack first for date: ${options.date}\n`);
      console.log(`  Digest: ${options.runDigest ? 'ON' : 'OFF'}`);
      console.log(`  Hunt Log: ${options.runHuntLog ? 'ON' : 'OFF'}\n`);
      
      console.log('Generating improve pack...\n');
      result = buildPipelineWithImprovePack(
        options.date,
        options.log,
        options.summary,
        options.runDigest ?? true,
        options.runHuntLog ?? false,
        outdir,
        options.since
      );
    }
    
    if (!result) {
      console.error('❌ Error: No result from pipeline builder\n');
      process.exit(1);
    }
    
    if (!result.success) {
      console.error(`❌ Error: ${result.message}\n`);
      process.exit(1);
    }
    
    console.log(`✅ ${result.message}\n`);
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  ${w}`));
      console.log('');
    }
    
    if (result.digestOutput) {
      if (result.digestOutput.hasLearningDraft && result.digestOutput.hasStats) {
        console.log('✅ Digest completed successfully\n');
      } else if (result.digestOutput.warnings.length > 0) {
        console.log('⚠️  Digest warnings:');
        result.digestOutput.warnings.forEach(w => console.log(`  ${w}`));
        console.log('');
      }
    }
    
    if (result.huntLogOutput) {
      if (result.huntLogOutput.entriesAdded > 0) {
        console.log(`✅ Hunt log: ${result.huntLogOutput.entriesAdded} entries added, ${result.huntLogOutput.totalLines} total lines\n`);
      }
      if (result.huntLogOutput.warnings.length > 0) {
        console.log('⚠️  Hunt log warnings:');
        result.huntLogOutput.warnings.forEach(w => console.log(`  ${w}`));
        console.log('');
      }
    }
    
    console.log('Next steps:');
    console.log(`  1. Review ${result.pipelinePackPath}/PACK.md`);
    console.log('  2. Check all LEARNING-DRAFT.md files for insights');
    console.log('  3. Verify no invented scores, employers, or compensation');
    console.log('  4. Career manually folds insights into learning.md\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
