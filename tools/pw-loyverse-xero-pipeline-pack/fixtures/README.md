# Fixtures for pw-loyverse-xero-pipeline-pack

This directory contains synthetic test fixtures for the Perfect Water Loyverse↔Xero reconciliation pipeline pack tool.

## Files

### loyverse-sales.csv
Synthetic Loyverse POS receipts (10 records)
- Contains Date, Receipt Number, Total Amount, Payment Type
- Receipt mode format

### xero-sales.csv
Synthetic Xero bank transactions (10 records)
- Contains Date, Reference, Amount, Description
- Receipt mode format

## Test Data Characteristics

**Matches (6):**
- RCP-001, RCP-002, RCP-003, RCP-005, RCP-006, RCP-007, RCP-009, RCP-010

**Gaps (4):**
- RCP-004 (in Loyverse, not in Xero)
- RCP-008 (in Loyverse, not in Xero)
- RCP-011 (in Xero, not in Loyverse)
- RCP-012 (in Xero, not in Xero)

**Totals:**
- Loyverse: 10 records, 1685.04 total
- Xero: 10 records, 1912.49 total
- Difference: -227.45

## Usage

Run the test:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run receipt mode reconciliation on fixtures/
3. Generate pipeline pack in test-out/
4. Auto-build loyverse-xero-recon sibling if needed
5. Exit with code 0 (success)

## Notes

- All amounts and receipt numbers are synthetic
- No real Perfect Water transaction data
- Designed to test pipeline orchestration, not reconciliation logic
- Reconciliation logic is tested in loyverse-xero-recon sibling tool
