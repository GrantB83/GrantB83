# Month-Close Pack Approval Gates

## Safety Rules

1. **Ledger owns sheet writes** - Coding/CoS never writes directly to Google Sheets
2. **No invented amounts** - All monetary values come from source CSVs only
3. **No payments** - This is a reconciliation pack, not a payment system
4. **Manual verification required** - Review all reports before any sheet updates

## Required Approvals

- **H2:** Required before any Google Sheet writes or merchant rule changes
- **Ledger review:** All amounts must be verified against source CSVs

## What This Pack Contains

- **inventory.json** - Machine-readable CSV file metadata
- **inventory.md** - Human-readable inventory (filenames, sizes, headers only)
- **CLOSE.md** - Month-close checklist
- **APPROVAL.md** - This file (safety gates)
- **manifest.json** - Pack metadata
- **unmatched-queue.md** - Unmatched merchants (if provided via --unmatched-queue)

## What This Pack Does NOT Contain

- ❌ Amount values in markdown prose (amounts stay in CSVs only)
- ❌ Invented or estimated amounts
- ❌ Payment instructions
- ❌ Auto-write capabilities to sheets
