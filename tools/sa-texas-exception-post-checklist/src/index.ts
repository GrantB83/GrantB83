#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync, statSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import {
  validatePackStructure,
  checkRequiredFilesPresent,
  checkHospitalityExists,
  checkHeavyMetalExists,
  checkApprovalPresent,
  checkPackWarnings,
  generateChecklist,
  generateIssues,
  generateApprovalCopy,
} from './checker.js';
import type { CliOptions, ChecklistManifest } from './types.js';

function showHelp(): void {
  console.log(`
sa-texas-exception-post-checklist - Pre-WhatsApp post checklist generator

USAGE:
  npm run checklist -- --pack <pack-dir> --outdir <dir> [options]

REQUIRED:
  --pack              Path to pack folder from sa-texas-morning-exception-pack
  --outdir            Output directory for checklist files

OPTIONAL:
  --date              Date label (YYYY-MM-DD format, optional)
  --help              Show this help message

EXAMPLES:
  npm run checklist -- --pack ./pack-2026-09-02 --outdir out/
  npm run checklist -- --pack ./pack-2026-09-02 --outdir out/ --date 2026-09-02

PACK STRUCTURE EXPECTED:
  pack-dir/
    ├── PACK.md
    ├── hospitality.md
    ├── heavy-metal.md
    └── APPROVAL.md

OUTPUTS:
  - POST-CHECKLIST.md    Numbered go/no-go checklist for SA Ops / CoS
  - ISSUES.md            Failures and warnings only
  - APPROVAL.md          CoS workflow and safety gates
  - manifest.json        Machine-readable checklist metadata

SAFETY:
  - OFFLINE ONLY - no WhatsApp APIs or network calls
  - READ-ONLY - validates pack structure only
  - NEVER INVENTS - no rates, volumes, or guest facts fabricated
  - PERFECT WATER - excluded from scope
  - CoS owns WhatsApp - never auto-sends
`);
}

function parseCliArgs(): CliOptions | null {
  try {
    const { values } = parseArgs({
      options: {
        pack: { type: 'string' },
        outdir: { type: 'string' },
        date: { type: 'string' },
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

    if (!values.outdir) {
      console.error('❌ Error: --outdir is required');
      showHelp();
      process.exit(1);
    }

    return {
      pack: values.pack,
      outdir: values.outdir,
      date: values.date,
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

function main(): void {
  console.log('✅ SA Texas Exception Post Checklist Generator\n');

  const options = parseCliArgs();
  if (!options) {
    return;
  }

  const packPath = resolve(options.pack);
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

  console.log('\n🔍 Running checks...\n');

  const checks = {
    requiredFiles: checkRequiredFilesPresent(files),
    hospitality: checkHospitalityExists(files),
    heavyMetal: checkHeavyMetalExists(files),
    approval: checkApprovalPresent(files),
    packWarnings: checkPackWarnings(files),
  };

  for (const [checkName, result] of Object.entries(checks)) {
    const icon = result.passed ? '✓' : '⚠️';
    console.log(`${icon} ${checkName}: ${result.message}`);
  }

  const hasFailures = Object.values(checks).some(c => !c.passed && c !== checks.packWarnings);

  if (hasFailures) {
    console.log('\n❌ Pack validation failed. Review ISSUES.md after generation.\n');
  } else {
    console.log('\n✅ All critical checks passed.\n');
  }

  const outdir = resolve(options.outdir);
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  const checklist = generateChecklist(options.date || null, files, checks);
  const issues = generateIssues(checks);
  const approval = generateApprovalCopy(options.date || null);

  const manifest: ChecklistManifest = {
    date: options.date || null,
    generatedAt: new Date().toISOString(),
    packPath: packPath,
    outputs: [
      'POST-CHECKLIST.md',
      'ISSUES.md',
      'APPROVAL.md',
      'manifest.json',
    ],
    checks,
  };

  writeFileSync(join(outdir, 'POST-CHECKLIST.md'), checklist, 'utf-8');
  writeFileSync(join(outdir, 'ISSUES.md'), issues, 'utf-8');
  writeFileSync(join(outdir, 'APPROVAL.md'), approval, 'utf-8');
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`📝 Generated outputs in ${outdir}:`);
  console.log('   - POST-CHECKLIST.md');
  console.log('   - ISSUES.md');
  console.log('   - APPROVAL.md');
  console.log('   - manifest.json');

  console.log('\n⚠️  CoS / SA Ops: Review POST-CHECKLIST.md before any WhatsApp posting');
  console.log('⚠️  Never auto-send. CoS owns WhatsApp workflow.\n');

  if (hasFailures) {
    process.exit(1);
  }
}

main();
