#!/usr/bin/env node

/**
 * Career Application Packet Assemble - CLI Entry Point
 */

import { parseArgs } from 'node:util';
import type { CliOptions } from './types.js';
import { assemblePacket } from './assembler.js';

const HELP_TEXT = `
Career Application Packet Assemble

Usage:
  npm run assemble -- --outdir <dir> [options]

Options:
  --outdir <dir>           Output directory (required)
  --score <path>           Path to score report (from career-jd-hard-gates-score)
  --cover-lint <path>      Path to cover lint report (from career-cover-letter-facts-lint)
  --facts <path>           Path to facts.json
  --jd <path>              Path to job description text file
  --draft <path>           Path to cover letter draft
  --run-score              Run career-jd-hard-gates-score (requires --jd)
  --run-cover-lint         Run career-cover-letter-facts-lint (requires --draft and --facts)
  --help, -h               Show this help message

Examples:
  # Use prebuilt reports
  npm run assemble -- --outdir out/packet-20260902/ \\
    --score score-outdir/scorecard.md \\
    --cover-lint lint-outdir/report.md \\
    --facts facts.json

  # Run scoring tool during assembly
  npm run assemble -- --outdir out/packet-20260902/ \\
    --run-score --jd jd.txt \\
    --cover-lint lint-outdir/report.md \\
    --facts facts.json

  # Run both tools during assembly
  npm run assemble -- --outdir out/packet-20260902/ \\
    --run-score --jd jd.txt \\
    --run-cover-lint --draft cover.md --facts facts.json

Safety Notes:
  - Offline only - No LinkedIn API
  - Never invents facts or comp
  - Career bot owns apply decision
  - Score ≥8 required for apply
`;

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({
      options: {
        outdir: { type: 'string' },
        score: { type: 'string' },
        'cover-lint': { type: 'string' },
        facts: { type: 'string' },
        jd: { type: 'string' },
        draft: { type: 'string' },
        'run-score': { type: 'boolean' },
        'run-cover-lint': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: false,
      allowPositionals: false,
    });

    if (values.help) {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    const options: CliOptions = {
      outdir: values.outdir as string | undefined,
      score: values.score as string | undefined,
      coverLint: values['cover-lint'] as string | undefined,
      facts: values.facts as string | undefined,
      jd: values.jd as string | undefined,
      draft: values.draft as string | undefined,
      runScore: values['run-score'] as boolean | undefined,
      runCoverLint: values['run-cover-lint'] as boolean | undefined,
    };

    // Validate
    if (!options.outdir) {
      console.error('[ERROR] --outdir is required');
      console.error(HELP_TEXT);
      process.exit(1);
    }

    if (options.runScore && !options.jd) {
      console.error('[ERROR] --run-score requires --jd');
      process.exit(1);
    }

    if (options.runCoverLint && (!options.draft || !options.facts)) {
      console.error('[ERROR] --run-cover-lint requires --draft and --facts');
      process.exit(1);
    }

    console.error('[INFO] Assembling career application packet...');
    const result = await assemblePacket(options);

    if (result.warnings.length > 0) {
      console.error(`[WARN] ${result.warnings.length} warning(s):`);
      result.warnings.forEach((w) => console.error(`  - ${w}`));
    }

    console.error(`[SUCCESS] Packet assembled: ${result.outdir}`);
    console.error(`[INFO] ${result.manifest.outputs.length} files generated`);
    console.error('[INFO] Review APPROVAL.md before applying');

    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Failed to assemble packet:', error);
    process.exit(1);
  }
}

main();
