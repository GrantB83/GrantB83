import { LoyverseSalesSummary, XeroProfitAndLoss, SummaryGapRecord, SummaryReconResult } from './types.js';

export function reconcileSummaries(
  loyverseSummaries: LoyverseSalesSummary[],
  xeroPLs: XeroProfitAndLoss[],
  threshold = 1.00
): SummaryReconResult {
  const gaps: SummaryGapRecord[] = [];
  const matched = new Set<string>();

  for (const loySummary of loyverseSummaries) {
    const storeName = normalizeStoreName(loySummary.storeName || '');
    
    const xeroPL = xeroPLs.find(x => normalizeStoreName(x.storeName || '') === storeName);

    if (!xeroPL) {
      gaps.push({
        type: 'store_mismatch',
        storeName: loySummary.storeName,
        loyverseSummary: loySummary,
        issue: `Loyverse store "${loySummary.storeName}" not found in Xero P&L data`,
        difference: 0
      });
      continue;
    }

    matched.add(storeName);

    const netSalesDiff = Math.abs(loySummary.netSales - xeroPL.totalTradingIncome);
    if (netSalesDiff >= threshold) {
      gaps.push({
        type: 'net_sales_mismatch',
        storeName: loySummary.storeName,
        loyverseSummary: loySummary,
        xeroPL: xeroPL,
        issue: `Net Sales mismatch for ${loySummary.storeName}: Loyverse ${loySummary.netSales.toFixed(2)} vs Xero ${xeroPL.totalTradingIncome.toFixed(2)}`,
        difference: parseFloat((loySummary.netSales - xeroPL.totalTradingIncome).toFixed(2))
      });
    }

    const grossProfitDiff = Math.abs(loySummary.grossProfit - xeroPL.grossProfit);
    if (grossProfitDiff >= threshold) {
      gaps.push({
        type: 'gross_profit_mismatch',
        storeName: loySummary.storeName,
        loyverseSummary: loySummary,
        xeroPL: xeroPL,
        issue: `Gross Profit mismatch for ${loySummary.storeName}: Loyverse ${loySummary.grossProfit.toFixed(2)} vs Xero ${xeroPL.grossProfit.toFixed(2)}`,
        difference: parseFloat((loySummary.grossProfit - xeroPL.grossProfit).toFixed(2))
      });
    }

    const cogsDiff = Math.abs(loySummary.costOfGoods - (xeroPL.costOfGoodsSold || xeroPL.totalCostOfSales));
    const xeroCogsValue = xeroPL.costOfGoodsSold || xeroPL.totalCostOfSales;
    if (cogsDiff >= threshold) {
      gaps.push({
        type: 'cogs_mismatch',
        storeName: loySummary.storeName,
        loyverseSummary: loySummary,
        xeroPL: xeroPL,
        issue: `Cost of Goods mismatch for ${loySummary.storeName}: Loyverse ${loySummary.costOfGoods.toFixed(2)} vs Xero ${xeroCogsValue.toFixed(2)}`,
        difference: parseFloat((loySummary.costOfGoods - xeroCogsValue).toFixed(2))
      });
    }
  }

  for (const xeroPL of xeroPLs) {
    const storeName = normalizeStoreName(xeroPL.storeName || '');
    if (!matched.has(storeName)) {
      gaps.push({
        type: 'store_mismatch',
        storeName: xeroPL.storeName,
        xeroPL: xeroPL,
        issue: `Xero P&L store "${xeroPL.storeName}" not found in Loyverse summaries`,
        difference: 0
      });
    }
  }

  const loyverseTotalNetSales = loyverseSummaries.reduce((sum, s) => sum + s.netSales, 0);
  const xeroTotalTradingIncome = xeroPLs.reduce((sum, x) => sum + x.totalTradingIncome, 0);

  return {
    gaps,
    storeCount: Math.max(loyverseSummaries.length, xeroPLs.length),
    loyverseTotalNetSales: parseFloat(loyverseTotalNetSales.toFixed(2)),
    xeroTotalTradingIncome: parseFloat(xeroTotalTradingIncome.toFixed(2)),
    totalDifference: parseFloat((loyverseTotalNetSales - xeroTotalTradingIncome).toFixed(2))
  };
}

function normalizeStoreName(name: string): string {
  const normalized = name.toLowerCase().trim();
  
  if (normalized.includes('louis') || normalized.includes('ltt') || normalized.includes('trichardt')) {
    return 'ltt';
  }
  if (normalized.includes('technical')) {
    return 'technical';
  }
  if (normalized.includes('thohoyandou') || normalized.includes('tnd')) {
    return 'tnd';
  }
  
  return normalized;
}
