# Test Fixtures for pw-grv-csv-normalize

This directory contains test CSV files for validating the GRV normalizer.

## Files

### generic-good.csv

Clean generic GRV CSV with common column names:
- Store, Item, Qty, Unit, Date, Supplier, Doc No
- 4 valid rows covering both stores (LT, Tho)
- Should normalize successfully with 0 rejections

### loyverse-like.csv

Loyverse-style goods-received export:
- Outlet, Item, Quantity, Unit, Date, Supplier, Receipt Number, Note
- 4 valid rows with notes
- Should detect as "loyverse" profile
- Should normalize successfully with 0 rejections

### sparse-bad.csv

Intentionally broken CSV to test rejection logic:
- Row 1: Missing Store (blank)
- Row 2: Missing Item (blank)
- Row 3: Missing Qty (blank) + extra column "unit" in wrong place
- Row 4: Unparseable Qty ("abc")
- Row 5: Missing Unit (blank)
- Should reject all 5 rows with specific reasons

## Running Tests

```bash
# From tools/pw-grv-csv-normalize/
npm run test:fixtures
```

This will:
1. Build TypeScript
2. Normalize generic-good.csv → test-out/
3. Normalize loyverse-like.csv → test-out-loyverse/
4. Normalize sparse-bad.csv → test-out-bad/
5. Echo success message

Expected results:
- generic-good: 4 normalized, 0 rejected
- loyverse-like: 4 normalized, 0 rejected
- sparse-bad: 0 normalized, 5 rejected
