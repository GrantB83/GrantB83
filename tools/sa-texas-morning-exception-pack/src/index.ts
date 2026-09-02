#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { parseBrownsBookings, parseHMQuoteFiles, parseNotes } from './parser.js';
import { generateHospitalitySection, generateHeavyMetalSection, generateNotesSection } from './pack-generator.js';
import { writeOutputs } from './output-writer.js';
import type { CliOptions, PackManifest, BrownsBooking, HMQuoteFile } from './types.js';

function showHelp(): void {
  console.log(`
sa-texas-morning-exception-pack - Assemble SA Ops exception digest

USAGE:
  npm run pack -- --date YYYY-MM-DD --outdir <dir> [options]

REQUIRED:
  --date              Target date (YYYY-MM-DD format)
  --outdir            Output directory for pack files

OPTIONAL:
  --browns-bookings   Path to Browns bookings JSON file
  --hm-quotes-dir     Path to Heavy Metal open quotes directory
  --notes             Path to exception notes markdown file
  --help              Show this help message

EXAMPLES:
  npm run pack -- --date 2026-09-02 --outdir out/
  npm run pack -- --date 2026-09-02 --outdir out/ --browns-bookings bookings.json
  npm run pack -- --date 2026-09-02 --outdir out/ --hm-quotes-dir ./hm-open/
  npm run pack -- --date 2026-09-02 --outdir out/ \\
    --browns-bookings bookings.json \\
    --hm-quotes-dir ./hm-open/ \\
    --notes notes.md

OUTPUTS:
  - PACK.md           Pack index with contents and next steps
  - hospitality.md    The Browns exceptional bookings
  - heavy-metal.md    Heavy Metal open quotes
  - APPROVAL.md       Safety gates and CoS workflow
  - manifest.json     Machine-readable pack metadata

SAFETY:
  - DRAFT ONLY - never auto-sends
  - CoS owns WhatsApp workflow
  - Never invents rates, volumes, or guest facts
  - Flags missing inputs explicitly
  - Perfect Water excluded from scope

SCOPE:
  - Heavy Metal Sand & Stone: open quotes (filenames only)
  - The Browns: exceptional bookings only
  - Perfect Water: NOT INCLUDED
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
        date: { type: 'string' },
        outdir: { type: 'string' },
        'browns-bookings': { type: 'string' },
        'hm-quotes-dir': { type: 'string' },
        notes: { type: 'string' },
        help: { type: 'boolean' },
      },
      strict: true,
    });
    
    if (values.help) {
      showHelp();
      return null;
    }
    
    if (!values.date) {
      console.error('❌ Error: --date is required');
      showHelp();
      process.exit(1);
    }
    
    if (!validateDate(values.date)) {
      console.error(`❌ Error: --date must be in YYYY-MM-DD format (got: ${values.date})`);
      process.exit(1);
    }
    
    if (!values.outdir) {
      console.error('❌ Error: --outdir is required');
      showHelp();
      process.exit(1);
    }
    
    return {
      date: values.date,
      outdir: values.outdir,
      brownsBookings: values['browns-bookings'],
      hmQuotesDir: values['hm-quotes-dir'],
      notes: values.notes,
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

function main(): void {
  console.log('🇿🇦 SA Texas-Morning Exception Pack Generator\n');
  
  const options = parseCliArgs();
  if (!options) {
    return;
  }
  
  const warnings: string[] = [];
  
  let brownsBookings: BrownsBooking[] | null = null;
  if (options.brownsBookings) {
    const bookingsPath = resolve(options.brownsBookings);
    if (!existsSync(bookingsPath)) {
      console.error(`❌ Error: Browns bookings file not found: ${bookingsPath}`);
      process.exit(1);
    }
    
    try {
      brownsBookings = parseBrownsBookings(bookingsPath);
      console.log(`✓ Loaded ${brownsBookings.length} Browns booking(s)`);
    } catch (err: any) {
      console.error(`❌ Error parsing Browns bookings: ${err.message}`);
      process.exit(1);
    }
  } else {
    warnings.push('No Browns bookings file provided (--browns-bookings)');
  }
  
  let hmQuoteFiles: HMQuoteFile[] | null = null;
  if (options.hmQuotesDir) {
    const quotesPath = resolve(options.hmQuotesDir);
    if (!existsSync(quotesPath)) {
      console.error(`❌ Error: HM quotes directory not found: ${quotesPath}`);
      process.exit(1);
    }
    
    const stats = statSync(quotesPath);
    if (!stats.isDirectory()) {
      console.error(`❌ Error: HM quotes path is not a directory: ${quotesPath}`);
      process.exit(1);
    }
    
    try {
      hmQuoteFiles = parseHMQuoteFiles(quotesPath);
      console.log(`✓ Found ${hmQuoteFiles.length} HM quote file(s)`);
    } catch (err: any) {
      console.error(`❌ Error reading HM quotes directory: ${err.message}`);
      process.exit(1);
    }
  } else {
    warnings.push('No Heavy Metal quotes directory provided (--hm-quotes-dir)');
  }
  
  let notes: string | null = null;
  if (options.notes) {
    const notesPath = resolve(options.notes);
    if (!existsSync(notesPath)) {
      console.error(`❌ Error: Notes file not found: ${notesPath}`);
      process.exit(1);
    }
    
    try {
      notes = parseNotes(notesPath);
      console.log(`✓ Loaded exception notes (${notes.split('\n').length} line(s))`);
    } catch (err: any) {
      console.error(`❌ Error reading notes file: ${err.message}`);
      process.exit(1);
    }
  } else {
    warnings.push('No exception notes file provided (--notes)');
  }
  
  console.log(`\n📦 Generating exception pack for ${options.date}...\n`);
  
  const hospitalitySection = generateHospitalitySection(options.date, brownsBookings);
  const heavyMetalSection = generateHeavyMetalSection(options.date, hmQuoteFiles);
  const notesSection = generateNotesSection(notes);
  
  const manifest: PackManifest = {
    date: options.date,
    generatedAt: new Date().toISOString(),
    sources: {
      brownsBookings: options.brownsBookings || null,
      hmQuotesDir: options.hmQuotesDir || null,
      notes: options.notes || null,
    },
    outputs: [
      'PACK.md',
      'hospitality.md',
      'heavy-metal.md',
      'APPROVAL.md',
      'manifest.json',
    ],
    warnings,
  };
  
  try {
    writeOutputs(
      options.date,
      hospitalitySection,
      heavyMetalSection,
      notesSection,
      options.outdir,
      manifest
    );
  } catch (err: any) {
    console.error(`❌ Error writing outputs: ${err.message}`);
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warning of warnings) {
      console.log(`   - ${warning}`);
    }
  }
  
  console.log('\n⚠️  DRAFT ONLY - Review APPROVAL.md before any WhatsApp posting');
  console.log('⚠️  CoS owns WhatsApp workflow - Never auto-send\n');
}

main();
