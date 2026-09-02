#!/usr/bin/env node

import * as fs from 'fs';
import { parseRatesCSV } from './rate-parser.js';
import { parsePromo } from './promo-parser.js';
import { generateWorksheet, writeWorksheetFiles } from './worksheet-generator.js';
import { PromoRecord } from './types.js';

function printUsage(): void {
  console.log(`
Browns OTA Rate Worksheet Generator

Usage:
  npm run worksheet -- --rates <file> [--promo <file>] [--outdir <dir>]

Options:
  --rates       Path to rates CSV file (required)
  --promo       Path to promo JSON or CSV file (optional)
  --outdir      Output directory for worksheets (default: ./out)
  --help, -h    Show this help message

Example:
  npm run worksheet -- --rates fixtures/sample-rates.csv --promo fixtures/sample-promo.json --outdir out/

Output Files:
  - worksheet.csv      Machine-readable plan for Nightsbridge entry
  - worksheet.md       Human checklist with blanks where rates missing
  - APPROVAL.md        Grant must approve before any OTA/Nightsbridge changes
  - manifest.json      Metadata summary

Safety:
  - Never invents rates or discounts
  - Leaves blanks where data is missing
  - Flags incomplete entries
  - No API calls or browser automation
`);
}

function parseArgs(): { rates?: string; promo?: string; outdir: string } | null {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return null;
  }

  let rates: string | undefined;
  let promo: string | undefined;
  let outdir = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--rates' && i + 1 < args.length) {
      rates = args[++i];
    } else if (arg === '--promo' && i + 1 < args.length) {
      promo = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      outdir = args[++i];
    }
  }

  if (!rates) {
    console.error('Error: --rates is required\n');
    printUsage();
    process.exit(1);
  }

  return { rates, promo, outdir };
}

async function main(): Promise<void> {
  console.log('Browns OTA Rate Worksheet Generator\n');

  const config = parseArgs();
  if (!config) {
    process.exit(0);
  }

  try {
    const ratesFile = config.rates;
    
    if (!ratesFile) {
      throw new Error('Missing required argument: --rates');
    }

    if (!fs.existsSync(ratesFile)) {
      throw new Error(`Rates file not found: ${ratesFile}`);
    }

    console.log(`Reading rates file: ${ratesFile}`);
    const rates = parseRatesCSV(ratesFile);
    console.log(`  ✓ Loaded ${rates.length} rate records\n`);

    let promos: PromoRecord[] = [];
    if (config.promo) {
      if (!fs.existsSync(config.promo)) {
        throw new Error(`Promo file not found: ${config.promo}`);
      }
      console.log(`Reading promo file: ${config.promo}`);
      promos = parsePromo(config.promo);
      console.log(`  ✓ Loaded ${promos.length} promo records\n`);
    } else {
      console.log('No promo file specified, generating base rates only\n');
    }

    console.log('Generating worksheet...');
    const output = generateWorksheet(rates, promos);
    console.log(`  ✓ Created ${output.worksheetRows.length} worksheet entries\n`);

    if (output.warnings.length > 0) {
      console.log(`⚠️  Found ${output.warnings.length} warning(s):`);
      for (const warning of output.warnings) {
        console.log(`   - ${warning}`);
      }
      console.log('');
    }

    console.log(`Writing output files to: ${config.outdir}`);
    writeWorksheetFiles(output, config.outdir);
    console.log('  ✓ worksheet.csv');
    console.log('  ✓ worksheet.md');
    console.log('  ✓ APPROVAL.md');
    console.log('  ✓ manifest.json\n');

    console.log('✅ Worksheet generation complete!\n');

    if (output.hasIncompletePricing) {
      console.log('⚠️  WARNING: Incomplete pricing detected.');
      console.log('   Review APPROVAL.md before using this worksheet.\n');
    } else {
      console.log('✓ All rates and promos have complete pricing.\n');
    }

    console.log('📋 Next steps:');
    console.log(`   1. Review ${config.outdir}/worksheet.md`);
    console.log(`   2. Get approval via ${config.outdir}/APPROVAL.md`);
    console.log('   3. Enter rates in Nightsbridge\n');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
