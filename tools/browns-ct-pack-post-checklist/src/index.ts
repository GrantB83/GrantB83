#!/usr/bin/env node

import { parseArgs } from 'util';
import { existsSync, statSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import {
  validatePackStructure,
  checkRequiredFilesPresent,
  checkPackTimelineReferences,
  checkSlotExpectations,
  checkChangesFilePresence,
  generateChecklist,
  generateIssues,
  generateApprovalCopy,
} from './checker.js';
import type { CliOptions, ChecklistManifest } from './types.js';

function showHelp(): void {
  console.log(`
browns-ct-pack-post-checklist - Pre-WhatsApp post checklist generator

USAGE:
  npm run checklist -- --pack <pack-dir> --outdir <dir> [options]

REQUIRED:
  --pack              Path to pack folder from browns-ct-pack-assemble
  --outdir            Output directory for checklist files

OPTIONAL:
  --slot              Tailor checklist emphasis to specific slot: 20:00 | 09:00 | 21:00 | all
  --help              Show this help message

EXAMPLES:
  npm run checklist -- --pack ./ct-2026-09-20 --outdir out/
  npm run checklist -- --pack ./ct-2026-09-20 --outdir out/ --slot 20:00
  npm run checklist -- --pack ./ct-2026-09-20 --outdir out/ --slot all

PACK STRUCTURE EXPECTED:
  pack-dir/
    ├── PACK.md (required)
    ├── APPROVAL.md (required)
    ├── daily-ops.md (optional)
    ├── changes.md (optional)
    ├── queue.md (optional)
    ├── unknown-time.md (optional)
    ├── guest-*.md (optional)
    └── welcome-*.md (optional)

OUTPUTS:
  - POST-CHECKLIST.md    Numbered go/no-go checklist for CoS WhatsApp Admin
  - ISSUES.md            Failures and warnings only
  - APPROVAL.md          CoS owns WhatsApp; Grant approval; never auto-send
  - manifest.json        Machine-readable checklist metadata

SAFETY:
  - OFFLINE ONLY - no WhatsApp APIs or network calls
  - READ-ONLY - validates pack structure only
  - NEVER INVENTS - no guest phones/rates/ETAs fabricated
  - DULLSTROOM / THE BROWNS ONLY - scope boundary
  - CoS owns WhatsApp - never auto-sends
`);
}

function parseCliArgs(): CliOptions | null {
  try {
    const { values } = parseArgs({
      options: {
        pack: { type: 'string' },
        outdir: { type: 'string' },
        slot: { type: 'string' },
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

    let slot: '20:00' | '09:00' | '21:00' | 'all' | undefined;
    if (values.slot) {
      if (!['20:00', '09:00', '21:00', 'all'].includes(values.slot)) {
        console.error('❌ Error: --slot must be one of: 20:00, 09:00, 21:00, all');
        process.exit(1);
      }
      slot = values.slot as '20:00' | '09:00' | '21:00' | 'all';
    }

    return {
      pack: values.pack,
      outdir: values.outdir,
      slot,
    };
  } catch (err: any) {
    console.error(`❌ Error parsing arguments: ${err.message}`);
    showHelp();
    process.exit(1);
  }
}

function main(): void {
  console.log('✅ Browns CT Pack Post Checklist Generator\n');

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

  console.log(`📂 Pack directory: ${packPath}`);
  if (options.slot) {
    console.log(`⏰ Slot: ${options.slot}\n`);
  } else {
    console.log(`⏰ Slot: all (no specific slot emphasis)\n`);
  }

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
    packTimeline: checkPackTimelineReferences(files, options.slot),
    slotExpectations: checkSlotExpectations(files, options.slot),
    changes: checkChangesFilePresence(files),
  };

  for (const [checkName, result] of Object.entries(checks)) {
    const icon = result.passed ? '✓' : '⚠️';
    console.log(`${icon} ${checkName}: ${result.message}`);
  }

  const hasFailures = Object.values(checks).some(c => !c.passed && c !== checks.packTimeline && c !== checks.slotExpectations && c !== checks.changes);

  if (hasFailures) {
    console.log('\n❌ Pack validation failed. Review ISSUES.md after generation.\n');
  } else {
    console.log('\n✅ All critical checks passed.\n');
  }

  const outdir = resolve(options.outdir);
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  const checklist = generateChecklist(options.slot || null, files, checks);
  const issues = generateIssues(checks);
  const approval = generateApprovalCopy();

  const manifest: ChecklistManifest = {
    generatedAt: new Date().toISOString(),
    packPath: packPath,
    slot: options.slot || null,
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

  console.log('\n⚠️  CoS WhatsApp Admin - The Browns: Review POST-CHECKLIST.md before any WhatsApp posting');
  console.log('⚠️  Never auto-send. CoS owns WhatsApp workflow.\n');

  if (hasFailures) {
    process.exit(1);
  }
}

main();
