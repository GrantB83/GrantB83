#!/usr/bin/env node

/**
 * Vault Due Digest Post Checklist CLI
 * Offline pre-action checklist for vault-due-digest-pack outputs
 */

import { parseArgs } from 'util';
import { existsSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join, basename } from 'path';
import {
  validatePackStructure,
  checkOverviewPresent,
  checkApprovalPresent,
  checkByEntityDir,
  checkNoCurrencyInProse,
  generateChecklist,
  generateIssues,
  generateApprovalCopy,
} from './checker.js';
import type { CliOptions, ChecklistManifest } from './types.js';

function showHelp(): void {
  console.log(`
vault-due-digest-post-checklist - Pre-action checklist for Vault weekday ops

USAGE:
  npm run checklist -- --pack <pack-dir> [options]

REQUIRED:
  --pack              Path to pack folder from vault-due-digest-pack

OPTIONAL:
  --as-of             Date label (YYYY-MM-DD format, optional)
  --outdir            Output directory for checklist files (default: ./out)
  --help              Show this help message

EXAMPLES:
  npm run checklist -- --pack ./digest-pack-2026-09-02
  npm run checklist -- --pack ./digest-pack-2026-09-02 --as-of 2026-09-02 --outdir reports/

PACK STRUCTURE EXPECTED:
  pack-dir/
    ├── DIGEST.md or master.md (required - overview)
    ├── APPROVAL.md (required)
    ├── by-entity/ (optional but expected)
    │   ├── gab-trust/
    │   ├── sars/
    │   └── ...
    └── missing-signals.md (optional)

OUTPUTS:
  - ACTION-CHECKLIST.md  Numbered go/no-go for Vault weekday ops
  - ISSUES.md            Failures and warnings only
  - APPROVAL.md          Vault research gates and N2 reminder
  - manifest.json        Machine-readable checklist metadata

SAFETY:
  - OFFLINE ONLY - no file body reads, no network calls
  - NEVER SUBMITS - Vault owns all CIPC/SARS/trust filings
  - NEVER INVENTS - no dates, amounts, or legal positions fabricated
  - FILENAME HEURISTICS ONLY - classification from filenames/markdown only
`);
}

function parseCliArgs(): CliOptions | null {
  try {
    const { values } = parseArgs({
      options: {
        pack: { type: 'string' },
        'as-of': { type: 'string' },
        outdir: { type: 'string' },
        help: { type: 'boolean' },
      },
      strict: true,
    });

    if (values.help) {
      showHelp();
      return null;
    }

    if (!values.pack) {
      console.error('❌ Error: --pack is required');
      showHelp();
      process.exit(1);
    }

    return {
      pack: values.pack,
      asOf: values['as-of'],
      outdir: values.outdir || './out',
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

/**
 * Extract date from pack path (e.g., digest-pack-2026-09-02, pack-2026-09-02)
 */
function extractDateFromPackPath(packPath: string): string | null {
  const name = basename(packPath);
  const match = name.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function main(): void {
  console.log('✅ Vault Due Digest Post Checklist Generator\n');

  const options = parseCliArgs();
  if (!options) {
    return;
  }

  const packPath = resolve(options.pack!);
  if (!existsSync(packPath)) {
    console.error(`❌ Error: Pack directory not found: ${packPath}`);
    process.exit(1);
  }

  const stats = statSync(packPath);
  if (!stats.isDirectory()) {
    console.error(`❌ Error: Pack path is not a directory: ${packPath}`);
    process.exit(1);
  }

  console.log(`📂 Pack directory: ${packPath}\n`);

  let files;
  try {
    files = validatePackStructure(packPath);
    console.log('✓ Pack structure validated');
  } catch (err: any) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // Extract or use provided date
  let packDate: string = options.asOf || '';
  if (!packDate) {
    const extracted = extractDateFromPackPath(packPath);
    if (extracted) {
      packDate = extracted;
      console.log(`📅 Extracted date from pack path: ${packDate}`);
    } else {
      console.warn('⚠️  No date provided or extracted, using placeholder');
      packDate = 'UNKNOWN';
    }
  }

  console.log('\n🔍 Running checks...\n');

  const checks = {
    overview: checkOverviewPresent(files),
    approval: checkApprovalPresent(files),
    byEntity: checkByEntityDir(files),
    currency: checkNoCurrencyInProse(files),
  };

  for (const [checkName, result] of Object.entries(checks)) {
    const icon = result.passed ? '✓' : '⚠️';
    console.log(`${icon} ${checkName}: ${result.message}`);
  }

  const hasFailures = 
    !checks.overview.passed || 
    !checks.approval.passed;

  if (hasFailures) {
    console.log('\n❌ Pack validation failed. Review ISSUES.md after generation.\n');
  } else {
    console.log('\n✅ All critical checks passed.\n');
  }

  const outdir = resolve(options.outdir || './out');
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  const checklist = generateChecklist(packDate, files, checks);
  const issues = generateIssues(checks);
  const approval = generateApprovalCopy(packDate);

  const manifest: ChecklistManifest = {
    date: packDate,
    generatedAt: new Date().toISOString(),
    packPath: packPath,
    outputs: [
      'ACTION-CHECKLIST.md',
      'ISSUES.md',
      'APPROVAL.md',
      'manifest.json',
    ],
    checks,
  };

  writeFileSync(join(outdir, 'ACTION-CHECKLIST.md'), checklist, 'utf-8');
  writeFileSync(join(outdir, 'ISSUES.md'), issues, 'utf-8');
  writeFileSync(join(outdir, 'APPROVAL.md'), approval, 'utf-8');
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`📝 Generated outputs in ${outdir}:`);
  console.log('   - ACTION-CHECKLIST.md');
  console.log('   - ISSUES.md');
  console.log('   - APPROVAL.md');
  console.log('   - manifest.json');

  console.log('\n⚠️  Vault / CoS: Review ACTION-CHECKLIST.md before any research or filing steps');
  console.log('⚠️  N2 gate: Human approval required before SARS/CIPC submit');
  console.log('⚠️  Never opens file bodies. Filename heuristics only. Offline only.\n');

  if (hasFailures) {
    process.exit(1);
  }
}

main();
