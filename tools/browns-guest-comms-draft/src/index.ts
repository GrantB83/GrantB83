#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import type { BookingData } from './types.js';
import { loadSeeds } from './seed-loader.js';
import { loadFacts } from './facts-loader.js';
import { generateDrafts } from './generator.js';
import { writeOutputs } from './output-writer.js';

interface CLIArgs {
  bookingFile: string;
  seedsDir?: string;
  factsFile?: string;
  outDir: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  let bookingFile = '';
  let seedsDir: string | undefined;
  let factsFile: string | undefined;
  let outDir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--booking' || arg === '-b') {
      bookingFile = args[++i];
    } else if (arg === '--seeds' || arg === '-s') {
      seedsDir = args[++i];
    } else if (arg === '--facts' || arg === '-f') {
      factsFile = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      outDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!bookingFile) {
    console.error('Error: --booking argument is required.\n');
    printHelp();
    process.exit(1);
  }

  return { bookingFile, seedsDir, factsFile, outDir };
}

function printHelp(): void {
  console.log(`
Browns Guest Communications Draft Generator

Generates DRAFT guest communications (WhatsApp, email, team notes) from booking JSON.
IMPORTANT: Drafts only. Never sends. Human approval required before any guest contact.

Usage:
  draft --booking <json-file> [--seeds <dir>] [--facts <file>] [--outdir <dir>]

Required:
  --booking, -b    Path to booking JSON file (required fields: guestName, checkInDate,
                   checkOutDate, suiteOrUnit, adults, channel)

Optional:
  --seeds, -s      Directory containing tone seed samples (*.txt files)
                   Expected: welcome-*.txt, directions-*.txt, late-checkin-*.txt
  --facts, -f      Path to brand facts file (JSON or Markdown)
                   Production: /workspace/stay-knowledge/the-browns.md
  --outdir, -o     Output directory for draft job folder (default: ./out)
  --help, -h       Show this help message

Booking JSON Schema:
  {
    "guestName": "string (required)",
    "checkInDate": "YYYY-MM-DD (required)",
    "checkOutDate": "YYYY-MM-DD (required)",
    "suiteOrUnit": "string (required)",
    "lateCheckIn": "boolean (optional)",
    "adults": "number (required)",
    "children": "number (optional)",
    "notes": "string (optional)",
    "channel": "whatsapp | email (required)"
  }

Output Files (in timestamped job folder):
  - draft-welcome-whatsapp.txt   Guest welcome message for WhatsApp
  - draft-welcome-email.txt      Guest welcome email (subject + body)
  - draft-late-checkin.txt       Late check-in coordination (if applicable)
  - draft-team-checkin.txt       Internal team daily check-in note
  - APPROVAL.md                  Approval gate reminder
  - manifest.json                Job metadata

Examples:
  Basic usage:
    draft --booking fixtures/sample-booking.json --outdir out/

  With seed samples:
    draft --booking fixtures/sample-booking.json --seeds fixtures/seeds --outdir out/

  With facts file:
    draft --booking data/booking.json --seeds seeds/ --facts facts.md --outdir drafts/

Safety:
  ❌ Never sends WhatsApp or email
  ❌ Never invents rates or deposits
  ❌ Never accesses live booking systems
  ✅ Drafts only - human approval required (see docs/automation/approval-gates.md)
  `);
}

function validateBooking(booking: BookingData): void {
  const required = ['guestName', 'checkInDate', 'checkOutDate', 'suiteOrUnit', 'adults', 'channel'];
  const missing = required.filter(field => !(field in booking));

  if (missing.length > 0) {
    throw new Error(`Missing required booking fields: ${missing.join(', ')}`);
  }

  if (!['whatsapp', 'email'].includes(booking.channel)) {
    throw new Error(`Invalid channel: ${booking.channel}. Must be 'whatsapp' or 'email'`);
  }

  if (typeof booking.adults !== 'number' || booking.adults < 1) {
    throw new Error('adults must be a number >= 1');
  }

  // Validate date format (basic check)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(booking.checkInDate) || !datePattern.test(booking.checkOutDate)) {
    throw new Error('Dates must be in YYYY-MM-DD format');
  }
}

function main(): void {
  console.log('🏡 Browns Guest Communications Draft Generator\n');

  const args = parseArgs();

  // Load booking
  if (!existsSync(args.bookingFile)) {
    console.error(`Error: Booking file not found: ${args.bookingFile}`);
    process.exit(1);
  }

  console.log(`📖 Reading booking: ${args.bookingFile}`);
  const bookingContent = readFileSync(args.bookingFile, 'utf-8');
  const booking = JSON.parse(bookingContent) as BookingData;

  try {
    validateBooking(booking);
    console.log(`  ✓ Guest: ${booking.guestName}`);
    console.log(`  ✓ Dates: ${booking.checkInDate} to ${booking.checkOutDate}`);
    console.log(`  ✓ Suite: ${booking.suiteOrUnit}`);
  } catch (error) {
    console.error(`\n❌ Invalid booking data: ${(error as Error).message}`);
    process.exit(1);
  }

  // Load seeds (optional)
  const seeds = args.seedsDir ? loadSeeds(args.seedsDir) : {};
  if (args.seedsDir) {
    const seedCount = Object.values(seeds).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    console.log(`\n📚 Loaded ${seedCount} seed sample(s) from: ${args.seedsDir}`);
  } else {
    console.log('\n📚 No seed samples provided (using default tone)');
  }

  // Load facts (optional)
  const facts = loadFacts(args.factsFile);
  if (args.factsFile) {
    console.log(`📋 Loaded brand facts from: ${args.factsFile}`);
  } else {
    console.log('📋 Using default brand facts (safe fixtures only)');
  }

  // Generate drafts
  console.log('\n✍️  Generating draft communications...');
  const drafts = generateDrafts(booking, facts, seeds);

  // Write outputs
  console.log(`\n📁 Writing outputs to: ${args.outDir}`);
  writeOutputs(drafts, args.outDir);

  console.log('\n⚠️  IMPORTANT: These are DRAFT communications only.');
  console.log('   Review APPROVAL.md before any guest contact.');
  console.log('   No auto-send. Human approval required.\n');
}

main();
