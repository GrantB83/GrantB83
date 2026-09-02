/**
 * Report generation for ledger-month-close-pack
 */

import type { PackManifest, CSVFileInfo } from './types.js';

/**
 * Generate inventory.md report
 */
export function generateInventoryMarkdown(manifest: PackManifest): string {
  const lines: string[] = [];

  lines.push(`# Ledger Month-Close Pack Inventory`);
  lines.push(``);
  lines.push(`**Month:** ${manifest.month}`);
  lines.push(`**Generated:** ${manifest.generatedAt}`);
  lines.push(`**Exports directory:** ${manifest.exportsDir}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`- **Total CSV files:** ${manifest.totalFiles}`);
  lines.push(`- **Total size:** ${formatBytes(manifest.totalSize)}`);
  lines.push(`- **Files with missing headers:** ${manifest.missingHeadersCount}`);
  lines.push(`- **Unmatched queue included:** ${manifest.unmatchedQueueIncluded ? 'Yes' : 'No'}`);
  lines.push(``);

  if (manifest.csvFiles.length === 0) {
    lines.push(`⚠️ No CSV files found in exports directory.`);
    lines.push(``);
    return lines.join('\n');
  }

  lines.push(`## CSV Files`);
  lines.push(``);
  lines.push(`| File | Size | Modified | Header Row |`);
  lines.push(`|------|------|----------|------------|`);

  for (const file of manifest.csvFiles) {
    const sizeStr = formatBytes(file.size);
    const mtimeStr = new Date(file.mtime).toISOString().split('T')[0];
    const headerPreview = file.headerRow.substring(0, 60);
    const headerDisplay = file.headerRow.length > 60 ? `${headerPreview}...` : headerPreview;

    lines.push(`| ${file.basename} | ${sizeStr} | ${mtimeStr} | ${headerDisplay} |`);
  }

  lines.push(``);

  // Flag files with missing headers
  const filesWithIssues = manifest.csvFiles.filter((f) => f.missingHeaders.length > 0);
  if (filesWithIssues.length > 0) {
    lines.push(`## ⚠️ Missing Required Headers`);
    lines.push(``);

    for (const file of filesWithIssues) {
      lines.push(`### ${file.basename}`);
      lines.push(``);
      lines.push(`Missing headers: ${file.missingHeaders.join(', ')}`);
      lines.push(``);
    }
  }

  return lines.join('\n');
}

/**
 * Generate CLOSE.md checklist
 */
export function generateCloseChecklist(manifest: PackManifest): string {
  const lines: string[] = [];

  lines.push(`# Month-Close Checklist`);
  lines.push(``);
  lines.push(`**Month:** ${manifest.month}`);
  lines.push(``);
  lines.push(`## Export CSV Files Present`);
  lines.push(``);

  if (manifest.csvFiles.length === 0) {
    lines.push(`- [ ] ❌ No CSV files found - exports missing`);
  } else {
    lines.push(`- [x] ✅ Found ${manifest.csvFiles.length} CSV file(s)`);
  }

  lines.push(``);
  lines.push(`## Headers OK`);
  lines.push(``);

  if (manifest.missingHeadersCount > 0) {
    lines.push(`- [ ] ❌ ${manifest.missingHeadersCount} file(s) have missing required headers`);
  } else {
    lines.push(`- [x] ✅ All headers present (or no header validation required)`);
  }

  lines.push(``);
  lines.push(`## Unmatched Merchants Researched`);
  lines.push(``);

  if (manifest.unmatchedQueueIncluded) {
    lines.push(`- [ ] Review unmatched-queue.md and research unknown merchants`);
    lines.push(`- [ ] Update merchant rules based on research`);
  } else {
    lines.push(`- [ ] ⚠️ No unmatched queue file included (use --unmatched-queue if needed)`);
  }

  lines.push(``);
  lines.push(`## Sheet Write Approval`);
  lines.push(``);
  lines.push(`- [ ] Ledger sheet updates need H2 approval`);
  lines.push(`- [ ] No amounts invented or modified from source CSVs`);
  lines.push(``);

  return lines.join('\n');
}

/**
 * Generate APPROVAL.md safety gates
 */
export function generateApprovalGates(): string {
  const lines: string[] = [];

  lines.push(`# Month-Close Pack Approval Gates`);
  lines.push(``);
  lines.push(`## Safety Rules`);
  lines.push(``);
  lines.push(`1. **Ledger owns sheet writes** - Coding/CoS never writes directly to Google Sheets`);
  lines.push(`2. **No invented amounts** - All monetary values come from source CSVs only`);
  lines.push(`3. **No payments** - This is a reconciliation pack, not a payment system`);
  lines.push(`4. **Manual verification required** - Review all reports before any sheet updates`);
  lines.push(``);
  lines.push(`## Required Approvals`);
  lines.push(``);
  lines.push(`- **H2:** Required before any Google Sheet writes or merchant rule changes`);
  lines.push(`- **Ledger review:** All amounts must be verified against source CSVs`);
  lines.push(``);
  lines.push(`## What This Pack Contains`);
  lines.push(``);
  lines.push(`- **inventory.json** - Machine-readable CSV file metadata`);
  lines.push(`- **inventory.md** - Human-readable inventory (filenames, sizes, headers only)`);
  lines.push(`- **CLOSE.md** - Month-close checklist`);
  lines.push(`- **APPROVAL.md** - This file (safety gates)`);
  lines.push(`- **manifest.json** - Pack metadata`);
  lines.push(`- **unmatched-queue.md** - Unmatched merchants (if provided via --unmatched-queue)`);
  lines.push(``);
  lines.push(`## What This Pack Does NOT Contain`);
  lines.push(``);
  lines.push(`- ❌ Amount values in markdown prose (amounts stay in CSVs only)`);
  lines.push(`- ❌ Invented or estimated amounts`);
  lines.push(`- ❌ Payment instructions`);
  lines.push(`- ❌ Auto-write capabilities to sheets`);
  lines.push(``);

  return lines.join('\n');
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}
