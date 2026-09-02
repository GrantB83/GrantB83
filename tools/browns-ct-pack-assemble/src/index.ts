#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CliOptions } from './types.js';
import { runSiblingTool } from './tool-runner.js';
import { generatePackIndex } from './pack-generator.js';
import { writeOutputs } from './output-writer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function showHelp(): void {
  console.log(`
browns-ct-pack-assemble - Assemble CoS Browns CT timed packs

PURPOSE:
  Orchestrate offline Browns tools into one dated pack folder for WhatsApp Admin.
  CT = America/Chicago timezone. Timed posts: same-day morning drafts by 20:00 CT,
  after-hours check-ins by 09:00 CT, staff ops brief at 21:00 CT. NEVER auto-send.

USAGE:
  npm run assemble -- --day YYYY-MM-DD --outdir out/ct-YYYY-MM-DD/ [options]

REQUIRED:
  --day         Target date (YYYY-MM-DD format)
  --outdir      Output directory for the pack

PREBUILT INPUTS (prefer for reliability):
  --bookings    Path to bookings.json
  --before      Path to before.json (for change-check)
  --after       Path to after.json (for change-check)
  --facts       Path to facts.json
  --guest-booking  Path to guest booking.json (single guest for welcome drafts)

RUN FLAGS (invoke sibling tools):
  --run-adapter      Run browns-nightsbridge-bookings-adapter
  --run-change-check Run browns-booking-change-check (needs before+after OR run-adapter)
  --run-daily-ops    Run browns-daily-ops-brief (needs bookings)
  --run-guest-comms  Run browns-guest-comms-draft (needs guest-booking)
  --run-late-checkin Run browns-late-checkin-queue (needs bookings+day)

OPTIONS:
  --help        Show this help message

EXAMPLES:
  # Prebuilt inputs only
  npm run assemble -- --day 2026-09-20 --outdir out/ct-2026-09-20/ \\
    --bookings bookings.json --before before.json --after after.json

  # Run sibling tools
  npm run assemble -- --day 2026-09-20 --outdir out/ct-2026-09-20/ \\
    --bookings bookings.json --run-daily-ops --run-guest-comms \\
    --guest-booking guest.json

OUTPUTS:
  PACK.md      - Index + timed-post checklist (20:00 / 09:00 / 21:00 CT)
  APPROVAL.md  - Hard gates: never auto-send; CoS owns WhatsApp
  changes.md   - From change-check (if run or provided)
  daily-ops.md - From daily-ops-brief (if run)
  guest-*.md   - Guest draft files (if run)
  manifest.json

SAFETY:
  - DRAFT ONLY - Never sends WhatsApp or email
  - Offline orchestrator - Calls sibling tools via npm run child processes
  - Never invents rates/amounts/phones
  - Dullstroom / The Browns only
  - CoS approval required before every WhatsApp send
`);
}

function validateDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

function parseCliArgs(): CliOptions | null {
  try {
    const { values } = parseArgs({
      options: {
        day: { type: 'string' },
        outdir: { type: 'string' },
        bookings: { type: 'string' },
        before: { type: 'string' },
        after: { type: 'string' },
        facts: { type: 'string' },
        'guest-booking': { type: 'string' },
        'run-adapter': { type: 'boolean' },
        'run-change-check': { type: 'boolean' },
        'run-daily-ops': { type: 'boolean' },
        'run-guest-comms': { type: 'boolean' },
        'run-late-checkin': { type: 'boolean' },
        help: { type: 'boolean' },
      },
      strict: true,
    });
    
    if (values.help) {
      showHelp();
      return null;
    }
    
    if (!values.day) {
      console.error('❌ Error: --day is required');
      showHelp();
      process.exit(1);
    }
    
    if (!validateDate(values.day)) {
      console.error(`❌ Error: --day must be in YYYY-MM-DD format (got: ${values.day})`);
      process.exit(1);
    }
    
    if (!values.outdir) {
      console.error('❌ Error: --outdir is required');
      showHelp();
      process.exit(1);
    }
    
    return {
      day: values.day,
      outdir: values.outdir,
      bookings: values.bookings,
      before: values.before,
      after: values.after,
      facts: values.facts,
      'guest-booking': values['guest-booking'],
      'run-adapter': values['run-adapter'] || false,
      'run-change-check': values['run-change-check'] || false,
      'run-daily-ops': values['run-daily-ops'] || false,
      'run-guest-comms': values['run-guest-comms'] || false,
      'run-late-checkin': values['run-late-checkin'] || false,
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('📦 Browns CT Pack Assembler\\n');
  
  const options = parseCliArgs();
  if (!options) {
    return;
  }
  
  // Validate prebuilt inputs exist
  if (options.bookings && !existsSync(resolve(options.bookings))) {
    console.error(`❌ Error: Bookings file not found: ${options.bookings}`);
    process.exit(1);
  }
  
  if (options.before && !existsSync(resolve(options.before))) {
    console.error(`❌ Error: Before file not found: ${options.before}`);
    process.exit(1);
  }
  
  if (options.after && !existsSync(resolve(options.after))) {
    console.error(`❌ Error: After file not found: ${options.after}`);
    process.exit(1);
  }
  
  if (options.facts && !existsSync(resolve(options.facts))) {
    console.error(`❌ Error: Facts file not found: ${options.facts}`);
    process.exit(1);
  }
  
  if (options['guest-booking'] && !existsSync(resolve(options['guest-booking']))) {
    console.error(`❌ Error: Guest booking file not found: ${options['guest-booking']}`);
    process.exit(1);
  }
  
  // Validate run flags have required inputs
  if (options['run-daily-ops'] && !options.bookings) {
    console.error('❌ Error: --run-daily-ops requires --bookings');
    process.exit(1);
  }
  
  if (options['run-guest-comms'] && !options['guest-booking']) {
    console.error('❌ Error: --run-guest-comms requires --guest-booking');
    process.exit(1);
  }
  
  if (options['run-change-check'] && !options.before && !options.after && !options['run-adapter']) {
    console.error('❌ Error: --run-change-check requires --before and --after OR --run-adapter');
    process.exit(1);
  }
  
  if (options['run-late-checkin'] && !options.bookings) {
    console.error('❌ Error: --run-late-checkin requires --bookings');
    process.exit(1);
  }
  
  const packResults = {
    changeCheckOutput: null as string | null,
    dailyOpsOutput: null as string | null,
    guestCommsOutputs: [] as string[],
    lateCheckinOutput: null as string | null,
    ranFlags: {
      ranAdapter: false,
      ranChangeCheck: false,
      ranDailyOps: false,
      ranGuestComms: false,
      ranLateCheckin: false,
    }
  };
  
  // Run sibling tools if requested
  const toolsDir = resolve(join(__dirname, '../..'));
  
  if (options['run-adapter']) {
    console.log('\\n🔧 Running browns-nightsbridge-bookings-adapter...');
    try {
      const adapterOutput = join(options.outdir, 'adapter-temp');
      await runSiblingTool(
        'browns-nightsbridge-bookings-adapter',
        ['--day', options.day, '--outdir', adapterOutput],
        toolsDir
      );
      console.log('✓ Adapter completed');
      packResults.ranFlags.ranAdapter = true;
    } catch (err: any) {
      console.error(`❌ Adapter failed: ${err.message}`);
      process.exit(1);
    }
  }
  
  if (options['run-change-check']) {
    console.log('\\n🔧 Running browns-booking-change-check...');
    try {
      const changeCheckOutput = resolve(join(options.outdir, 'change-check-temp'));
      const args = ['--before', resolve(options.before!), '--after', resolve(options.after!), '--outdir', changeCheckOutput];
      if (options.day) {
        args.push('--day', options.day);
      }
      await runSiblingTool('browns-booking-change-check', args, toolsDir);
      packResults.changeCheckOutput = changeCheckOutput;
      console.log('✓ Change check completed');
      packResults.ranFlags.ranChangeCheck = true;
    } catch (err: any) {
      console.error(`❌ Change check failed: ${err.message}`);
      process.exit(1);
    }
  }
  
  if (options['run-daily-ops'] && options.bookings) {
    console.log('\\n🔧 Running browns-daily-ops-brief...');
    try {
      const dailyOpsOutput = join(options.outdir, 'daily-ops-temp');
      const args = ['--day', options.day, '--bookings', resolve(options.bookings), '--outdir', dailyOpsOutput];
      if (options.facts) {
        args.push('--facts', resolve(options.facts));
      }
      await runSiblingTool('browns-daily-ops-brief', args, toolsDir);
      packResults.dailyOpsOutput = dailyOpsOutput;
      console.log('✓ Daily ops brief completed');
      packResults.ranFlags.ranDailyOps = true;
    } catch (err: any) {
      console.error(`❌ Daily ops brief failed: ${err.message}`);
      process.exit(1);
    }
  }
  
  if (options['run-guest-comms'] && options['guest-booking']) {
    console.log('\\n🔧 Running browns-guest-comms-draft...');
    try {
      const guestCommsOutput = join(options.outdir, 'guest-comms-temp');
      const args = ['--booking', resolve(options['guest-booking']), '--outdir', guestCommsOutput];
      await runSiblingTool('browns-guest-comms-draft', args, toolsDir);
      packResults.guestCommsOutputs.push(guestCommsOutput);
      console.log('✓ Guest comms draft completed');
      packResults.ranFlags.ranGuestComms = true;
    } catch (err: any) {
      console.error(`❌ Guest comms draft failed: ${err.message}`);
      process.exit(1);
    }
  }
  
  if (options['run-late-checkin'] && options.bookings) {
    console.log('\\n🔧 Running browns-late-checkin-queue...');
    try {
      const lateCheckinOutput = join(options.outdir, 'late-checkin-temp');
      const args = ['--bookings', resolve(options.bookings), '--day', options.day, '--outdir', lateCheckinOutput];
      await runSiblingTool('browns-late-checkin-queue', args, toolsDir);
      packResults.lateCheckinOutput = lateCheckinOutput;
      console.log('✓ Late checkin queue completed');
      packResults.ranFlags.ranLateCheckin = true;
    } catch (err: any) {
      console.error(`❌ Late checkin queue failed: ${err.message}`);
      process.exit(1);
    }
  }
  
  // Generate pack files
  console.log('\\n📝 Generating CT pack files...');
  try {
    await writeOutputs(options, packResults);
    console.log(`\\n✅ CT pack assembled in: ${options.outdir}`);
    console.log('\\n📋 Next steps:');
    console.log('   1. Review PACK.md for timed checklist');
    console.log('   2. Review APPROVAL.md for safety gates');
    console.log('   3. WhatsApp Admin - The Browns (Liana vet / Grant approval)');
    console.log('   4. NEVER auto-send\\n');
  } catch (err: any) {
    console.error(`❌ Error writing outputs: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
