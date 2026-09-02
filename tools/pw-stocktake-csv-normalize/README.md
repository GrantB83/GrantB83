# Stocktake CSV Normalizer for Perfect Water / CoS

An offline command-line tool that normalizes messy stocktake CSVs into a standard schema for Perfect Water / CoS store reconciliation. Supports generic stocktake exports and Loyverse inventory formats.

## Features

- 📊 **CSV-based normalization** - Offline, no API keys required
- 🔍 **Auto-detect delimiter** - Comma, semicolon, or tab
- 🎯 **Multiple profiles** - Generic, Loyverse, auto-detect
- 🚫 **Never invents quantities** - Blank/unparseable → rejected.csv
- ✅ **Strict validation** - Required fields enforced
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Purpose

Perfect Water store stocktakes arrive as messy CSVs from various sources (manual counts, Loyverse exports, spreadsheet templates). This tool normalizes them into a consistent schema for reconciliation:

**Standard Schema:**
- `Store` - Store/location name (required)
- `SKU/Item` - SKU or item name (required)
- `CountedQty` - Counted quantity (required, must be parseable number)
- `Unit` - Unit of measure (required)
- `CountedAt` - Date counted (optional, YYYY-MM-DD)
- `Notes` - Additional notes (optional)

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-stocktake-csv-normalize
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
npm run normalize -- --input <stocktake.csv> --outdir <output-dir> [--profile <profile>]
```

### Examples

**Auto-detect format:**
```bash
npm run normalize -- --input stocktake.csv --outdir out/
```

**Specific profile:**
```bash
npm run normalize -- --input loyverse-export.csv --outdir out/ --profile loyverse
```

**Generic stocktake:**
```bash
npm run normalize -- --input manual-count.csv --outdir out/ --profile generic
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--input` | `-i` | Input stocktake CSV file | ✅ Yes | - |
| `--outdir` | `-o` | Output directory | ✅ Yes | - |
| `--profile` | `-p` | Profile: auto\|generic\|loyverse | No | `auto` |
| `--help` | `-h` | Show help message | No | - |

### Profiles

| Profile | Description | Common Headers |
|---------|-------------|----------------|
| `auto` | Auto-detect from headers (default) | Any combination |
| `generic` | Generic stocktake format | Store, Item, Qty, Unit, Date, Notes |
| `loyverse` | Loyverse inventory export | Store Name, Item Name, Quantity, Unit of Measure, Stocktake Date |

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
| **Store** | store, location, branch, outlet, shop |
| **SKU/Item** | sku, item, product, sku/item, item name, product name, product code, item code |
| **CountedQty** | countedqty, counted qty, qty, quantity, count, stock, counted, amount |
| **Unit** | unit, uom, unit of measure, measure |
| **CountedAt** | countedat, counted at, date, timestamp, counted date, stocktake date |
| **Notes** | notes, note, remarks, comment, comments, description |

### 3. Date Normalization

Converts to `YYYY-MM-DD`:
- `DD/MM/YYYY` → `YYYY-MM-DD`
- `DD-MM-YYYY` → `YYYY-MM-DD`
- `YYYY/MM/DD` → `YYYY-MM-DD`
- `YYYY-MM-DD` → (unchanged)

### 4. Quantity Parsing

- Removes spaces and commas
- Parses as decimal number
- **Never invents quantities** - blank/unparseable → `rejected.csv`

### 5. Required Field Validation

The tool enforces strict validation:

| Field | Required | Rejection Reason |
|-------|----------|------------------|
| Store | ✅ Yes | "missing store" |
| SKU/Item | ✅ Yes | "missing sku/item" |
| CountedQty | ✅ Yes | "missing or blank quantity" |
| CountedQty (parseable) | ✅ Yes | "unparseable quantity" |
| Unit | ✅ Yes | "missing unit" |
| CountedAt (if present) | No | "unparseable date" |
| Notes | No | - |

## Output Files

The CLI generates six files in the specified output directory:

### 1. `stocktake-normalized.csv`

**Standard schema ready for reconciliation:**

```csv
Store,SKU/Item,CountedQty,Unit,CountedAt,Notes
Main Store,Water 500ml,100,bottles,2026-09-01,Checked twice
Branch A,Juice 1L,50,bottles,2026-09-01,
```

**Headers:** `Store,SKU/Item,CountedQty,Unit,CountedAt,Notes`

### 2. `rejected.csv`

Rows that failed validation with rejection reasons:

```csv
reason,Store,Item,Qty,Unit,Date
missing or blank quantity,Main Store,Water 500ml,,bottles,01/09/2026
missing store,,Juice 1L,50,bottles,01/09/2026
```

### 3. `missing-fields.md`

Human-readable report of missing fields:

```markdown
# Missing Fields Report

The following fields were missing or unparseable in rejected rows:

- CountedQty
- Store
```

### 4. `APPROVAL.md`

Safety checklist for manual review before using output:

- Offline operation verified
- No invented quantities
- File-based quantities only
- Read-only (no write-back)

### 5. `manifest.json`

Machine-readable metadata:

```json
{
  "tool": "pw-stocktake-csv-normalize",
  "version": "1.0.0",
  "inputFile": "stocktake.csv",
  "profile": "generic",
  "delimiter": "comma",
  "timestamp": "2026-09-02T01:00:00.000Z",
  "totalRows": 10,
  "normalizedRows": 8,
  "rejectedRows": 2
}
```

### 6. `report.md`

Summary report with statistics (row counts only — amounts stay in files):

```markdown
# Stocktake CSV Normalization Report

## Results

- **Total Rows:** 10
- **Normalized Rows:** 8
- **Rejected Rows:** 2
- **Success Rate:** 80.0%

## Next Steps

1. Review rejected.csv for critical missing items
2. Check missing-fields.md for data quality patterns
3. Use stocktake-normalized.csv for store reconciliation
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Valid row normalization
- Missing field validation
- Unparseable quantity handling
- Date format variations
- Quantity parsing with commas
- Decimal quantities
- Optional field handling

### Test with Fixtures

The tool includes synthetic test fixtures (no real stock levels or business data):

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run normalization on multiple fixtures (generic-good, loyverse-like, sparse-bad)
3. Generate reports in test output directories
4. Exit with code 0 (success)

**Fixtures included:**
- `generic-good.csv` - 5 valid stocktake entries with optional fields
- `loyverse-like.csv` - 4 Loyverse-style inventory entries
- `sparse-bad.csv` - 5 rows with 5 intentional validation failures

See `fixtures/README.md` for details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/pw-stocktake-csv-normalize/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── profiles.ts             # Profile configurations
│   ├── csv-parser.ts           # CSV parsing and delimiter detection
│   ├── normalizer.ts           # Normalization logic
│   ├── report-generator.ts     # Report generation
│   └── normalizer.test.ts      # Normalization tests
├── fixtures/
│   ├── generic-good.csv        # Valid generic stocktake
│   ├── loyverse-like.csv       # Loyverse-style export
│   ├── sparse-bad.csv          # Invalid rows for rejection testing
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
- ✅ **No invented quantities** - Blank/unparseable → rejected.csv
- ✅ **No invented items** - Missing SKU/Item → rejected.csv
- ✅ **File-based** - All quantities stay in CSV files
- ✅ **Read-only** - No write-back to Loyverse or inventory systems

**Safety Note:** This tool never invents, estimates, or fabricates quantities, items, or stores. All outputs are derived directly from the source CSV. Keep amounts in files, not chat. Review APPROVAL.md before using output.

## Troubleshooting

### "CSV file must have at least a header row and one data row" error

Ensure your CSV has:
- A header row
- At least one data row
- Valid content (not empty)

### High rejection rate

Check `rejected.csv` and `missing-fields.md` for:
- Missing Store column
- Missing SKU/Item column
- Missing CountedQty column or blank values
- Unparseable quantities (non-numeric)
- Missing Unit column

### Quantity parsing issues

For quantities:
- Ensure numeric values only (commas are okay: "1,234")
- Decimals are supported: "12.5"
- Blank or non-numeric values → rejected.csv

### Wrong delimiter detected

The tool auto-detects comma, semicolon, or tab. If detection fails, your CSV may have mixed delimiters (not supported).

## Example Output

### Terminal Output

```
Stocktake CSV Normalizer for Perfect Water / CoS

Reading input file: stocktake.csv
  ✓ Loaded 50 rows
  ✓ Detected delimiter: comma
  ✓ Using profile: generic

Normalizing rows...
  ✓ Normalized: 48
  ✓ Rejected: 2

Generating reports...
  ✓ stocktake-normalized.csv
  ✓ rejected.csv
  ✓ missing-fields.md
  ✓ APPROVAL.md
  ✓ manifest.json
  ✓ report.md

✅ Normalization complete!

⚠️  2 row(s) were rejected. See rejected.csv for details.
```

### Output File Sample

**stocktake-normalized.csv:**
```csv
Store,SKU/Item,CountedQty,Unit,CountedAt,Notes
Main Store,Perfect Water 500ml,150,bottles,2026-09-01,
Main Store,Perfect Water 1L,80,bottles,2026-09-01,
Branch A,Perfect Water 500ml,90,bottles,2026-09-01,Recount needed
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
