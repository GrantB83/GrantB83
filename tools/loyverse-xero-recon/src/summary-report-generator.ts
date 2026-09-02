import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { SummaryReconResult } from './types.js';

export function generateSummaryCSVReport(result: SummaryReconResult, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  
  const lines: string[] = [
    'Type,Store Name,Metric,Loyverse Value,Xero Value,Difference,Issue'
  ];

  for (const gap of result.gaps) {
    const storeName = gap.storeName || 'Unknown';
    const loyValue = gap.loyverseSummary?.netSales?.toFixed(2) || '';
    const xeroValue = gap.xeroPL?.totalTradingIncome?.toFixed(2) || '';
    const diff = gap.difference?.toFixed(2) || '';
    const issue = escapeCSV(gap.issue);
    
    lines.push(`${gap.type},${escapeCSV(storeName)},${getMetricName(gap.type)},${loyValue},${xeroValue},${diff},${issue}`);
  }

  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

export function generateSummaryMarkdownReport(result: SummaryReconResult, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  
  const timestamp = new Date().toISOString();
  
  let md = '# Loyverse ↔ Xero Summary/P&L Reconciliation Gap Report\n\n';
  md += `**Generated:** ${timestamp}\n\n`;
  md += '## Summary\n\n';
  md += `- **Stores Analyzed:** ${result.storeCount}\n`;
  md += `- **Loyverse Total Net Sales:** ${result.loyverseTotalNetSales.toFixed(2)}\n`;
  md += `- **Xero Total Trading Income:** ${result.xeroTotalTradingIncome.toFixed(2)}\n`;
  md += `- **Total Difference:** ${result.totalDifference.toFixed(2)}\n`;
  md += `- **Gaps Found:** ${result.gaps.length}\n\n`;

  if (result.gaps.length === 0) {
    md += '## ✅ No Gaps Found\n\n';
    md += 'All store summaries reconcile within the threshold.\n';
    writeFileSync(outputPath, md, 'utf-8');
    return;
  }

  md += '## Gaps by Type\n\n';
  const gapsByType = new Map<string, number>();
  for (const gap of result.gaps) {
    gapsByType.set(gap.type, (gapsByType.get(gap.type) || 0) + 1);
  }
  
  for (const [type, count] of gapsByType.entries()) {
    md += `- **${formatGapType(type)}:** ${count}\n`;
  }
  md += '\n';

  md += '## Gap Details\n\n';

  const netSalesMismatches = result.gaps.filter(g => g.type === 'net_sales_mismatch');
  if (netSalesMismatches.length > 0) {
    md += '### Net Sales Mismatches\n\n';
    md += '| Store | Loyverse Net Sales | Xero Trading Income | Difference |\n';
    md += '|-------|-------------------|---------------------|------------|\n';
    for (const gap of netSalesMismatches) {
      const store = gap.storeName || 'Unknown';
      const loyVal = gap.loyverseSummary?.netSales.toFixed(2) || '';
      const xeroVal = gap.xeroPL?.totalTradingIncome.toFixed(2) || '';
      const diff = gap.difference.toFixed(2);
      md += `| ${store} | ${loyVal} | ${xeroVal} | ${diff} |\n`;
    }
    md += '\n';
  }

  const grossProfitMismatches = result.gaps.filter(g => g.type === 'gross_profit_mismatch');
  if (grossProfitMismatches.length > 0) {
    md += '### Gross Profit Mismatches\n\n';
    md += '| Store | Loyverse Gross Profit | Xero Gross Profit | Difference |\n';
    md += '|-------|-----------------------|-------------------|------------|\n';
    for (const gap of grossProfitMismatches) {
      const store = gap.storeName || 'Unknown';
      const loyVal = gap.loyverseSummary?.grossProfit.toFixed(2) || '';
      const xeroVal = gap.xeroPL?.grossProfit.toFixed(2) || '';
      const diff = gap.difference.toFixed(2);
      md += `| ${store} | ${loyVal} | ${xeroVal} | ${diff} |\n`;
    }
    md += '\n';
  }

  const cogsMismatches = result.gaps.filter(g => g.type === 'cogs_mismatch');
  if (cogsMismatches.length > 0) {
    md += '### Cost of Goods Mismatches\n\n';
    md += '| Store | Loyverse COGS | Xero COGS | Difference |\n';
    md += '|-------|---------------|-----------|------------|\n';
    for (const gap of cogsMismatches) {
      const store = gap.storeName || 'Unknown';
      const loyVal = gap.loyverseSummary?.costOfGoods.toFixed(2) || '';
      const xeroCogsVal = gap.xeroPL?.costOfGoodsSold || gap.xeroPL?.totalCostOfSales || 0;
      const diff = gap.difference.toFixed(2);
      md += `| ${store} | ${loyVal} | ${xeroCogsVal.toFixed(2)} | ${diff} |\n`;
    }
    md += '\n';
  }

  const storeMismatches = result.gaps.filter(g => g.type === 'store_mismatch');
  if (storeMismatches.length > 0) {
    md += '### Store Mismatches\n\n';
    for (const gap of storeMismatches) {
      md += `- ${gap.issue}\n`;
    }
    md += '\n';
  }

  writeFileSync(outputPath, md, 'utf-8');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatGapType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getMetricName(type: string): string {
  switch (type) {
    case 'net_sales_mismatch': return 'Net Sales';
    case 'gross_profit_mismatch': return 'Gross Profit';
    case 'cogs_mismatch': return 'Cost of Goods';
    case 'store_mismatch': return 'Store';
    default: return 'Unknown';
  }
}
