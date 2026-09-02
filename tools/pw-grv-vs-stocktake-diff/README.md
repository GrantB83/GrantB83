# Perfect Water GRV vs Stocktake Diff CLI

An offline command-line tool that compares normalized GRV (goods-received voucher) CSV against normalized stocktake CSV by Store + SKU/Item for Perfect Water / CoS inventory reconciliation. Reports counted vs received deltas to help identify shrinkage, stocktake errors, or GRV discrepancies.

## Features

- 📊 **CSV-based diff** - Offline, no APIs required
- 🏪 **Store + SKU comparison** - Groups by Store|SKU/Item key
- 📝 **Dual output** - JSON (structured) + Markdown (readable)
- 🔍 **Missing keys detection** - Flags items in one CSV but not the other
- ⚠️ **Rejected rows tracking** - Reports blank/unparseable quantities
- 🔗 **Orchestrator support** - Can shell out to sibling normalizer tools
- ✅ **Fully tested** - Includes automated tests and synthetic fixtures
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Purpose

Perfect Water maintains goods-received (GRV) records and periodic stocktake counts. This tool compares normalized GRV data against normalized stocktake data by Store + SKU/Item, reporting deltas to identify:

- **Shrinkage** - Stock counted less than received
- **Stocktake errors** - Miscounts or missed items
- **GRV discrepancies** - Items received but not recorded
- **Unrecorded receipts** - Items counted but no GRV exists

**Preferred inputs:** Outputs from sibling tools:
- `pw-grv-csv-normalize` → `grv-normalized.csv` (headers: Store, SKU/Item, ReceivedQty, Unit, ReceivedAt, Supplier, DocNo, Notes)
- `pw-stocktake-csv-normalize` → `stocktake-normalized.csv` (headers: Store, SKU/Item, CountedQty, Unit, CountedAt, Notes)

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-grv-vs-stocktake-diff
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

### Basic Usage (Pre-Normalized CSVs)

```bash
npm run diff -- --grv <grv-file> --stocktake <stocktake-file> --outdir <output-dir>
```

**Example:**

```bash
npm run diff -- \
  --grv grv-normalized.csv \
  --stocktake stocktake-normalized.csv \
  --outdir out/
```

### Orchestrator Mode (Run Sibling Tools)

If you have raw CSVs and want to normalize them first:

```bash
npm run diff -- \
  --run-grv-normalize --grv-raw raw-grv.csv \
  --run-stocktake-normalize --stock-raw raw-stocktake.csv \
  --outdir out/
```

This will:
1. Shell out to `pw-grv-csv-normalize` to normalize the raw GRV CSV
2. Shell out to `pw-stocktake-csv-normalize` to normalize the raw stocktake CSV
3. Compare the normalized outputs
4. Generate diff reports

### Custom Column Names

If your normalized CSVs use different column names:

```bash
npm run diff -- \
  --grv grv-normalized.csv \
  --stocktake stocktake-normalized.csv \
  --outdir out/ \
  --store-col "Location" \
  --key-col "Product" \
  --grv-qty-col "Received" \
  --stock-qty-col "Counted"
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--grv` | Path to normalized GRV CSV | Yes* | - |
| `--stocktake` | Path to normalized stocktake CSV | Yes* | - |
| `--outdir` | Output directory | No | `./out` |
| `--store-col` | Store column name | No | `Store` |
| `--key-col` | SKU/Item column name | No | `SKU/Item` |
| `--grv-qty-col` | GRV quantity column name | No | `ReceivedQty` |
| `--stock-qty-col` | Stocktake quantity column name | No | `CountedQty` |
| `--run-grv-normalize` | Run pw-grv-csv-normalize first | No | false |
| `--grv-raw` | Raw GRV CSV (requires --run-grv-normalize) | No | - |
| `--run-stocktake-normalize` | Run pw-stocktake-csv-normalize first | No | false |
| `--stock-raw` | Raw stocktake CSV (requires --run-stocktake-normalize) | No | - |
| `--help`, `-h` | Show help message | No | - |

\* Required unless using orchestrator mode with `--run-grv-normalize` and `--run-stocktake-normalize`

### Output Files

The CLI generates five files in the specified output directory:

1. **`diff.json`** - Structured diff data
   - Items with store, item, received, counted, delta
   - Summary statistics
   - Machine-readable format

2. **`diff.md`** - Human-readable diff
   - Summary statistics (totals and counts)
   - Item-level breakdown table with Store, Item, Received, Counted, Delta, Unit
   - Sorted by absolute delta (largest discrepancies first)

3. **`missing-keys.md`** - Missing keys report
   - Items in GRV but missing in stocktake (received but not counted)
   - Items in stocktake but missing in GRV (counted but no GRV record)
   - Rejected rows from both CSVs (blank/unparseable quantities)

4. **`APPROVAL.md`** - Safety gates and ownership
   - Tool purpose and constraints
   - Perfect Water ownership notice
   - Approval gates (H3 before inventory decisions)
   - Bot reminders (amounts stay in files)

5. **`manifest.json`** - Run metadata
   - Input file paths
   - Summary statistics
   - Timestamp
   - Output file descriptions

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test fixtures (no real stock levels):

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Process `fixtures/grv-normalized.csv` and `fixtures/stocktake-normalized.csv`
3. Generate reports in `test-out/`
4. Exit with code 0 (success)

The fixtures simulate realistic Perfect Water inventory scenarios:
- 4 matched items with varying deltas
- 1 item received but not counted (Salt 25kg)
- 1 item counted but no GRV (Ice Tray)
- Total delta: +15 (more counted than received)

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/pw-grv-vs-stocktake-diff/
├── src/
│   ├── index.ts              # CLI entry point with orchestrator support
│   ├── types.ts              # TypeScript type definitions
│   ├── csv-parser.ts         # CSV parsing logic for GRV and stocktake
│   ├── csv-parser.test.ts    # CSV parser tests
│   └── diff-generator.ts     # Diff generation and report logic
├── fixtures/
│   ├── grv-normalized.csv    # Synthetic GRV data
│   ├── stocktake-normalized.csv  # Synthetic stocktake data
│   └── README.md             # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── test-out/                 # Test outputs (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Data Processing

### Diff Logic

1. **Parse GRV CSV** - Read and validate goods-received data
2. **Parse Stocktake CSV** - Read and validate stocktake counts
3. **Generate Key Map** - Build key as `Store|SKU/Item`
4. **Calculate Deltas** - For each key: `delta = counted - received`
   - Positive delta → More counted than received (possible GRV undercount or stocktake overcount)
   - Negative delta → Less counted than received (possible shrinkage or stocktake error)
5. **Identify Missing Keys** - Flag items in one CSV but not the other
6. **Sort by Delta** - Largest absolute delta first (biggest discrepancies on top)

### Validation Rules

- All required columns must be present (Store, SKU/Item, Qty)
- Store and Item must not be blank
- Quantity must be a valid number
- Invalid rows are rejected and reported in `missing-keys.md`
- Empty CSVs or CSVs with only invalid rows cause exit code 1

### Comparison Key

Each item is grouped by `Store|SKU/Item`:
- Example: `LT|Water 5L` and `Tho|Water 5L` are distinct
- Same item in different stores are tracked separately
- Delta is calculated per store+item combination

## Limitations & Constraints

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented quantities** - All amounts from source CSVs only
- ✅ **Read-only** - Never modifies source CSV files
- ✅ **File-based** - All amounts stay in files
- ✅ **Blank/unparseable qty → rejected** - Invalid rows reported in missing-keys.md
- ✅ **Exit 1 on bad input** - Malformed CSVs caught early
- ✅ **Perfect Water owns ops** - PW owns all inventory decisions

## Troubleshooting

### "Required column not found" error

Ensure your CSVs have the required columns:
- GRV: Store, SKU/Item, ReceivedQty (or use column overrides)
- Stocktake: Store, SKU/Item, CountedQty (or use column overrides)

Check the error message for exact column names found in your CSV.

### "CSV file not found" error

Verify:
- File path is correct
- File exists
- You have read permissions

### Rejected rows reported

Check `missing-keys.md` for:
- Row numbers with blank Store, SKU/Item, or quantity
- Unparseable quantity values
- Fix or remove invalid rows from source CSVs and re-run

### Missing keys reported

Check `missing-keys.md` for:
- Items in GRV but not in stocktake (not counted? missing from stocktake?)
- Items in stocktake but not in GRV (no GRV record? unrecorded receipt?)
- Investigate discrepancies before inventory decisions

### Orchestrator mode fails

If `--run-grv-normalize` or `--run-stocktake-normalize` fails:
- Ensure sibling tools exist: `tools/pw-grv-csv-normalize` and `tools/pw-stocktake-csv-normalize`
- Ensure sibling tools are built: `cd tools/pw-grv-csv-normalize && npm install && npm run build`
- Check sibling tool error messages

## Example Output

### Terminal Output

```
Perfect Water GRV vs Stocktake Diff CLI

Reading GRV CSV: fixtures/grv-normalized.csv
  ✓ Loaded 5 valid row(s)

Reading stocktake CSV: fixtures/stocktake-normalized.csv
  ✓ Loaded 5 valid row(s)

Generating diff...
  ✓ Compared 6 item(s)
  ✓ Total received: 260
  ✓ Total counted: 275
  ✓ Total delta (counted - received): 15

Generating reports in: test-out
  ✓ diff.json
  ✓ diff.md
  ✓ missing-keys.md
  ✓ APPROVAL.md
  ✓ manifest.json

✅ Diff generation complete!

⚠️  1 item(s) missing in stocktake, 1 missing in GRV. See missing-keys.md.
```

### Markdown Diff Sample

```markdown
# Perfect Water GRV vs Stocktake Diff

**Generated:** 2026-09-02T10:00:00.000Z

## Summary

- **Total Received:** 260
- **Total Counted:** 275
- **Total Delta (Counted - Received):** 15
- **Items Compared:** 6
- **Missing in Stocktake:** 1
- **Missing in GRV:** 1

## Item Breakdown

| Store | Item | Received | Counted | Delta | Unit |
|-------|------|----------|---------|-------|------|
| LT | Water 5L | 100 | 95 | -5 | bottles |
| Tho | Water 5L | 80 | 82 | 2 | bottles |
| Tho | Filter Cartridge | 20 | 18 | -2 | units |
| LT | Water 10L | 50 | 50 | 0 | bottles |
| LT | Salt 25kg | 10 | 0 | -10 | bags |
| LT | Ice Tray | 0 | 30 | 30 | units |

---

**⚠️ Reminder for Bots:** Amounts stay in this file. Never paste quantity figures into chat unless explicitly requested.
```

## Integration with Perfect Water Operations

### Typical Workflow

1. **Export GRV data** - From Loyverse, supplier emails, or manual entry → CSV
2. **Normalize GRV** - Run `pw-grv-csv-normalize` → `grv-normalized.csv`
3. **Export stocktake** - From Loyverse, manual counts, or spreadsheet → CSV
4. **Normalize stocktake** - Run `pw-stocktake-csv-normalize` → `stocktake-normalized.csv`
5. **Run diff** - Process with this CLI → `diff.md`, `missing-keys.md`
6. **Review output** - Check deltas and missing keys
7. **Investigate discrepancies** - Why the delta? Shrinkage? Error? Theft?
8. **Perfect Water decides** - PW team makes inventory adjustment decisions

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate:** Before using diff data for PW inventory decisions
- **Grant approval required:** Before any stock adjustments based on diff outputs

### Bot Reminder

**Amounts stay in files.** Never paste quantity figures or amounts into chat unless explicitly requested by Grant.

## Use Cases

1. **Monthly inventory reconciliation** - Compare month's GRV data vs month-end stocktake
2. **Shrinkage detection** - Identify items with negative deltas (counted < received)
3. **Stocktake error detection** - Large deltas may indicate counting mistakes
4. **GRV discrepancy investigation** - Items counted but no GRV → unrecorded receipts?
5. **Cost-of-sales verification** - Validate stock movements match receipts

## Safety

This tool is designed for Perfect Water / CoS inventory reconciliation:

✅ **Offline only** - No APIs or network calls  
✅ **No invented quantities** - All amounts from source CSVs only  
✅ **Read-only** - Never modifies source CSV files  
✅ **File-based** - All amounts stay in files  
✅ **Blank/unparseable qty → rejected** - Invalid rows reported in missing-keys.md  
✅ **Exit 1 on bad input** - Malformed CSVs caught early  
✅ **Perfect Water owns ops** - PW owns all inventory decisions

**Never invent stock levels or counts.** Only report what exists in source CSVs.

## Related Tools

- **pw-grv-csv-normalize** - Normalize GRV CSVs into standard schema
- **pw-stocktake-csv-normalize** - Normalize stocktake CSVs into standard schema
- **pw-ordered-vs-sold-diff** - Compare ordered vs sold by SKU
- **pw-loyverse-daily-sales-digest** - Daily sales digest from Loyverse
- **loyverse-xero-recon** - Reconcile Loyverse with Xero accounting

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** inventory-alerts, supplier-po, bank-recon-exceptions

## Quality Gates

- **H3** - Before any inventory adjustment decisions based on diff outputs
- **Grant approval** - Before any stock writes or CoS changes
- **Offline only** - This tool generates reports; no auto-adjustments

## Contributing

When updating this tool:
1. Maintain backward compatibility with normalized CSV schemas
2. Add new features to `src/` with tests
3. Update fixtures if schema changes
4. Run `npm run test:fixtures` and `npm test`
5. Update this README and tools catalog
6. Conventional commit: `feat(tools): update pw-grv-vs-stocktake-diff`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
