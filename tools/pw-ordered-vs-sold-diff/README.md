# Perfect Water Ordered vs Sold Diff CLI

An offline command-line tool that compares ordered exports vs sold/Loyverse exports by SKU/Item (+ optional Store) for Perfect Water / CoS cost-of-sales reconciliation.

## Features

- 📊 **CSV-based diff** - No Loyverse API required
- 🏪 **Optional Store-level comparison** - Compare per-store when Store column present
- 📝 **Dual output** - JSON (structured) + Markdown (readable)
- 🔍 **Missing keys detection** - Flags items in one CSV but not the other
- ⚠️ **Rejected rows tracking** - Reports blank/unparseable quantities
- ✅ **Fully tested** - Includes automated tests and synthetic fixtures
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-ordered-vs-sold-diff
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

### Ordered CSV

Export ordered quantities from your ordering system or inventory management tool. Required columns:
- **Item** (or SKU/Product name)
- **Quantity** (numeric)
- **Store** (optional, for per-store comparison)

### Sold CSV (Loyverse)

1. Log in to your **Loyverse Back Office** (https://backend.loyverse.com)
2. Navigate to **Reports** → **Sales by Item**
3. Select your date range
4. Ensure **Item** and **Quantity** columns are visible
5. If comparing per-store, ensure **Store** column is visible
6. Click **Export** → **CSV**
7. Save the file (e.g., `loyverse-2024-09-02.csv`)

## Usage

### Basic Usage (No Store Comparison)

```bash
npm run diff -- --ordered <ordered-file> --sold <sold-file> --outdir <output-dir>
```

**Example:**

```bash
npm run diff -- --ordered exports/ordered.csv --sold exports/loyverse-sold.csv --outdir out/
```

### Store-Level Comparison

```bash
npm run diff -- \
  --ordered exports/ordered.csv \
  --sold exports/loyverse-sold.csv \
  --outdir out/ \
  --store-col Store
```

### Custom Column Names

If your CSVs have different column names:

```bash
npm run diff -- \
  --ordered exports/ordered.csv \
  --sold exports/sold.csv \
  --outdir out/ \
  --key-col "Product" \
  --qty-col "Qty" \
  --store-col "Location"
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--ordered` | Path to ordered CSV file | ✅ Yes | - |
| `--sold` | Path to sold/Loyverse CSV file | ✅ Yes | - |
| `--outdir` | Output directory for reports | No | `./out` |
| `--key-col` | Item/SKU column name | No | `Item` |
| `--qty-col` | Quantity column name | No | `Quantity` |
| `--store-col` | Store column name (optional) | No | - |
| `--help`, `-h` | Show help message | No | - |

### Output Files

The CLI generates five files in the specified output directory:

1. **`diff.json`** - Structured diff data
   - Items with ordered/sold/delta
   - Missing keys lists
   - Totals and counts
   - Machine-readable format

2. **`diff.md`** - Human-readable diff
   - Summary statistics
   - Item-level breakdown with ordered/sold/delta
   - Store column included if `--store-col` used

3. **`missing-keys.md`** - Missing keys report
   - Items present in ordered CSV but missing in sold CSV
   - Items present in sold CSV but missing in ordered CSV
   - Rejected rows from both CSVs (blank/unparseable quantities)

4. **`APPROVAL.md`** - Safety gates and ownership
   - Tool purpose and constraints
   - Approval gates
   - Bot reminders

5. **`manifest.json`** - Run metadata
   - Input file paths
   - Summary statistics
   - Output file descriptions

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test fixtures:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Process `fixtures/ordered.csv` and `fixtures/sold.csv`
3. Generate reports in `test-out/`
4. Exit with code 0 (success)

The fixtures contain realistic Perfect Water items with differences:
- Items present in both CSVs (matched)
- Items in ordered but not sold (Cooler Box)
- Items in sold but not ordered (Ice Tray)
- Varying quantities (deltas)

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/pw-ordered-vs-sold-diff/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── csv-parser.ts         # CSV parsing logic
│   ├── csv-parser.test.ts    # CSV parser tests
│   └── diff-generator.ts     # Diff generation logic
├── fixtures/
│   ├── ordered.csv           # Synthetic ordered data
│   ├── sold.csv              # Synthetic sold data
│   ├── ordered-with-store.csv
│   ├── sold-with-store.csv
│   └── README.md             # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default report output (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Data Processing

### Diff Logic

1. **Parse Ordered CSV** - Read and validate ordered export
2. **Parse Sold CSV** - Read and validate sold export
3. **Generate Key Map** - Build key as `Item` or `Item|Store` if store-level comparison
4. **Calculate Deltas** - For each key: `delta = ordered - sold`
5. **Identify Missing Keys** - Flag items in one CSV but not the other
6. **Sort by Delta** - Largest absolute delta first

### Validation Rules

- All required columns must be present
- Item and Quantity must not be blank
- Quantity must be a valid number
- Invalid rows are rejected and reported in `missing-keys.md`
- Empty CSVs or CSVs with only invalid rows cause exit code 1

### Store-Level Comparison

When `--store-col` is provided:
- Each item is grouped by `Item|Store` key
- Diff shows per-store ordered/sold/delta
- Items with same name but different stores are treated as distinct

Without `--store-col`:
- Each item is grouped by `Item` key only
- Diff shows total ordered/sold/delta across all stores

## Limitations & Constraints

- ✅ **Offline only** - No Loyverse API or network calls
- ✅ **No invented quantities** - All amounts from source CSVs only
- ✅ **Read-only** - Never modifies source CSV files
- ✅ **File-based** - All amounts stay in files
- ✅ **Exit 1 on bad input** - Malformed CSVs caught early
- ✅ **Perfect Water ops ownership** - PW owns all CoS reconciliation decisions

## Troubleshooting

### "Required column not found" error

Ensure your CSV has the required columns:
- Item (or use `--key-col` to specify a different name)
- Quantity (or use `--qty-col`)
- Store (if using `--store-col`)

Check the error message for exact column names found in your CSV.

### "CSV file not found" error

Verify:
- File path is correct
- File exists
- You have read permissions

### Rejected rows reported

Check `missing-keys.md` for:
- Row numbers with blank item or quantity
- Unparseable quantity values
- Fix or remove invalid rows from source CSVs and re-run

### Missing keys reported

Check `missing-keys.md` for:
- Items in ordered CSV but not in sold CSV (possibly not yet sold)
- Items in sold CSV but not in ordered CSV (possibly unrecorded orders)
- Review and investigate discrepancies before CoS decisions

## Example Output

### Terminal Output

```
Perfect Water Ordered vs Sold Diff CLI

Reading ordered CSV: fixtures/ordered.csv
  ✓ Loaded 5 valid row(s)

Reading sold CSV: fixtures/sold.csv
  ✓ Loaded 5 valid row(s)

Generating diff...
  ✓ Compared 6 item(s)
  ✓ Total ordered: 98
  ✓ Total sold: 94
  ✓ Total delta: 4

Generating reports in: out
  ✓ diff.json
  ✓ diff.md
  ✓ missing-keys.md
  ✓ APPROVAL.md
  ✓ manifest.json

✅ Diff generation complete!

⚠️  0 item(s) missing in ordered, 1 missing in sold. See missing-keys.md.
```

### Markdown Diff Sample

```markdown
# Perfect Water Ordered vs Sold Diff

**Generated:** 2024-09-02T10:00:00.000Z

## Summary

- **Total Ordered:** 98
- **Total Sold:** 94
- **Total Delta:** 4
- **Items Compared:** 6

## Item Breakdown

| Item | Ordered | Sold | Delta |
|------|---------|------|-------|
| Cooler Box | 8 | 0 | 8 |
| Water Bottle 5L | 50 | 45 | 5 |
| Water Bottle 10L | 20 | 18 | 2 |
| Filter Cartridge | 15 | 15 | 0 |
| Water Dispenser | 5 | 6 | -1 |
| Ice Tray | 0 | 10 | -10 |

---

**⚠️ Reminder for Bots:** Amounts stay in this file. Never paste quantity figures into chat unless explicitly requested.
```

## Integration with Perfect Water Operations

### Typical Workflow

1. **Export Ordered** - Export ordered quantities from your inventory system
2. **Export Sold** - Export Loyverse sales CSV for the same period
3. **Run Diff** - Process with this CLI
4. **Review Output** - Check `diff.md` for deltas and `missing-keys.md` for discrepancies
5. **CoS Reconciliation** - Use diff data for cost-of-sales analysis
6. **Stock Investigation** - Investigate large deltas or missing keys

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate:** Before using diff data for PW CoS decisions
- **Grant approval required:** Before any stock adjustments based on diff outputs

### Bot Reminder

**Amounts stay in files.** Never paste quantity figures or amounts into chat unless explicitly requested by Grant.

## Safety

This tool is designed for Perfect Water / CoS cost-of-sales reconciliation:

✅ **Offline only** - No APIs or network calls  
✅ **No invented quantities** - All amounts from source CSVs only  
✅ **Read-only** - Never modifies source CSV files  
✅ **File-based** - All amounts stay in files  
✅ **Blank/unparseable qty → rejected** - Invalid rows reported in missing-keys.md  
✅ **Exit 1 on bad input** - Malformed CSVs caught early

**Never invent stock levels or sales figures.** Only report what exists in source CSVs.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
