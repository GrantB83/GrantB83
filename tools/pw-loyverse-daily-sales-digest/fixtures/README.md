# Test Fixtures

This directory contains synthetic test data for `pw-loyverse-daily-sales-digest`.

## loyverse-day.csv

A sample Loyverse daily sales export with:

- **3 stores:** Louis Trichardt, Thohoyandou, Technical
- **10 rows** of sales data
- **Mix of products:** 5L Bottle, 10L Bottle, Filter Cartridge, Water Dispenser, Service Call, Installation

### Expected Digest Output

- **Total Stores:** 3
- **Total Unique Items:** 6
- **Total Quantity:** 99
- **Total Gross Sales:** 6140.00

### Store Breakdown

1. **Louis Trichardt:** 4 items, 47 quantity, 2315.00 total
2. **Technical:** 3 items, 19 quantity, 3000.00 total
3. **Thohoyandou:** 3 items, 33 quantity, 825.00 total

## Testing

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Process `fixtures/loyverse-day.csv`
3. Generate reports in `test-out/`
4. Exit with code 0 (success)

## Safety

✅ All amounts are synthetic  
✅ No real customer or sales data  
✅ Safe for git commit
