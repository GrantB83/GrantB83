import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseLoyverseSalesSummary, parseXeroProfitAndLoss } from './summary-parser.js';
import { reconcileSummaries } from './summary-reconciliation.js';

describe('Summary Reconciliation Tests', () => {
  it('should reconcile matching summaries without gaps', () => {
    const loySummaries = [
      parseLoyverseSalesSummary('fixtures/summary/loyverse-ltt-sales-summary.csv'),
      parseLoyverseSalesSummary('fixtures/summary/loyverse-technical-sales-summary.csv'),
      parseLoyverseSalesSummary('fixtures/summary/loyverse-tnd-sales-summary.csv')
    ];

    const xeroPLs = [
      parseXeroProfitAndLoss('fixtures/summary/xero-ltt-pl.csv'),
      parseXeroProfitAndLoss('fixtures/summary/xero-technical-pl.csv'),
      parseXeroProfitAndLoss('fixtures/summary/xero-thohoyandou-pl.csv')
    ];

    const result = reconcileSummaries(loySummaries, xeroPLs, 1.00);

    assert.equal(result.storeCount, 3);
    assert.equal(result.gaps.length, 0, 'Should have no gaps with threshold 1.00');
    assert.equal(result.loyverseTotalNetSales, 20070.25);
    assert.equal(result.xeroTotalTradingIncome, 20070.25);
    assert.equal(result.totalDifference, 0);
  });

  it('should detect net sales mismatch with low threshold', () => {
    const loySummaries = [
      { 
        storeName: 'Test Store',
        grossSales: 1000,
        refunds: 0,
        discounts: 0,
        netSales: 1000.00,
        costOfGoods: 400,
        grossProfit: 600,
        margin: 60,
        taxes: 150
      }
    ];

    const xeroPLs = [
      {
        storeName: 'Test Store',
        totalTradingIncome: 1000.50,
        totalCostOfSales: 400,
        grossProfit: 600.50,
        totalOperatingExpenses: 200,
        netProfit: 400.50
      }
    ];

    const result = reconcileSummaries(loySummaries, xeroPLs, 0.01);

    assert.ok(result.gaps.length > 0, 'Should detect mismatch with 0.01 threshold');
    const netSalesGap = result.gaps.find(g => g.type === 'net_sales_mismatch');
    assert.ok(netSalesGap, 'Should have net sales mismatch gap');
    assert.equal(netSalesGap?.difference, -0.50);
  });

  it('should detect store mismatch when store exists only in Loyverse', () => {
    const loySummaries = [
      { 
        storeName: 'Store A',
        grossSales: 1000,
        refunds: 0,
        discounts: 0,
        netSales: 1000,
        costOfGoods: 400,
        grossProfit: 600,
        margin: 60,
        taxes: 150
      }
    ];

    const xeroPLs = [
      {
        storeName: 'Store B',
        totalTradingIncome: 1000,
        totalCostOfSales: 400,
        grossProfit: 600,
        totalOperatingExpenses: 200,
        netProfit: 400
      }
    ];

    const result = reconcileSummaries(loySummaries, xeroPLs, 1.00);

    assert.equal(result.gaps.length, 2, 'Should have 2 store mismatch gaps');
    assert.ok(result.gaps.every(g => g.type === 'store_mismatch'));
  });

  it('should normalize store names correctly', () => {
    const loySummaries = [
      { 
        storeName: 'Louis Trichardt',
        grossSales: 1000,
        refunds: 0,
        discounts: 0,
        netSales: 1000,
        costOfGoods: 400,
        grossProfit: 600,
        margin: 60,
        taxes: 150
      }
    ];

    const xeroPLs = [
      {
        storeName: 'Perfect Water LTT',
        totalTradingIncome: 1000,
        totalCostOfSales: 400,
        grossProfit: 600,
        totalOperatingExpenses: 200,
        netProfit: 400
      }
    ];

    const result = reconcileSummaries(loySummaries, xeroPLs, 1.00);

    assert.equal(result.gaps.length, 0, 'Should match LTT variations');
  });

  it('should calculate total differences correctly', () => {
    const loySummaries = [
      { 
        storeName: 'Store 1',
        grossSales: 1000,
        refunds: 0,
        discounts: 0,
        netSales: 1000,
        costOfGoods: 400,
        grossProfit: 600,
        margin: 60,
        taxes: 150
      },
      { 
        storeName: 'Store 2',
        grossSales: 2000,
        refunds: 0,
        discounts: 0,
        netSales: 2000,
        costOfGoods: 800,
        grossProfit: 1200,
        margin: 60,
        taxes: 300
      }
    ];

    const xeroPLs = [
      {
        storeName: 'Store 1',
        totalTradingIncome: 995,
        totalCostOfSales: 400,
        grossProfit: 595,
        totalOperatingExpenses: 200,
        netProfit: 395
      },
      {
        storeName: 'Store 2',
        totalTradingIncome: 2005,
        totalCostOfSales: 800,
        grossProfit: 1205,
        totalOperatingExpenses: 400,
        netProfit: 805
      }
    ];

    const result = reconcileSummaries(loySummaries, xeroPLs, 1.00);

    assert.equal(result.loyverseTotalNetSales, 3000);
    assert.equal(result.xeroTotalTradingIncome, 3000);
    assert.equal(result.totalDifference, 0);
    assert.ok(result.gaps.length > 0, 'Should detect individual store mismatches');
  });
});
