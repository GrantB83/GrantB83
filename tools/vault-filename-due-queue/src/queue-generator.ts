import { writeFileSync } from 'fs';
import { join } from 'path';
import { DocumentCategory, QueueEntry, QueueResult } from './types.js';

export function buildQueueResult(entries: QueueEntry[]): QueueResult {
  const byCategory: Record<DocumentCategory, number> = {
    'cipc-annual-return': 0,
    'cipc-change-form': 0,
    'cipc-certificate': 0,
    'sars-annual-tax-return': 0,
    'sars-provisional-tax': 0,
    'sars-vat-return': 0,
    'sars-emp-return': 0,
    'sars-correspondence': 0,
    'bee-affidavit': 0,
    'bee-certificate': 0,
    'trust-distribution': 0,
    'trust-resolution': 0,
    'trust-compliance': 0,
    'property-rates': 0,
    'property-levies': 0,
    'insurance-renewal': 0,
    'forex-application': 0,
    'bank-statement': 0,
    'attorney-letter': 0,
    'other-compliance': 0,
    'unknown': 0,
  };

  let filesWithDates = 0;
  let filesUnknownDue = 0;
  let filesNoDatePattern = 0;

  for (const entry of entries) {
    byCategory[entry.category]++;
    
    if (entry.dueStatus === 'has-date') {
      filesWithDates++;
    } else if (entry.dueStatus === 'unknown-due') {
      filesUnknownDue++;
    } else {
      filesNoDatePattern++;
    }
  }

  return {
    entries,
    summary: {
      totalFiles: entries.length,
      byCategory,
      filesWithDates,
      filesUnknownDue,
      filesNoDatePattern,
    },
  };
}

export function generateQueueJSON(result: QueueResult, outputDir: string): void {
  const outputPath = join(outputDir, 'queue.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`  ✓ Queue JSON: ${outputPath}`);
}

export function generateQueueMarkdown(result: QueueResult, outputDir: string): void {
  const outputPath = join(outputDir, 'queue.md');
  
  const lines: string[] = [];
  lines.push('# Vault Filename Due Queue');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Files:** ${result.summary.totalFiles}`);
  lines.push(`- **Files with Dates:** ${result.summary.filesWithDates}`);
  lines.push(`- **Files with Unknown Due:** ${result.summary.filesUnknownDue}`);
  lines.push(`- **Files with No Date Pattern:** ${result.summary.filesNoDatePattern}`);
  lines.push('');
  
  lines.push('## Priority Queue (Files with Dates)');
  lines.push('');
  
  const withDates = result.entries.filter(e => e.dueStatus === 'has-date');
  if (withDates.length > 0) {
    withDates.forEach((entry, idx) => {
      lines.push(`### ${idx + 1}. ${entry.filename}`);
      lines.push('');
      lines.push(`- **Category:** ${entry.category}`);
      lines.push(`- **Date Tokens:** ${entry.dateTokens.join(', ')}`);
      lines.push(`- **Confidence:** ${entry.confidence}`);
      if (entry.signals.length > 0) {
        lines.push(`- **Signals:** ${entry.signals.join(', ')}`);
      }
      if (entry.notes) {
        lines.push(`- **Notes:** ${entry.notes}`);
      }
      lines.push('');
    });
  } else {
    lines.push('*No files with date tokens found.*');
    lines.push('');
  }
  
  lines.push('## Research Queue (Unknown Due Dates)');
  lines.push('');
  
  const unknownDue = result.entries.filter(e => e.dueStatus === 'unknown-due');
  if (unknownDue.length > 0) {
    unknownDue.forEach((entry, idx) => {
      lines.push(`### ${withDates.length + idx + 1}. ${entry.filename}`);
      lines.push('');
      lines.push(`- **Category:** ${entry.category}`);
      lines.push(`- **Confidence:** ${entry.confidence}`);
      if (entry.signals.length > 0) {
        lines.push(`- **Signals:** ${entry.signals.join(', ')}`);
      }
      if (entry.notes) {
        lines.push(`- **Notes:** ${entry.notes}`);
      }
      lines.push('');
    });
  } else {
    lines.push('*No files with unknown due dates.*');
    lines.push('');
  }
  
  lines.push('## Counts by Category');
  lines.push('');
  
  Object.entries(result.summary.byCategory)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      lines.push(`- **${category}:** ${count}`);
    });
  
  lines.push('');
  
  writeFileSync(outputPath, lines.join('\n'));
  console.log(`  ✓ Queue Markdown: ${outputPath}`);
}

export function generateMissingSignalsMarkdown(result: QueueResult, outputDir: string): void {
  const outputPath = join(outputDir, 'missing-signals.md');
  
  const lines: string[] = [];
  lines.push('# Missing Signals Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Files with no category or date pattern detected.');
  lines.push('');
  
  const noSignals = result.entries.filter(e => 
    e.category === 'unknown' && e.dueStatus === 'no-date-pattern'
  );
  
  if (noSignals.length > 0) {
    lines.push(`## Files Without Signals (${noSignals.length})`);
    lines.push('');
    
    noSignals.forEach((entry, idx) => {
      lines.push(`${idx + 1}. \`${entry.filename}\``);
      if (entry.notes) {
        lines.push(`   - ${entry.notes}`);
      }
    });
    
    lines.push('');
    lines.push('**Recommendation:** Review these filenames manually to determine document type and due dates.');
  } else {
    lines.push('✅ All files have at least one signal (category or date pattern).');
  }
  
  lines.push('');
  
  writeFileSync(outputPath, lines.join('\n'));
  console.log(`  ✓ Missing Signals: ${outputPath}`);
}

export function generateApprovalMarkdown(outputDir: string): void {
  const outputPath = join(outputDir, 'APPROVAL.md');
  
  const lines: string[] = [];
  lines.push('# APPROVAL — Vault Filename Due Queue');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Safety Rules');
  lines.push('');
  lines.push('- ✅ **Filename heuristics only** — No file bodies opened');
  lines.push('- ✅ **No invented dates** — Date tokens extracted from filenames only');
  lines.push('- ✅ **No legal positions** — Category hints are heuristic, not advice');
  lines.push('- ✅ **Offline only** — No APIs, no network calls');
  lines.push('- ✅ **Read-only** — No files moved, renamed, or modified');
  lines.push('');
  lines.push('## Vault Ownership');
  lines.push('');
  lines.push('Vault owns next actions on all CIPC/SARS/trust filings:');
  lines.push('');
  lines.push('- **Never auto-submit** — All statutory filings require human approval (N2 gate)');
  lines.push('- **Never invent amounts** — This tool does not extract or handle monetary values');
  lines.push('- **Date uncertainty flagged** — Files with `unknown-due` status require manual research');
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review `queue.md` for priority items (files with dates)');
  lines.push('2. Research `unknown-due` entries in `queue.json`');
  lines.push('3. Check `missing-signals.md` for unclassified files');
  lines.push('4. Update compliance registers with extracted due dates');
  lines.push('5. Never use this output for auto-filing or payment actions');
  lines.push('');
  
  writeFileSync(outputPath, lines.join('\n'));
  console.log(`  ✓ Approval doc: ${outputPath}`);
}

export function generateManifest(result: QueueResult, outputDir: string, mode: 'files' | 'dir', inputPath: string): void {
  const outputPath = join(outputDir, 'manifest.json');
  
  const manifest = {
    generatedAt: new Date().toISOString(),
    mode,
    inputPath,
    summary: result.summary,
  };
  
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Manifest: ${outputPath}`);
}
