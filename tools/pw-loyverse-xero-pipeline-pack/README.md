# pw-loyverse-xero-pipeline-pack

**One-line:** Offline CLI tool orchestrating Perfect Water Loyverse↔Xero reconciliation packing: CSV inputs → gap report pack.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-loyverse-xero-pipeline-pack/`

## Purpose

One dated pipeline pack for Perfect Water / CoS cash integrity: Loyverse CSV + Xero CSV → gap report (CSV + Markdown) + PACK.md + APPROVAL.md. Offline only. Never invents amounts or invents matches. Never writes to Loyverse/Xero. Never sends mail.

## Goal

Wire existing Perfect Water Loyverse↔Xero reconciliation tool into a single offline pipeline pack orchestrator:

1. **loyverse-xero-recon** (default ON)

## Features

- 📦 **Pipeline orchestrator** - Calls sibling tool via npm run
- 🔍 **Flexible modes** - Receipt mode (transactions) or summary mode (monthly aggregates)
- 📊 **Index with counts only** - PACK.md shows operations performed, never amounts in prose
- ✅ **Boolean skip flags** - PR #114 pattern for optional stages (`--run-recon`, `--no-run-recon`)
- 📋 **Accurate manifest** - PR #116 pattern, only lists files actually present
- 🚫 **Offline only** - No Loyverse API, no Xero API, no network calls
- ⚠️ **Never invents** - No amounts, no forced matches fabricated
- 🏗️ **Auto-build sibling** - Discovers real output layout, builds sibling dist/index.js if missing

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tool** (auto-built if missing):
  - `tools/loyverse-xero-recon`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-loyverse-xero-pipeline-pack
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

### Mode 1: Receipt Reconciliation (Default)

Individual transaction reconciliation:

```bash
npm run pack -- \
  --loyverse-csv loyverse-receipts.csv \
  --xero-csv xero-transactions.csv \
  --outdir pack-out/
```

### Mode 2: Summary Reconciliation

Monthly aggregate reconciliation:

```bash
npm run pack -- \
  --loyverse-csv loyverse-summary.csv \
  --xero-csv xero-pl.csv \
  --mode summary \
  --outdir pack-out/
```

### Mode 3: Skip Reconciliation

Pack structure only (no reconciliation):

```bash
npm run pack -- \
  --loyverse-csv loyverse.csv \
  --xero-csv xero.csv \
  --no-run-recon \
  --outdir pack-out/
```

### Optional Flags

#### Date Label

```bash
npm run pack -- \
  --loyverse-csv loyverse.csv \
  --xero-csv xero.csv \
  --as-of 2026-09-02
```

#### Skip Reconciliation (PR #114 boolean patterns)

```bash
# Using equals sign
npm run pack -- --loyverse-csv loyverse.csv --xero-csv xero.csv --run-recon=false

# Using space
npm run pack -- --loyverse-csv loyverse.csv --xero-csv xero.csv --run-recon false

# Using negative flag
npm run pack -- --loyverse-csv loyverse.csv --xero-csv xero.csv --no-run-recon
```

## CLI Options

```
REQUIRED INPUTS:
  --loyverse-csv <path>   Loyverse CSV file (receipts or sales summary)
  --xero-csv <path>       Xero CSV file (bank transactions or P&L)

OPTIONAL INPUTS:
  --mode <type>           Reconciliation mode: receipt | summary [default: receipt]
  --outdir <path>         Output directory [default: ./out]
  --as-of <YYYY-MM-DD>    Date label for pack naming [default: today]

STAGE CONTROL (PR #114 boolean patterns):
  --run-recon             Run loyverse-xero-recon [default: true]
                          Accepts: --run-recon, --run-recon=true/false,
                          --run-recon true/false, --no-run-recon

OTHER:
  --help, -h              Show this help message
```

## Output Files

The CLI generates a pack in `<outdir>/pw-loyverse-xero-pack-<date>/`:

### 1. PACK.md

**Index with operations performed** (NO amounts in prose):
- Operations performed (which tools ran)
- Included files list
- Mode used
- Next steps
- Safety reminders

### 2. APPROVAL.md

**Approval gates and constraints:**
- Never invents (amounts, matches)
- Never writes (Loyverse, Xero, mail)
- Offline only
- PW ownership
- Approval gates (H3)

### 3. Reconciliation Files (if --run-recon, default ON)

- **gap-report.csv** - Machine-readable gap data
- **gap-report.md** - Human-readable gap report with summary statistics

### 4. manifest.json

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
2. Process loyverse-sales.csv and xero-sales.csv in `fixtures/`
3. Auto-build sibling tool if needed
4. Generate a pipeline pack in `test-out/`
5. Exit with code 0 (success)

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Pipeline Logic

1. **Parse inputs** - Validate --loyverse-csv, --xero-csv, optional --mode
2. **Run reconciliation** (unless --no-run-recon)
   - Auto-build loyverse-xero-recon if needed
   - Shell out to npm run recon
3. **Copy recon outputs** - gap-report.csv, gap-report.md
4. **Generate PACK.md** - Index with operations performed (no amounts in prose)
5. **Generate APPROVAL.md** - Never invents, never writes live systems
6. **Write manifest.json** - Run metadata and accurate file list (PR #116)

## Auto-Build Behavior

When sibling tool's `dist/index.js` is missing:

1. Check if `node_modules` exists, run `npm install` if not
2. Run `npm run build` to create `dist/`
3. Continue with normal operation

This enables:
- ✅ Fresh clone workflow (no manual builds)
- ✅ CI/CD pipelines (fixtures test end-to-end)
- ✅ Discovery of real output layout

## Validation Rules

- Both --loyverse-csv and --xero-csv must be provided
- --mode must be "receipt" or "summary" (default: receipt)
- Missing inputs cause exit code 1
- Sibling tool failures propagate and cause exit 1

## Limitations & Constraints

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented amounts** - All amounts from source CSVs only
- ✅ **No invented matches** - Tool never forces reconciliation
- ✅ **Read-only** - Never modifies source CSV files or live systems
- ✅ **File-based** - All amounts stay in files
- ✅ **Perfect Water owns ops** - PW owns all CoS decisions
- ✅ **Exit 1 on bad input** - Malformed CSVs or missing inputs caught early

## Troubleshooting

### "Sibling tool not found" error

Ensure sibling tool exists:

```bash
cd ../loyverse-xero-recon && npm install && npm run build
```

Or rely on auto-build (will happen automatically on first run).

### "Must provide --loyverse-csv" error

Provide both required CSV inputs.

### Invalid mode error

Use `--mode receipt` or `--mode summary`.

## Example Workflows

### Workflow 1: Monthly CoS Reconciliation (Receipt Mode)

```bash
# Export Loyverse receipts and Xero bank transactions
# Save as: loyverse-jan-2026.csv, xero-jan-2026.csv

# Assemble pack with reconciliation
cd tools/pw-loyverse-xero-pipeline-pack
npm run pack -- \
  --loyverse-csv ../../exports/loyverse-jan-2026.csv \
  --xero-csv ../../exports/xero-jan-2026.csv \
  --as-of 2026-01-31 \
  --outdir ../../packs/jan-2026

# Review outputs
cat ../../packs/jan-2026/pw-loyverse-xero-pack-2026-01-31/PACK.md
open ../../packs/jan-2026/pw-loyverse-xero-pack-2026-01-31/gap-report.md
```

### Workflow 2: Summary Mode Reconciliation

```bash
# Export Loyverse sales summary and Xero P&L
cd tools/pw-loyverse-xero-pipeline-pack
npm run pack -- \
  --loyverse-csv loyverse-summary.csv \
  --xero-csv xero-pl.csv \
  --mode summary \
  --outdir pack-out/

# Review outputs
cat pack-out/pw-loyverse-xero-pack-*/PACK.md
open pack-out/pw-loyverse-xero-pack-*/gap-report.md
```

### Workflow 3: Pack Structure Only (No Reconciliation)

```bash
# Just want pack structure without running recon
npm run pack -- \
  --loyverse-csv loyverse.csv \
  --xero-csv xero.csv \
  --no-run-recon
```

## Integration with Perfect Water Operations

### Typical Flow

1. **Export data** - From Loyverse and Xero → CSVs
2. **Run pipeline pack** - Reconciliation (default) → gap report pack
3. **Review PACK.md** - Check operations performed and included files
4. **Open gap-report.md** - Inspect gaps (unmatched, mismatches, duplicates)
5. **Check gap-report.csv** - Machine-readable data for spreadsheet analysis
6. **Perfect Water decides** - PW team investigates gaps and makes CoS decisions
7. **Archive pack** - Store in Drive `30_PerfectWater/CoS/YYYY-MM/`

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate** - Before using pack data for PW CoS decisions
- **Grant approval required** - Before any CoS adjustments based on pack outputs

### Bot Reminder

**Amounts stay in files.** Never paste figures or amounts into chat unless explicitly requested by Grant.

## Use Cases

1. **Monthly cash integrity reconciliation** - Loyverse receipts vs Xero bank transactions
2. **Summary reconciliation** - Loyverse sales summary vs Xero P&L reports
3. **Gap investigation** - Identify unmatched transactions, date/amount mismatches
4. **CoS analysis** - Archive packs for Perfect Water CoS decision-making

## Safety

This tool is designed for Perfect Water / CoS reconciliation:

✅ **Offline only** - No APIs or network calls  
✅ **Never invents amounts** - All amounts from source CSVs only  
✅ **Never invents matches** - Only reports actual gaps, no forced reconciliation  
✅ **Read-only** - Never modifies source CSV files  
✅ **File-based** - All amounts stay in files  
✅ **Exit 1 on bad input** - Malformed CSVs caught early  
✅ **Perfect Water owns ops** - PW owns all CoS decisions

**Never invent amounts or forced matches. Only report what exists in source CSVs.**

## Related Tools

- **loyverse-xero-recon** - Loyverse↔Xero reconciliation gap CLI (sibling tool)
- **pw-ordered-sold-pipeline-pack** - Similar pattern for ordered vs sold reconciliation
- **pw-bank-rejected-pipeline-pack** - Similar pattern for bank rejected transactions
- **browns-inquiry-quote-pipeline-pack** - Similar pattern for Browns hospitality

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** cost-of-sales, cash-integrity, reconciliation

## Quality Gates

- **H3** - Before any CoS decisions based on pack outputs
- **Grant approval** - Before any CoS adjustments or system writes
- **Offline only** - This tool generates reports; no auto-adjustments

## Contributing

When updating this tool:
1. Maintain backward compatibility with sibling tool outputs
2. Add new features to `src/` with tests
3. Update fixtures if pack structure changes
4. Run `npm run test:fixtures` and `npm test`
5. Update this README and tools catalog
6. Conventional commit: `feat(tools): update pw-loyverse-xero-pipeline-pack`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
