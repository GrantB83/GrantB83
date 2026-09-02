import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { ReconResult } from './types.js';

export function generateCSVReport(result: ReconResult, outputPath: string): void {
  ensureDirectoryExists(outputPath);

  const lines: string[] = [
    'Type,Issue,Loyverse Date,Loyverse Receipt,Loyverse Amount,Xero Date,Xero Reference,Xero Amount'
  ];

  for (const gap of result.gaps) {
    const loyDate = gap.loyverseRecord?.date || '';
    const loyReceipt = gap.loyverseRecord?.receiptNumber || '';
    const loyAmount = gap.loyverseRecord?.totalAmount?.toFixed(2) || '';
    const xeroDate = gap.xeroRecord?.date || '';
    const xeroRef = gap.xeroRecord?.reference || '';
    const xeroAmount = gap.xeroRecord?.amount?.toFixed(2) || '';

    lines.push(
      `"${gap.type}","${escapeCSV(gap.issue)}","${loyDate}","${loyReceipt}","${loyAmount}","${xeroDate}","${xeroRef}","${xeroAmount}"`
    );
  }

  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

export function generateMarkdownReport(result: ReconResult, outputPath: string): void {
  ensureDirectoryExists(outputPath);

  const lines: string[] = [
    '# Loyverse ↔ Xero Reconciliation Gap Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Loyverse Records:** ${result.loyverseRecordCount}`,
    `- **Xero Records:** ${result.xeroRecordCount}`,
    `- **Matched:** ${result.matchedCount}`,
    `- **Gaps Found:** ${result.gaps.length}`,
    `- **Loyverse Total:** ${result.loyverseTotal.toFixed(2)}`,
    `- **Xero Total:** ${result.xeroTotal.toFixed(2)}`,
    `- **Difference:** ${(result.loyverseTotal - result.xeroTotal).toFixed(2)}`,
    '',
    '## Gaps by Type',
    ''
  ];

  const gapsByType = new Map<string, number>();
  for (const gap of result.gaps) {
    gapsByType.set(gap.type, (gapsByType.get(gap.type) || 0) + 1);
  }

  for (const [type, count] of gapsByType.entries()) {
    lines.push(`- **${formatGapType(type)}:** ${count}`);
  }

  lines.push('', '## Detailed Gaps', '');

  for (const gap of result.gaps) {
    lines.push(`### ${formatGapType(gap.type)}`);
    lines.push('');
    lines.push(`**Issue:** ${gap.issue}`);
    lines.push('');

    if (gap.loyverseRecord) {
      lines.push('**Loyverse:**');
      lines.push(`- Date: ${gap.loyverseRecord.date}`);
      lines.push(`- Receipt: ${gap.loyverseRecord.receiptNumber}`);
      lines.push(`- Amount: ${gap.loyverseRecord.totalAmount.toFixed(2)}`);
      lines.push(`- Payment Type: ${gap.loyverseRecord.paymentType}`);
      lines.push('');
    }

    if (gap.xeroRecord) {
      lines.push('**Xero:**');
      lines.push(`- Date: ${gap.xeroRecord.date}`);
      lines.push(`- Reference: ${gap.xeroRecord.reference}`);
      lines.push(`- Amount: ${gap.xeroRecord.amount.toFixed(2)}`);
      lines.push(`- Description: ${gap.xeroRecord.description}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  if (result.gaps.length === 0) {
    lines.push('✅ **No gaps found! All records reconcile successfully.**');
    lines.push('');
  }

  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

function formatGapType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function escapeCSV(value: string): string {
  return value.replace(/"/g, '""');
}

function ensureDirectoryExists(filePath: string): void {
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}
