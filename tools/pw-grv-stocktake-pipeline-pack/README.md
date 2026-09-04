# pw-grv-stocktake-pipeline-pack

**One-line:** Offline CLI orchestrator wiring Perfect Water GRV + stocktake normalize → diff → optional inventory-recon into one pipeline pack.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-grv-stocktake-pipeline-pack/`

## Purpose

Wire existing Perfect Water inventory reconciliation tools into a single offline pipeline pack orchestrator:

1. **pw-grv-csv-normalize** (optional, if raw GRV provided)
2. **pw-stocktake-csv-normalize** (optional, if raw stocktake provided)
3. **pw-grv-vs-stocktake-diff** (required for meaningful pack)
4. **pw-inventory-recon-pack** (optional, default ON if sibling cleanly accepts diff outputs; else OFF with README note)

Never invents stock quantities or rand amounts. Never pays. Offline validation only. Perfect Water owns ops.

## Features

- 📦 **Pipeline orchestrator** - Calls sibling tools via npm run
- 🔍 **Flexible inputs** - Normalized CSVs, raw CSVs with normalization, or prebuilt diff outputs
- 📊 **Index with counts only** - PACK.md shows row/key counts, never quantity/amount tables in prose
- ✅ **Boolean skip flags** - PR #114 pattern for optional stages (`--run-inventory-recon`, `--no-run-inventory-recon`)
- 📋 **Accurate manifest** - PR #116 pattern, only lists files actually present
- 🚫 **Offline only** - No Loyverse API, no network calls
- ⚠️ **Never invents quantities** - All amounts from source CSVs only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools installed and built:**
  - `tools/pw-grv-csv-normalize`
  - `tools/pw-stocktake-csv-normalize`
  - `tools/pw-grv-vs-stocktake-diff`
  - `tools/pw-inventory-recon-pack` (optional)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-grv-stocktake-pipeline-pack
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

### Mode 1: From Normalized CSVs (Preferred)

When you already have normalized GRV and stocktake CSVs:

```bash
npm run pipeline -- \
  --grv-norm ../pw-grv-csv-normalize/out/grv-normalized.csv \
  --stock-norm ../pw-stocktake-csv-normalize/out/stocktake-normalized.csv \
  --outdir pack-out/
```

### Mode 2: From Raw CSVs (Normalize First)

When you have raw GRV and stocktake CSVs:

```bash
npm run pipeline -- \
  --grv-raw raw-grv.csv \
  --stock-raw raw-stocktake.csv \
  --outdir pack-out/
```

### Mode 3: From Prebuilt Diff Outputs

When you already have diff outputs from `pw-grv-vs-stocktake-diff`:

```bash
npm run pipeline -- \
  --diff-outdir ../pw-grv-vs-stocktake-diff/out/ \
  --outdir pack-out/
```

### Optional Flags

#### Skip inventory-recon-pack (PR #114 boolean patterns)

```bash
# Using equals sign
npm run pipeline -- --grv-norm grv.csv --stock-norm stock.csv --run-inventory-recon=false

# Using space
npm run pipeline -- --grv-norm grv.csv --stock-norm stock.csv --run-inventory-recon false

# Using negative flag
npm run pipeline -- --grv-norm grv.csv --stock-norm stock.csv --no-run-inventory-recon
```

#### Skip diff (only valid with --diff-outdir)

```bash
npm run pipeline -- --diff-outdir diff-out/ --skip-diff
```

## CLI Options

```
OPTIONS:
  --grv-norm              Path to normalized GRV CSV
  --stock-norm            Path to normalized stocktake CSV
  --grv-raw               Path to raw GRV CSV (requires normalization)
  --stock-raw             Path to raw stocktake CSV (requires normalization)
  --diff-outdir           Path to prebuilt diff output directory
  
  --run-inventory-recon   Run pw-inventory-recon-pack [default: true]
                          Accepts: --run-inventory-recon, --run-inventory-recon=true/false,
                          --run-inventory-recon true/false, --no-run-inventory-recon
  --skip-diff             Skip pw-grv-vs-stocktake-diff (only if --diff-outdir provided)
  
  --outdir, -o            Output directory [default: ./out]
  --help, -h              Show this help message
```

## Output Files

The CLI generates a pack in `<outdir>/pw-grv-stocktake-pack/`:

### 1. PACK.md

**Index with counts only** (NO quantity/amount tables in prose):
- Included files list
- Summary statistics (row/key counts)
- Operations performed
- Usage instructions
- Critical reminders (amounts stay in files)

### 2. Core Diff Files (from pw-grv-vs-stocktake-diff)

- **diff.md** - Human-readable diff report
- **diff.json** - Machine-readable diff data
- **missing-keys.md** - Items missing in one side or rejected rows
- **APPROVAL.md** - Approval gates and PW ownership

### 3. Inventory Recon Files (if run)

- **APPROVAL-RECON.md** - Additional approval checklist
- Additional files from `pw-inventory-recon-pack` if successful

### 4. PACK-manifest.json

Machine-readable pipeline metadata (PR #116 - only lists files actually present):
- Tool name and version
- Timestamp
- Operations performed (which tools ran)
- Input paths
- Files list (accurate to present files)

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
2. Process normalized CSVs in `fixtures/normalized-csvs/`
3. Generate a pipeline pack in `test-out/`
4. Exit with code 0 (success)

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Pipeline Logic

1. **Determine input mode** - Normalized CSVs, raw CSVs, or prebuilt diff
2. **Run GRV normalization** (if raw GRV provided)
3. **Run stocktake normalization** (if raw stocktake provided)
4. **Run diff** (unless --skip-diff or --diff-outdir provided)
5. **Copy diff outputs** - diff.md, diff.json, missing-keys.md, APPROVAL.md
6. **Optional: Run inventory-recon-pack** (default ON, can be skipped with --run-inventory-recon=false)
7. **Generate PACK.md** - Index with row/key counts only
8. **Write PACK-manifest.json** - Run metadata and accurate file list (PR #116)

## Validation Rules

- At least one input mode must be provided
- `--grv-raw` and `--stock-raw` require both to be present
- `--grv-norm` and `--stock-norm` require both to be present
- Missing inputs cause exit code 1
- Sibling tool failures propagate and cause exit 1

## Limitations & Constraints

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented quantities** - All amounts from source CSVs only
- ✅ **Read-only** - Never modifies source CSV files or inventory systems
- ✅ **File-based** - All amounts stay in files
- ✅ **Perfect Water owns ops** - PW owns all inventory decisions
- ✅ **Exit 1 on bad input** - Malformed CSVs or missing inputs caught early

## Troubleshooting

### "Must provide one of..." error

Ensure you provide one input mode:
- `--grv-norm` + `--stock-norm` (normalized CSVs)
- `--grv-raw` + `--stock-raw` (raw CSVs)
- `--diff-outdir` (prebuilt diff)

### "Sibling tool not found" error

Ensure sibling tools exist and are built:

```bash
cd ../pw-grv-csv-normalize && npm install && npm run build
cd ../pw-stocktake-csv-normalize && npm install && npm run build
cd ../pw-grv-vs-stocktake-diff && npm install && npm run build
cd ../pw-inventory-recon-pack && npm install && npm run build
```

### "Failed to run inventory-recon-pack" warning

This is non-fatal. The pipeline continues without inventory-recon outputs. Core diff files are still available.

To disable inventory-recon-pack entirely:

```bash
npm run pipeline -- [inputs] --run-inventory-recon=false
```

## Example Workflows

### Workflow 1: Monthly Inventory Recon (Full Pipeline)

```bash
# Export GRV and stocktake CSVs from Loyverse
# Save as: grv-sept-2026.csv, stocktake-sept-2026.csv

# Assemble pack with full orchestration
cd tools/pw-grv-stocktake-pipeline-pack
npm run pipeline -- \
  --grv-raw ../../exports/grv-sept-2026.csv \
  --stock-raw ../../exports/stocktake-sept-2026.csv \
  --outdir ../../packs/sept-2026

# Review outputs
cat ../../packs/sept-2026/pw-grv-stocktake-pack/PACK.md
open ../../packs/sept-2026/pw-grv-stocktake-pack/diff.md
```

### Workflow 2: Quick Pack from Prebuilt Diff

```bash
# Already ran pw-grv-vs-stocktake-diff
cd tools/pw-grv-stocktake-pipeline-pack
npm run pipeline -- \
  --diff-outdir ../pw-grv-vs-stocktake-diff/out/ \
  --outdir pack-out/

# Review outputs
cat pack-out/pw-grv-stocktake-pack/PACK.md
```

### Workflow 3: Skip Inventory Recon Pack

```bash
# Only want diff outputs, not full recon pack
npm run pipeline -- \
  --grv-norm grv-normalized.csv \
  --stock-norm stocktake-normalized.csv \
  --no-run-inventory-recon
```

## Integration with Perfect Water Operations

### Typical Flow

1. **Export data** - From Loyverse, supplier emails, or manual entry → CSVs
2. **Run pipeline pack** - Normalize, diff, and optionally run full recon pack
3. **Review PACK.md** - Check row/key counts and included files
4. **Open diff.md** - Inspect item-level deltas (amounts in file, not chat)
5. **Check missing-keys.md** - Investigate items in one side but not the other
6. **Perfect Water decides** - PW team makes inventory adjustment decisions
7. **Archive pack** - Store in Drive `30_PerfectWater/InventoryRecon/YYYY-MM/`

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate** - Before using diff data for PW inventory decisions
- **Grant approval required** - Before any stock adjustments based on pack outputs

### Bot Reminder

**Amounts stay in files.** Never paste quantity figures or amounts into chat unless explicitly requested by Grant.

## Use Cases

1. **Monthly inventory reconciliation** - Full pipeline from raw exports to recon pack
2. **Shrinkage detection** - Identify items with negative deltas (counted < received)
3. **Stocktake error detection** - Large deltas may indicate counting mistakes
4. **Data quality auditing** - Review rejected rows and missing keys
5. **Cost-of-sales verification** - Validate stock movements match receipts

## Safety

This tool is designed for Perfect Water / CoS inventory reconciliation:

✅ **Offline only** - No APIs or network calls  
✅ **No invented quantities** - All amounts from source CSVs only  
✅ **Read-only** - Never modifies source CSV files  
✅ **File-based** - All amounts stay in files  
✅ **Blank/unparseable qty → rejected** - Invalid rows reported  
✅ **Exit 1 on bad input** - Malformed CSVs caught early  
✅ **Perfect Water owns ops** - PW owns all inventory decisions

**Never invent stock levels or counts.** Only report what exists in source CSVs.

## Related Tools

- **pw-grv-csv-normalize** - Normalize GRV CSVs into standard schema
- **pw-stocktake-csv-normalize** - Normalize stocktake CSVs into standard schema
- **pw-grv-vs-stocktake-diff** - Compare normalized GRV vs stocktake by Store + SKU
- **pw-inventory-recon-pack** - Orchestrate full inventory recon pack with rejected digest
- **pw-ordered-vs-sold-diff** - Compare ordered vs sold by SKU
- **pw-loyverse-daily-sales-digest** - Daily sales digest from Loyverse

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** inventory-alerts, stock-take-variance, supplier-po

## Quality Gates

- **H3** - Before any inventory adjustment decisions based on pack outputs
- **Grant approval** - Before any stock writes or CoS changes
- **Offline only** - This tool generates reports; no auto-adjustments

## Contributing

When updating this tool:
1. Maintain backward compatibility with sibling tool outputs
2. Add new features to `src/` with tests
3. Update fixtures if pack structure changes
4. Run `npm run test:fixtures` and `npm test`
5. Update this README and tools catalog
6. Conventional commit: `feat(tools): update pw-grv-stocktake-pipeline-pack`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
