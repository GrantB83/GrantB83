#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync, readFileSync } from 'fs';
import { parseInput, parseText } from './parser.js';
import { transformRows } from './transformer.js';
import { writeOutputs } from './output-writer.js';
import { CliOptions } from './types.js';

function showHelp(): void {
  console.log(`
browns-nightsbridge-bookings-adapter

Convert Nightsbridge-ish day sheets (CSV/TSV/paste) into bookings.json
for browns-daily-ops-brief.

USAGE:
  npm run adapt -- --day YYYY-MM-DD --input <file> [options]
  npm run adapt -- --day YYYY-MM-DD --paste [options]

OPTIONS:
  --day <YYYY-MM-DD>    Required. Target date for status derivation
  --input <file>        Path to CSV/TSV file
  --paste               Read from stdin (pasted table)
  --outdir <dir>        Output directory (default: ./out)
  --help                Show this help

EXAMPLES:
  # From CSV file
  npm run adapt -- --day 2026-09-20 --input nightsbridge.csv

  # From TSV file
  npm run adapt -- --day 2026-09-20 --input export.tsv --outdir reports/

  # From pasted text
  cat table.txt | npm run adapt -- --day 2026-09-20 --paste

OUTPUTS:
  - bookings.json       Feed into browns-daily-ops-brief
  - bookings.csv        Human-readable CSV
  - missing-fields.md   Issues to resolve
  - APPROVAL.md         Safety checklist
  - manifest.json       File inventory

PROPERTY:
  Dullstroom The Browns Luxury Guest Suites only.
`);
}

function validateDate(dateStr: string): boolean {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (!match) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({
      options: {
        day: { type: 'string' },
        input: { type: 'string' },
        paste: { type: 'boolean' },
        outdir: { type: 'string' },
        help: { type: 'boolean' }
      }
    });
    
    if (values.help) {
      showHelp();
      process.exit(0);
    }
    
    const day = values.day as string | undefined;
    const input = values.input as string | undefined;
    const paste = values.paste as boolean | undefined;
    const outdir = (values.outdir as string | undefined) || './out';
    
    if (!day) {
      console.error('❌ Error: --day is required\n');
      showHelp();
      process.exit(1);
    }
    
    if (!validateDate(day)) {
      console.error(`❌ Error: Invalid date format "${day}". Use YYYY-MM-DD\n`);
      process.exit(1);
    }
    
    if (!input && !paste) {
      console.error('❌ Error: Either --input <file> or --paste is required\n');
      showHelp();
      process.exit(1);
    }
    
    if (input && paste) {
      console.error('❌ Error: Cannot use both --input and --paste\n');
      showHelp();
      process.exit(1);
    }
    
    console.log('🔄 Browns Nightsbridge Bookings Adapter');
    console.log(`📅 Target date: ${day}`);
    
    let parsedData;
    
    if (paste) {
      console.log('📋 Reading from stdin...');
      const stdinText = readFileSync(0, 'utf-8');
      parsedData = parseText(stdinText);
      console.log(`✅ Parsed ${parsedData.rows.length} row(s) (delimiter: ${parsedData.delimiter === ',' ? 'CSV' : 'TSV'})`);
    } else if (input) {
      console.log(`📂 Reading from: ${input}`);
      
      if (!existsSync(input)) {
        console.error(`❌ Error: File not found: ${input}`);
        process.exit(1);
      }
      
      parsedData = parseInput(input);
      console.log(`✅ Parsed ${parsedData.rows.length} row(s) (delimiter: ${parsedData.delimiter === ',' ? 'CSV' : 'TSV'})`);
    } else {
      console.error('❌ Error: No input provided');
      process.exit(1);
    }
    
    console.log('🔄 Transforming to bookings schema...');
    const { bookings, missingFields } = transformRows(parsedData.rows, day);
    
    console.log(`✅ Transformed ${bookings.length} booking(s)`);
    
    if (missingFields.length > 0) {
      console.log(`⚠️  ${missingFields.length} field(s) missing - see missing-fields.md`);
    }
    
    console.log(`📁 Writing outputs to: ${outdir}`);
    writeOutputs(bookings, missingFields, outdir, day);
    
    console.log('✅ Done!\n');
    console.log('📄 Generated files:');
    console.log(`   - ${outdir}/bookings.json (${bookings.length} records)`);
    console.log(`   - ${outdir}/bookings.csv`);
    console.log(`   - ${outdir}/missing-fields.md`);
    console.log(`   - ${outdir}/APPROVAL.md`);
    console.log(`   - ${outdir}/manifest.json\n`);
    
    if (missingFields.length > 0) {
      console.log('⚠️  Review missing-fields.md before proceeding to browns-daily-ops-brief\n');
    } else {
      console.log('✅ No missing fields. Ready for browns-daily-ops-brief\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
