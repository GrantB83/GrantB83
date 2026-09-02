#!/usr/bin/env node

import * as fs from 'fs';
import { parseTransactions, parseRules } from './csv-parser.js';
import { matchTransactions } from './matcher.js';
import { generateReports } from './report-generator.js';

function printUsage(): void {
  console.log(`
Budget Merchant Matcher CLI

Usage:
  npm run match -- --transactions <file> --rules <file> [--output <dir>]

Options:
  --transactions, -t    Path to transactions CSV file (required)
  --rules, -r          Path to rules CSV or JSON file (required)
  --output, -o         Output directory for reports (default: ./out)
  --help, -h           Show this help message

Example:
  npm run match -- --transactions txns.csv --rules rules.csv --output reports/
`);
}

function parseArgs(): { transactions?: string; rules?: string; output: string } | null {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return null;
  }

  let transactions: string | undefined;
  let rules: string | undefined;
  let output = './out';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if ((arg === '--transactions' || arg === '-t') && i + 1 < args.length) {
      transactions = args[++i];
    } else if ((arg === '--rules' || arg === '-r') && i + 1 < args.length) {
      rules = args[++i];
    } else if ((arg === '--output' || arg === '-o') && i + 1 < args.length) {
      output = args[++i];
    }
  }

  if (!transactions || !rules) {
    console.error('Error: --transactions and --rules are required\n');
    printUsage();
    process.exit(1);
  }

  return { transactions, rules, output };
}

async function main(): Promise<void> {
  console.log('Budget Merchant Matcher CLI\n');

  const config = parseArgs();
  if (!config) {
    process.exit(0);
  }

  try {
    const transactionsFile = config.transactions;
    const rulesFile = config.rules;

    if (!transactionsFile || !rulesFile) {
      throw new Error('Missing required arguments');
    }

    if (!fs.existsSync(transactionsFile)) {
      throw new Error(`Transactions file not found: ${transactionsFile}`);
    }
    if (!fs.existsSync(rulesFile)) {
      throw new Error(`Rules file not found: ${rulesFile}`);
    }

    console.log(`Reading transactions file: ${transactionsFile}`);
    const transactions = parseTransactions(transactionsFile);
    console.log(`  ✓ Loaded ${transactions.length} transactions\n`);

    console.log(`Reading rules file: ${rulesFile}`);
    const rules = parseRules(rulesFile);
    console.log(`  ✓ Loaded ${rules.length} rules\n`);

    console.log('Matching transactions...');
    const summary = matchTransactions(transactions, rules);
    console.log(`  ✓ Matched: ${summary.matchedTransactions} transactions`);
    console.log(`  ✓ Unmatched: ${summary.unmatchedTransactions} transactions\n`);

    console.log(`Generating reports in: ${config.output}`);
    generateReports(summary, config.output);
    console.log('  ✓ matched.csv');
    console.log('  ✓ matched.md');
    console.log('  ✓ unmatched.csv');
    console.log('  ✓ unmatched.md');
    console.log('  ✓ summary.md\n');

    console.log('✅ Matching complete!\n');

    if (summary.unmatchedTransactions > 0) {
      console.log(`⚠️  Found ${summary.uniqueUnmatchedMerchants} unmatched merchant(s) needing classification.`);
      console.log(`   Review unmatched.md for the action list.\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
