# Test Fixtures for pw-rejected-csv-digest

This directory contains test fixtures for the rejected CSV digest tool.

## Fixtures

### grv-rejected.csv
Sample rejected GRV (goods received voucher) rows from `pw-grv-csv-normalize`.
- 5 rows with various rejection reasons
- Missing Store, SKU, and Unit
- Unparseable quantity

### stocktake-rejected.csv
Sample rejected stocktake rows from `pw-stocktake-csv-normalize`.
- 3 rows with rejection reasons
- Missing Store and CountedQty
- Unparseable quantity

### dir-test/ (directory)
Directory containing multiple rejected CSV files for `--dir` testing.
- rejected-bank-001.csv
- rejected-ordered-vs-sold.csv

## Expected Behavior

Running the digest tool on these fixtures should:

1. **Parse all files successfully** - No parse errors
2. **Classify rejection reasons** - Group by reason with counts
3. **Generate DIGEST.md** - Numbered findings WITHOUT pasting actual amounts/quantities
4. **Generate reasons.json** - Machine-readable counts + sample indices
5. **Generate missing-headers.md** - Report any header issues
6. **Generate APPROVAL.md** - Safety checklist
7. **Generate manifest.json** - Full metadata
8. **Exit 0** - Success

## Test Commands

```bash
# Single file
npm run digest -- --csv fixtures/grv-rejected.csv --outdir test-out-single

# Multiple files
npm run digest -- \\
  --csv fixtures/grv-rejected.csv --label "GRV" \\
  --csv fixtures/stocktake-rejected.csv --label "Stocktake" \\
  --outdir test-out-multi

# Directory scan
npm run digest -- --dir fixtures/dir-test --outdir test-out-dir

# All fixtures (via npm script)
npm run test:fixtures
```

## Critical Assertions

For all test runs:

- ✅ DIGEST.md must NOT contain actual monetary amounts or quantity values in prose
- ✅ Amounts/quantities stay in the source files only
- ✅ Reason counts are correct
- ✅ No invented data
- ✅ Exit code 0 for valid inputs
