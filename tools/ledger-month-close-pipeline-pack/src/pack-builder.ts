/**
 * Pack builder for month-close pipeline pack
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { CLIOptions, StageFile, PackManifest } from './types.js';

export async function buildPack(options: CLIOptions): Promise<void> {
  const { month, outdir } = options;

  console.log(`🔧 Building month-close pipeline pack for ${month}...`);

  // Create output directory
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true });
  }

  // Discover stage files
  const stageFiles: StageFile[] = [];
  let stageCount = 0;

  // Stage 1: Unmatched merchant queue
  const unmatchedQueueMd = findStageFile(options.unmatchedOutdir, 'queue.md');
  if (unmatchedQueueMd.present) {
    stageFiles.push(unmatchedQueueMd);
    stageCount++;
    copyFileSync(unmatchedQueueMd.sourcePath!, join(outdir, 'queue.md'));
    console.log('  ✅ Copied queue.md from unmatched-merchant-queue');
  } else {
    stageFiles.push(unmatchedQueueMd);
    console.log('  ⚠️  queue.md not found (unmatched-merchant-queue stage)');
  }

  // Stage 2: Alias suggestions
  const suggestionsMd = findStageFile(options.suggestOutdir, 'suggestions.md');
  if (suggestionsMd.present) {
    stageFiles.push(suggestionsMd);
    stageCount++;
    copyFileSync(suggestionsMd.sourcePath!, join(outdir, 'suggestions.md'));
    console.log('  ✅ Copied suggestions.md from merchant-alias-suggest');
  } else {
    stageFiles.push(suggestionsMd);
    console.log('  ⚠️  suggestions.md not found (merchant-alias-suggest stage)');
  }

  // Stage 3: Alias apply checklist
  const applyChecklistMd = findStageFile(options.aliasChecklistOutdir, 'APPLY-CHECKLIST.md');
  if (applyChecklistMd.present) {
    stageFiles.push(applyChecklistMd);
    stageCount++;
    copyFileSync(applyChecklistMd.sourcePath!, join(outdir, 'APPLY-CHECKLIST.md'));
    console.log('  ✅ Copied APPLY-CHECKLIST.md from alias-apply-checklist');
  } else {
    stageFiles.push(applyChecklistMd);
    console.log('  ⚠️  APPLY-CHECKLIST.md not found (alias-apply-checklist stage)');
  }

  // Stage 4: Month-close pack
  const closeMd = findStageFile(options.closeOutdir, 'CLOSE.md');
  if (closeMd.present) {
    stageFiles.push(closeMd);
    stageCount++;
    copyFileSync(closeMd.sourcePath!, join(outdir, 'CLOSE.md'));
    console.log('  ✅ Copied CLOSE.md from month-close-pack');
  } else {
    stageFiles.push(closeMd);
    console.log('  ⚠️  CLOSE.md not found (month-close-pack stage)');
  }

  const closeApprovalMd = findStageFile(options.closeOutdir, 'APPROVAL.md');
  if (closeApprovalMd.present) {
    stageFiles.push(closeApprovalMd);
    copyFileSync(closeApprovalMd.sourcePath!, join(outdir, 'CLOSE-APPROVAL.md'));
    console.log('  ✅ Copied APPROVAL.md from month-close-pack as CLOSE-APPROVAL.md');
  } else {
    stageFiles.push(closeApprovalMd);
  }

  // Fail if zero stages present
  if (stageCount === 0) {
    console.error('\n❌ Error: Zero stage inputs found. At least one stage output directory must contain files.');
    process.exit(1);
  }

  // Generate PACK.md index
  const packMd = generatePackIndex(month, stageFiles);
  writeFileSync(join(outdir, 'PACK.md'), packMd);
  console.log('  ✅ Generated PACK.md index');

  // Generate APPROVAL.md with H2 gate reminder
  const approvalMd = generateApprovalDoc(month);
  writeFileSync(join(outdir, 'APPROVAL.md'), approvalMd);
  console.log('  ✅ Generated APPROVAL.md with H2 gate');

  // Generate manifest.json
  const manifest: PackManifest = {
    tool: 'ledger-month-close-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    month,
    stages: {
      unmatchedQueue: unmatchedQueueMd.present,
      aliasSuggest: suggestionsMd.present,
      aliasChecklist: applyChecklistMd.present,
      monthClose: closeMd.present,
    },
    files: stageFiles,
    totalStages: stageCount,
  };
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('  ✅ Generated manifest.json');

  console.log(`\n✅ Pack complete! ${stageCount} stage(s) included. Output: ${outdir}`);
  console.log('\n📋 Files generated:');
  console.log('  - PACK.md (index with file presence)');
  console.log('  - APPROVAL.md (H2 gate reminder)');
  console.log('  - manifest.json (machine-readable metadata)');
  if (unmatchedQueueMd.present) console.log('  - queue.md');
  if (suggestionsMd.present) console.log('  - suggestions.md');
  if (applyChecklistMd.present) console.log('  - APPLY-CHECKLIST.md');
  if (closeMd.present) console.log('  - CLOSE.md');
  if (closeApprovalMd.present) console.log('  - CLOSE-APPROVAL.md');
}

function findStageFile(outdir: string | undefined, filename: string): StageFile {
  const stage = filename.replace('.md', '').replace('APPLY-CHECKLIST', 'alias-checklist').replace('CLOSE', 'month-close');
  const description = getFileDescription(filename);

  if (!outdir) {
    return {
      stage,
      filename,
      sourcePath: null,
      present: false,
      description,
    };
  }

  const fullPath = join(outdir, filename);
  const present = existsSync(fullPath);

  return {
    stage,
    filename,
    sourcePath: present ? fullPath : null,
    present,
    description,
  };
}

function getFileDescription(filename: string): string {
  switch (filename) {
    case 'queue.md':
      return 'Unmatched merchant research queue';
    case 'suggestions.md':
      return 'Merchant alias suggestions (scored by token overlap)';
    case 'APPLY-CHECKLIST.md':
      return 'H2-ready alias apply checklist';
    case 'CLOSE.md':
      return 'Month-close checklist';
    case 'APPROVAL.md':
      return 'Month-close approval gates';
    default:
      return 'Stage output file';
  }
}

function generatePackIndex(month: string, stageFiles: StageFile[]): string {
  const lines: string[] = [];

  lines.push(`# Month-Close Pipeline Pack`);
  lines.push('');
  lines.push(`**Month:** ${month}`);
  lines.push('');
  lines.push('This pack assembles outputs from the month-end ledger pipeline:');
  lines.push('');
  lines.push('```');
  lines.push('unmatched-merchant-queue → merchant-alias-suggest → alias-apply-checklist → month-close-pack');
  lines.push('```');
  lines.push('');
  lines.push('## Pipeline Stages Included');
  lines.push('');

  const stages = [
    { name: 'Unmatched Merchant Queue', files: ['queue.md'] },
    { name: 'Merchant Alias Suggestions', files: ['suggestions.md'] },
    { name: 'Alias Apply Checklist', files: ['APPLY-CHECKLIST.md'] },
    { name: 'Month-Close Pack', files: ['CLOSE.md', 'APPROVAL.md'] },
  ];

  for (const stage of stages) {
    const stagePresent = stage.files.some(f => stageFiles.find(sf => sf.filename === f)?.present);
    const icon = stagePresent ? '✅' : '❌';
    lines.push(`- ${icon} **${stage.name}**`);

    for (const filename of stage.files) {
      const file = stageFiles.find(sf => sf.filename === filename);
      if (file?.present) {
        lines.push(`  - \`${filename}\` - ${file.description}`);
      }
    }
  }

  lines.push('');
  lines.push('## File Presence');
  lines.push('');
  lines.push('| Stage | File | Present | Description |');
  lines.push('|-------|------|---------|-------------|');

  for (const file of stageFiles) {
    const presentIcon = file.present ? '✅' : '❌';
    lines.push(`| ${file.stage} | \`${file.filename}\` | ${presentIcon} | ${file.description} |`);
  }

  lines.push('');
  lines.push('## Critical Safety');
  lines.push('');
  lines.push('- ✅ **Offline only** - No Google Sheets API or network calls');
  lines.push('- ✅ **Amounts stay in files** - Never paste transaction amounts into PACK.md prose');
  lines.push('- ⚠️ **H2 approval required** - See APPROVAL.md before any Google Sheet writes');
  lines.push('- ⚠️ **Ledger owns sheet writes** - Coding/CoS never writes Budget directly');
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review stage outputs in order (queue → suggestions → checklist → close)');
  lines.push('2. Complete manual research for queue.md items');
  lines.push('3. Verify alias suggestions and apply checklist');
  lines.push('4. Follow APPROVAL.md workflow for H2 gate');
  lines.push('5. Ledger updates Google Sheet after approval');
  lines.push('');

  return lines.join('\n');
}

function generateApprovalDoc(month: string): string {
  const lines: string[] = [];

  lines.push(`# Approval Workflow for Month-Close Pipeline Pack`);
  lines.push('');
  lines.push(`**Month:** ${month}`);
  lines.push('');
  lines.push('## H2 Gate Required Before Google Sheet Writes');
  lines.push('');
  lines.push('This pack aggregates outputs from multiple ledger pipeline stages. Before any Google Sheet updates:');
  lines.push('');
  lines.push('1. **Ledger owns sheet writes** - Coding/CoS provides tooling only');
  lines.push('2. **Manual verification required** - Review all stage outputs before applying');
  lines.push('3. **H2 approval required** - Per `docs/automation/approval-gates.md`');
  lines.push('4. **Offline only** - No auto-apply, no Sheets API calls');
  lines.push('');
  lines.push('## What This Pack Contains');
  lines.push('');
  lines.push('- **queue.md** - Unmatched merchants needing research (from `ledger-unmatched-merchant-queue`)');
  lines.push('- **suggestions.md** - Alias suggestions via token overlap (from `ledger-merchant-alias-suggest`)');
  lines.push('- **APPLY-CHECKLIST.md** - Human tick-off checklist (from `ledger-alias-apply-checklist`)');
  lines.push('- **CLOSE.md** - Month-close sanity checks (from `ledger-month-close-pack`)');
  lines.push('- **CLOSE-APPROVAL.md** - Month-close approval gates (from `ledger-month-close-pack`)');
  lines.push('');
  lines.push('## What Ledger Owns');
  lines.push('');
  lines.push('- ✅ Manual research for unmatched merchants (S1 standing approval for public sources)');
  lines.push('- ✅ Verification of alias suggestions against source data');
  lines.push('- ✅ Ticking off APPLY-CHECKLIST.md items');
  lines.push('- ✅ Requesting H2 approval before sheet writes');
  lines.push('- ✅ Manual Google Sheet updates after approval');
  lines.push('- ✅ Updating alias knowledge base (with H2 approval)');
  lines.push('');
  lines.push('## What Coding/CoS Never Does');
  lines.push('');
  lines.push('- ❌ Write Budget sheet directly (Ledger owns sheet writes)');
  lines.push('- ❌ Invent merchant identities or amounts');
  lines.push('- ❌ Auto-apply aliases without human verification');
  lines.push('- ❌ Bypass H2 approval gate');
  lines.push('- ❌ Call Google Sheets API (offline tooling only)');
  lines.push('');
  lines.push('## Approval Workflow');
  lines.push('');
  lines.push('```');
  lines.push('1. Ledger reviews PACK.md index');
  lines.push('2. Ledger researches queue.md unmatched merchants');
  lines.push('3. Ledger verifies suggestions.md alias mappings');
  lines.push('4. Ledger ticks off APPLY-CHECKLIST.md items');
  lines.push('5. Ledger verifies CLOSE.md sanity checks');
  lines.push('6. Ledger requests: "APPROVE ALIAS UPDATES" (H2 gate)');
  lines.push('7. Grant replies: "APPROVED" or provides corrections');
  lines.push('8. Ledger manually updates Google Sheet after approval');
  lines.push('```');
  lines.push('');
  lines.push('## Hard Constraints');
  lines.push('');
  lines.push('Per `AGENTS.md` and `docs/automation/approval-gates.md`:');
  lines.push('');
  lines.push('- **Offline only** - No Google Sheets API, no network calls');
  lines.push('- **H2 before writes** - Human approval gate enforced');
  lines.push('- **Amounts stay in files** - Never paste transaction amounts into digest prose');
  lines.push('- **Ledger owns sheet** - Coding/CoS never write Budget directly');
  lines.push('- **No invented data** - Amounts, merchant identities, aliases must come from source files only');
  lines.push('');

  return lines.join('\n');
}
