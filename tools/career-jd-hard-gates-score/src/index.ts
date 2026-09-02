#!/usr/bin/env node
/**
 * Career JD Hard Gates Score CLI
 * Offline tool to score job descriptions against career hard gates
 */

import * as fs from 'fs';
import { CliOptions, HardGates, DEFAULT_HARD_GATES } from './types.js';
import { parseJD } from './parser.js';
import { evaluateGates } from './gates.js';
import { scoreJD, determineVerdict, buildScorecard } from './scorer.js';
import { generateOutputs } from './generator.js';

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Career JD Hard Gates Score CLI - Score job descriptions against career hard gates

USAGE:
  npm run score -- --jd <path> [options]

OPTIONS:
  --jd              Path to job description text file [REQUIRED]
  --gates           Path to gates JSON file (overrides defaults)
  --company         Override company name
  --title           Override job title
  --outdir, -o      Output directory [default: ./out]
  --help, -h        Show this help message

EXAMPLES:
  # Basic scoring
  npm run score -- --jd path/to/jd.txt

  # With custom gates
  npm run score -- --jd jd.txt --gates gates.json

  # With overrides
  npm run score -- --jd jd.txt --company "Tesla" --title "Operations Manager"

  # Custom output directory
  npm run score -- --jd jd.txt --outdir reports/

  # Test with fixtures
  npm run test:fixtures

OUTPUT FILES:
  - scorecard.json       (structured scorecard with gates/scores/verdict)
  - scorecard.md         (Grant-facing full sentences, no dollar amounts)
  - APPROVAL.md          (offline draft aid for Career bot)
  - manifest.json        (metadata)

HARD GATES (any fail = skip):
  1. DNC: Company not on do-not-contact list
  2. Comp: Meets floor OR unlisted but likely meets it
  3. Location: Tesla/remote/WFH OR ≤30min from Circle C Austin
  4. Function: Ops/Product/Strategy/Finance or Tesla production
  5. Seniority: Manager and above (not junior IC)

SCORES (0-2 each, total /10):
  - titleMatch: How well title matches target functions/levels
  - proofPointMatch: How well requirements match resume proof points
  - seniority: How senior is the role
  - payConfidence: How confident about compensation
  - commuteOrWfhFit: How good is location fit

VERDICT:
  - apply: ≥8 total, all gates pass
  - watch: 6-7 total, all gates pass
  - discard: ≤5 total, all gates pass
  - skip: One or more gates failed

SAFETY:
  - Offline only - keyword/regex heuristics, no LLM, no network
  - Never invents compensation numbers
  - Facts-only reminder in all outputs
  - If parsing unsure, marks unknown and fails-closed on hard gates

DEFAULT GATES:
  - DNC list: J.D. Abrams, Zachry, Capitol Aggregates
  - Comp floor: null (unlisted OK if level suggests meets it)
  - Unknown handling: watch (not skip)

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
    } else if (arg === '--jd') {
      options.jd = args[++i];
    } else if (arg === '--gates') {
      options.gates = args[++i];
    } else if (arg === '--company') {
      options.company = args[++i];
    } else if (arg === '--title') {
      options.title = args[++i];
    } else if (arg === '--outdir' || arg === '-o') {
      options.outdir = args[++i];
    }
  }
  
  return options;
}

/**
 * Load gates from file or use defaults
 */
function loadGates(gatesPath?: string): HardGates {
  if (!gatesPath) {
    return DEFAULT_HARD_GATES;
  }
  
  if (!fs.existsSync(gatesPath)) {
    throw new Error(`Gates file not found: ${gatesPath}`);
  }
  
  const gatesText = fs.readFileSync(gatesPath, 'utf-8');
  const gatesJson = JSON.parse(gatesText);
  
  // Merge with defaults
  return {
    ...DEFAULT_HARD_GATES,
    ...gatesJson,
  };
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
  if (!options.jd) {
    console.error('❌ Error: --jd is required\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    console.log('Career JD Hard Gates Score CLI\n');
    console.log('⚠️  Offline scoring only - keyword/regex heuristics');
    console.log('⚠️  Never invents compensation numbers');
    console.log('⚠️  Facts-only reminder in all outputs\n');
    
    // Load JD
    console.log(`Reading JD: ${options.jd}`);
    
    if (!fs.existsSync(options.jd)) {
      throw new Error(`JD file not found: ${options.jd}`);
    }
    
    const jdText = fs.readFileSync(options.jd, 'utf-8');
    console.log(`  ✓ Loaded ${jdText.length} characters\n`);
    
    // Load gates
    console.log('Loading gates...');
    const gates = loadGates(options.gates);
    
    if (options.gates) {
      console.log(`  ✓ Loaded custom gates from ${options.gates}`);
    } else {
      console.log('  ✓ Using default gates');
    }
    
    console.log(`    - DNC list: ${gates.dncList.length} companies`);
    console.log(`    - Comp floor: ${gates.annualUSDFloor === null ? 'null (unlisted OK)' : '$' + gates.annualUSDFloor.toLocaleString()}`);
    console.log(`    - Unknown handling: ${gates.unknownHandling}\n`);
    
    // Parse JD
    console.log('Parsing JD...');
    const parsed = parseJD(jdText, options.company, options.title);
    
    console.log(`  ✓ Company: ${parsed.company || 'unknown'}`);
    console.log(`  ✓ Title: ${parsed.title || 'unknown'}`);
    console.log(`  ✓ Location: ${parsed.location || 'unknown'}`);
    console.log(`  ✓ Compensation: ${parsed.compensation || 'unlisted'}`);
    console.log(`  ✓ Tesla: ${parsed.isTesla ? 'yes' : 'no'}`);
    console.log(`  ✓ Remote/WFH: ${parsed.isRemote ? 'yes' : 'no'}\n`);
    
    // Evaluate gates
    console.log('Evaluating hard gates...');
    const gatesEval = evaluateGates(parsed, gates);
    
    const gatesList = [
      gatesEval.dnc,
      gatesEval.comp,
      gatesEval.location,
      gatesEval.function,
      gatesEval.seniority,
    ];
    
    for (const gate of gatesList) {
      const icon = gate.status === 'pass' ? '✅' : gate.status === 'fail' ? '❌' : '⚠️';
      console.log(`  ${icon} ${gate.gate}: ${gate.status} (${gate.confidence} confidence)`);
    }
    
    console.log(`  Overall: ${gatesEval.overallPass ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Score
    console.log('Scoring...');
    const scores = scoreJD(parsed, gatesEval);
    
    console.log(`  ✓ Title Match: ${scores.titleMatch}/2`);
    console.log(`  ✓ Proof Point Match: ${scores.proofPointMatch}/2`);
    console.log(`  ✓ Seniority: ${scores.seniority}/2`);
    console.log(`  ✓ Pay Confidence: ${scores.payConfidence}/2`);
    console.log(`  ✓ Commute/WFH Fit: ${scores.commuteOrWfhFit}/2`);
    console.log(`  TOTAL: ${scores.total}/10\n`);
    
    // Verdict
    const verdict = determineVerdict(gatesEval, scores);
    console.log(`Verdict: ${verdict.toUpperCase()}\n`);
    
    // Build scorecard
    const scorecard = buildScorecard(parsed, gatesEval, scores, verdict);
    
    // Generate outputs
    console.log('Generating output files...');
    const outputDir = await generateOutputs(scorecard, {
      jdPath: options.jd,
      gatesPath: options.gates || null,
      companyOverride: options.company || null,
      titleOverride: options.title || null,
      outdir: options.outdir || './out',
    });
    
    console.log(`  ✓ Output directory: ${outputDir}\n`);
    
    // Print summary
    console.log('✅ Scoring complete!\n');
    console.log('Generated files:');
    console.log('  - scorecard.json');
    console.log('  - scorecard.md');
    console.log('  - APPROVAL.md');
    console.log('  - manifest.json\n');
    
    console.log('⚠️  IMPORTANT: Review APPROVAL.md before proceeding!\n');
    console.log('Next steps:');
    console.log(`  1. cd ${outputDir}`);
    console.log('  2. cat APPROVAL.md');
    console.log('  3. Review scorecard.md for details');
    
    if (verdict === 'apply') {
      console.log('  4. Proceed with Career bot application workflow\n');
    } else if (verdict === 'watch') {
      console.log('  4. Consider mitigating factors before applying\n');
    } else if (verdict === 'discard') {
      console.log('  4. Consider focusing on higher-scoring roles\n');
    } else {
      console.log('  4. DO NOT APPLY - hard gate failure\n');
    }
    
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
