# Test Fixtures for pw-bank-csv-normalize

All fixtures contain **synthetic data only**. No real account numbers, PII, or actual transaction data.

## Files

### generic-good.csv
- **Format:** Date, Reference, Amount, Description
- **Rows:** 5 valid transactions
- **Purpose:** Test basic normalization with standard headers
- **Expected:** 5 normalized, 0 rejected

### fnb-like.csv
- **Format:** Transaction Date, Reference, Debit, Credit, Description
- **Rows:** 5 transactions with debit/credit split
- **Purpose:** Test FNB-style split columns
- **Expected:** 5 normalized, 0 rejected
- **Sign convention:** Credits positive, debits negative

### standard-like.csv
- **Format:** Posting Date, Cheque Number, Withdrawal, Deposit, Particulars
- **Rows:** 5 transactions with withdrawal/deposit split
- **Purpose:** Test Standard Bank-style columns
- **Expected:** 5 normalized, 0 rejected

### debit-credit-split.csv
- **Format:** Date, Reference, Debit Amount, Credit Amount, Details
- **Rows:** 5 transactions with explicit debit/credit columns
- **Purpose:** Test combined debit/credit normalization
- **Expected:** 5 normalized, 0 rejected
- **Formula:** Amount = Credit - Debit

### sparse-bad.csv
- **Format:** Date, Reference, Amount, Description
- **Rows:** 5 transactions, 3 invalid
- **Purpose:** Test rejection logic
- **Expected:** 2 normalized, 3 rejected
- **Rejection reasons:**
  - Missing date
  - Missing amount
  - Invalid amount format

### xero-import.csv
- **Format:** Date, Amount, Payee, Description, Reference
- **Rows:** 5 transactions matching existing Xero import format
- **Purpose:** Test xero-import profile with Payee field
- **Expected:** 5 normalized, 0 rejected
- **Features:**
  - Payee preserved in optional column
  - Description = Payee | Description (or Payee alone if Description empty)
  - Includes "Yoko" variation (Yoco settlement)

## Amount Sign Convention

For debit/credit split columns:
- **Credits** (money-in / sales settlements): positive amounts
- **Debits** (money-out / fees): negative amounts
- **Formula:** `Amount = Credit - Debit`

Example:
- Debit: 100, Credit: 0 → Amount: -100.00
- Debit: 0, Credit: 500 → Amount: 500.00
- Debit: 10, Credit: 1000 → Amount: 990.00

## Running Tests

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run normalization on each fixture
3. Generate reports in `test-out/`, `test-out-fnb/`, `test-out-xero/`
4. Exit with code 0 (success)

## Safety Note

All fixtures are synthetic. No real bank data, account numbers, or PII.
