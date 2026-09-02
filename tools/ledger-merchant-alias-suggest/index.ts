#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { CliOptions, UnmatchedQueue, AliasesFile, AliasPattern, MerchantSuggestion } from './src/types.js';
import { suggestAliases } from './src/scorer.js';
import {
  writeSuggestionsJson,
  writeSuggestionsMd,
  writeNoMatchMd,
  writeApproval,
  writeManifest
} from './src/output-writer.js';

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {
    minScore: 0.4
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--unmatched' && i + 1 < args.length) {
      options.unmatched = args[++i];
    } else if (arg === '--merchants' && i + 1 < args.length) {
      options.merchants = args[++i];
    } else if (arg === '--aliases' && i + 1 < args.length) {
      options.aliases = args[++i];
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[++i];
    } else if (arg === '--min-score' && i + 1 < args.length) {
      options.minScore = parseFloat(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.unmatched && !options.merchants) {
    console.error('Error: Either --unmatched or --merchants is required');
    printHelp();
    process.exit(1);
  }

  if (options.unmatched && options.merchants) {
    console.error('Error: Cannot specify both --unmatched and --merchants');
    printHelp();
    process.exit(1);
  }

  if (!options.aliases) {
    console.error('Error: --aliases is required');
    printHelp();
    process.exit(1);
  }

  if (!options.outdir) {
    console.error('Error: --outdir is required');
    printHelp();
    process.exit(1);
  }

  if (options.minScore !== undefined && (options.minScore < 0 || options.minScore > 1)) {
    console.error('Error: --min-score must be between 0.0 and 1.0');
    process.exit(1);
  }

  return options as CliOptions;
}

function printHelp(): void {
  console.log(`
ledger-merchant-alias-suggest

Suggest merchant→alias mappings using heuristic token overlap.

USAGE:
  npm run suggest -- --unmatched queue.json --aliases aliases.json --outdir out/
  npm run suggest -- --merchants list.txt --aliases aliases.json --outdir out/

OPTIONS:
  --unmatched <file>      Unmatched queue JSON from ledger-unmatched-merchant-queue
  --merchants <file>      Plain text file with one merchant per line
  --aliases <file>        Aliases JSON file (required)
  --outdir <dir>          Output directory (required)
  --min-score <0.0-1.0>   Minimum similarity score (default: 0.4)
  --help, -h              Show this help

EXAMPLES:
  # From unmatched queue JSON
  npm run suggest -- \\
    --unmatched path/to/queue.json \\
    --aliases known-aliases.json \\
    --outdir out/

  # From plain text list
  npm run suggest -- \\
    --merchants merchants.txt \\
    --aliases known-aliases.json \\
    --outdir out/

  # Custom minimum score
  npm run suggest -- \\
    --merchants merchants.txt \\
    --aliases aliases.json \\
    --min-score 0.5 \\
    --outdir out/

ALIASES FILE FORMAT:
  {
    "aliases": [
      {
        "alias": "Amazon",
        "patterns": ["Amazon.com", "Amazon Prime", "AMZN"]
      },
      {
        "alias": "Walmart",
        "patterns": ["Walmart", "Walmart.com", "Walmart Store"]
      }
    ]
  }

OUTPUT FILES:
  suggestions.json    - Structured suggestion data
  suggestions.md      - Human-readable ranked suggestions
  no-match.md         - Merchants with no matches
  APPROVAL.md         - Safety gates and next steps
  manifest.json       - Run metadata

SAFETY:
  - Offline only (no API calls)
  - Read-only (no file modifications)
  - Never invents amounts
  - Never writes to live Budget sheet
`);
}

function loadMerchants(options: CliOptions): string[] {
  if (options.unmatched) {
    if (!fs.existsSync(options.unmatched)) {
      console.error(`Error: Unmatched queue file not found: ${options.unmatched}`);
      process.exit(1);
    }

    const content = fs.readFileSync(options.unmatched, 'utf-8');
    let data: UnmatchedQueue;
    
    try {
      data = JSON.parse(content);
    } catch (err) {
      console.error(`Error: Failed to parse unmatched queue JSON: ${err}`);
      process.exit(1);
    }

    if (!data.merchants || !Array.isArray(data.merchants)) {
      console.error('Error: Unmatched queue JSON must have a "merchants" array');
      process.exit(1);
    }

    return data.merchants.map(m => m.displayName).filter(name => name && name.trim().length > 0);
  }

  if (options.merchants) {
    if (!fs.existsSync(options.merchants)) {
      console.error(`Error: Merchants file not found: ${options.merchants}`);
      process.exit(1);
    }

    const content = fs.readFileSync(options.merchants, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  return [];
}

function loadAliases(aliasesPath: string): AliasPattern[] {
  if (!fs.existsSync(aliasesPath)) {
    console.error(`Error: Aliases file not found: ${aliasesPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(aliasesPath, 'utf-8');
  let data: AliasesFile;
  
  try {
    data = JSON.parse(content);
  } catch (err) {
    console.error(`Error: Failed to parse aliases JSON: ${err}`);
    process.exit(1);
  }

  if (!data.aliases || !Array.isArray(data.aliases)) {
    console.error('Error: Aliases JSON must have an "aliases" array');
    process.exit(1);
  }

  for (const alias of data.aliases) {
    if (!alias.alias || typeof alias.alias !== 'string') {
      console.error('Error: Each alias must have an "alias" string field');
      process.exit(1);
    }
    if (!alias.patterns || !Array.isArray(alias.patterns) || alias.patterns.length === 0) {
      console.error(`Error: Alias "${alias.alias}" must have a non-empty "patterns" array`);
      process.exit(1);
    }
  }

  return data.aliases;
}

function main(): void {
  const options = parseArgs();
  const minScore = options.minScore || 0.4;

  console.log('🔍 Loading merchants...');
  const merchants = loadMerchants(options);
  console.log(`   Found ${merchants.length} merchants`);

  if (merchants.length === 0) {
    console.error('Error: No merchants found in input file');
    process.exit(1);
  }

  console.log('📋 Loading aliases...');
  const aliases = loadAliases(options.aliases);
  console.log(`   Found ${aliases.length} alias patterns`);

  console.log(`🎯 Scoring merchants (min score: ${minScore})...`);
  const suggestions: MerchantSuggestion[] = [];
  const noMatches: string[] = [];

  for (const merchant of merchants) {
    const suggestion = suggestAliases(merchant, aliases, minScore);
    if (suggestion) {
      suggestions.push(suggestion);
    } else {
      noMatches.push(merchant);
    }
  }

  const highConf = suggestions.filter(s => s.confidence === 'high').length;
  const medConf = suggestions.filter(s => s.confidence === 'medium').length;
  const lowConf = suggestions.filter(s => s.confidence === 'low').length;

  console.log(`   Suggestions: ${suggestions.length}`);
  console.log(`     - High confidence: ${highConf}`);
  console.log(`     - Medium confidence: ${medConf}`);
  console.log(`     - Low confidence: ${lowConf}`);
  console.log(`   No matches: ${noMatches.length}`);

  console.log('📝 Writing output files...');
  if (!fs.existsSync(options.outdir)) {
    fs.mkdirSync(options.outdir, { recursive: true });
  }

  const outputFiles: string[] = [];

  outputFiles.push(writeSuggestionsJson(options.outdir, suggestions, noMatches, minScore));
  outputFiles.push(writeSuggestionsMd(options.outdir, suggestions));
  outputFiles.push(writeNoMatchMd(options.outdir, noMatches));
  outputFiles.push(writeApproval(options.outdir));
  outputFiles.push(
    writeManifest(
      options.outdir,
      {
        merchants: options.merchants,
        unmatched: options.unmatched,
        aliases: options.aliases
      },
      outputFiles,
      {
        totalMerchants: merchants.length,
        withSuggestions: suggestions.length,
        noMatch: noMatches.length,
        highConfidence: highConf,
        mediumConfidence: medConf,
        lowConfidence: lowConf
      },
      minScore
    )
  );

  console.log('\n✅ Done!');
  console.log(`   Output written to: ${options.outdir}`);
  console.log(`   Files: ${outputFiles.map(f => path.basename(f)).join(', ')}`);
}

main();
