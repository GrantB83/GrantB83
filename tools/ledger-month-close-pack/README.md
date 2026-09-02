# ledger-month-close-pack

**One-line:** Offline USA Budget month-end close pack builder for Ledger / CoS.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-month-close-pack/`

## Purpose

USA Budget month-end close (typically the 7th) needs a repeatable pack:
- Inventory of export CSVs
- Header sanity checks
- Unmatched-merchant queue pointer
- APPROVAL checklist

**Critical:** Amounts must stay in files — never in digest prose.

## Features

- 📊 **CSV inventory** - Scan exports directory for all CSV files
- 📝 **Header validation** - Flag missing required headers (Date, Amount, Merchant, etc.)
- 🔒 **Amount safety** - Headers and filenames only; amounts never appear in markdown prose
- 📋 **Unmatched queue** - Optional copy-in of merchant research queue
- ✅ **Approval gates** - CLOSE.md checklist + APPROVAL.md safety rules
- 📦 **Machine-readable** - JSON manifest and inventory for automation
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/ledger-month-close-pack
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
npm run pack -- --month YYYY-MM --exports-dir ./exports/ --outdir out/
```

### With Unmatched Queue

```bash
npm run pack -- \
  --month 2024-01 \
  --exports-dir ./exports/ \
  --outdir out/ \
  --unmatched-queue path/to/queue.md
```

### With Header Validation

```bash
npm run pack -- \
  --month 2024-01 \
  --exports-dir ./exports/ \
  --outdir out/ \
  --require-headers Date,Amount,Merchant
```

### CLI Options

| Option | Description | Required | Example |
|--------|-------------|----------|---------|
| `--month` | Month for close pack (YYYY-MM format) | ✅ Yes | `2024-01` |
| `--exports-dir` | Directory containing CSV exports | ✅ Yes | `./exports/` |
| `--outdir` | Output directory for pack files | ✅ Yes | `out/` |
| `--unmatched-queue` | Path to unmatched-queue.md to include | No | `queue.md` |
| `--require-headers` | Comma-separated list of required headers | No | `Date,Amount,Merchant` |
| `--help`, `-h` | Show help message | No | - |

## Behaviors

### CSV Scanning

The tool scans `--exports-dir` for `*.csv` files and records:
- **Basename** - Filename only
- **Size** - File size in bytes
- **Modified time** - Last modification timestamp (ISO8601)
- **Header row** - First line only (column names)

### Header Validation

When `--require-headers` is specified:
- Each CSV's header row is checked for required tokens
- Case-insensitive substring matching
- Missing headers are flagged in inventory.md and CLOSE.md
- Example: `--require-headers Date,Amount,Merchant`

### Amount Safety

**Critical rule:** Amount values NEVER appear in markdown prose.

✅ **Allowed:**
- Amounts in source CSV files (input data)
- Filenames and header rows in inventory.md
- File counts and sizes

❌ **Forbidden:**
- Amount values in inventory.md prose
- Amount summaries in CLOSE.md or APPROVAL.md
- Financial data in markdown reports

### Unmatched Queue

If `--unmatched-queue` is provided:
- Copies specified markdown file into pack as `unmatched-queue.md`
- References it in CLOSE.md checklist
- Useful for linking merchant research output from `ledger-unmatched-merchant-queue`

## Output Files

The tool generates these files in `--outdir`:

### 1. `manifest.json` - Pack Metadata

Machine-readable pack summary:
```json
{
  "month": "2024-01",
  "generatedAt": "2024-01-07T10:30:00.000Z",
  "exportsDir": "./exports/",
  "csvFiles": [...],
  "unmatchedQueueIncluded": true,
  "totalFiles": 3,
  "totalSize": 12345,
  "missingHeadersCount": 0
}
```

### 2. `inventory.json` - CSV File Details

Machine-readable inventory:
```json
[
  {
    "basename": "budget-jan-2024.csv",
    "path": "./exports/budget-jan-2024.csv",
    "size": 456,
    "mtime": "2024-01-06T18:30:00.000Z",
    "headerRow": "Date,Merchant,Amount,Category",
    "missingHeaders": []
  }
]
```

### 3. `inventory.md` - Human-Readable Inventory

Table of CSV files with headers and metadata (no amounts in prose).

### 4. `CLOSE.md` - Month-Close Checklist

```markdown
# Month-Close Checklist

**Month:** 2024-01

## Export CSV Files Present
- [x] ✅ Found 3 CSV file(s)

## Headers OK
- [x] ✅ All headers present

## Unmatched Merchants Researched
- [ ] Review unmatched-queue.md and research unknown merchants

## Sheet Write Approval
- [ ] Ledger sheet updates need H2 approval
- [ ] No amounts invented or modified from source CSVs
```

### 5. `APPROVAL.md` - Safety Gates

Documents safety rules:
- Ledger owns sheet writes (Coding never writes)
- No invented amounts
- No payments
- H2 approval required

### 6. `unmatched-queue.md` (optional)

Copy of merchant research queue if `--unmatched-queue` provided.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test CSVs with ~5 transactions each:

```bash
npm run test:fixtures
```

Expected results:
- 3 CSV files discovered (budget, bank-statement, receipts)
- Total size ~600-800 bytes
- All reports generated
- Exit code 0 (success)

See `fixtures/README.md` for details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Integration with Other Tools

### With ledger-unmatched-merchant-queue

```bash
# Step 1: Build unmatched merchant queue
cd tools/ledger-unmatched-merchant-queue
npm run queue -- --input transactions.csv --outdir queue-out/

# Step 2: Include queue in month-close pack
cd ../ledger-month-close-pack
npm run pack -- \
  --month 2024-01 \
  --exports-dir ../../exports/ \
  --outdir ../../month-close/ \
  --unmatched-queue ../ledger-unmatched-merchant-queue/queue-out/queue.md
```

### With budget-merchant-matcher

```bash
# Step 1: Match merchants
cd tools/budget-merchant-matcher
npm run match -- --transactions exports/jan.csv --rules rules.csv --output matched/

# Step 2: Build month-close pack
cd ../ledger-month-close-pack
npm run pack -- --month 2024-01 --exports-dir ../budget-merchant-matcher/matched/ --outdir close-pack/
```

## Example Workflow

1. **Export CSV files** from USA Budget app (typically on the 7th)
2. **Run merchant matching** to classify transactions:
   ```bash
   cd tools/budget-merchant-matcher
   npm run match -- --transactions exports/jan.csv --rules rules.csv --output matched/
   ```
3. **Build unmatched queue** from unmatched.csv:
   ```bash
   cd ../ledger-unmatched-merchant-queue
   npm run queue -- --input ../budget-merchant-matcher/matched/unmatched.csv --outdir queue/
   ```
4. **Build month-close pack**:
   ```bash
   cd ../ledger-month-close-pack
   npm run pack -- \
     --month 2024-01 \
     --exports-dir ../budget-merchant-matcher/matched/ \
     --outdir ../../month-close-jan/ \
     --unmatched-queue ../ledger-unmatched-merchant-queue/queue/queue.md \
     --require-headers Date,Amount,Merchant
   ```
5. **Review CLOSE.md** checklist
6. **Research unmatched merchants** from queue
7. **Request H2 approval** before any sheet writes

## Project Structure

```
tools/ledger-month-close-pack/
├── src/
│   ├── types.ts              # TypeScript type definitions
│   ├── csv-scanner.ts        # CSV file discovery and header parsing
│   ├── report-generator.ts   # Markdown and checklist generation
│   └── pack-builder.ts       # Main pack orchestration
├── fixtures/
│   ├── exports/
│   │   ├── budget-jan-2024.csv
│   │   ├── bank-statement-jan.csv
│   │   └── receipts.csv
│   └── README.md             # Fixture documentation
├── index.ts                  # CLI entry point
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Safety Notes

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies source CSV files
- ✅ **No invented amounts** - Only reports what exists in source CSVs
- ✅ **Amounts stay in files** - Headers and filenames only in markdown
- ✅ **H2 approval required** - Before any Google Sheet writes
- ⚠️ **Ledger owns sheet writes** - Coding/CoS never writes directly to Sheets
- ⚠️ **Manual verification required** - Review all reports before any updates

## Troubleshooting

### "No CSV files found" error

- Verify `--exports-dir` path is correct
- Ensure directory contains `*.csv` files (case-insensitive)
- Check file permissions

### Missing headers warning

- Review which files are flagged in `inventory.md`
- Update `--require-headers` to match your CSV format
- Or fix source CSV exports to include required columns

### Month format error

- Month must be `YYYY-MM` format (e.g., `2024-01`, not `2024-1` or `Jan 2024`)

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
