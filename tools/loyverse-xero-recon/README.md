# Loyverse ↔ Xero Reconciliation Gap CLI

An offline command-line tool that reconciles Loyverse POS sales data with Xero accounting records, identifying mismatches, unmatched transactions, and duplicates.

## Features

- 📊 **CSV-based reconciliation** - No API keys or OAuth required
- 🔍 **Two reconciliation modes**:
  - **Receipt mode** - Matches individual Loyverse receipts with Xero bank transactions
  - **Summary mode** - Reconciles Loyverse Sales Summary (daily aggregates) with Xero P&L reports
- 🔍 **Gap detection** - Finds unmatched records, date mismatches, amount discrepancies, and duplicates
- 📝 **Dual output** - Generates both CSV (for spreadsheets) and Markdown (for readable reports)
- ✅ **Fully tested** - Includes automated tests and synthetic fixtures
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/loyverse-xero-recon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## Exporting Data

### Receipt Mode: From Loyverse

1. Log in to your **Loyverse Back Office** (https://backend.loyverse.com)
2. Navigate to **Reports** → **Sales**
3. Select your date range
4. Click **Export** → **CSV**
5. Save the file (e.g., `loyverse-sales.csv`)

**Required columns:**
- Date
- Receipt Number
- Total Amount
- Payment Type

### Receipt Mode: From Xero

1. Log in to **Xero** (https://login.xero.com)
2. Go to **Accounting** → **Bank Accounts**
3. Select your sales/merchant account
4. Click **Export** (top right) → **CSV**
5. Save the file (e.g., `xero-sales.csv`)

**Required columns:**
- Date
- Reference
- Amount
- Description

### Summary Mode: From Loyverse

1. Log in to your **Loyverse Back Office**
2. Navigate to **Reports** → **Sales Summary**
3. Select your date range (typically one month)
4. Click **Export** → **CSV**
5. Save one file per store (e.g., `ltt-sales-summary.csv`)

**Required columns:**
- Date (format: M/D/YY)
- Gross sales
- Refunds
- Discounts
- Net sales
- Cost of goods
- Gross profit
- Margin
- Taxes

### Summary Mode: From Xero

1. Log in to **Xero**
2. Navigate to **Reports** → **Profit and Loss**
3. Select your store and date range (monthly)
4. Export or copy the P&L report to CSV
5. Save one file per store (e.g., `ltt-pl.csv`)

**Required structure:**
- Line 2: Store name (e.g., "Perfect Water Louis Trichardt")
- Lines with labels: "Sales", "Total Trading Income", "Cost of Goods Sold", "Total Cost of Sales", "Gross Profit", "Total Operating Expenses", "Net Profit"

**Note:** When bank statement exports or receipt-level data are unavailable, use Summary mode with Sales Summary and P&L reports instead.

## Usage

### Receipt Mode (Individual Transactions)

Reconcile individual Loyverse receipts with Xero bank transactions:

```bash
npm run recon -- --mode receipt --loyverse <loyverse-file> --xero <xero-file> --output <output-dir>
```

**Example:**

```bash
npm run recon -- --mode receipt --loyverse exports/loyverse-jan.csv --xero exports/xero-jan.csv --output reports/
```

### Summary Mode (Monthly Aggregates)

Reconcile Loyverse Sales Summary with Xero Profit & Loss reports:

**Single store:**

```bash
npm run recon:summary -- --loyverse exports/ltt-summary.csv --xero exports/ltt-pl.csv --output reports/
```

**Multiple stores (three-store batch):**

```bash
npm run recon:summary -- --loyverse exports/summaries/ --xero exports/p-and-l/ --output reports/
```

This will automatically pair files by store name (LTT, Technical, Thohoyandou).

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--mode` | `-m` | Mode: `receipt` or `summary` | No | `receipt` |
| `--loyverse` | `-l` | Path to Loyverse CSV file or directory | ✅ Yes | - |
| `--xero` | `-x` | Path to Xero CSV file or directory | ✅ Yes | - |
| `--output` | `-o` | Output directory for reports | No | `./out` |
| `--threshold` | `-t` | Difference threshold for summary mode | No | `1.00` |
| `--help` | `-h` | Show help message | No | - |

### Output Files

The CLI generates two files in the specified output directory:

1. **`gap-report.csv`** - Machine-readable CSV with all gaps
   - Useful for importing into spreadsheets for further analysis

2. **`gap-report.md`** - Human-readable Markdown report
   - Includes summary statistics
   - Detailed gap descriptions
   - Organized by gap type

## Gap Types Detected

### Receipt Mode

| Gap Type | Description |
|----------|-------------|
| **Unmatched Loyverse** | Transaction in Loyverse but not in Xero |
| **Unmatched Xero** | Transaction in Xero but not in Loyverse |
| **Date Mismatch** | Matched transaction with different dates |
| **Amount Mismatch** | Matched transaction with different amounts |
| **Duplicate** | Same receipt/reference number appears multiple times |

### Summary Mode

| Gap Type | Description |
|----------|-------------|
| **Net Sales Mismatch** | Loyverse Net Sales ≠ Xero Total Trading Income (exceeds threshold) |
| **Gross Profit Mismatch** | Loyverse Gross Profit ≠ Xero Gross Profit (exceeds threshold) |
| **COGS Mismatch** | Loyverse Cost of Goods ≠ Xero Cost of Goods Sold (exceeds threshold) |
| **Store Mismatch** | Store exists in one system but not the other |

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test fixtures for both modes:

**Receipt mode:**

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run receipt mode reconciliation on test fixtures
3. Generate reports in `test-out/`
4. Exit with code 0 (success)

The fixtures contain 10 Loyverse and 10 Xero records with 4 intentional gaps. See `fixtures/README.md` for details.

**Summary mode:**

```bash
npm run test:summary
```

This will:
1. Build the CLI
2. Run summary mode reconciliation on three-store fixtures
3. Generate reports in `test-summary-out/`
4. Exit with code 0 (success)

The summary fixtures contain three stores (LTT, Technical, Thohoyandou) with matching totals. See `fixtures/summary/README.md` for details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/loyverse-xero-recon/
├── src/
│   ├── index.ts                        # CLI entry point
│   ├── types.ts                        # TypeScript type definitions
│   ├── csv-parser.ts                   # Receipt mode CSV parsing
│   ├── reconciliation.ts               # Receipt mode matching logic
│   ├── report-generator.ts             # Receipt mode reports
│   ├── summary-parser.ts               # Summary mode CSV parsing
│   ├── summary-reconciliation.ts       # Summary mode matching logic
│   ├── summary-report-generator.ts     # Summary mode reports
│   ├── csv-parser.test.ts              # CSV parser tests
│   ├── reconciliation.test.ts          # Receipt reconciliation tests
│   ├── summary-parser.test.ts          # Summary parser tests
│   └── summary-reconciliation.test.ts  # Summary reconciliation tests
├── fixtures/
│   ├── loyverse-sales.csv              # Receipt mode: Loyverse receipts
│   ├── xero-sales.csv                  # Receipt mode: Xero bank transactions
│   ├── README.md                       # Receipt mode fixture docs
│   └── summary/
│       ├── loyverse-*-sales-summary.csv # Summary mode: Loyverse daily aggregates
│       ├── xero-*-pl.csv                # Summary mode: Xero P&L reports
│       └── README.md                    # Summary mode fixture docs
├── dist/                               # Compiled JavaScript (generated)
├── out/                                # Default report output (generated)
├── package.json
├── tsconfig.json
└── README.md                           # This file
```

## Matching Logic

### Receipt Mode

The reconciliation engine matches individual transactions using:

1. **Receipt/Reference matching** - Xero reference or description contains Loyverse receipt number
2. **Amount matching** - Amounts must match within 1 cent (0.01)
3. **Date proximity** - Dates must be within 7 days of each other

This allows for slight timing differences between POS recording and bank clearing.

### Summary Mode

The reconciliation engine compares monthly aggregates:

1. **Store name matching** - Normalizes store names (e.g., "Louis Trichardt" matches "LTT")
2. **Net Sales vs Trading Income** - Compares Loyverse Net Sales with Xero Total Trading Income
3. **Gross Profit matching** - Compares Loyverse Gross Profit with Xero Gross Profit
4. **COGS matching** - Compares Loyverse Cost of Goods with Xero Cost of Goods Sold
5. **Threshold-based gaps** - Only reports differences exceeding the threshold (default: 1.00)

Supports three-store batch matching for Perfect Water stores: LTT, Technical, and Thohoyandou.

## Limitations & Constraints

- ✅ **Offline only** - No live API connections to Loyverse or Xero
- ✅ **CSV exports required** - Manual export step needed from each system
- ✅ **No secrets** - No API keys, tokens, or credentials stored
- ✅ **File-based** - All amounts stay in CSV/markdown files only
- ✅ **Read-only** - No write-back to Loyverse or Xero

## Troubleshooting

### "Empty CSV file" error

Ensure your CSV has:
- A header row
- At least one data row
- All required columns

### "Invalid date format" error

Supported formats:
- `YYYY-MM-DD` (e.g., `2024-01-15`)
- `DD/MM/YYYY` (e.g., `15/01/2024`)
- `D-M-YYYY` (e.g., `15-1-2024`)

### No matches found (high gap count)

**Receipt mode:** Check:
- Date ranges overlap between exports
- Receipt numbers are consistent (case-sensitive)
- CSV files have correct column headers

**Summary mode:** Check:
- Store names in both files (Loyverse filename/path and Xero line 2)
- CSV files have correct column headers and structure
- Amounts are in the correct columns (not swapped or shifted)

## Example Output

### Terminal Output
```
Loyverse ↔ Xero Reconciliation CLI

Reading Loyverse file: fixtures/loyverse-sales.csv
  ✓ Loaded 10 Loyverse records
Reading Xero file: fixtures/xero-sales.csv
  ✓ Loaded 10 Xero records

Reconciling records...
  ✓ Matched: 6
  ✓ Gaps found: 4

Generating reports in: out
  ✓ CSV report: out/gap-report.csv
  ✓ Markdown report: out/gap-report.md

✅ Reconciliation complete!

⚠️  Found 4 gap(s) that need attention.
```

### Markdown Report Sample
```markdown
# Loyverse ↔ Xero Reconciliation Gap Report

**Generated:** 2024-09-02T01:49:00.000Z

## Summary

- **Loyverse Records:** 10
- **Xero Records:** 10
- **Matched:** 6
- **Gaps Found:** 4
- **Loyverse Total:** 1285.04
- **Xero Total:** 1551.54
- **Difference:** -266.50

## Gaps by Type

- **Unmatched Loyverse:** 2
- **Unmatched Xero:** 2
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
