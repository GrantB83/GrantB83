# Fixtures for ledger-month-close-pack

This directory contains synthetic test data for the month-close pack tool.

## Test CSVs

### exports/budget-jan-2024.csv
- 5 transactions from January 2024
- Headers: Date, Merchant, Amount, Category
- Includes one "Unknown Coffee Shop" (simulated unmatched merchant)
- Total amount: $446.39

### exports/bank-statement-jan.csv
- 4 entries (1 opening balance + 3 transactions)
- Headers: Date, Description, Amount, Balance
- Simulates bank CSV format

### exports/receipts.csv
- 3 receipt entries
- Headers: Date, Vendor, Total
- Different header names to test flexibility

## Test Scenarios

### Basic Usage
```bash
npm run pack -- --month 2024-01 --exports-dir fixtures/exports --outdir test-out
```

Expected output:
- 3 CSV files discovered
- Total size ~600-800 bytes
- All files have date headers
- inventory.json, inventory.md, CLOSE.md, APPROVAL.md, manifest.json generated

### With Required Headers
```bash
npm run pack -- --month 2024-01 --exports-dir fixtures/exports --outdir test-out --require-headers Date,Amount
```

Expected behavior:
- receipts.csv flagged for missing "Amount" header (has "Total" instead)
- Warning in CLOSE.md about missing headers

### With Unmatched Queue
```bash
npm run pack -- --month 2024-01 --exports-dir fixtures/exports --outdir test-out --unmatched-queue path/to/queue.md
```

Expected behavior:
- Copies provided queue.md into pack
- CLOSE.md references unmatched queue

## Safety Verification

After running test:fixtures, verify:
1. ✅ No amount values appear in inventory.md prose (only in table filenames)
2. ✅ Only header rows are recorded, not full CSV content
3. ✅ File sizes and mtimes are correct
4. ✅ APPROVAL.md includes all safety gates
5. ✅ manifest.json has correct structure

## Amounts in Fixtures

**Note:** These CSV fixtures contain dollar amounts because they are test data files. The tool's safety rule is:
- ✅ Amounts allowed in CSV files (source data)
- ❌ Amounts NOT allowed in generated markdown prose

The tool extracts only headers and filenames, never printing amount values in inventory.md or CLOSE.md text.
