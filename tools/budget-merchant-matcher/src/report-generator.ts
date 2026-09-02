import * as fs from 'fs';
import * as path from 'path';
import { MatchingSummary } from './types.js';

export function generateReports(summary: MatchingSummary, outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  generateMatchedCSV(summary, outputDir);
  generateMatchedMD(summary, outputDir);
  generateUnmatchedCSV(summary, outputDir);
  generateUnmatchedMD(summary, outputDir);
  generateSummaryMD(summary, outputDir);
}

function generateMatchedCSV(summary: MatchingSummary, outputDir: string): void {
  const lines: string[] = [];
  
  const hasAmounts = summary.matched.some(m => m.totalAmount !== undefined);
  
  if (hasAmounts) {
    lines.push('Merchant,Category,Transaction Count,Total Amount,Notes');
  } else {
    lines.push('Merchant,Category,Transaction Count,Notes');
  }

  for (const match of summary.matched) {
    const notes = match.notes || '';
    if (hasAmounts) {
      const amount = match.totalAmount !== undefined ? match.totalAmount.toFixed(2) : '';
      lines.push(`"${match.merchant}","${match.category}",${match.count},"${amount}","${notes}"`);
    } else {
      lines.push(`"${match.merchant}","${match.category}",${match.count},"${notes}"`);
    }
  }

  fs.writeFileSync(path.join(outputDir, 'matched.csv'), lines.join('\n'));
}

function generateMatchedMD(summary: MatchingSummary, outputDir: string): void {
  const lines: string[] = [];
  
  lines.push('# Matched Merchants\n');
  lines.push(`**Total Matched Transactions:** ${summary.matchedTransactions}`);
  lines.push(`**Unique Merchants:** ${summary.uniqueMatchedMerchants}\n`);

  const hasAmounts = summary.matched.some(m => m.totalAmount !== undefined);
  
  if (hasAmounts) {
    lines.push('| Merchant | Category | Count | Total Amount | Notes |');
    lines.push('|----------|----------|-------|--------------|-------|');
  } else {
    lines.push('| Merchant | Category | Count | Notes |');
    lines.push('|----------|----------|-------|-------|');
  }

  for (const match of summary.matched) {
    const notes = match.notes || '';
    if (hasAmounts) {
      const amount = match.totalAmount !== undefined ? `$${match.totalAmount.toFixed(2)}` : '';
      lines.push(`| ${match.merchant} | ${match.category} | ${match.count} | ${amount} | ${notes} |`);
    } else {
      lines.push(`| ${match.merchant} | ${match.category} | ${match.count} | ${notes} |`);
    }
  }

  fs.writeFileSync(path.join(outputDir, 'matched.md'), lines.join('\n'));
}

function generateUnmatchedCSV(summary: MatchingSummary, outputDir: string): void {
  const lines: string[] = [];
  
  const hasAmounts = summary.unmatched.some(u => u.totalAmount !== undefined);
  
  if (hasAmounts) {
    lines.push('Merchant,Transaction Count,Total Amount');
  } else {
    lines.push('Merchant,Transaction Count');
  }

  for (const unmatched of summary.unmatched) {
    if (hasAmounts) {
      const amount = unmatched.totalAmount !== undefined ? unmatched.totalAmount.toFixed(2) : '';
      lines.push(`"${unmatched.merchant}",${unmatched.count},"${amount}"`);
    } else {
      lines.push(`"${unmatched.merchant}",${unmatched.count}`);
    }
  }

  fs.writeFileSync(path.join(outputDir, 'unmatched.csv'), lines.join('\n'));
}

function generateUnmatchedMD(summary: MatchingSummary, outputDir: string): void {
  const lines: string[] = [];
  
  lines.push('# Unmatched Merchants\n');
  lines.push(`**Total Unmatched Transactions:** ${summary.unmatchedTransactions}`);
  lines.push(`**Unique Merchants:** ${summary.uniqueUnmatchedMerchants}\n`);
  lines.push('**Action Required:** These merchants need research and classification.\n');

  const hasAmounts = summary.unmatched.some(u => u.totalAmount !== undefined);
  
  if (hasAmounts) {
    lines.push('| Merchant | Count | Total Amount |');
    lines.push('|----------|-------|--------------|');
  } else {
    lines.push('| Merchant | Count |');
    lines.push('|----------|-------|');
  }

  for (const unmatched of summary.unmatched) {
    if (hasAmounts) {
      const amount = unmatched.totalAmount !== undefined ? `$${unmatched.totalAmount.toFixed(2)}` : '';
      lines.push(`| ${unmatched.merchant} | ${unmatched.count} | ${amount} |`);
    } else {
      lines.push(`| ${unmatched.merchant} | ${unmatched.count} |`);
    }
  }

  fs.writeFileSync(path.join(outputDir, 'unmatched.md'), lines.join('\n'));
}

function generateSummaryMD(summary: MatchingSummary, outputDir: string): void {
  const lines: string[] = [];
  
  lines.push('# Budget Merchant Matching Summary\n');
  lines.push(`**Generated:** ${new Date().toISOString()}\n`);
  
  lines.push('## Overview\n');
  lines.push(`- **Total Transactions:** ${summary.totalTransactions}`);
  lines.push(`- **Matched Transactions:** ${summary.matchedTransactions}`);
  lines.push(`- **Unmatched Transactions:** ${summary.unmatchedTransactions}`);
  lines.push(`- **Match Rate:** ${((summary.matchedTransactions / summary.totalTransactions) * 100).toFixed(1)}%\n`);
  
  lines.push('## Merchant Summary\n');
  lines.push(`- **Unique Matched Merchants:** ${summary.uniqueMatchedMerchants}`);
  lines.push(`- **Unique Unmatched Merchants:** ${summary.uniqueUnmatchedMerchants}\n`);
  
  lines.push('## Output Files\n');
  lines.push('- `matched.csv` - Matched merchants with categories (CSV format)');
  lines.push('- `matched.md` - Matched merchants with categories (Markdown format)');
  lines.push('- `unmatched.csv` - Unmatched merchants needing classification (CSV format)');
  lines.push('- `unmatched.md` - Unmatched merchants needing classification (Markdown format)');
  lines.push('- `summary.md` - This summary file\n');
  
  lines.push('## Next Steps\n');
  lines.push('1. Review `unmatched.md` for merchants requiring classification');
  lines.push('2. Add new patterns to your rules file for unmatched merchants');
  lines.push('3. Re-run the matcher to verify improved coverage');

  fs.writeFileSync(path.join(outputDir, 'summary.md'), lines.join('\n'));
}
