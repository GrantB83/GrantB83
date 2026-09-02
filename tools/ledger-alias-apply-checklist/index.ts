#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions, MerchantSuggestion } from './src/types.js';
import {
  parseSuggestionsJson,
  parseSuggestionsMd,
  parseNoMatchMd,
  groupByConfidence
} from './src/parser.js';
import {
  writeApplyChecklist,
  writeSkipped,
  writeApproval,
  writeManifest
} from './src/output-writer.js';

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--suggestions' && i + 1 < args.length) {
      options.suggestions = args[++i];
    } else if (arg === '--suggestions-md' && i + 1 < args.length) {
      options.suggestionsMd = args[++i];
    } else if (arg === '--no-match' && i + 1 < args.length) {
      options.noMatch = args[++i];
    } else if (arg === '--month' && i + 1 < args.length) {
      options.month = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.suggestions && !options.suggestionsMd) {
    console.error('Error: Either --suggestions or --suggestions-md is required');
    printHelp();
    process.exit(1);
  }

  if (!options.outdir) {
    console.error('Error: --outdir is required');
    printHelp();
    process.exit(1);
  }

  if (options.month && !options.month.match(/^\d{4}-\d{2}$/)) {
    console.error('Error: --month must be in YYYY-MM format');
    process.exit(1);
  }

  return options as CliOptions;
}

function printHelp(): void {
  console.log(`
ledger-alias-apply-checklist

Generate H2-ready apply checklist from ledger-merchant-alias-suggest output.

USAGE:
  npm run apply -- --suggestions suggestions.json --outdir out/
  npm run apply -- --suggestions-md suggestions.md --no-match no-match.md --outdir out/
  npm run apply -- --suggestions suggestions.json --month 2026-09 --outdir out/

OPTIONS:
  --suggestions <file>       Suggestions JSON from ledger-merchant-alias-suggest
  --suggestions-md <file>    Suggestions markdown from ledger-merchant-alias-suggest
  --no-match <file>          Optional no-match markdown file
  --month <YYYY-MM>          Optional month label for the checklist
  --outdir <dir>             Output directory (required)
  --help, -h                 Show this help

EXAMPLES:
  # From JSON output only
  npm run apply -- \\
    --suggestions path/to/suggestions.json \\
    --outdir out/

  # From markdown outputs
  npm run apply -- \\
    --suggestions-md path/to/suggestions.md \\
    --no-match path/to/no-match.md \\
    --outdir out/

  # With month label
  npm run apply -- \\
    --suggestions suggestions.json \\
    --month 2026-09 \\
    --outdir out/

OUTPUT FILES:
  APPLY-CHECKLIST.md  - Numbered proposed mappings for human tick-off
  SKIPPED.md          - Low-confidence / no-match items
  APPROVAL.md         - H2 gate workflow guidance
  manifest.json       - Run metadata

SAFETY:
  - Offline only (no Google Sheets API)
  - Read-only (no file modifications)
  - Never invents amounts or aliases
  - Never writes to Budget sheet
  - H2 approval required before any sheet writes

WORKFLOW INTEGRATION:
  ledger-merchant-alias-suggest → ledger-alias-apply-checklist → H2 approval → Manual sheet update
`);
}

function main(): void {
  const options = parseArgs();

  console.log('🔍 Loading suggestions...');
  let suggestions: MerchantSuggestion[] = [];

  if (options.suggestions) {
    try {
      suggestions = parseSuggestionsJson(options.suggestions);
      console.log(`   Loaded ${suggestions.length} suggestions from JSON`);
    } catch (err) {
      console.error(`Error: ${err}`);
      process.exit(1);
    }
  } else if (options.suggestionsMd) {
    try {
      suggestions = parseSuggestionsMd(options.suggestionsMd);
      console.log(`   Loaded ${suggestions.length} suggestions from markdown`);
    } catch (err) {
      console.error(`Error: ${err}`);
      process.exit(1);
    }
  }

  if (suggestions.length === 0) {
    console.error('Error: No suggestions found in input file');
    process.exit(1);
  }

  console.log('📊 Loading no-match items...');
  let noMatches: string[] = [];
  if (options.noMatch) {
    try {
      noMatches = parseNoMatchMd(options.noMatch);
      console.log(`   Loaded ${noMatches.length} no-match items`);
    } catch (err) {
      console.log(`   Warning: Could not load no-match file: ${err}`);
    }
  }

  console.log('📋 Grouping by confidence...');
  const grouped = groupByConfidence(suggestions);
  console.log(`   High: ${grouped.high.length}`);
  console.log(`   Medium: ${grouped.medium.length}`);
  console.log(`   Low: ${grouped.low.length}`);

  console.log('📝 Writing output files...');
  if (!fs.existsSync(options.outdir)) {
    fs.mkdirSync(options.outdir, { recursive: true });
  }

  const outputFiles: string[] = [];

  outputFiles.push(writeApplyChecklist(options.outdir, grouped, options.month));
  outputFiles.push(writeSkipped(options.outdir, grouped, noMatches));
  outputFiles.push(writeApproval(options.outdir));
  outputFiles.push(
    writeManifest(
      options.outdir,
      {
        suggestions: options.suggestions,
        suggestionsMd: options.suggestionsMd,
        noMatch: options.noMatch
      },
      outputFiles,
      {
        highConfidence: grouped.high.length,
        mediumConfidence: grouped.medium.length,
        lowConfidence: grouped.low.length,
        skipped: grouped.low.length + noMatches.length,
        totalMappings: grouped.high.length + grouped.medium.length
      },
      options.month
    )
  );

  console.log('\n✅ Done!');
  console.log(`   Output written to: ${options.outdir}`);
  console.log(`   Files: ${outputFiles.map(f => path.basename(f)).join(', ')}`);
  console.log('\n⚠️  Next: Review APPLY-CHECKLIST.md and get H2 approval before applying to Budget sheet.');
}

main();
