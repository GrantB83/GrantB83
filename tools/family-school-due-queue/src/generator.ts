import { writeFileSync } from 'fs';
import { join } from 'path';
import type { QueueEntry, QueueOutput, Manifest } from './types.js';

export function generateOutputs(
  output: QueueOutput,
  manifest: Manifest,
  outdir: string
): void {
  generateQueueJson(output, outdir);
  generateQueueMd(output, outdir);
  generateMissingSignalsMd(output, outdir);
  generateApprovalMd(outdir);
  generateManifestJson(manifest, outdir);
}

function generateQueueJson(output: QueueOutput, outdir: string): void {
  const path = join(outdir, 'queue.json');
  writeFileSync(path, JSON.stringify(output, null, 2), 'utf-8');
}

function generateQueueMd(output: QueueOutput, outdir: string): void {
  const lines: string[] = [];
  
  lines.push('# Family School Due Queue\n');
  lines.push(`**As of:** ${output.asOf}\n`);
  lines.push(`**Total Items:** ${output.entries.length}\n`);
  
  const withDates = output.entries.filter(e => e.dueDate);
  const withoutDates = output.entries.filter(e => !e.dueDate);
  
  if (withDates.length > 0) {
    lines.push('## Items with Due Dates\n');
    withDates.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    
    withDates.forEach((entry, idx) => {
      lines.push(`### ${idx + 1}. ${entry.text}\n`);
      lines.push(`- **Due Date:** ${entry.dueDate}`);
      lines.push(`- **Source:** ${entry.source}`);
      lines.push(`- **Confidence:** ${entry.confidence}`);
      lines.push(`- **Signals:** ${entry.signals.join(', ')}\n`);
    });
  }
  
  if (withoutDates.length > 0) {
    lines.push('## Items without Due Dates (Action Keywords)\n');
    
    withoutDates.forEach((entry, idx) => {
      const num = withDates.length + idx + 1;
      lines.push(`### ${num}. ${entry.text}\n`);
      lines.push(`- **Source:** ${entry.source}`);
      lines.push(`- **Confidence:** ${entry.confidence}`);
      lines.push(`- **Signals:** ${entry.signals.join(', ')}\n`);
    });
  }
  
  const path = join(outdir, 'queue.md');
  writeFileSync(path, lines.join('\n'), 'utf-8');
}

function generateMissingSignalsMd(output: QueueOutput, outdir: string): void {
  const lines: string[] = [];
  
  lines.push('# Missing Signals\n');
  lines.push(`**Count:** ${output.missingSignals.length}\n`);
  
  if (output.missingSignals.length === 0) {
    lines.push('All items have at least one due/deadline signal.\n');
  } else {
    lines.push('The following items had no recognized due/deadline signals:\n');
    output.missingSignals.forEach((text, idx) => {
      lines.push(`${idx + 1}. ${text}`);
    });
    lines.push('\n## Recommendations\n');
    lines.push('- Review items manually for due dates in body text (if available)');
    lines.push('- Check if items are informational only (no action required)');
    lines.push('- Consider updating keyword patterns if common signals are missed\n');
  }
  
  const path = join(outdir, 'missing-signals.md');
  writeFileSync(path, lines.join('\n'), 'utf-8');
}

function generateApprovalMd(outdir: string): void {
  const content = `# APPROVAL — Family School Due Queue

## Ownership

- **Family** owns WhatsApp posting for family morning digest
- **CoS** posts to WhatsApp Admin for family coordination
- **Never auto-send** - All outputs are DRAFT only

## Safety Rules

- ✅ **Subjects/filenames only** - Never opens email bodies or attachments
- ✅ **No invented dates** - Only extracts dates explicitly present in text
- ✅ **Heuristic extraction** - Date/keyword signals may have false positives
- ✅ **Offline only** - No Gmail API or network calls
- ✅ **DRAFT ONLY** - Never sends WhatsApp or email automatically

## Review Checklist

Before posting family morning digest:

- [ ] Review \`queue.md\` for accuracy
- [ ] Check \`missing-signals.md\` for items needing manual review
- [ ] Verify due dates are reasonable and not past dates
- [ ] Confirm items are relevant to current school year
- [ ] Family bot or CoS manually posts to WhatsApp Admin

## Integration

This tool may be wired into \`family-morning-digest-pack\` for automated morning digest assembly. See \`tools/family-morning-digest-pack/\` for integration details.

## Never

- ❌ **Never auto-send** - WhatsApp posting requires manual approval
- ❌ **Never open email bodies** - Subjects/filenames only
- ❌ **Never invent dates** - Uncertain → missing-signals.md
- ❌ **Never assume school facts** - Extraction is heuristic guidance only
`;
  
  const path = join(outdir, 'APPROVAL.md');
  writeFileSync(path, content, 'utf-8');
}

function generateManifestJson(manifest: Manifest, outdir: string): void {
  const path = join(outdir, 'manifest.json');
  writeFileSync(path, JSON.stringify(manifest, null, 2), 'utf-8');
}
