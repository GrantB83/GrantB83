#!/usr/bin/env node
/**
 * Family School Pipeline Pack CLI Entry Point
 * 
 * Orchestrates Family school morning pieces:
 * 1) family-school-subject-digest (default ON)
 * 2) family-school-due-queue (default ON)
 * 3) family-calendar-ics-digest (default OFF)
 * 
 * SAFETY:
 * - Never opens email bodies or attachments
 * - Never invents due dates
 * - Never auto-sends
 * - Offline only
 */

import type { CliOptions } from './types.js';
import { assemblePack } from './assembler.js';

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Family School Pipeline Pack - Orchestrator for Family / CoS school digests

Usage:
  npm run pack -- --subjects <file> [options]

Required:
  --subjects <path>          Path to subjects file (one subject per line)
  OR --input <path>          Alias for --subjects

Optional Inputs:
  --filenames <path>         Path to filenames file (for due-queue attachment mode)
  --ics <path>               Path to .ics calendar file (for calendar stage)

Date & Output:
  --date <YYYY-MM-DD>        Date label [default: today]
  --timezone <tz>            Timezone [default: America/Chicago]
  --outdir <path>            Output directory [default: ./out]

Stage Flags (PR #114 pattern):
  --run-digest               Run family-school-subject-digest [default: true]
                             Accepts: --run-digest, --run-digest=true/false,
                             --run-digest true/false, --no-run-digest
  --run-due-queue            Run family-school-due-queue [default: true]
                             Same syntax as --run-digest
  --run-calendar             Run family-calendar-ics-digest [default: false]
                             Requires --ics when enabled

Other:
  --help, -h                 Show this help message

Examples:

  # Basic usage (digest + due-queue enabled by default):
  npm run pack -- --subjects subjects.txt --date 2026-09-04

  # With filenames for due-queue:
  npm run pack -- --subjects subjects.txt --filenames files.txt

  # With calendar:
  npm run pack -- --subjects subjects.txt --ics school.ics --run-calendar

  # Skip digest:
  npm run pack -- --subjects subjects.txt --run-digest=false

  # Skip due-queue:
  npm run pack -- --subjects subjects.txt --no-run-due-queue

  # Only calendar:
  npm run pack -- --ics school.ics --run-calendar --run-digest=false --run-due-queue=false

  # Test with fixtures:
  npm run test:fixtures

Safety:
  - Never opens email bodies or attachments
  - Never invents due dates or school facts
  - Never sends WhatsApp/email
  - Offline only
  - Family / CoS owns send workflow
`);
}

/**
 * Parse boolean flag (PR #114 pattern)
 */
function parseBooleanFlag(
  args: string[],
  i: number,
  arg: string,
  flagName: string
): { value: boolean; skip: number } {
  if (arg.startsWith(`--no-${flagName}`)) {
    return { value: false, skip: 0 };
  }
  
  if (arg.includes('=')) {
    const value = arg.split('=')[1].toLowerCase();
    return { value: !(value === 'false' || value === '0' || value === 'no'), skip: 0 };
  }
  
  const nextArg = args[i + 1];
  if (nextArg && (nextArg === 'false' || nextArg === '0' || nextArg === 'no')) {
    return { value: false, skip: 1 };
  } else if (nextArg && (nextArg === 'true' || nextArg === '1' || nextArg === 'yes')) {
    return { value: true, skip: 1 };
  } else {
    return { value: true, skip: 0 };
  }
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    runDigest: true,     // default ON
    runDueQueue: true,   // default ON
    runCalendar: false   // default OFF
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--subjects' && i + 1 < args.length) {
      options.subjects = args[++i];
    } else if (arg === '--input' && i + 1 < args.length) {
      options.input = args[++i];
    } else if (arg === '--filenames' && i + 1 < args.length) {
      options.filenames = args[++i];
    } else if (arg === '--ics' && i + 1 < args.length) {
      options.ics = args[++i];
    } else if (arg === '--date' && i + 1 < args.length) {
      options.date = args[++i];
    } else if (arg === '--timezone' && i + 1 < args.length) {
      options.timezone = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    } else if (arg === '--run-digest' || arg.startsWith('--run-digest=') || arg === '--no-run-digest') {
      const result = parseBooleanFlag(args, i, arg, 'run-digest');
      options.runDigest = result.value;
      i += result.skip;
    } else if (arg === '--run-due-queue' || arg.startsWith('--run-due-queue=') || arg === '--no-run-due-queue') {
      const result = parseBooleanFlag(args, i, arg, 'run-due-queue');
      options.runDueQueue = result.value;
      i += result.skip;
    } else if (arg === '--run-calendar' || arg.startsWith('--run-calendar=') || arg === '--no-run-calendar') {
      const result = parseBooleanFlag(args, i, arg, 'run-calendar');
      options.runCalendar = result.value;
      i += result.skip;
    }
  }

  return options;
}

/**
 * Main CLI
 */
async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Validate inputs
  const hasSubjectsOrInput = options.subjects || options.input;
  const hasIcs = options.ics;
  
  if (!hasSubjectsOrInput && !hasIcs) {
    console.error('Error: At least one of --subjects/--input or --ics is required\n');
    showHelp();
    process.exit(1);
  }

  try {
    console.log('Family School Pipeline Pack\n');
    console.log('⚠️  Offline pipeline assembler - no API calls');
    console.log('⚠️  Never opens email bodies or attachments');
    console.log('⚠️  Never invents due dates');
    console.log('⚠️  Never auto-sends\n');

    console.log('Stage configuration:');
    console.log(`  - family-school-subject-digest: ${options.runDigest ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  - family-school-due-queue: ${options.runDueQueue ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  - family-calendar-ics-digest: ${options.runCalendar ? 'ENABLED' : 'DISABLED'}`);
    console.log('');

    const result = await assemblePack(options);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log(`\n✅ ${result.message}`);
    console.log(`📄 Review APPROVAL.md before proceeding\n`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
