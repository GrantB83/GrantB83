#!/usr/bin/env node
/**
 * SA Texas Exception Pipeline Pack CLI
 * Offline pipeline pack assembler combining morning exception pack and post-checklist
 */

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions } from './types.js';
import {
  buildPipelineFromExistingPack,
  buildPipelineWithMorningPack
} from './pipeline-builder.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
SA Texas Exception Pipeline Pack CLI - Pipeline assembler with validation

USAGE:
  npm run pipeline -- --pack <path-to-pack> [options]
  npm run pipeline -- --run-morning-pack --date <YYYY-MM-DD> [options]

OPTIONS:
  --pack, -p                  Path to existing sa-texas-morning-exception-pack output [preferred]
  --run-morning-pack          Run sa-texas-morning-exception-pack first
  --run-post-checklist        Run sa-texas-exception-post-checklist [default: true]
                              Accepts: --run-post-checklist, --run-post-checklist=true/false,
                              --run-post-checklist true/false, --no-run-post-checklist
  --date, -d                  Date label (YYYY-MM-DD) [required for --run-morning-pack]
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

MORNING PACK OPTIONS (when --run-morning-pack is used):
  --browns-bookings           Path to Browns bookings JSON file
  --hm-quotes-dir             Path to Heavy Metal open quotes directory
  --notes                     Path to exception notes markdown file

BEHAVIOR:
  Inputs:
  - --pack path to existing morning exception pack (preferred), OR
  - --run-morning-pack with morning pack inputs
  
  Assemble pipeline pack:
  - PACK.md — index of morning exception pack + post-checklist status
  - Copies from morning pack: hospitality.md, heavy-metal.md, APPROVAL.md
  - Copies from post-checklist (if run): POST-CHECKLIST.md, ISSUES.md
  - APPROVAL.md — CoS / SA Ops owns WhatsApp; never auto-send; offline only
  - manifest.json
  
  Exit 1 if morning pack missing/invalid or checklist fails.

OUTPUT:
  Creates: <outdir>/pipeline-pack-YYYY-MM-DD/
    - PACK.md               (index of all contents)
    - hospitality.md        (from morning exception pack)
    - heavy-metal.md        (from morning exception pack)
    - APPROVAL.md           (from morning exception pack)
    - POST-CHECKLIST.md     (from post-checklist, if run)
    - ISSUES.md             (from post-checklist, if run)
    - manifest.json         (metadata)

EXIT CODES:
  0 - Pipeline pack created successfully, all checks passed
  1 - Pack path missing/invalid, morning pack failed, or checklist failed

SAFETY:
  - Offline only - no API calls
  - Never sends to WhatsApp
  - Never invents rates, volumes, or guest facts
  - CoS / SA Ops owns WhatsApp send workflow
  - Heavy Metal + hospitality only (Perfect Water excluded)
  - USA hours

EXAMPLES:
  # Use existing morning exception pack (preferred)
  npm run pipeline -- --pack ../sa-texas-morning-exception-pack/out/pack-2026-09-02

  # Generate morning pack first
  npm run pipeline -- --run-morning-pack --date 2026-09-02 \\
    --browns-bookings bookings.json \\
    --hm-quotes-dir ./hm-open/ \\
    --notes notes.md

  # Skip post-checklist (using equals sign)
  npm run pipeline -- --pack path/to/pack --run-post-checklist=false

  # Skip post-checklist (using space)
  npm run pipeline -- --pack path/to/pack --run-post-checklist false

  # Skip post-checklist (using negative flag)
  npm run pipeline -- --pack path/to/pack --no-run-post-checklist

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments with PR #114 boolean flag pattern
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runPostChecklist: true // default to true
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--pack' || arg === '-p') {
      options.pack = args[++i];
    } else if (arg === '--run-morning-pack') {
      options.runMorningPack = true;
    } else if (arg === '--no-run-post-checklist') {
      // Handle negative flag: --no-run-post-checklist
      options.runPostChecklist = false;
    } else if (arg === '--run-post-checklist' || arg.startsWith('--run-post-checklist=')) {
      // Handle --run-post-checklist[=value]
      if (arg.includes('=')) {
        // Parse --run-post-checklist=false or --run-post-checklist=true
        const value = arg.split('=')[1].toLowerCase();
        options.runPostChecklist = !(value === 'false' || value === '0' || value === 'no');
      } else {
        // Check next argument for false/0/no
        const nextArg = args[i + 1];
        if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
          options.runPostChecklist = false;
          i++;
        } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
          options.runPostChecklist = true;
          i++;
        } else {
          // Bare --run-post-checklist means true
          options.runPostChecklist = true;
        }
      }
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    } else if (arg === '--browns-bookings') {
      options.brownsBookings = args[++i];
    } else if (arg === '--hm-quotes-dir') {
      options.hmQuotesDir = args[++i];
    } else if (arg === '--notes') {
      options.notes = args[++i];
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
  if (!options.pack && !options.runMorningPack) {
    console.error('❌ Error: Either --pack or --run-morning-pack is required\n');
    printHelp();
    process.exit(1);
  }
  
  if (options.pack && options.runMorningPack) {
    console.error('❌ Error: Cannot use both --pack and --run-morning-pack\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('🇿🇦 SA Texas Exception Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline assembler - no API calls');
    console.log('⚠️  Never sends to WhatsApp');
    console.log('⚠️  Never invents rates, volumes, or guest facts');
    console.log('⚠️  CoS / SA Ops owns send workflow');
    console.log('⚠️  Heavy Metal + hospitality only (Perfect Water excluded)\n');
    
    const outdir = options.outdir || './out';
    
    let result;
    
    if (options.pack) {
      // Mode 1: Use existing morning exception pack
      const packPath = path.resolve(options.pack);
      
      console.log(`📦 Using existing morning exception pack: ${packPath}\n`);
      
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
      result = buildPipelineFromExistingPack(
        packPath,
        options.runPostChecklist ?? true,
        outdir,
        packDate
      );
      
    } else if (options.runMorningPack) {
      // Mode 2: Run morning exception pack first
      if (!options.date) {
        console.error('❌ Error: --date is required when using --run-morning-pack\n');
        process.exit(1);
      }
      
      console.log(`📦 Running morning exception pack first for date: ${options.date}\n`);
      
      console.log('Generating morning exception pack...\n');
      result = buildPipelineWithMorningPack(
        options.date,
        options.brownsBookings,
        options.hmQuotesDir,
        options.notes,
        options.runPostChecklist ?? true,
        outdir
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
    
    if (result.checklistOutput) {
      if (result.checklistOutput.allPassed) {
        console.log('✅ All post-checklist checks PASSED!\n');
      } else {
        console.log('❌ Some post-checklist checks FAILED!\n');
        if (result.checklistOutput.failures.length > 0) {
          console.log('Failures:');
          result.checklistOutput.failures.forEach(f => console.log(`  ${f}`));
          console.log('');
        }
      }
      
      if (result.checklistOutput.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        result.checklistOutput.warnings.forEach(w => console.log(`  ${w}`));
        console.log('');
      }
    }
    
    console.log('Next steps:');
    console.log(`  1. Review ${outdir}/pipeline-pack-${options.date || 'YYYY-MM-DD'}/PACK.md`);
    console.log('  2. Check POST-CHECKLIST.md for go/no-go status (if present)');
    console.log('  3. Review ISSUES.md for any failures/warnings (if present)');
    console.log('  4. Verify hospitality.md and heavy-metal.md for accuracy');
    console.log('  5. CoS / SA Ops posts to WhatsApp Admin\n');
    
    // Exit with appropriate code
    if (!result.checklistOutput || result.checklistOutput.allPassed) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
