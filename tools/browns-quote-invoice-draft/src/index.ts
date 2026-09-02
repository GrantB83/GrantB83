#!/usr/bin/env node

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { parseQuoteJson } from './json-parser.js';
import { validateQuoteInput } from './validators.js';
import { generateDrafts } from './draft-generator.js';

interface CliArgs {
  quote?: string;
  outdir?: string;
  help?: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {
    outdir: './out'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--quote' || arg === '-q') {
      parsed.quote = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      parsed.outdir = args[++i];
    }
  }

  return parsed;
}

function showHelp(): void {
  console.log(`
Browns Quote & Invoice Draft Generator

USAGE:
  npm run draft -- --quote <file> [--outdir <dir>]

OPTIONS:
  --quote, -q    Path to quote JSON file (required)
  --outdir, -o   Output directory (default: ./out)
  --help, -h     Show this help message

EXAMPLES:
  npm run draft -- --quote fixtures/sample-quote.json
  npm run draft -- --quote data/booking.json --outdir drafts/

CRITICAL SAFETY:
  This tool NEVER invents rates or totals.
  All amounts must come from the input JSON.
  Missing amounts result in availability-only drafts.

OUTPUT FILES:
  - draft-quote-whatsapp.txt    WhatsApp message draft
  - draft-quote-email.txt       Email quote draft
  - draft-proforma-email.txt    Proforma invoice (if applicable)
  - APPROVAL.md                 Approval checklist
  - manifest.json               Generation metadata

⚠️  DRAFT ONLY - Never send without Grant's approval
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.quote) {
    console.error('❌ Error: --quote argument is required\n');
    showHelp();
    process.exit(1);
  }

  console.log('Browns Quote & Invoice Draft Generator\n');
  console.log(`Reading quote file: ${args.quote}`);

  try {
    const quoteInput = await parseQuoteJson(args.quote);
    
    const validation = validateQuoteInput(quoteInput);
    if (!validation.valid) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    console.log('  ✓ Quote data validated');

    console.log('\nGenerating drafts...');
    const drafts = generateDrafts(quoteInput);
    
    console.log(`  ✓ Generated ${drafts.manifest.files.length} files`);
    if (!drafts.manifest.hasAmounts) {
      console.log('  ⚠️  No amounts in input - drafts indicate availability only');
    }

    await mkdir(args.outdir!, { recursive: true });
    console.log(`\nWriting files to: ${args.outdir}`);

    await writeFile(
      join(args.outdir!, 'draft-quote-whatsapp.txt'),
      drafts.whatsappQuote,
      'utf-8'
    );
    console.log('  ✓ draft-quote-whatsapp.txt');

    await writeFile(
      join(args.outdir!, 'draft-quote-email.txt'),
      drafts.emailQuote,
      'utf-8'
    );
    console.log('  ✓ draft-quote-email.txt');

    if (drafts.proformaEmail) {
      await writeFile(
        join(args.outdir!, 'draft-proforma-email.txt'),
        drafts.proformaEmail,
        'utf-8'
      );
      console.log('  ✓ draft-proforma-email.txt');
    }

    await writeFile(
      join(args.outdir!, 'APPROVAL.md'),
      drafts.approval,
      'utf-8'
    );
    console.log('  ✓ APPROVAL.md');

    await writeFile(
      join(args.outdir!, 'manifest.json'),
      JSON.stringify(drafts.manifest, null, 2),
      'utf-8'
    );
    console.log('  ✓ manifest.json');

    console.log('\n✅ Draft generation complete!\n');
    console.log('⚠️  Review APPROVAL.md before sending any drafts.\n');
    console.log('NEXT STEPS:');
    console.log('1. Review all generated files');
    console.log('2. Verify amounts (if present) match your source data');
    console.log('3. Get Grant\'s approval before sending');

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

main();
