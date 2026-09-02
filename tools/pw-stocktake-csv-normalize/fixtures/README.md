# Stocktake CSV Fixtures

Test fixtures for `pw-stocktake-csv-normalize`. All fixtures contain synthetic data only (no real PII, stock levels, or business data).

## Fixtures

### generic-good.csv
- **Format:** Generic stocktake format
- **Rows:** 5 valid stocktake entries
- **Headers:** Store, Item, Qty, Unit, Date, Notes
- **Purpose:** Test successful normalization with optional fields
- **Expected:** 5 normalized, 0 rejected

### loyverse-like.csv
- **Format:** Loyverse-style inventory export
- **Rows:** 4 valid entries
- **Headers:** Store Name, Item Name, Quantity, Unit of Measure, Stocktake Date, Comment
- **Purpose:** Test Loyverse profile detection and aliasing
- **Expected:** 4 normalized, 0 rejected

### sparse-bad.csv
- **Format:** Generic format with intentional validation failures
- **Rows:** 5 entries with various issues
- **Issues:**
  - Row 1: Missing quantity (blank)
  - Row 2: Missing store (blank)
  - Row 3: Missing item (blank)
  - Row 4: Unparseable quantity ("abc")
  - Row 5: Missing unit (blank)
- **Purpose:** Test rejection handling and missing field detection
- **Expected:** 0 normalized, 5 rejected

## Running Tests

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run normalization on all fixtures
3. Generate reports in test output directories
4. Verify no build or runtime errors

## Validation

Each fixture run should produce:
- `stocktake-normalized.csv`
- `rejected.csv`
- `missing-fields.md`
- `APPROVAL.md`
- `manifest.json`
- `report.md`

## Safety Note

All fixture data is synthetic. No real stock levels, store names, or business data is included.
