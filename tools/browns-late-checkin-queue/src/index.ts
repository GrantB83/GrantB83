#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { parseBookings } from './parser.js';
import { buildLateCheckInQueue } from './queue-builder.js';
import { writeOutputs } from './output-writer.js';
import type { CliOptions, MissingField, QueueOutput } from './types.js';

function showHelp(): void {
  console.log(`
browns-late-checkin-queue - Generate late/after-hours check-in queue for CoS 09:00 CT pack

USAGE:
  npm run queue -- --bookings <file> --day YYYY-MM-DD [options]

OPTIONS:
  --bookings       Path to bookings JSON file (required)
  --day            Target check-in date (YYYY-MM-DD, required)
  --outdir         Output directory (default: ./out)
  --after-hour     Late check-in threshold hour (default: 15)
  --timezone       Timezone for interpretation (default: Africa/Johannesburg)
  --help           Show this help message

EXAMPLES:
  npm run queue -- --bookings bookings.json --day 2026-09-20
  npm run queue -- --bookings bookings.json --day 2026-09-20 --after-hour 17
  npm run queue -- --bookings bookings.json --day 2026-09-20 --outdir out/ --timezone Africa/Johannesburg

RULES:
  - Include bookings arriving on --day with check-in time at/after --after-hour
  - Include bookings with late/after-hours/ETA keywords in status/notes
  - Bookings with missing check-in time go to unknown-time.md
  - Never invents times, phone numbers, or rates
  - Dullstroom only (The Browns Luxury Guest Suites)
  - Offline only - no APIs

OUTPUTS:
  - queue.json (structured)
  - queue.md (human-readable numbered list)
  - unknown-time.md (bookings without check-in times)
  - missing-fields.md (data quality)
  - APPROVAL.md (DRAFT - CoS WhatsApp send checklist)
  - manifest.json (run metadata)

SAFETY:
  - DRAFT ONLY - Never auto-sends
  - Manual CoS WhatsApp send required
  - Review APPROVAL.md before every send
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
        bookings: { type: 'string' },
        day: { type: 'string' },
        outdir: { type: 'string' },
        'after-hour': { type: 'string' },
        timezone: { type: 'string' },
        help: { type: 'boolean' },
      },
      strict: true,
    });
    
    if (values.help) {
      showHelp();
      return null;
    }
    
    if (!values.bookings) {
      console.error('❌ Error: --bookings is required');
      showHelp();
      process.exit(1);
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
    
    const afterHour = values['after-hour'] ? parseInt(values['after-hour'], 10) : 15;
    if (isNaN(afterHour) || afterHour < 0 || afterHour > 23) {
      console.error(`❌ Error: --after-hour must be 0-23 (got: ${values['after-hour']})`);
      process.exit(1);
    }
    
    return {
      bookings: values.bookings,
      day: values.day,
      outdir: values.outdir || './out',
      afterHour,
      timezone: values.timezone || 'Africa/Johannesburg',
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

function main(): void {
  console.log('🏨 Browns Late Check-In Queue Generator\n');
  
  const options = parseCliArgs();
  if (!options) {
    return;
  }
  
  const bookingsPath = resolve(options.bookings);
  if (!existsSync(bookingsPath)) {
    console.error(`❌ Error: Bookings file not found: ${bookingsPath}`);
    process.exit(1);
  }
  
  let bookings;
  try {
    console.log(`📖 Reading bookings from: ${bookingsPath}`);
    bookings = parseBookings(bookingsPath);
    console.log(`✓ Parsed ${bookings.length} booking record(s)`);
  } catch (err: any) {
    console.error(`❌ Error parsing bookings: ${err.message}`);
    process.exit(1);
  }
  
  console.log(`\n🕐 Building late check-in queue for ${options.day}`);
  console.log(`   After-hours threshold: ${options.afterHour}:00 ${options.timezone}`);
  
  const { lateCheckins, unknownTimeCheckins } = buildLateCheckInQueue(
    bookings,
    options.day,
    options.afterHour,
    options.timezone
  );
  
  console.log(`✓ Found ${lateCheckins.length} late check-in(s)`);
  console.log(`✓ Found ${unknownTimeCheckins.length} unknown-time check-in(s)`);
  
  // Track missing fields
  const missingFields: MissingField[] = [];
  [...lateCheckins, ...unknownTimeCheckins].forEach(entry => {
    const missing: string[] = [];
    if (!entry.checkInTime) missing.push('checkInTime');
    if (!entry.guestPhone) missing.push('guestPhone');
    
    if (missing.length > 0) {
      missingFields.push({
        guestName: entry.guestName,
        missingFields: missing,
      });
    }
  });
  
  const queueOutput: QueueOutput = {
    targetDay: options.day,
    afterHourThreshold: options.afterHour,
    timezone: options.timezone,
    lateCheckins,
    unknownTimeCheckins,
  };
  
  const outdir = options.outdir || './out';
  
  try {
    console.log(`\n📝 Writing outputs to: ${outdir}`);
    writeOutputs(queueOutput, missingFields, outdir);
  } catch (err: any) {
    console.error(`❌ Error writing outputs: ${err.message}`);
    process.exit(1);
  }
  
  console.log('\n⚠️  DRAFT ONLY - Review APPROVAL.md before CoS WhatsApp send\n');
}

main();
