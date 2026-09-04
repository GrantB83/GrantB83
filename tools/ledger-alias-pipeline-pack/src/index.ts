#!/usr/bin/env node
/**
 * Ledger Alias Pipeline Pack CLI
 * Offline pipeline pack orchestrator: suggest → apply-checklist
 */

import * as path from 'path';
import type { CliOptions } from './types.js';
import {
  buildPipelineFromSuggestOutput,
  buildPipelineWithSuggest
} from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Ledger Alias Pipeline Pack CLI - Offline merchant alias research pipeline

USAGE:
  npm run pipeline -- --suggest-outdir <path> [options]
  npm run pipeline -- --run-suggest [suggest options] [options]

OPTIONS:
  --suggest-outdir            Path to existing ledger-merchant-alias-suggest output [preferred]
  --run-suggest               Run ledger-merchant-alias-suggest first
  --run-apply-checklist       Run ledger-alias-apply-checklist [default: true]
                              Accepts: --run-apply-checklist, --run-apply-checklist=true/false,
                              --run-apply-checklist true/false, --no-run-apply-checklist
  --month                     Optional month label (YYYY-MM format)
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

SUGGEST OPTIONS (when --run-suggest is used):
  --unmatched-queue           Path to unmatched queue JSON (from ledger-unmatched-merchant-queue)
  --merchants                 Path to plain text merchant list (one per line)
  --aliases                   Path to aliases JSON file [required for --run-suggest]

BEHAVIOR:
  Input Modes:
  - --suggest-outdir: Use existing suggest output (preferred)
  - --run-suggest: Run suggest tool first (requires --unmatched-queue or --merchants, and --aliases)

  Pipeline Pack Assembly:
  - Copies suggest outputs: suggestions.json, suggestions.md, no-match.md, APPROVAL.md
  - Optionally runs apply-checklist: APPLY-CHECKLIST.md, SKIPPED.md, APPROVAL-CHECKLIST.md
  - Generates PACK.md (pipeline pack index)
  - Generates manifest.json (metadata, PR #116 pattern - only lists files actually present)

  Exit 1 if suggest output missing/invalid or tools fail.

OUTPUT:
  Creates: <outdir>/ledger-alias-pack[-YYYY-MM]/
    - PACK.md                    (pipeline pack index)
    - suggestions.json           (from suggest)
    - suggestions.md             (from suggest)
    - no-match.md                (from suggest)
    - APPROVAL.md                (from suggest)
    - APPLY-CHECKLIST.md         (from checklist, if run)
    - SKIPPED.md                 (from checklist, if run)
    - APPROVAL-CHECKLIST.md      (from checklist, if run)
    - manifest.json              (metadata)

EXIT CODES:
  0 - Pipeline pack created successfully
  1 - Suggest output missing/invalid or tools failed

SAFETY:
  - Offline only - no Google Sheets API
  - Read-only - never modifies input files
  - H2 approval required before any Budget sheet writes
  - Never invents amounts or aliases
  - Ledger owns sheet writes - Coding/CoS provides tooling only

EXAMPLES:
  # Use existing suggest output (preferred)
  npm run pipeline -- --suggest-outdir ../ledger-merchant-alias-suggest/out/

  # Run suggest first
  npm run pipeline -- \\
    --run-suggest \\
    --unmatched-queue ../ledger-unmatched-merchant-queue/out/queue.json \\
    --aliases aliases.json \\
    --month 2026-09

  # Skip apply-checklist (using equals sign)
  npm run pipeline -- --suggest-outdir out/ --run-apply-checklist=false

  # Skip apply-checklist (using space)
  npm run pipeline -- --suggest-outdir out/ --run-apply-checklist false

  # Skip apply-checklist (using negative flag)
  npm run pipeline -- --suggest-outdir out/ --no-run-apply-checklist

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runApplyChecklist: true // default to true
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--suggest-outdir') {
      options.suggestOutdir = args[++i];
    } else if (arg === '--run-suggest') {
      options.runSuggest = true;
    } else if (arg === '--no-run-apply-checklist') {
      // Handle negative flag: --no-run-apply-checklist (PR #114 pattern)
      options.runApplyChecklist = false;
    } else if (arg === '--run-apply-checklist' || arg.startsWith('--run-apply-checklist=')) {
      // Handle --run-apply-checklist[=value] (PR #114 pattern)
      if (arg.includes('=')) {
        // Parse --run-apply-checklist=false or --run-apply-checklist=true
        const value = arg.split('=')[1].toLowerCase();
        options.runApplyChecklist = !(value === 'false' || value === '0' || value === 'no');
      } else {
        // Check next argument for false/0/no
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runApplyChecklist = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runApplyChecklist = true;
          i++;
        } else {
          // Bare --run-apply-checklist means true
          options.runApplyChecklist = true;
        }
      }
    } else if (arg === '--month') {
      options.month = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    } else if (arg === '--unmatched-queue') {
      options.unmatchedQueue = args[++i];
    } else if (arg === '--merchants') {
      options.merchants = args[++i];
    } else if (arg === '--aliases') {
      options.aliases = args[++i];
    }
  }
  
  return options;
}

/**
 * Validate month format (YYYY-MM)
 */
function validateMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
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
  if (!options.suggestOutdir && !options.runSuggest) {
    console.error('❌ Error: Either --suggest-outdir or --run-suggest is required\n');
    printHelp();
    process.exit(1);
  }
  
  if (options.suggestOutdir && options.runSuggest) {
    console.error('❌ Error: Cannot use both --suggest-outdir and --run-suggest\n');
    printHelp();
    process.exit(1);
  }
  
  // Validate month format if provided
  if (options.month && !validateMonth(options.month)) {
    console.error('❌ Error: --month must be in YYYY-MM format (e.g., 2026-09)\n');
    process.exit(1);
  }
  
  try {
    console.log('Ledger Alias Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline orchestrator - no Google Sheets API');
    console.log('⚠️  Never invents amounts or aliases');
    console.log('⚠️  H2 approval required before sheet writes');
    console.log('⚠️  Ledger owns sheet writes - Coding/CoS provides tooling only\n');
    
    const outdir = options.outdir || './out';
    
    let result;
    
    if (options.suggestOutdir) {
      // Mode 1: Use existing suggest output
      const suggestOutdir = path.resolve(options.suggestOutdir);
      
      console.log(`📦 Using existing suggest output: ${suggestOutdir}\n`);
      
      console.log('Building pipeline pack...\n');
      result = buildPipelineFromSuggestOutput(
        suggestOutdir,
        options.runApplyChecklist ?? true,
        outdir,
        options.month || null
      );
      
    } else if (options.runSuggest) {
      // Mode 2: Run suggest first
      console.log('📦 Running suggest first\n');
      
      if (!options.aliases) {
        console.error('❌ Error: --aliases is required when using --run-suggest\n');
        process.exit(1);
      }
      
      result = buildPipelineWithSuggest(
        options.unmatchedQueue,
        options.merchants,
        options.aliases,
        options.runApplyChecklist ?? true,
        outdir,
        options.month || null
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
    
    console.log(`\n✅ ${result.message}\n`);
    console.log(`📁 Files generated: ${result.files.length}`);
    result.files.forEach(f => console.log(`   - ${f}`));
    console.log('');
    
    console.log('Next steps:');
    console.log(`  1. Review ${result.outdir}/PACK.md for pipeline pack contents`);
    console.log('  2. Check suggestions.md for merchant→alias mappings');
    console.log('  3. Review no-match.md for manual research items');
    if (options.runApplyChecklist) {
      console.log('  4. Review APPLY-CHECKLIST.md for H2 approval');
      console.log('  5. Get H2 approval before any Budget sheet writes');
      console.log('  6. Ledger manually applies approved changes\n');
    } else {
      console.log('  4. Get H2 approval before any Budget sheet writes');
      console.log('  5. Ledger manually applies approved changes\n');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
