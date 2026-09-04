# pw-ordered-sold-pipeline-pack

**One-line:** Offline CLI tool orchestrating Perfect Water cost-of-sales reconciliation: optional Loyverse daily sales digest → ordered-vs-sold diff pack.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-ordered-sold-pipeline-pack/`

## Purpose

One dated pipeline pack for Perfect Water / CoS: optional Loyverse daily sales digest → ordered-vs-sold diff pack with PACK.md + APPROVAL.md. Offline CSV only. Never invents quantities, prices, SKUs, or store names. Never writes to Loyverse/Xero. Never sends mail.

## Goal

Wire existing Perfect Water cost-of-sales tools into a single offline pipeline pack orchestrator:

1. **pw-loyverse-daily-sales-digest** (optional, default OFF unless --sales-csv given or --run-sales)
2. **pw-ordered-vs-sold-diff** (default ON)

## Features

- 📦 **Pipeline orchestrator** - Calls sibling tools via npm run
- 🔍 **Flexible inputs** - Sales CSV (optional), ordered CSV + sold CSV (required for diff)
- 📊 **Index with counts only** - PACK.md shows operations performed, never quantity/amount tables in prose
- ✅ **Boolean skip flags** - PR #114 pattern for optional stages (`--run-sales`, `--no-run-sales`, `--run-diff`, `--no-run-diff`)
- 📋 **Accurate manifest** - PR #116 pattern, only lists files actually present
- 🚫 **Offline only** - No Loyverse API, no Xero API, no network calls
- ⚠️ **Never invents** - No quantities, prices, SKUs, or store names fabricated
- 🏗️ **Auto-build siblings** - Discovers real output layout, builds sibling dist/index.js if missing

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools** (auto-built if missing):
  - `tools/pw-loyverse-daily-sales-digest`
  - `tools/pw-ordered-vs-sold-diff`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-ordered-sold-pipeline-pack
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

### Mode 1: Diff Only (Default)

Ordered vs sold diff without sales digest:

```bash
npm run pack -- \
  --ordered-csv ordered.csv \
  --sold-csv sold.csv \
  --outdir pack-out/
```

### Mode 2: Sales Digest + Diff

Optional Loyverse sales digest, then diff:

```bash
npm run pack -- \
  --ordered-csv ordered.csv \
  --sales-csv loyverse-sales.csv \
  --run-sales \
  --outdir pack-out/
```

### Mode 3: Sales Digest Only

Sales digest without diff:

```bash
npm run pack -- \
  --sales-csv loyverse-sales.csv \
  --run-sales \
  --no-run-diff \
  --outdir pack-out/
```

### Optional Flags

#### Store Filter

```bash
npm run pack -- \
  --ordered-csv ordered.csv \
  --sold-csv sold.csv \
  --store "Louis Trichardt"
```

#### Date Label

```bash
npm run pack -- \
  --ordered-csv ordered.csv \
  --sold-csv sold.csv \
  --as-of 2026-09-02
```

#### Skip Sales Digest (PR #114 boolean patterns)

```bash
# Using equals sign
npm run pack -- --ordered-csv ordered.csv --sales-csv sales.csv --run-sales=false

# Using space
npm run pack -- --ordered-csv ordered.csv --sales-csv sales.csv --run-sales false

# Using negative flag
npm run pack -- --ordered-csv ordered.csv --sales-csv sales.csv --no-run-sales
```

#### Skip Diff

```bash
npm run pack -- --sales-csv sales.csv --run-sales --no-run-diff
```

## CLI Options

```
REQUIRED INPUTS:
  --ordered-csv <path>    Ordered quantities CSV
  --sold-csv <path>       Sold quantities CSV (or use --sales-csv)
  --sales-csv <path>      Alternative to --sold-csv (triggers optional sales digest)

OPTIONAL INPUTS:
  --store <name>          Store name for filtering (optional)
  --outdir <path>         Output directory [default: ./out]
  --as-of <YYYY-MM-DD>    Date label for pack naming [default: today]

STAGE CONTROL (PR #114 boolean patterns):
  --run-sales             Run pw-loyverse-daily-sales-digest [default: false unless --sales-csv]
                          Accepts: --run-sales, --run-sales=true/false,
                          --run-sales true/false, --no-run-sales
  
  --run-diff              Run pw-ordered-vs-sold-diff [default: true]
                          Accepts: --run-diff, --run-diff=true/false,
                          --run-diff true/false, --no-run-diff

OTHER:
  --help, -h              Show this help message
```

## Output Files

The CLI generates a pack in `<outdir>/pw-ordered-sold-pack-<date>/`:

### 1. PACK.md

**Index with operations performed** (NO quantity/amount tables in prose):
- Operations performed (which tools ran)
- Included files list
- Store filter (if used)
- Next steps
- Safety reminders

### 2. APPROVAL.md

**Approval gates and constraints:**
- Never invents (quantities, prices, SKUs, store names)
- Never writes (Loyverse, Xero, mail)
- Offline only
- PW ownership
- Approval gates (H3)

### 3. Sales Digest Files (if --run-sales)

- **digest.md** - Human-readable daily sales digest
- **digest.json** - Machine-readable rollup data
- **missing-fields.md** - Data quality report
- **sales-manifest.json** - Sales digest metadata

### 4. Diff Files (if --run-diff, default ON)

- **diff.md** - Human-readable ordered vs sold diff
- **diff.json** - Machine-readable diff data
- **missing-keys.md** - Items in one side but not the other

### 5. manifest.json

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
2. Process ordered.csv and sold.csv in `fixtures/`
3. Auto-build sibling tools if needed
4. Generate a pipeline pack in `test-out/`
5. Exit with code 0 (success)

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Pipeline Logic

1. **Parse inputs** - Validate --ordered-csv, --sold-csv/--sales-csv, optional --store
2. **Run sales digest** (if --run-sales or --sales-csv given without explicit --no-run-sales)
   - Auto-build pw-loyverse-daily-sales-digest if needed
   - Shell out to npm run digest
3. **Run diff** (unless --no-run-diff)
   - Auto-build pw-ordered-vs-sold-diff if needed
   - Shell out to npm run diff
4. **Copy stage outputs** - digest.md/json, diff.md/json, missing-keys.md, etc.
5. **Generate PACK.md** - Index with operations performed (no amounts in prose)
6. **Generate APPROVAL.md** - Never invents, never writes live systems
7. **Write manifest.json** - Run metadata and accurate file list (PR #116)

## Auto-Build Behavior

When a sibling tool's `dist/index.js` is missing:

1. Check if `node_modules` exists, run `npm install` if not
2. Run `npm run build` to create `dist/`
3. Continue with normal operation

This enables:
- ✅ Fresh clone workflow (no manual builds)
- ✅ CI/CD pipelines (fixtures test end-to-end)
- ✅ Discovery of real output layout

## Validation Rules

- At least one input mode must be provided
- `--sales-csv` enables `--run-sales` by default (can be overridden with `--no-run-sales`)
- `--run-diff` requires both `--ordered-csv` and `--sold-csv` (or `--sales-csv`)
- Missing inputs cause exit code 1
- Sibling tool failures propagate and cause exit 1

## Limitations & Constraints

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented quantities** - All amounts from source CSVs only
- ✅ **No invented prices** - Tool never calculates prices
- ✅ **No invented SKUs** - Only SKUs from source data
- ✅ **No invented store names** - Only stores from source data
- ✅ **Read-only** - Never modifies source CSV files or live systems
- ✅ **File-based** - All amounts stay in files
- ✅ **Perfect Water owns ops** - PW owns all CoS decisions
- ✅ **Exit 1 on bad input** - Malformed CSVs or missing inputs caught early

## Troubleshooting

### "Sibling tool not found" error

Ensure sibling tools exist:

```bash
cd ../pw-loyverse-daily-sales-digest && npm install && npm run build
cd ../pw-ordered-vs-sold-diff && npm install && npm run build
```

Or rely on auto-build (will happen automatically on first run).

### "Cannot run diff without --ordered-csv" error

Provide `--ordered-csv` or disable diff with `--no-run-diff`.

### "Must provide either --sold-csv or --sales-csv" error

Provide at least one input for sold quantities.

## Example Workflows

### Workflow 1: Monthly CoS Pack (Diff Only)

```bash
# Export ordered and sold CSVs from PW systems
# Save as: ordered-sept-2026.csv, sold-sept-2026.csv

# Assemble pack with diff only
cd tools/pw-ordered-sold-pipeline-pack
npm run pack -- \
  --ordered-csv ../../exports/ordered-sept-2026.csv \
  --sold-csv ../../exports/sold-sept-2026.csv \
  --as-of 2026-09-02 \
  --outdir ../../packs/sept-2026

# Review outputs
cat ../../packs/sept-2026/pw-ordered-sold-pack-2026-09-02/PACK.md
open ../../packs/sept-2026/pw-ordered-sold-pack-2026-09-02/diff.md
```

### Workflow 2: Sales Digest + Diff

```bash
# Export Loyverse sales CSV and ordered CSV
cd tools/pw-ordered-sold-pipeline-pack
npm run pack -- \
  --ordered-csv ordered.csv \
  --sales-csv loyverse-sales.csv \
  --run-sales \
  --outdir pack-out/

# Review outputs
cat pack-out/pw-ordered-sold-pack-*/PACK.md
open pack-out/pw-ordered-sold-pack-*/digest.md
open pack-out/pw-ordered-sold-pack-*/diff.md
```

### Workflow 3: Sales Digest Only (No Diff)

```bash
# Just want to review daily sales, no diff
npm run pack -- \
  --sales-csv loyverse-sales.csv \
  --run-sales \
  --no-run-diff
```

## Integration with Perfect Water Operations

### Typical Flow

1. **Export data** - From Loyverse, PW systems, or manual entry → CSVs
2. **Run pipeline pack** - Optional sales digest, then diff
3. **Review PACK.md** - Check operations performed and included files
4. **Open diff.md** - Inspect ordered vs sold deltas (amounts in file, not chat)
5. **Check missing-keys.md** - Investigate items in one side but not the other
6. **Review digest.md** - If ran, check daily sales rollup
7. **Perfect Water decides** - PW team makes CoS reconciliation decisions
8. **Archive pack** - Store in Drive `30_PerfectWater/CoS/YYYY-MM/`

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate** - Before using pack data for PW CoS decisions
- **Grant approval required** - Before any stock adjustments based on pack outputs

### Bot Reminder

**Amounts stay in files.** Never paste quantity figures or amounts into chat unless explicitly requested by Grant.

## Use Cases

1. **Monthly cost-of-sales reconciliation** - Ordered vs sold diff for CoS analysis
2. **Daily sales review** - Optional Loyverse digest for sales performance
3. **Shrinkage detection** - Identify items with negative deltas (sold > ordered)
4. **Missing keys investigation** - Items in one side but not the other
5. **Per-store analysis** - Use `--store` filter for store-specific packs

## Safety

This tool is designed for Perfect Water / CoS reconciliation:

✅ **Offline only** - No APIs or network calls  
✅ **No invented quantities** - All amounts from source CSVs only  
✅ **No invented prices** - Tool never calculates prices  
✅ **No invented SKUs** - Only SKUs from source data  
✅ **No invented store names** - Only stores from source data  
✅ **Read-only** - Never modifies source CSV files  
✅ **File-based** - All amounts stay in files  
✅ **Blank/unparseable qty → rejected** - Invalid rows reported  
✅ **Exit 1 on bad input** - Malformed CSVs caught early  
✅ **Perfect Water owns ops** - PW owns all CoS decisions

**Never invent stock levels, prices, or CoS adjustments.** Only report what exists in source CSVs.

## Related Tools

- **pw-loyverse-daily-sales-digest** - Daily sales digest from Loyverse CSV
- **pw-ordered-vs-sold-diff** - Compare ordered vs sold by SKU
- **pw-grv-stocktake-pipeline-pack** - Similar pattern for GRV + stocktake
- **browns-inquiry-quote-pipeline-pack** - Similar pattern for Browns hospitality

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** cost-of-sales, inventory-recon, sales-digest

## Quality Gates

- **H3** - Before any CoS decisions based on pack outputs
- **Grant approval** - Before any stock writes or CoS changes
- **Offline only** - This tool generates reports; no auto-adjustments

## Contributing

When updating this tool:
1. Maintain backward compatibility with sibling tool outputs
2. Add new features to `src/` with tests
3. Update fixtures if pack structure changes
4. Run `npm run test:fixtures` and `npm test`
5. Update this README and tools catalog
6. Conventional commit: `feat(tools): update pw-ordered-sold-pipeline-pack`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
