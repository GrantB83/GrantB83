#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import type { BookingRecord, CliOptions } from './types.js';
import { filterBookings } from './filter.js';
import { loadGuestFacts } from './facts-loader.js';
import { generateWelcomeStubs } from './generator.js';
import { writeOutputs } from './output-writer.js';

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  
  let bookings = '';
  let asOf: string | undefined;
  let windowDays = 1;
  let facts: string | undefined;
  let outdir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--bookings' || arg === '-b') {
      bookings = args[++i];
    } else if (arg === '--as-of') {
      asOf = args[++i];
    } else if (arg === '--window-days') {
      windowDays = parseInt(args[++i], 10);
    } else if (arg === '--facts' || arg === '-f') {
      facts = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      outdir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!bookings) {
    console.error('Error: --bookings argument is required.\n');
    printHelp();
    process.exit(1);
  }

  if (isNaN(windowDays) || windowDays < 0) {
    console.error('Error: --window-days must be a non-negative number.\n');
    process.exit(1);
  }

  return { bookings, asOf, windowDays, facts, outdir };
}

function printHelp(): void {
  console.log(`
Browns Welcome Draft Pack Generator

Generates same-day/upcoming welcome message stubs for CoS WhatsApp Admin.
IMPORTANT: Drafts only. Never sends. Never invents guest phone or amounts.

Usage:
  draft-pack --bookings <json-file> [options]

Required:
  --bookings, -b       Path to bookings JSON file (from browns-nightsbridge-bookings-adapter)

Optional:
  --as-of              Date to filter from (YYYY-MM-DD, default: today)
  --window-days        Check-in within N days of as-of (default: 1)
  --facts, -f          Path to guest facts JSON (from browns-guest-facts-pack)
  --outdir, -o         Output directory for pack folder (default: ./out)
  --help, -h           Show this help message

Bookings JSON Schema:
  Array of:
  {
    "guestName": "string (required)",
    "checkInDate": "YYYY-MM-DD (required)",
    "checkOutDate": "YYYY-MM-DD (optional)",
    "suiteOrUnit": "string (optional)",
    "adults": "number (optional)",
    "children": "number (optional)",
    "notes": "string (optional)",
    "guestPhone": "string (optional)",
    "ratePerNight": "number (optional)",
    "currency": "string (optional)"
  }

Output Files (in pack folder):
  - queue.md                 Numbered welcome stubs for CoS WhatsApp posting
  - drafts/<safe-name>.md    Individual welcome stub per guest
  - missing-fields.md        Guests missing phone or rate card
  - APPROVAL.md              Review checklist (CoS posts Admin; Grant approval; no auto-send)
  - manifest.json            Pack metadata

Examples:
  Basic usage (same-day check-ins):
    draft-pack --bookings bookings.json --outdir out/

  With guest facts:
    draft-pack --bookings bookings.json --facts guest-facts.json --outdir out/

  Custom window (check-ins within 2 days):
    draft-pack --bookings bookings.json --as-of 2026-09-03 --window-days 2 --outdir out/

Critical Safety Notes:
  ✅ Offline only - No WhatsApp API or NightsBridge integration
  ✅ DRAFT ONLY - Never sends automatically
  ✅ Never invents guest phone - Placeholder [GUEST_PHONE] when unknown
  ✅ Never invents rates - Placeholder [RATE CARD REQUIRED] when unknown
  ✅ CoS owns WhatsApp - Coexistence of Service required for all sends
  ⚠️ Manual approval required - Review APPROVAL.md before every post
  ⚠️ Grant approval required - Before posting to WhatsApp Admin - The Browns

Integration:
  This tool consumes outputs from:
  - browns-nightsbridge-bookings-adapter (bookings.json)
  - browns-guest-facts-pack (guest-facts.json, optional)

  It can feed into:
  - browns-guest-comms-draft (full welcome messages)
  - browns-ct-pack-assemble (timed CT packs)
`);
}

async function main(): Promise<void> {
  const opts = parseArgs();

  // Load bookings
  if (!existsSync(opts.bookings)) {
    console.error(`Error: Bookings file not found: ${opts.bookings}`);
    process.exit(1);
  }

  let bookingsData: BookingRecord[];
  try {
    const raw = readFileSync(opts.bookings, 'utf-8');
    bookingsData = JSON.parse(raw);
    
    if (!Array.isArray(bookingsData)) {
      console.error('Error: Bookings JSON must be an array.');
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error parsing bookings JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  // Load guest facts if provided
  const guestFactsMap = opts.facts ? loadGuestFacts(opts.facts) : new Map();

  // Determine as-of date
  const asOfDate = opts.asOf || new Date().toISOString().split('T')[0];

  // Filter bookings within window
  const filtered = filterBookings(bookingsData, asOfDate, opts.windowDays);

  console.log(`Found ${filtered.length} booking(s) within ${opts.windowDays} day(s) of ${asOfDate}`);

  // Generate welcome stubs
  const stubs = generateWelcomeStubs(filtered, guestFactsMap);

  console.log(`Generated ${stubs.length} welcome stub(s)`);

  // Write outputs
  writeOutputs(stubs, {
    asOfDate,
    windowDays: opts.windowDays,
    totalBookings: bookingsData.length,
    outdir: opts.outdir,
  });

  console.log(`\nPack ready: ${opts.outdir}/`);
  console.log('Review APPROVAL.md before posting to WhatsApp Admin - The Browns');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
