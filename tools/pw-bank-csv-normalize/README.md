# Bank CSV Normalizer for Perfect Water

An offline command-line tool that normalizes South African bank statement CSVs and settlement files into a standard Xero-shaped format for receipt reconciliation. Supports FNB, Standard Bank, ABSA, Nedbank, PayFast, Yoco, and generic bank exports, plus existing Xero import files.

## Features

- 📊 **CSV-based normalization** - Offline, no API keys required
- 🔍 **Auto-detect delimiter** - Comma, semicolon, or tab
- 🎯 **Multiple bank profiles** - FNB, Standard, ABSA, Nedbank, PayFast, Yoco, generic, xero-import
- 📅 **Date normalization** - Handles DD/MM/YYYY, YYYY-MM-DD, and other SA formats
- 💰 **Smart amount parsing** - Single amount column or debit/credit split
- 🚫 **Never invents amounts** - Blank/unparseable → rejected.csv
- ✅ **Fully tested** - Automated tests with synthetic fixtures
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Purpose

Perfect Water already has `tools/loyverse-xero-recon` with receipt mode that expects Xero bank export columns: `Date`, `Reference`, `Amount`, `Description`. Real SA bank statement CSVs often have different headers and sign conventions. This tool normalizes those bank/settlement CSVs into the receipt-mode Xero-shaped CSV format.

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-bank-csv-normalize
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## Usage

### Basic Command

```bash
npm run normalize -- --input <bank.csv> --outdir <output-dir> [--profile <profile>]
```

### Examples

**Auto-detect format:**
```bash
npm run normalize -- --input bank-statement.csv --outdir out/
```

**Specific bank profile:**
```bash
npm run normalize -- --input fnb-export.csv --outdir out/ --profile fnb
```

**Xero import format:**
```bash
npm run normalize -- --input xero-bank-import.csv --outdir out/ --profile xero-import
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--input` | `-i` | Input bank CSV file | ✅ Yes | - |
| `--outdir` | `-o` | Output directory | ✅ Yes | - |
| `--profile` | `-p` | Bank profile (see below) | No | `auto` |
| `--help` | `-h` | Show help message | No | - |

### Profiles

| Profile | Description | Common Headers |
|---------|-------------|----------------|
| `auto` | Auto-detect from headers (default) | Any combination |
| `fnb` | FNB bank statement | Transaction Date, Reference, Debit, Credit |
| `standard` | Standard Bank statement | Posting Date, Cheque Number, Withdrawal, Deposit |
| `absa` | ABSA bank statement | Date, Transaction Reference, Debit, Credit |
| `nedbank` | Nedbank statement | Date, Trace Number, Debit, Credit |
| `payfast` | PayFast settlement export | Date, Payment Reference, Amount, Merchant |
| `yoco` | Yoco settlement export | Date, Receipt Number, Amount, Merchant |
| `generic` | Generic bank CSV | Date, Reference, Amount, Description |
| `xero-import` | Existing Xero import format | Date, Amount, Payee, Description, Reference |

## Amount Sign Convention

For CSVs with separate Debit/Credit or Withdrawal/Deposit columns:

- **Credits** (money-in / sales settlements): **positive amounts**
- **Debits** (money-out / fees): **negative amounts**
- **Formula:** `Amount = Credit - Debit`

Example:
- Debit: R100, Credit: R0 → Amount: -100.00
- Debit: R0, Credit: R500 → Amount: 500.00
- Debit: R10, Credit: R1000 → Amount: 990.00

## Normalization Logic

### 1. Delimiter Detection

Auto-detects CSV delimiter:
- Comma (`,`)
- Semicolon (`;`)
- Tab (`\t`)

### 2. Column Mapping

Flexible header aliases map to canonical columns:

| Canonical | Aliases |
|-----------|---------|
| **Date** | date, transaction date, posting date, value date, settlement date |
| **Reference** | reference, ref, transaction reference, cheque number, trace number, transaction id, receipt number |
| **Amount** | amount, transaction amount, value, net amount, settlement amount |
| **Debit** | debit, debit amount, withdrawal, fee |
| **Credit** | credit, credit amount, deposit |
| **Description** | description, details, narrative, particulars, merchant |
| **Payee** | payee, beneficiary, recipient, merchant (xero-import profile) |
| **Store** | store, location, branch (optional) |

### 3. Date Normalization

Converts to `YYYY-MM-DD`:
- `DD/MM/YYYY` → `YYYY-MM-DD`
- `DD-MM-YYYY` → `YYYY-MM-DD`
- `YYYY/MM/DD` → `YYYY-MM-DD`
- `YYYY-MM-DD` → (unchanged)

### 4. Amount Parsing

- Removes spaces, commas, and currency symbols (R, $)
- Parses as decimal number
- Combines Debit/Credit columns if present: `Amount = Credit - Debit`
- **Never invents amounts** - blank/unparseable → `rejected.csv`

### 5. Reference Handling

- Prefers dedicated Reference/Trace/Transaction ID column
- Falls back to first 50 chars of Description if Reference missing
- **Never invents references** - if both missing, row → `rejected.csv`

### 6. Description and Payee (xero-import profile)

When using `--profile xero-import` or when Payee column is present:

- **Description output:** `Payee | Description` (if both present), or `Payee` alone (if Description empty)
- **Payee preservation:** Optional `Payee` column retained in extended output
- **Xero-compatible output:** Strict 4-column `xero-bank-normalized.csv` (Date, Reference, Amount, Description) ready for loyverse-xero-recon

**Example:**
- Input: Payee="Yoko", Description="CREDIT TRANSFER YOCO SETTLEMENT"
- Output Description: "Yoko | CREDIT TRANSFER YOCO SETTLEMENT"

**Note:** Yoco settlements often appear as Payee "Yoko" or Description containing "CREDIT TRANSFER YOCO" — these are passed through as-is, never rewritten.

## Output Files

The CLI generates six files in the specified output directory:

### 1. `xero-bank-normalized.csv`

**Strict 4-column format ready for loyverse-xero-recon:**

```csv
Date,Reference,Amount,Description
2024-01-15,TXN001,1234.56,Payment from ACME Corp
2024-01-16,TXN002,-50.00,Bank charges
```

**Headers:** `Date,Reference,Amount,Description` (exactly as loyverse-xero-recon expects)

### 2. `rejected.csv`

Rows that failed validation with rejection reasons:

```csv
reason,Date,Reference,Amount,Description
missing date,,REF001,100.00,Test transaction
missing or unparseable amount,2024-01-15,REF002,,Invalid row
```

### 3. `missing-fields.md`

Human-readable report of missing fields:

```markdown
# Missing Fields Report

The following fields were missing or unparseable in rejected rows:

- Date
- Amount
```

### 4. `APPROVAL.md`

Safety checklist for manual review before using output:

- Offline operation verified
- No invented amounts
- File-based amounts only
- Read-only (no write-back)

### 5. `manifest.json`

Machine-readable metadata:

```json
{
  "tool": "pw-bank-csv-normalize",
  "version": "1.0.0",
  "inputFile": "bank-statement.csv",
  "profile": "fnb",
  "delimiter": "comma",
  "timestamp": "2024-09-02T01:00:00.000Z",
  "totalRows": 100,
  "normalizedRows": 98,
  "rejectedRows": 2
}
```

### 6. `report.md`

Summary report with statistics and next steps:

```markdown
# Bank CSV Normalization Report

## Results

- **Total Rows:** 100
- **Normalized Rows:** 98
- **Rejected Rows:** 2
- **Success Rate:** 98.0%

## Next Steps

1. Review rejected.csv for critical missing transactions
2. Use xero-bank-normalized.csv with loyverse-xero-recon
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Date format variations
- Amount parsing with spaces/commas
- Debit/credit split columns
- Missing field validation
- Reference fallback logic
- Payee field handling (xero-import profile)

### Test with Fixtures

The tool includes synthetic test fixtures (no real PII or account numbers):

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run normalization on multiple fixtures (generic, FNB-like, xero-import)
3. Generate reports in `test-out/`, `test-out-fnb/`, `test-out-xero/`
4. Exit with code 0 (success)

**Fixtures included:**
- `generic-good.csv` - 5 valid transactions with standard headers
- `fnb-like.csv` - 5 transactions with Debit/Credit columns
- `standard-like.csv` - 5 transactions with Withdrawal/Deposit columns
- `debit-credit-split.csv` - 5 transactions with explicit split
- `sparse-bad.csv` - 5 rows with 3 intentional validation failures
- `xero-import.csv` - 5 transactions matching Xero import format with Payee

See `fixtures/README.md` for details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Integration with loyverse-xero-recon

This tool's output feeds directly into the Perfect Water receipt reconciliation workflow:

```bash
# Step 1: Normalize bank CSV
cd tools/pw-bank-csv-normalize
npm run normalize -- --input bank-jan.csv --outdir normalized/

# Step 2: Reconcile with Loyverse
cd ../loyverse-xero-recon
npm run recon -- --mode receipt \
  --loyverse exports/loyverse-jan.csv \
  --xero ../pw-bank-csv-normalize/normalized/xero-bank-normalized.csv \
  --output recon-reports/
```

## Project Structure

```
tools/pw-bank-csv-normalize/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── profiles.ts             # Bank profile configurations
│   ├── csv-parser.ts           # CSV parsing and delimiter detection
│   ├── normalizer.ts           # Normalization logic
│   ├── report-generator.ts     # Report generation
│   └── normalizer.test.ts      # Normalization tests
├── fixtures/
│   ├── generic-good.csv        # Valid generic transactions
│   ├── fnb-like.csv            # FNB-style debit/credit split
│   ├── standard-like.csv       # Standard Bank format
│   ├── debit-credit-split.csv  # Explicit split columns
│   ├── sparse-bad.csv          # Invalid rows for rejection testing
│   ├── xero-import.csv         # Xero import format with Payee
│   └── README.md               # Fixture documentation
├── dist/                       # Compiled JavaScript (generated)
├── test-out/                   # Test outputs (generated)
├── package.json
├── tsconfig.json
└── README.md                   # This file
```

## Limitations & Safety

- ✅ **Offline only** - No API calls, no network requests
- ✅ **No secrets** - No credentials or tokens required
- ✅ **No invented amounts** - Blank/unparseable → rejected.csv
- ✅ **No invented references** - Missing reference → rejected.csv (unless fallback possible)
- ✅ **File-based** - All amounts stay in CSV files
- ✅ **Read-only** - No write-back to bank systems

**Safety Note:** This tool never invents, estimates, or fabricates amounts or references. All outputs are derived directly from the source CSV. Keep amounts in files, not chat. Review APPROVAL.md before using output.

## Troubleshooting

### "CSV file must have at least a header row and one data row" error

Ensure your CSV has:
- A header row
- At least one data row
- Valid content (not empty)

### High rejection rate

Check `rejected.csv` and `missing-fields.md` for:
- Missing Date column or invalid date formats
- Missing Amount/Debit/Credit columns
- Missing Description/Payee columns

### Amount sign issues

For debit/credit splits:
- Verify which column represents money-in (credits should be positive)
- Check if your bank uses Withdrawal/Deposit instead of Debit/Credit
- Use `--profile` to specify your bank format

### Wrong delimiter detected

The tool auto-detects comma, semicolon, or tab. If detection fails, your CSV may have mixed delimiters (not supported).

### Yoco/PayFast variations

Yoco settlements may appear as:
- Payee: "Yoko" (common misspelling)
- Description: "CREDIT TRANSFER YOCO"
- Payee: "Yoco"

All variations are passed through as-is. This tool does not rewrite or normalize merchant names.

## Example Output

### Terminal Output

```
Bank CSV Normalizer for Perfect Water

Reading input file: bank-statement.csv
  ✓ Loaded 150 rows
  ✓ Detected delimiter: comma
  ✓ Using profile: fnb

Normalizing rows...
  ✓ Normalized: 148
  ✓ Rejected: 2

Generating reports...
  ✓ xero-bank-normalized.csv
  ✓ rejected.csv
  ✓ missing-fields.md
  ✓ APPROVAL.md
  ✓ manifest.json
  ✓ report.md

✅ Normalization complete!

⚠️  2 row(s) were rejected. See rejected.csv for details.
```

### Output File Sample

**xero-bank-normalized.csv:**
```csv
Date,Reference,Amount,Description
2024-01-15,FNB001,1500.00,CREDIT TRANSFER FROM CLIENT A
2024-01-16,FNB002,-50.00,BANK CHARGES
2024-01-17,FNB003,2000.00,PAYMENT RECEIVED - INV123
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
