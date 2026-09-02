# Loyverse ↔ Xero Reconciliation Gap CLI

An offline command-line tool that reconciles Loyverse POS sales data with Xero accounting records, identifying mismatches, unmatched transactions, and duplicates.

## Features

- 📊 **CSV-based reconciliation** - No API keys or OAuth required
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

### From Loyverse

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

### From Xero

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

## Usage

### Basic Command

```bash
npm run recon -- --loyverse <loyverse-file> --xero <xero-file> --output <output-dir>
```

### Example

```bash
npm run recon -- --loyverse exports/loyverse-jan.csv --xero exports/xero-jan.csv --output reports/
```

### CLI Options

| Option | Shorthand | Description | Required |
|--------|-----------|-------------|----------|
| `--loyverse` | `-l` | Path to Loyverse CSV file | ✅ Yes |
| `--xero` | `-x` | Path to Xero CSV file | ✅ Yes |
| `--output` | `-o` | Output directory for reports | No (default: `./out`) |
| `--help` | `-h` | Show help message | No |

### Output Files

The CLI generates two files in the specified output directory:

1. **`gap-report.csv`** - Machine-readable CSV with all gaps
   - Useful for importing into spreadsheets for further analysis

2. **`gap-report.md`** - Human-readable Markdown report
   - Includes summary statistics
   - Detailed gap descriptions
   - Organized by gap type

## Gap Types Detected

| Gap Type | Description |
|----------|-------------|
| **Unmatched Loyverse** | Transaction in Loyverse but not in Xero |
| **Unmatched Xero** | Transaction in Xero but not in Loyverse |
| **Date Mismatch** | Matched transaction with different dates |
| **Amount Mismatch** | Matched transaction with different amounts |
| **Duplicate** | Same receipt/reference number appears multiple times |

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test fixtures that demonstrate known gaps:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run reconciliation on test fixtures
3. Generate reports in `test-out/`
4. Exit with code 0 (success)

The fixtures contain 10 Loyverse and 10 Xero records with 4 intentional gaps. See `fixtures/README.md` for details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/loyverse-xero-recon/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── csv-parser.ts         # CSV parsing logic
│   ├── reconciliation.ts     # Matching and gap detection
│   ├── report-generator.ts   # CSV and Markdown output
│   ├── csv-parser.test.ts    # CSV parser tests
│   └── reconciliation.test.ts # Reconciliation tests
├── fixtures/
│   ├── loyverse-sales.csv    # Synthetic Loyverse data
│   ├── xero-sales.csv        # Synthetic Xero data
│   └── README.md             # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default report output (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Matching Logic

The reconciliation engine matches records using:

1. **Receipt/Reference matching** - Xero reference or description contains Loyverse receipt number
2. **Amount matching** - Amounts must match within 1 cent (0.01)
3. **Date proximity** - Dates must be within 7 days of each other

This allows for slight timing differences between POS recording and bank clearing.

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

Check:
- Date ranges overlap between exports
- Receipt numbers are consistent (case-sensitive)
- CSV files have correct column headers

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
