# CSV Fixture Harness Test Fixtures

This directory contains sample CSV files for testing the validation tool.

## Good Fixtures

### `good.csv`
- 10 rows of valid transaction data
- All required headers present (Date, Amount, Merchant, Category, Notes)
- No currency violations in Notes column
- No excessive blank cells
- **Expected result:** PASS

## Bad Fixtures

### `bad-missing-headers.csv`
- Missing the `Amount` header
- Only 3 columns instead of expected 5
- **Expected result:** FAIL (missing required header: Amount)

### `bad-few-rows.csv`
- Only 2 data rows
- When validated with `--min-rows 5`, should fail
- **Expected result:** FAIL (insufficient rows when min-rows check is applied)

### `bad-currency-in-notes.csv`
- Notes column contains currency-like values: $50, R75, ZAR 100, USD 250, 45.99
- These should be flagged when using `--forbid-currency-in Notes`
- **Expected result:** FAIL (5 currency violations in Notes column)

### `bad-blank-heavy.csv`
- Category and Notes columns are 100% blank
- Should trigger warnings about blank-heavy columns
- **Expected result:** PASS with warnings (blank columns don't fail validation, they warn)

## Test Commands

### Test good fixture
```bash
npm run check -- --csv fixtures/good.csv --require-headers Date,Amount --min-rows 5
# Expected: PASS (exit code 0)
```

### Test missing headers
```bash
npm run check -- --csv fixtures/bad-missing-headers.csv --require-headers Date,Amount
# Expected: FAIL (exit code 1, missing Amount header)
```

### Test insufficient rows
```bash
npm run check -- --csv fixtures/bad-few-rows.csv --min-rows 5
# Expected: FAIL (exit code 1, only 2 rows but need 5)
```

### Test currency violations
```bash
npm run check -- --csv fixtures/bad-currency-in-notes.csv --forbid-currency-in Notes
# Expected: FAIL (exit code 1, 5 currency violations)
```

### Test blank-heavy columns
```bash
npm run check -- --csv fixtures/bad-blank-heavy.csv
# Expected: PASS with warnings (exit code 0, but warnings about blank columns)
```

## Fixture Design Principles

1. **No real data** - All merchant names, amounts, and details are synthetic
2. **Demonstrative** - Each bad fixture demonstrates exactly one failure mode
3. **Minimal** - Small enough to review by eye, large enough to be realistic
4. **Documented** - Expected results clearly stated
