#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { parseBookings, parseFacts } from './parser.js';
import { groupByStatus } from './brief-generator.js';
import { writeOutputs } from './output-writer.js';
import type { CliOptions } from './types.js';

function showHelp(): void {
  console.log(`
browns-daily-ops-brief - Generate draft daily ops briefs

USAGE:
  npm run brief -- --day YYYY-MM-DD --bookings <file> [options]

OPTIONS:
  --day         Target date (YYYY-MM-DD format, required)
  --bookings    Path to bookings JSON or CSV file (required)
  --facts       Optional JSON file with additional facts (key-value pairs)
  --outdir      Output directory (default: ./out)
  --help        Show this help message

EXAMPLES:
  npm run brief -- --day 2026-09-20 --bookings bookings.json
  npm run brief -- --day 2026-09-20 --bookings bookings.csv --outdir reports/
  npm run brief -- --day 2026-09-20 --bookings bookings.json --facts facts.json

SAFETY:
  - Generates DRAFT outputs only
  - Never sends WhatsApp or email automatically
  - Never invents rates or amounts
  - Human approval required before sending

OUTPUT FILES:
  - draft-team-group-whatsapp.txt
  - draft-guest-welcome-stubs/ (if arrivals)
  - APPROVAL.md
  - manifest.json
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
        bookings: { type: 'string' },
        facts: { type: 'string' },
        outdir: { type: 'string' },
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
    
    if (!values.bookings) {
      console.error('❌ Error: --bookings is required');
      showHelp();
      process.exit(1);
    }
    
    return {
      day: values.day,
      bookings: values.bookings,
      facts: values.facts,
      outdir: values.outdir || './out',
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

function main(): void {
  console.log('🏨 Browns Daily Ops Brief Generator\n');
  
  const options = parseCliArgs();
  if (!options) {
    return;
  }
  
  const bookingsPath = resolve(options.bookings);
  if (!existsSync(bookingsPath)) {
    console.error(`❌ Error: Bookings file not found: ${bookingsPath}`);
    process.exit(1);
  }
  
  let facts: Record<string, string> | undefined;
  if (options.facts) {
    const factsPath = resolve(options.facts);
    if (!existsSync(factsPath)) {
      console.error(`❌ Error: Facts file not found: ${factsPath}`);
      process.exit(1);
    }
    
    try {
      facts = parseFacts(factsPath);
      console.log(`📋 Loaded ${Object.keys(facts).length} fact(s)`);
    } catch (err: any) {
      console.error(`❌ Error parsing facts file: ${err.message}`);
      process.exit(1);
    }
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
  
  const sections = groupByStatus(bookings);
  
  const outdir = options.outdir || './out';
  
  try {
    writeOutputs(options.day, sections, outdir, facts);
  } catch (err: any) {
    console.error(`❌ Error writing outputs: ${err.message}`);
    process.exit(1);
  }
  
  console.log('\n⚠️  DRAFT ONLY - Review APPROVAL.md before sending\n');
}

main();
