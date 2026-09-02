# Test Fixtures

These CSV files contain **synthetic, anonymized data** designed to demonstrate reconciliation gaps between Loyverse and Xero exports.

## Known Gaps in These Fixtures

The fixtures are intentionally created with the following mismatches:

### Unmatched Records

1. **Loyverse RCP-004** (2024-01-18, $45.75) - Missing in Xero
2. **Loyverse RCP-008** (2024-01-23, $92.30) - Missing in Xero
3. **Xero RCP-011** (2024-01-21, $275.00) - Missing in Loyverse
4. **Xero RCP-012** (2024-01-26, $95.50) - Missing in Loyverse

### Summary

- **Total Loyverse records:** 10
- **Total Xero records:** 10
- **Matched records:** 6
- **Expected gaps:** 4 (2 unmatched Loyverse + 2 unmatched Xero)

## File Format

### Loyverse CSV Format
```csv
Date,Receipt Number,Total Amount,Payment Type
2024-01-15,RCP-001,125.50,Card
```

### Xero CSV Format
```csv
Date,Reference,Amount,Description
2024-01-15,RCP-001,125.50,Card Payment - Customer Sale
```

## Usage

Run the reconciliation CLI against these fixtures:

```bash
npm run test:fixtures
```

This will generate gap reports in the `test-out/` directory.
