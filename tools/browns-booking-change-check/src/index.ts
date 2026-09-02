#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { parseBookingsFile, computeFileHash } from './parser.js';
import { diffBookings } from './differ.js';
import { writeOutputs } from './output-writer.js';
import { OutputSummary } from './types.js';

function showHelp(): void {
  console.log(`
browns-booking-change-check

Diff two booking snapshots and report changes for CoS SA Ops
last-minute verification before WhatsApp Admin posts.

USAGE:
  npm run check -- --before before.json --after after.json [options]

OPTIONS:
  --before <file>       Required. Path to "before" bookings JSON
  --after <file>        Required. Path to "after" bookings JSON
  --outdir <dir>        Output directory (default: ./out)
  --day <YYYY-MM-DD>    Optional. Target day for context
  --help                Show this help

EXAMPLES:
  # Basic diff
  npm run check -- --before bookings-1900.json --after bookings-2045.json

  # With target day context
  npm run check -- \\
    --before before.json \\
    --after after.json \\
    --day 2026-09-20 \\
    --outdir reports/

OUTPUTS:
  - changes.json    Structured adds/removes/updates
  - changes.md      Numbered prose digest (for CoS)
  - APPROVAL.md     Pre-post checklist and safety notes
  - manifest.json   File inventory

MATCHING KEY:
  1. Explicit \`id\` field (if present)
  2. Else: guestName|checkInDate|checkOutDate|suiteOrUnit (normalized)

EXIT CODES:
  0 - Ran successfully (even if changes found)
  1 - Bad input or parse failure

PROPERTY:
  Dullstroom The Browns Luxury Guest Suites only.
`);
}

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({
      options: {
        before: { type: 'string' },
        after: { type: 'string' },
        outdir: { type: 'string' },
        day: { type: 'string' },
        help: { type: 'boolean' }
      }
    });
    
    if (values.help) {
      showHelp();
      process.exit(0);
    }
    
    const before = values.before as string | undefined;
    const after = values.after as string | undefined;
    const outdir = (values.outdir as string | undefined) || './out';
    const day = values.day as string | undefined;
    
    if (!before || !after) {
      console.error('❌ Error: Both --before and --after are required\n');
      showHelp();
      process.exit(1);
    }
    
    if (!existsSync(before)) {
      console.error(`❌ Error: File not found: ${before}`);
      process.exit(1);
    }
    
    if (!existsSync(after)) {
      console.error(`❌ Error: File not found: ${after}`);
      process.exit(1);
    }
    
    console.log('🔄 Browns Booking Change Check');
    if (day) {
      console.log(`📅 Target day: ${day}`);
    }
    
    console.log(`📂 Before: ${before}`);
    const beforeBookings = parseBookingsFile(before);
    console.log(`   ✅ Loaded ${beforeBookings.length} booking(s)`);
    
    console.log(`📂 After: ${after}`);
    const afterBookings = parseBookingsFile(after);
    console.log(`   ✅ Loaded ${afterBookings.length} booking(s)`);
    
    console.log('🔄 Computing diff...');
    const changes = diffBookings(beforeBookings, afterBookings);
    
    const adds = changes.filter(c => c.type === 'add').length;
    const removes = changes.filter(c => c.type === 'remove').length;
    const updates = changes.filter(c => c.type === 'update').length;
    
    console.log(`   ➕ ${adds} addition(s)`);
    console.log(`   ➖ ${removes} removal(s)`);
    console.log(`   🔄 ${updates} update(s)`);
    
    const beforeHash = computeFileHash(before);
    const afterHash = computeFileHash(after);
    
    const summary: OutputSummary = {
      adds,
      removes,
      updates,
      total: changes.length,
      beforeHash,
      afterHash
    };
    
    console.log(`📁 Writing outputs to: ${outdir}`);
    writeOutputs(changes, outdir, summary, day);
    
    console.log('✅ Done!\n');
    console.log('📄 Generated files:');
    console.log(`   - ${outdir}/changes.json (${changes.length} change(s))`);
    console.log(`   - ${outdir}/changes.md`);
    console.log(`   - ${outdir}/APPROVAL.md`);
    console.log(`   - ${outdir}/manifest.json\n`);
    
    if (changes.length === 0) {
      console.log('✅ No changes detected. Snapshots are identical.\n');
    } else {
      console.log(`⚠️  ${changes.length} change(s) detected. Review changes.md before posting.\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
