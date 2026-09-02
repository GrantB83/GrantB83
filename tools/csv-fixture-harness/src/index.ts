#!/usr/bin/env node

import { parseArgs } from 'util';
import { validateCSV } from './validator.js';
import { generateReports } from './report-generator.js';
import type { ValidationOptions } from './types.js';

const usage = `
CSV Fixture Harness - Validate CSV fixtures for data quality

USAGE:
  npm run check -- --csv <path> [options]

OPTIONS:
  --csv <path>                    Path to CSV file (required)
  --require-headers <list>        Comma-separated list of required headers (optional)
  --forbid-currency-in <list>     Comma-separated list of columns that should not contain currency values (optional)
  --min-rows <number>             Minimum number of rows required (optional)
  --outdir <path>                 Output directory for reports (default: ./out)
  --help                          Show this help message

EXAMPLES:
  npm run check -- --csv fixtures/good.csv --require-headers Date,Amount
  npm run check -- --csv data.csv --forbid-currency-in Notes,Description --min-rows 10
  npm run check -- --csv export.csv --require-headers Date,Merchant,Amount --outdir reports/

EXIT CODES:
  0  All validation checks passed
  1  One or more validation checks failed
`;

function main() {
  let args;

  try {
    args = parseArgs({
      options: {
        csv: { type: 'string' },
        'require-headers': { type: 'string' },
        'forbid-currency-in': { type: 'string' },
        'min-rows': { type: 'string' },
        outdir: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: false,
    });
  } catch (error) {
    console.error(`Error parsing arguments: ${error instanceof Error ? error.message : String(error)}`);
    console.log(usage);
    process.exit(1);
  }

  if (args.values.help) {
    console.log(usage);
    process.exit(0);
  }

  if (!args.values.csv) {
    console.error('Error: --csv argument is required\n');
    console.log(usage);
    process.exit(1);
  }

  const minRowsValue = args.values['min-rows'];
  
  const options: ValidationOptions = {
    csvPath: args.values.csv,
    requireHeaders: args.values['require-headers']
      ? args.values['require-headers'].split(',').map(h => h.trim())
      : undefined,
    forbidCurrencyIn: args.values['forbid-currency-in']
      ? args.values['forbid-currency-in'].split(',').map(c => c.trim())
      : undefined,
    minRows: minRowsValue && minRowsValue.trim() !== '' 
      ? parseInt(minRowsValue, 10) 
      : undefined,
    outdir: args.values.outdir || './out',
  };

  console.log('🔍 Validating CSV fixture...\n');
  console.log(`CSV: ${options.csvPath}`);
  if (options.requireHeaders) {
    console.log(`Required headers: ${options.requireHeaders.join(', ')}`);
  }
  if (options.forbidCurrencyIn) {
    console.log(`Currency-forbidden columns: ${options.forbidCurrencyIn.join(', ')}`);
  }
  if (options.minRows) {
    console.log(`Minimum rows: ${options.minRows}`);
  }
  console.log('');

  const result = validateCSV(options);

  console.log('📊 Validation Results:\n');
  console.log(`Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Total rows: ${result.totalRows}`);
  console.log(`Headers found: ${result.headers.length}`);
  console.log('');

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
    console.log('');
  }

  const files = generateReports(result, options.outdir);
  console.log('📝 Reports generated:');
  console.log(`  - ${files.markdown}`);
  console.log(`  - ${files.json}`);
  console.log('');

  if (result.passed) {
    console.log('✅ All validation checks passed!');
    process.exit(0);
  } else {
    console.log('❌ Validation failed. See report for details.');
    process.exit(1);
  }
}

main();
