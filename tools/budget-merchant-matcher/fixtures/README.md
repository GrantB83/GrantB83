# Budget Merchant Matcher Fixtures

This directory contains synthetic test data for the Budget Merchant Matcher CLI.

## Files

### `transactions.csv`

Sample transaction export with 15 synthetic transactions.

**Columns:**
- Date - Transaction date
- Merchant - Merchant name/description
- Amount - Transaction amount (synthetic values)

**Merchants included:**
- Acme Grocery Store (appears 3 times)
- QuickFuel Gas Station (appears 2 times)
- StreamFlix Monthly (appears 2 times)
- CloudHost Services (appears 2 times)
- ElectroPay Utility (appears 2 times)
- MegaMart Supermarket (appears 1 time)
- Unknown Coffee Shop (appears 1 time - unmatched)
- Mystery Vendor LLC (appears 1 time - unmatched)
- RandomPlace Store (appears 1 time - unmatched)

### `rules.csv` and `rules.json`

Known merchant classification rules in both CSV and JSON formats.

**Rules included:**
- `acme` → Grocery
- `megamart` → Grocery
- `quickfuel` → Fuel
- `streamflix` → Streaming
- `cloudhost` → Utilities
- `electropay` → Utilities
- `^stream` (regex) → Streaming

## Expected Results

When running the matcher with these fixtures:

- **Total Transactions:** 15
- **Matched:** 12 transactions
- **Unmatched:** 3 transactions (Unknown Coffee Shop, Mystery Vendor LLC, RandomPlace Store)
- **Match Rate:** 80%

## Usage

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run matching on these fixtures
3. Generate reports in `test-out/`
4. Display summary results

## Safety Note

All amounts in these fixtures are synthetic examples only. These values are for testing the CLI functionality and do not represent real financial data.
