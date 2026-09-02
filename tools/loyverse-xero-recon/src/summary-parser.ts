import { readFileSync } from 'fs';
import { LoyverseSalesSummary, XeroProfitAndLoss } from './types.js';

export function parseLoyverseSalesSummary(
  filePath: string,
  storeNameHint?: string
): LoyverseSalesSummary {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('Empty Loyverse Sales Summary CSV file');
  }

  const header = lines[0].toLowerCase();
  
  if (!header.includes('date') || !header.includes('net sales')) {
    throw new Error('Invalid Loyverse Sales Summary format. Expected columns: Date, Gross sales, Refunds, Discounts, Net sales, Cost of goods, Gross profit, Margin, Taxes');
  }

  let grossSales = 0;
  let refunds = 0;
  let discounts = 0;
  let netSales = 0;
  let costOfGoods = 0;
  let grossProfit = 0;
  let taxes = 0;
  let recordCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    
    if (parts.length < 9) {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
      continue;
    }

    grossSales += parseAmount(parts[1]);
    refunds += parseAmount(parts[2]);
    discounts += parseAmount(parts[3]);
    netSales += parseAmount(parts[4]);
    costOfGoods += parseAmount(parts[5]);
    grossProfit += parseAmount(parts[6]);
    taxes += parseAmount(parts[8]);
    recordCount++;
  }

  const margin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const summary: LoyverseSalesSummary = {
    storeName: storeNameHint || inferStoreNameFromPath(filePath),
    grossSales: parseFloat(grossSales.toFixed(2)),
    refunds: parseFloat(refunds.toFixed(2)),
    discounts: parseFloat(discounts.toFixed(2)),
    netSales: parseFloat(netSales.toFixed(2)),
    costOfGoods: parseFloat(costOfGoods.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    margin: parseFloat(margin.toFixed(2)),
    taxes: parseFloat(taxes.toFixed(2))
  };

  console.log(`  ✓ Aggregated ${recordCount} daily records for ${summary.storeName}`);

  return summary;
}

export function parseXeroProfitAndLoss(filePath: string): XeroProfitAndLoss {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 3) {
    throw new Error('Invalid Xero Profit & Loss CSV file');
  }

  let storeName: string | undefined;
  let totalTradingIncome = 0;
  let totalCostOfSales = 0;
  let grossProfit = 0;
  let totalOperatingExpenses = 0;
  let netProfit = 0;
  let otherRevenue: number | undefined;
  let sales: number | undefined;
  let costOfGoodsSold: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);

    if (i === 1 && parts[0] && parts[0].toLowerCase().includes('perfect water')) {
      storeName = parts[0].trim();
    }

    const label = parts[0]?.toLowerCase() || '';
    const value = parts[1]?.trim() || '';

    if (label === 'other revenue') {
      otherRevenue = parseAmount(value);
    } else if (label === 'sales') {
      sales = parseAmount(value);
    } else if (label === 'total trading income') {
      totalTradingIncome = parseAmount(value);
    } else if (label === 'cost of goods sold') {
      costOfGoodsSold = parseAmount(value);
    } else if (label === 'total cost of sales') {
      totalCostOfSales = parseAmount(value);
    } else if (label === 'gross profit') {
      grossProfit = parseAmount(value);
    } else if (label === 'total operating expenses') {
      totalOperatingExpenses = parseAmount(value);
    } else if (label === 'net profit') {
      netProfit = parseAmount(value);
    }
  }

  if (totalTradingIncome === 0 && grossProfit === 0) {
    throw new Error('Could not parse Xero P&L - no trading income or gross profit found');
  }

  return {
    storeName,
    totalTradingIncome,
    totalCostOfSales,
    grossProfit,
    totalOperatingExpenses,
    netProfit,
    otherRevenue,
    sales,
    costOfGoodsSold
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseAmount(amountStr: string): number {
  if (!amountStr || amountStr.trim() === '') {
    return 0;
  }
  
  const cleaned = amountStr.trim().replace(/[,$]/g, '');
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    return 0;
  }
  
  return amount;
}

function inferStoreNameFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';
  
  if (fileName.includes('ltt') || fileName.includes('louis') || fileName.includes('trichardt')) {
    return 'Louis Trichardt / LTT';
  }
  if (fileName.includes('technical')) {
    return 'Technical';
  }
  if (fileName.includes('thohoyandou') || fileName.includes('tnd')) {
    return 'Thohoyandou / TND';
  }
  
  return 'Unknown Store';
}
