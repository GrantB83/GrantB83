#!/usr/bin/env node
/**
 * vault-due-digest-pipeline-pack CLI
 * 
 * Offline orchestrator: vault-filename-due-queue → vault-due-digest-pack → vault-due-digest-post-checklist
 * 
 * SAFETY:
 * - Never opens file bodies
 * - Never submits to SARS/CIPC
 * - Never invents dates/amounts
 * - Vault owns all research and filings (N2 gate)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CliOptions } from './types.js';
import { buildPipelineFromPack, buildPipelineFromFilenames } from './pipeline-builder.js';

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Vault Due Digest Pipeline Pack - Offline orchestrator

USAGE:
  npm run pipeline -- --pack <digest-pack-dir> [options]
  npm run pipeline -- --filenames <list.txt> [options]

REQUIRED (one of):
  --pack <dir>               Path to existing vault-due-digest-pack output [preferred]
  --filenames <file>         Path to filename list (runs vault-due-digest-pack)

OPTIONS:
  --run-post-checklist       Run vault-due-digest-post-checklist [default: true]
                             Accepts: --run-post-checklist, --run-post-checklist=true/false,
                             --run-post-checklist true/false, --no-run-post-checklist
  --outdir, -o               Output directory [default: ./out]
  --help, -h                 Show this help message

BEHAVIOR:
  Input Modes:
  1. --pack path to existing digest pack (preferred) - fastest, most reliable
  2. --filenames path + runs vault-due-digest-pack with --run-entity-pack

  Pipeline Pack Assembly:
  - Copies DIGEST.md, APPROVAL.md, by-entity/ subdirectories from digest pack
  - Optionally runs vault-due-digest-post-checklist (default: ON)
  - Generates PACK.md index, manifest.json

  Post-Checklist Integration:
  - When --run-post-checklist is true (default): shells out to vault-due-digest-post-checklist
  - Copies POST-CHECKLIST.md and ISSUES.md to pipeline pack
  - Updates PACK.md with checklist status

EXIT CODES:
  0 - Pipeline pack assembled successfully
  1 - Pack path missing/invalid, digest pack failed, or checklist failed

SAFETY:
  - ✅ Offline only - no API calls, no file body reads
  - ✅ Never submits to SARS/CIPC - Vault owns filings (N2 gate)
  - ✅ Never invents dates/amounts - source data only
  - ⚠️ Manual review required - Vault reviews all research packs before action

EXAMPLES:

  # Use existing digest pack (preferred)
  npm run pipeline -- --pack ../vault-due-digest-pack/out/digest-2026-09-02

  # From filename list (runs digest pack + entity pack)
  npm run pipeline -- --filenames vault-filenames.txt --outdir pipeline-out/

  # Skip post-checklist (multiple syntax options)
  npm run pipeline -- --pack digest-pack/ --no-run-post-checklist
  npm run pipeline -- --pack digest-pack/ --run-post-checklist=false
  npm run pipeline -- --pack digest-pack/ --run-post-checklist false

  # Test with fixtures
  npm run test:fixtures
`);
}

/**
 * Parse boolean flag with flexible formats
 */
function parseBooleanFlag(args: string[], flagName: string, defaultValue: boolean): boolean {
  const negatedFlag = `--no-${flagName.replace(/^--/, '')}`;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === negatedFlag) {
      return false;
    }
    
    if (arg === flagName) {
      if (i + 1 < args.length) {
        const next = args[i + 1];
        if (next === 'true' || next === 'false') {
          return next === 'true';
        }
      }
      return true;
    }
    
    if (arg.startsWith(`${flagName}=`)) {
      const value = arg.split('=')[1];
      return value === 'true';
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
    } else if (arg === '--pack' && i + 1 < args.length) {
      options.pack = args[++i];
    } else if (arg === '--filenames' && i + 1 < args.length) {
      options.filenames = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      if (i + 1 < args.length) {
        options.outdir = args[++i];
      }
    }
  }
  
  options.runPostChecklist = parseBooleanFlag(args, '--run-post-checklist', true);
  
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
  if (!options.pack && !options.filenames) {
    console.error('❌ Error: Either --pack or --filenames is required\n');
    showHelp();
    process.exit(1);
  }
  
  if (options.pack && options.filenames) {
    console.error('❌ Error: Cannot use both --pack and --filenames\n');
    showHelp();
    process.exit(1);
  }
  
  const outdir = options.outdir || './out';
  
  try {
    console.log('\n🔒 Vault Due Digest Pipeline Pack\n');
    console.log('⚠️  Offline only - no file body reads, no network calls');
    console.log('⚠️  Never submits to SARS/CIPC');
    console.log('⚠️  Vault owns all research and filings (N2 gate)\n');
    
    let result;
    
    if (options.pack) {
      // Mode 1: Use existing digest pack
      const packPath = path.resolve(options.pack);
      console.log(`📦 Using existing digest pack: ${packPath}\n`);
      
      result = buildPipelineFromPack(
        packPath,
        options.runPostChecklist ?? true,
        outdir
      );
      
    } else if (options.filenames) {
      // Mode 2: Run digest pack from filenames
      const filenamesPath = path.resolve(options.filenames);
      console.log(`📁 Processing filename list: ${filenamesPath}\n`);
      
      result = buildPipelineFromFilenames(
        filenamesPath,
        options.runPostChecklist ?? true,
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
    console.log(`   - Digest Pack: ${result.manifest.runOptions.ranDigestPack ? '✅ Run' : '📦 Used existing'}`);
    console.log(`   - Entity Pack: ${result.manifest.runOptions.ranEntityPack ? '✅ Run' : '📦 Included'}`);
    console.log(`   - Post-Checklist: ${result.manifest.runOptions.ranPostChecklist ? '✅ Run' : '⏭️ Skipped'}`);
    console.log('');
    
    console.log('Next steps:');
    console.log(`  1. Review ${outdir}/PACK.md for pipeline overview`);
    console.log(`  2. Review ${outdir}/DIGEST.md for entity-scoped due items`);
    console.log(`  3. Check ${outdir}/by-entity/ for detailed research packs`);
    
    if (result.manifest.runOptions.ranPostChecklist) {
      console.log(`  4. Review ${outdir}/POST-CHECKLIST.md for go/no-go validation`);
      console.log(`  5. Check ${outdir}/ISSUES.md for any failures or warnings`);
    }
    
    console.log('  6. Vault owns all research and filings - never auto-submit\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
