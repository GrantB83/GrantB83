# Summary/P&L Mode Fixtures

This directory contains synthetic test fixtures for the **summary/P&L reconciliation mode**.

## Files

### Loyverse Sales Summary CSVs
- `loyverse-ltt-sales-summary.csv` - Louis Trichardt / LTT store (5 days)
- `loyverse-technical-sales-summary.csv` - Technical store (5 days)
- `loyverse-tnd-sales-summary.csv` - Thohoyandou / TND store (5 days)

### Xero Profit & Loss CSVs
- `xero-ltt-pl.csv` - Louis Trichardt P&L (monthly totals)
- `xero-technical-pl.csv` - Technical P&L (monthly totals)
- `xero-thohoyandou-pl.csv` - Thohoyandou P&L (monthly totals)

## Expected Totals

### Louis Trichardt / LTT
- **Loyverse Net Sales:** 5,451.50
- **Xero Trading Income:** 5,451.50
- **Status:** ✅ Perfect match

### Technical
- **Loyverse Net Sales:** 10,046.25
- **Xero Trading Income:** 10,046.25
- **Status:** ✅ Perfect match

### Thohoyandou / TND
- **Loyverse Net Sales:** 4,572.50
- **Xero Trading Income:** 4,572.50
- **Status:** ✅ Perfect match

## Expected Gaps

With the default threshold of 1.00, **no gaps should be detected** as all stores reconcile perfectly.

If you lower the threshold to 0.01 or test with modified fixtures, the tool will detect:
- Net Sales mismatches
- Gross Profit mismatches
- Cost of Goods mismatches
- Store name mismatches (if a store exists in one system but not the other)

## Testing

Run summary mode on these fixtures:

```bash
npm run build
node dist/index.js --mode summary --loyverse fixtures/summary/ --xero fixtures/summary/ --output test-summary-out
```

Or test individual stores:

```bash
node dist/index.js --mode summary --loyverse fixtures/summary/loyverse-ltt-sales-summary.csv --xero fixtures/summary/xero-ltt-pl.csv --output test-summary-out
```

## CSV Formats

### Loyverse Sales Summary Format
```
Date,Gross sales,Refunds,Discounts,Net sales,Cost of goods,Gross profit,Margin,Taxes
8/1/26,1250.50,0,50.00,1200.50,480.20,720.30,60.00,180.08
```

- Dates use M/D/YY format (e.g., 8/31/26)
- One row per day
- Tool aggregates all rows for the month

### Xero Profit & Loss Format
```
Profit and Loss,
Perfect Water <Store Name>,
For the month ended 31 August 2026,
,Aug 2026
Trading Income,
Sales,<amount>
Total Trading Income,<amount>
Cost of Sales,
Cost of Goods Sold,<amount>
Total Cost of Sales,<amount>
Gross Profit,<amount>
...
```

- CSV export of screen-transcribed P&L
- Store name extracted from line 2
- Tool parses key metrics by label matching
