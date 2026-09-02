# CSV Fixture Harness

A reusable offline CLI for validating CSV fixtures used in bot workflows. Checks header presence, required columns, row counts, blank cell detection, and optional "no invented amount" checks to flag currency-like tokens in columns that should be empty.

**Purpose:** Help Perfect Water, Ledger, Browns, Vault, and other automation workflows keep CSV fixtures honest and catch data quality issues before they enter production.

## Features

- ✅ **Header validation** - Verify required headers are present
- ✅ **Row count checks** - Enforce minimum row requirements
- 🔍 **Blank cell detection** - Flag columns with high blank percentages
- 💰 **Currency violation detection** - Find currency tokens ($, R, ZAR, amounts) in columns that should be empty
- 📊 **Dual report formats** - Generate both Markdown and JSON reports
- 🚫 **Read-only** - Never modifies input files, only validates
- 🧪 **Fully tested** - Comprehensive test suite with fixtures
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/csv-fixture-harness
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
npm run check -- --csv <path-to-csv> [options]
```

### Examples

#### Validate basic fixture
```bash
npm run check -- --csv data/transactions.csv
```

#### Check required headers
```bash
npm run check -- --csv fixtures/good.csv --require-headers Date,Amount
```

#### Check for currency violations
```bash
npm run check -- --csv export.csv --forbid-currency-in Notes,Description
```

#### Multiple checks combined
```bash
npm run check -- --csv data.csv \
  --require-headers Date,Amount,Merchant \
  --forbid-currency-in Notes \
  --min-rows 10 \
  --outdir reports/
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--csv <path>` | Path to CSV file to validate | ✅ Yes | - |
| `--require-headers <list>` | Comma-separated list of required headers | No | - |
| `--forbid-currency-in <list>` | Comma-separated list of columns that must not contain currency values | No | - |
| `--min-rows <number>` | Minimum number of data rows required | No | - |
| `--outdir <path>` | Output directory for reports | No | `./out` |
| `--help`, `-h` | Show help message | No | - |

## Validation Rules

### 1. Header Validation

- Checks that all headers in `--require-headers` exist in the CSV
- Case-insensitive matching (e.g., "date" matches "Date")
- Whitespace is trimmed

**Failure:** Missing any required header

### 2. Row Count Validation

- Counts data rows (excludes header row)
- Compares against `--min-rows` if specified

**Failure:** Fewer rows than specified minimum

### 3. Blank Cell Detection

- Calculates blank percentage for each column
- A cell is blank if empty or contains only whitespace
- Generates **warning** (not failure) if column is ≥50% blank

**Warning threshold:** 50% or more blank cells in a column

### 4. Currency Violation Detection

- Only checked for columns listed in `--forbid-currency-in`
- Detects these patterns:
  - Dollar signs with digits: `$50`, `$123.45`
  - South African Rand: `R75`, `R100`
  - Currency codes: `ZAR`, `USD`, `EUR`, `GBP` (case-insensitive)
  - Decimal amounts: `123.45`, `99.99`
- Empty cells are not flagged
- Text without currency patterns is allowed

**Failure:** Any currency-like pattern found in a forbidden column

## Output Files

The tool generates two reports in the specified output directory:

### 1. `report.md` - Markdown Report

Human-readable validation report with:
- Overall status (PASS/FAIL)
- CSV file path and row count
- List of errors and warnings
- Header analysis with missing headers highlighted
- Column statistics table
- Detailed currency violations (if any)

### 2. `report.json` - JSON Report

Machine-readable validation results with complete details:
```json
{
  "passed": true,
  "csvPath": "fixtures/good.csv",
  "totalRows": 10,
  "headers": ["Date", "Amount", "Merchant", "Category", "Notes"],
  "missingHeaders": [],
  "columnStats": [...],
  "minRowsCheck": {...},
  "errors": [],
  "warnings": []
}
```

## Exit Codes

- **0** - All validation checks passed
- **1** - One or more validation checks failed

Use exit codes in scripts:
```bash
if npm run check -- --csv data.csv --require-headers Date,Amount; then
  echo "Validation passed"
else
  echo "Validation failed"
fi
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

Test coverage includes:
- CSV parsing (quoted fields, empty cells, line endings)
- Header validation (case-insensitive, missing headers)
- Row count checks
- Blank cell detection
- Currency pattern matching
- Edge cases

### Test with Fixtures

The tool includes comprehensive test fixtures:

```bash
npm run test:fixtures
```

This runs the tool against `fixtures/good.csv` with the command from the user's goal:
```bash
npm run check -- --csv fixtures/good.csv --require-headers Date,Amount
```

**Expected result:** PASS (exit code 0)

See `fixtures/README.md` for details on all test fixtures.

### Clean Up

```bash
npm run clean
```

Removes `dist/` and `test-out/` directories.

## Use Cases

### Perfect Water Workflows
Validate order CSV exports before ingestion:
```bash
npm run check -- --csv pw-orders.csv \
  --require-headers Date,Store,Product,Quantity \
  --forbid-currency-in Notes \
  --min-rows 1
```

### Ledger/Finance Workflows
Check transaction exports:
```bash
npm run check -- --csv transactions.csv \
  --require-headers Date,Amount,Merchant \
  --min-rows 5
```

### Browns/Hospitality Workflows
Validate booking data:
```bash
npm run check -- --csv bookings.csv \
  --require-headers Date,Property,Guests \
  --forbid-currency-in Notes
```

### Vault/Trust Workflows
Check compliance documents:
```bash
npm run check -- --csv register.csv \
  --require-headers Entity,DueDate,Status \
  --min-rows 1
```

## Project Structure

```
tools/csv-fixture-harness/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── types.ts                 # TypeScript type definitions
│   ├── csv-parser.ts            # CSV parsing
│   ├── csv-parser.test.ts       # CSV parser tests
│   ├── validator.ts             # Validation logic
│   ├── validator.test.ts        # Validator tests
│   └── report-generator.ts      # Report generation
├── fixtures/
│   ├── good.csv                 # Valid fixture (PASS)
│   ├── bad-missing-headers.csv  # Missing required header (FAIL)
│   ├── bad-few-rows.csv         # Insufficient rows (FAIL)
│   ├── bad-currency-in-notes.csv # Currency violations (FAIL)
│   ├── bad-blank-heavy.csv      # Blank-heavy columns (WARN)
│   └── README.md                # Fixture documentation
├── dist/                        # Compiled JavaScript (generated)
├── out/                         # Default report output (generated)
├── package.json
├── tsconfig.json
└── README.md                    # This file
```

## Currency Detection Patterns

The tool detects these currency-like patterns:

| Pattern | Example | Regex |
|---------|---------|-------|
| Dollar sign + digit | `$50`, `$123.45` | `/\$\d/` |
| Rand + digit | `R75`, `R100` | `/R\d/` |
| Currency codes | `ZAR`, `USD`, `EUR`, `GBP` | `/ZAR/i`, `/USD/i`, etc. |
| Decimal amounts | `123.45`, `99.99` | `/\d+\.\d{2}/` |

**Why these patterns?**
- Bots should not invent amounts
- Notes/Description fields should contain text, not amounts
- Helps catch copy-paste errors where amounts leaked into wrong columns

**Important:** Empty cells are NOT flagged. Only non-empty cells with currency patterns fail validation.

## Limitations & Safety

- ✅ **Read-only** - Never modifies CSV files
- ✅ **Offline** - No network calls, APIs, or external services
- ✅ **No secrets** - No credentials or tokens required
- ✅ **No data invention** - Only validates existing data
- ⚠️ **Basic CSV parsing** - Handles common CSV formats but not all edge cases
- ⚠️ **Pattern-based** - Currency detection uses regex patterns, may have false positives

## Troubleshooting

### "CSV file is empty" error
- Check file exists and is not empty
- Ensure at least a header row is present

### "CSV file has no headers" error
- First row must contain column headers
- Check for leading blank lines

### "Failed to parse CSV" error
- Check CSV format (commas, quotes, line endings)
- Try opening in a spreadsheet tool to verify structure

### False positive currency violations
- Some text may match currency patterns (e.g., "R2D2", "USD123 form")
- Review `report.md` violations to confirm they're real issues
- Adjust forbidden columns list if needed

### Low blank percentage but many blank cells
- Percentage is calculated per column
- A few blank cells in a large dataset may not trigger warnings
- Check `report.json` for exact `blankCount` values

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
