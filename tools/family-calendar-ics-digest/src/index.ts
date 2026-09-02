#!/usr/bin/env node

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parseICS, extractEvents } from './parser.js';
import { formatDigest, formatMissingFields, formatApproval } from './digest.js';
import { CalendarEvent, DigestManifest, CliOptions } from './types.js';

function parseArgs(): CliOptions | null {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return null;
  }
  
  const options: Partial<CliOptions> = {
    timezone: 'America/Chicago',
    outdir: './out'
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    
    if ((arg === '--ics') && next) {
      options.ics = next;
      i++;
    } else if ((arg === '--from') && next) {
      options.from = next;
      i++;
    } else if ((arg === '--to') && next) {
      options.to = next;
      i++;
    } else if ((arg === '--outdir' || arg === '-o') && next) {
      options.outdir = next;
      i++;
    } else if ((arg === '--timezone' || arg === '-t') && next) {
      options.timezone = next;
      i++;
    }
  }
  
  if (!options.ics || !options.from || !options.to) {
    console.error('Error: --ics, --from, and --to are required\n');
    printHelp();
    return null;
  }
  
  return options as CliOptions;
}

function printHelp(): void {
  console.log(`
family-calendar-ics-digest - Offline ICS calendar digest generator

USAGE:
  npm run digest -- --ics <file> --from <date> --to <date> [options]

REQUIRED:
  --ics <file>          Path to .ics calendar file
  --from <YYYY-MM-DD>   Start date (inclusive)
  --to <YYYY-MM-DD>     End date (inclusive)

OPTIONS:
  --outdir, -o <dir>    Output directory (default: ./out)
  --timezone, -t <tz>   Timezone for display (default: America/Chicago)
  --help, -h            Show this help message

OUTPUTS:
  events.json           Structured event data
  digest.md             Numbered digest with full sentences
  missing-fields.md     Events with incomplete data
  APPROVAL.md           Safety gates and review checklist
  manifest.json         Generation metadata

EXAMPLES:
  npm run digest -- --ics school.ics --from 2026-09-02 --to 2026-09-05
  npm run digest -- --ics calendar.ics --from 2026-09-01 --to 2026-09-30 --outdir reports/
  npm run digest -- --ics events.ics --from 2026-09-15 --to 2026-09-20 --timezone America/New_York
`);
}

function main(): void {
  const options = parseArgs();
  if (!options) {
    process.exit(1);
  }
  
  try {
    console.log(`Parsing ICS file: ${options.ics}`);
    const vcalendar = parseICS(options.ics);
    
    const fromDate = new Date(options.from);
    const toDate = new Date(options.to);
    toDate.setHours(23, 59, 59, 999);
    
    console.log(`Extracting events from ${options.from} to ${options.to}`);
    const events = extractEvents(vcalendar, fromDate, toDate, options.timezone);
    
    console.log(`Found ${events.length} event(s) in date range`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outDir = join(options.outdir, `digest-${timestamp}`);
    
    mkdirSync(outDir, { recursive: true });
    console.log(`Output directory: ${outDir}`);
    
    writeFileSync(
      join(outDir, 'events.json'),
      JSON.stringify(events, null, 2),
      'utf-8'
    );
    console.log('✓ events.json');
    
    const digestMd = formatDigest(events, options.from, options.to, options.timezone);
    writeFileSync(join(outDir, 'digest.md'), digestMd, 'utf-8');
    console.log('✓ digest.md');
    
    const missingFieldsMd = formatMissingFields(events);
    writeFileSync(join(outDir, 'missing-fields.md'), missingFieldsMd, 'utf-8');
    console.log('✓ missing-fields.md');
    
    const approvalMd = formatApproval();
    writeFileSync(join(outDir, 'APPROVAL.md'), approvalMd, 'utf-8');
    console.log('✓ APPROVAL.md');
    
    const manifest: DigestManifest = {
      tool: 'family-calendar-ics-digest',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      inputFile: options.ics,
      dateRange: {
        from: options.from,
        to: options.to
      },
      timezone: options.timezone,
      eventCount: events.length,
      missingFieldsCount: events.filter(e => e.missingFields.length > 0).length
    };
    
    writeFileSync(
      join(outDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
    console.log('✓ manifest.json');
    
    console.log(`\nDigest generation complete!`);
    console.log(`Events: ${events.length}`);
    console.log(`Missing fields: ${manifest.missingFieldsCount}`);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
