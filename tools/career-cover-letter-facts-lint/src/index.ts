#!/usr/bin/env node
/**
 * Career Cover Letter Facts Lint CLI
 * Offline tool to lint cover letter drafts against allowed facts
 */

import * as fs from 'fs';
import { CliOptions, AllowedFacts } from './types.js';
import { extractClaims } from './extractor.js';
import { matchAllClaims } from './matcher.js';
import { buildLintReport, generateOutputs } from './generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Career Cover Letter Facts Lint CLI - Lint cover letters against allowed facts

USAGE:
  npm run lint -- --draft <path> --facts <path> [options]

OPTIONS:
  --draft           Path to cover letter draft (markdown/plain text) [REQUIRED]
  --facts           Path to allowed facts JSON file [REQUIRED]
  --outdir          Output directory [default: ./out]
  --strict          Exit 1 if any unmatched claims found
  --help, -h        Show this help message

EXAMPLES:
  # Basic linting
  npm run lint -- --draft cover.md --facts facts.json

  # Custom output directory
  npm run lint -- --draft cover.md --facts facts.json --outdir reports/

  # Strict mode (exit 1 on unmatched)
  npm run lint -- --draft cover.md --facts facts.json --strict

  # Test with fixtures
  npm run test:fixtures

OUTPUT FILES:
  - report.json      (matched/unmatched/suspicious phrases)
  - report.md        (numbered findings, NO invented rewrites)
  - APPROVAL.md      (Career owns apply; never invents claims)
  - manifest.json    (run metadata)

HEURISTICS:
  - Extract sentence-level claims from draft
  - Fuzzy/token overlap matching against facts
  - Flag numbers/$ amounts in draft not present in facts
  - Flag employer/title tokens not in facts
  - Fail closed on unknowns

FACTS FILE FORMAT (flexible):
  { "claims": ["fact 1", "fact 2", ...] }
  { "bullets": ["point 1", "point 2", ...] }
  ["fact 1", "fact 2", ...]  (flat array)

EXIT CODES:
  0  Ran successfully (even if unmatched found)
  1  Bad input or strict mode violations

SAFETY:
  - Offline only - no LLM, no network
  - Never invents compensation, titles, or employers
  - Career owns apply - this is a facts-check aid only

  `);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--draft') {
      options.draft = args[++i];
    } else if (arg === '--facts') {
      options.facts = args[++i];
    } else if (arg === '--outdir') {
      options.outdir = args[++i];
    } else if (arg === '--strict') {
      options.strict = true;
    }
  }
  
  return options;
}

/**
 * Load and parse facts file (flexible JSON structure)
 */
function loadFacts(factsPath: string): AllowedFacts {
  if (!fs.existsSync(factsPath)) {
    throw new Error(`Facts file not found: ${factsPath}`);
  }
  
  const factsText = fs.readFileSync(factsPath, 'utf-8');
  const factsJson = JSON.parse(factsText);
  
  return factsJson;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate required arguments
  if (!options.draft) {
    console.error('❌ Error: --draft is required\n');
    printHelp();
    process.exit(1);
  }
  
  if (!options.facts) {
    console.error('❌ Error: --facts is required\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Career Cover Letter Facts Lint CLI\n');
    console.log('⚠️  Offline linting only - fuzzy/token matching heuristics');
    console.log('⚠️  Never invents compensation, titles, or employers');
    console.log('⚠️  Career owns apply - this is a facts-check aid\n');
    
    // Load draft
    console.log(`Reading draft: ${options.draft}`);
    
    if (!fs.existsSync(options.draft)) {
      throw new Error(`Draft file not found: ${options.draft}`);
    }
    
    const draftText = fs.readFileSync(options.draft, 'utf-8');
    console.log(`  ✓ Loaded ${draftText.length} characters\n`);
    
    // Load facts
    console.log(`Reading facts: ${options.facts}`);
    const facts = loadFacts(options.facts);
    console.log('  ✓ Facts loaded\n');
    
    // Extract claims
    console.log('Extracting claims from draft...');
    const claims = extractClaims(draftText);
    console.log(`  ✓ Extracted ${claims.length} claims\n`);
    
    // Match claims against facts
    console.log('Matching claims against facts...');
    const matchResults = matchAllClaims(claims, facts);
    console.log('  ✓ Matching complete\n');
    
    // Build report
    console.log('Building lint report...');
    const report = buildLintReport(draftText, matchResults);
    
    console.log(`  ✅ Matched: ${report.summary.matchedCount}`);
    console.log(`  ⚠️  Suspicious: ${report.summary.suspiciousCount}`);
    console.log(`  🚨 Unmatched: ${report.summary.unmatchedCount}\n`);
    
    // Generate outputs
    console.log('Generating output files...');
    const outputDir = await generateOutputs(report, {
      draftPath: options.draft,
      factsPath: options.facts,
      strictMode: options.strict || false,
      outdir: options.outdir || './out',
    });
    
    console.log(`  ✓ Output directory: ${outputDir}\n`);
    
    // Print summary
    console.log('✅ Linting complete!\n');
    console.log('Generated files:');
    console.log('  - report.json');
    console.log('  - report.md');
    console.log('  - APPROVAL.md');
    console.log('  - manifest.json\n');
    
    if (report.summary.safeToApply) {
      console.log('✅ Status: All claims matched - safe to proceed\n');
    } else {
      console.log('⚠️  Status: Unmatched or suspicious claims found\n');
    }
    
    console.log('⚠️  IMPORTANT: Review APPROVAL.md before proceeding!\n');
    console.log('Next steps:');
    console.log(`  1. cd ${outputDir}`);
    console.log('  2. cat APPROVAL.md');
    console.log('  3. Review report.md for detailed findings');
    console.log('  4. Verify flagged items against career-os');
    
    if (!report.summary.safeToApply) {
      console.log('  5. Rewrite or remove unmatched claims');
      console.log('  6. Re-run lint on updated draft\n');
    } else {
      console.log('  5. Proceed with Career bot apply workflow\n');
    }
    
    // Exit with appropriate code
    if (options.strict && !report.summary.safeToApply) {
      console.log('❌ Strict mode: Exiting with code 1 due to unmatched claims\n');
      process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
