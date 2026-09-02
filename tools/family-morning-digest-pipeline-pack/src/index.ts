#!/usr/bin/env node
/**
 * Family Morning Digest Pipeline Pack CLI
 * Offline pipeline pack assembler combining morning digest and post-checklist
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
Family Morning Digest Pipeline Pack CLI - Pipeline assembler with validation

USAGE:
  npm run pipeline -- --pack <path-to-pack> [options]
  npm run pipeline -- --run-morning-pack --date <YYYY-MM-DD> [options]

OPTIONS:
  --pack, -p                  Path to existing family-morning-digest-pack output [preferred]
  --run-morning-pack          Run family-morning-digest-pack first
  --run-post-checklist        Run family-digest-post-checklist [default: true]
  --date, -d                  Date label (YYYY-MM-DD) [required for --run-morning-pack]
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

MORNING PACK OPTIONS (when --run-morning-pack is used):
  --subjects, -s              Path to subjects file
  --ics                       Path to .ics calendar file
  --timezone                  Timezone for calendar digest [default: America/Chicago]
  --run-subject-digest        Shell out to family-school-subject-digest
  --run-ics-digest            Shell out to family-calendar-ics-digest
  --school-due-subjects       Path to school subjects file for due queue
  --school-due-files          Path to school filenames file for due queue
  --run-school-due            Shell out to family-school-due-queue

BEHAVIOR:
  Inputs:
  - --pack path to existing morning pack (preferred), OR
  - --run-morning-pack with morning pack inputs (keep optional; fixtures use prebuilt)
  
  Assemble pipeline pack:
  - PACK.md — index of morning pack + post-checklist status
  - Copies from morning pack: school.md, family.md, calendar.md, APPROVAL.md
  - Copies from post-checklist (if run): POST-CHECKLIST.md, ISSUES.md
  - APPROVAL.md — Family/CoS owns WhatsApp; never auto-send; offline only
  - manifest.json
  
  Exit 1 if morning pack missing/invalid or checklist fails.

OUTPUT:
  Creates: <outdir>/pipeline-pack-YYYY-MM-DD/
    - PACK.md               (index of all contents)
    - school.md             (from morning pack)
    - family.md             (from morning pack)
    - calendar.md           (from morning pack, if present)
    - school-due-queue.md   (from morning pack, if present)
    - APPROVAL.md           (from morning pack)
    - POST-CHECKLIST.md     (from post-checklist, if run)
    - ISSUES.md             (from post-checklist, if run)
    - manifest.json         (metadata)

EXIT CODES:
  0 - Pipeline pack created successfully, all checks passed
  1 - Pack path missing/invalid, morning pack failed, or checklist failed

SAFETY:
  - Offline only - no API calls
  - Never sends to WhatsApp
  - Never invents school facts
  - Family / CoS owns WhatsApp send workflow

EXAMPLES:
  # Use existing morning pack (preferred)
  npm run pipeline -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

  # Generate morning pack first
  npm run pipeline -- --run-morning-pack --date 2026-09-02 --subjects subjects.txt --run-subject-digest

  # Skip post-checklist
  npm run pipeline -- --pack path/to/pack --run-post-checklist=false

  # Test with fixtures
  npm run test:fixtures
  `);
}

/**
 * Parse command line arguments
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
    } else if (arg === '--run-post-checklist') {
      const nextArg = args[i + 1];
      if (nextArg && (nextArg === 'false' || nextArg === '0')) {
        options.runPostChecklist = false;
        i++;
      } else {
        options.runPostChecklist = true;
      }
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    } else if (arg === '--subjects' || arg === '-s') {
      options.subjects = args[++i];
    } else if (arg === '--ics') {
      options.ics = args[++i];
    } else if (arg === '--timezone') {
      options.timezone = args[++i];
    } else if (arg === '--run-subject-digest') {
      options.runSubjectDigest = true;
    } else if (arg === '--run-ics-digest') {
      options.runIcsDigest = true;
    } else if (arg === '--school-due-subjects') {
      options.schoolDueSubjects = args[++i];
    } else if (arg === '--school-due-files') {
      options.schoolDueFiles = args[++i];
    } else if (arg === '--run-school-due') {
      options.runSchoolDue = true;
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
    console.log('Family Morning Digest Pipeline Pack CLI\n');
    console.log('⚠️  Offline pipeline assembler - no API calls');
    console.log('⚠️  Never sends to WhatsApp');
    console.log('⚠️  Never invents school facts');
    console.log('⚠️  Family / CoS owns send workflow\n');
    
    const outdir = options.outdir || './out';
    
    let result;
    
    if (options.pack) {
      // Mode 1: Use existing morning pack
      const packPath = path.resolve(options.pack);
      
      console.log(`📦 Using existing morning pack: ${packPath}\n`);
      
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
      // Mode 2: Run morning pack first
      if (!options.date) {
        console.error('❌ Error: --date is required when using --run-morning-pack\n');
        process.exit(1);
      }
      
      console.log(`📦 Running morning pack first for date: ${options.date}\n`);
      
      console.log('Generating morning pack...\n');
      result = buildPipelineWithMorningPack(
        options.date,
        options.subjects,
        options.ics,
        options.timezone || 'America/Chicago',
        options.runSubjectDigest ?? false,
        options.runIcsDigest ?? false,
        options.schoolDueSubjects,
        options.schoolDueFiles,
        options.runSchoolDue ?? false,
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
    console.log('  4. Verify school.md and family.md for accuracy');
    console.log('  5. Family / CoS posts to WhatsApp Admin - Grant & Liana Private\n');
    
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
