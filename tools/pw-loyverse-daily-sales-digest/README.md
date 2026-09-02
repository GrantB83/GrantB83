# Perfect Water Loyverse Daily Sales Digest CLI

An offline command-line tool that generates structured daily sales digests from Loyverse CSV exports for Perfect Water / CoS operations review.

## Features

- 📊 **CSV-based digests** - No Loyverse API required
- 🏪 **Store & item rollups** - Aggregates by Store and Item
- 📝 **Dual output** - JSON (structured) + Markdown (readable)
- 🔍 **Data quality checks** - Flags missing/invalid fields
- ✅ **Fully tested** - Includes automated tests and synthetic fixtures
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-loyverse-daily-sales-digest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## Exporting Data from Loyverse

1. Log in to your **Loyverse Back Office** (https://backend.loyverse.com)
2. Navigate to **Reports** → **Sales by Item**
3. Select your date range (typically one day)
4. Ensure **Store** column is visible
5. Click **Export** → **CSV**
6. Save the file (e.g., `loyverse-2024-09-02.csv`)

**Required columns:**
- Store
- Item
- Quantity
- Gross Sales

## Usage

### Basic Usage

```bash
npm run digest -- --csv <loyverse-file> --outdir <output-dir>
```

**Example:**

```bash
npm run digest -- --csv exports/loyverse-2024-09-02.csv --outdir out/
```

### Custom Column Names

If your CSV has different column names:

```bash
npm run digest -- \
  --csv exports/loyverse-day.csv \
  --outdir out/ \
  --store-col "Location" \
  --item-col "Product" \
  --qty-col "Qty" \
  --amount-col "Total"
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--csv` | Path to Loyverse CSV file | ✅ Yes | - |
| `--outdir` | Output directory for reports | No | `./out` |
| `--store-col` | Store column name | No | `Store` |
| `--item-col` | Item column name | No | `Item` |
| `--qty-col` | Quantity column name | No | `Quantity` |
| `--amount-col` | Gross Sales column name | No | `Gross Sales` |
| `--help`, `-h` | Show help message | No | - |

### Output Files

The CLI generates five files in the specified output directory:

1. **`digest.json`** - Structured rollup data
   - Store and item breakdowns
   - Totals and counts
   - Machine-readable format

2. **`digest.md`** - Human-readable digest
   - Summary statistics
   - Store-by-store breakdown
   - Item-level details with amounts

3. **`missing-fields.md`** - Data quality report
   - Count of missing/invalid rows
   - Row numbers with issues
   - Field-level breakdown

4. **`APPROVAL.md`** - Safety gates and ownership
   - Tool purpose and constraints
   - Approval gates
   - Bot reminders

5. **`manifest.json`** - Run metadata
   - Input file path
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
2. Process `fixtures/loyverse-day.csv`
3. Generate reports in `test-out/`
4. Exit with code 0 (success)

The fixture contains 10 sales records across 3 stores (Louis Trichardt, Thohoyandou, Technical). See `fixtures/README.md` for details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/pw-loyverse-daily-sales-digest/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── csv-parser.ts         # CSV parsing logic
│   ├── csv-parser.test.ts    # CSV parser tests
│   └── digest-generator.ts   # Digest generation logic
├── fixtures/
│   ├── loyverse-day.csv      # Synthetic test data
│   └── README.md             # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default report output (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Data Processing

### Rollup Logic

1. **Parse CSV** - Read and validate Loyverse export
2. **Group by Store** - Aggregate all sales per store
3. **Group by Item** - Within each store, aggregate by item
4. **Calculate totals** - Sum quantities and gross sales
5. **Sort** - Stores by total sales (desc), items by sales (desc)

### Validation Rules

- All required columns must be present
- Store, Item, Quantity, and Gross Sales must not be blank
- Quantity and Gross Sales must be valid numbers
- Invalid rows are skipped and reported in `missing-fields.md`

## Limitations & Constraints

- ✅ **Offline only** - No Loyverse API calls
- ✅ **No invented amounts** - Pass-through from CSV only
- ✅ **Read-only** - Never modifies source CSV
- ✅ **File-based** - All amounts stay in files
- ✅ **Perfect Water ops ownership** - PW owns all pricing/sales decisions

## Troubleshooting

### "Missing required columns" error

Ensure your CSV has all four required columns:
- Store (or use `--store-col` to specify a different name)
- Item (or use `--item-col`)
- Quantity (or use `--qty-col`)
- Gross Sales (or use `--amount-col`)

Check the error message for exact column names found in your CSV.

### "Empty CSV file" error

Ensure your CSV has:
- A header row
- At least one data row

### Invalid rows reported

Check `missing-fields.md` for:
- Row numbers with missing data
- Field-level breakdown (which columns are blank)
- Total count of invalid rows

Fix or remove invalid rows from the source CSV and re-run.

## Example Output

### Terminal Output

```
Perfect Water Loyverse Daily Sales Digest CLI

Reading CSV: fixtures/loyverse-day.csv
  ✓ Loaded 10 valid sales records

Generating digest...
  ✓ Processed 3 store(s)
  ✓ 6 unique item(s)
  ✓ Total quantity: 99
  ✓ Total gross sales: 6140.00

Generating reports in: out
  ✓ digest.json
  ✓ digest.md
  ✓ missing-fields.md
  ✓ APPROVAL.md
  ✓ manifest.json

✅ Digest generation complete!
```

### Markdown Digest Sample

```markdown
# Perfect Water Daily Sales Digest

**Generated:** 2024-09-02T10:00:00.000Z

## Summary

- **Total Stores:** 3
- **Total Unique Items:** 6
- **Total Quantity Sold:** 99
- **Total Gross Sales:** 6140.00

## Store Breakdown

### Louis Trichardt

- **Items:** 4
- **Quantity:** 47
- **Store Total:** 2315.00

| Item | Quantity | Gross Sales |
|------|----------|-------------|
| Water Dispenser | 2 | 1200.00 |
| 10L Bottle | 12 | 420.00 |
| 5L Bottle | 25 | 375.00 |
| Filter Cartridge | 8 | 320.00 |

---

**⚠️ Reminder for Bots:** Amounts stay in this file. Never paste sales figures into chat.
```

## Integration with Perfect Water Operations

### Typical Workflow

1. **Daily Export** - Export Loyverse sales CSV each morning
2. **Run Digest** - Process with this CLI
3. **Review Output** - Check `digest.md` for store/item performance
4. **Flag Exceptions** - Use totals to spot till vs bank mismatches
5. **Stock Planning** - Use item quantities for reorder decisions

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate:** Before using digest data for PW ops decisions
- **Grant approval required:** Before any price list or stock level changes based on digest

### Bot Reminder

**Amounts stay in files.** Never paste sales figures or amounts into chat unless explicitly requested.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
