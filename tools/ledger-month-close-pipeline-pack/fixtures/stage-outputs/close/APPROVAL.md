# Month-Close Approval Gates

**Month:** 2024-01

## What This Pack Contains

- CSV inventory from exports directory
- Header validation results
- Unmatched merchant queue pointer
- Month-close sanity checklist

## What Ledger Owns

- ✅ Manual research for unmatched merchants
- ✅ Verification of CSV data against source exports
- ✅ Requesting H2 approval before sheet writes
- ✅ Manual Google Sheet updates after approval

## What Coding/CoS Never Does

- ❌ Write Budget sheet directly (Ledger owns sheet writes)
- ❌ Invent amounts or merchant identities
- ❌ Auto-categorize transactions
- ❌ Bypass H2 approval gate
- ❌ Call Google Sheets API (offline only)

## H2 Approval Required

Before any Google Sheet writes:

1. Review all CSV files and headers
2. Complete unmatched merchant research
3. Verify alias suggestions
4. Request: "APPROVE ALIAS UPDATES"
5. Wait for Grant's approval response
6. Ledger manually updates sheet after approval

## Hard Constraints

- **Offline only** - No Google Sheets API or network calls
- **H2 before writes** - Human approval gate enforced
- **Amounts stay in files** - Never paste transaction amounts into digest prose
- **Ledger owns sheet** - Coding/CoS never write Budget directly
