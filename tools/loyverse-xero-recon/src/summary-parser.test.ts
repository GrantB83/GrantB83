import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseLoyverseSalesSummary, parseXeroProfitAndLoss } from './summary-parser.js';

describe('Summary Parser Tests', () => {
  it('should parse Loyverse Sales Summary CSV', () => {
    const summary = parseLoyverseSalesSummary('fixtures/summary/loyverse-ltt-sales-summary.csv');
    
    assert.ok(summary, 'Summary should be parsed');
    assert.equal(summary.netSales, 5451.50);
    assert.equal(summary.grossSales, 5671.50);
    assert.equal(summary.costOfGoods, 2180.60);
    assert.equal(summary.grossProfit, 3270.90);
    assert.ok(summary.storeName, 'Store name should be inferred');
  });

  it('should parse Xero P&L CSV', () => {
    const pl = parseXeroProfitAndLoss('fixtures/summary/xero-ltt-pl.csv');
    
    assert.ok(pl, 'P&L should be parsed');
    assert.equal(pl.totalTradingIncome, 5451.50);
    assert.equal(pl.totalCostOfSales, 2180.60);
    assert.equal(pl.grossProfit, 3270.90);
    assert.equal(pl.netProfit, 720.90);
    assert.ok(pl.storeName, 'Store name should be extracted');
    assert.ok(pl.storeName?.includes('Louis Trichardt'), 'Store name should be Louis Trichardt');
  });

  it('should parse Technical store Loyverse summary', () => {
    const summary = parseLoyverseSalesSummary('fixtures/summary/loyverse-technical-sales-summary.csv');
    
    assert.equal(summary.netSales, 10046.25);
    assert.equal(summary.costOfGoods, 4018.50);
    assert.equal(summary.grossProfit, 6027.75);
  });

  it('should parse Technical store Xero P&L', () => {
    const pl = parseXeroProfitAndLoss('fixtures/summary/xero-technical-pl.csv');
    
    assert.equal(pl.totalTradingIncome, 10046.25);
    assert.equal(pl.otherRevenue, 100.00);
    assert.equal(pl.sales, 9946.25);
    assert.ok(pl.storeName?.includes('Technical'), 'Store name should be Technical');
  });

  it('should parse Thohoyandou store files', () => {
    const summary = parseLoyverseSalesSummary('fixtures/summary/loyverse-tnd-sales-summary.csv');
    const pl = parseXeroProfitAndLoss('fixtures/summary/xero-thohoyandou-pl.csv');
    
    assert.equal(summary.netSales, 4572.50);
    assert.equal(pl.totalTradingIncome, 4572.50);
    assert.ok(pl.storeName?.includes('Thohoyandou'), 'Store name should be Thohoyandou');
  });

  it('should handle missing or zero values gracefully', () => {
    const pl = parseXeroProfitAndLoss('fixtures/summary/xero-ltt-pl.csv');
    
    assert.equal(pl.otherRevenue, undefined);
    assert.ok(pl.totalTradingIncome > 0);
  });
});
