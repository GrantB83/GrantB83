# pw-inventory-recon-pack

**One-line:** Offline orchestrator for Perfect Water inventory recon pack assembly (pw-grv-csv-normalize + pw-stocktake-csv-normalize + pw-grv-vs-stocktake-diff + optional pw-rejected-csv-digest).

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-inventory-recon-pack/`

## Purpose

Assemble a complete Perfect Water inventory reconciliation pack by orchestrating sibling tools and bundling outputs into one deliverable with PACK.md (index + counts only), APPROVAL.md (H3-style gate reminder), and manifest.json. Amounts and quantities stay in files, never in prose.

## Features

- 📦 **Pack orchestrator** - Calls pw-grv-csv-normalize, pw-stocktake-csv-normalize, pw-grv-vs-stocktake-diff, pw-rejected-csv-digest
- 📊 **Flexible inputs** - Prebuilt normalized CSVs, raw CSVs with normalization, or prebuilt diff outputs
- 🔍 **Index with counts only** - PACK.md shows row/key counts, never quantity/amount tables in prose
- ✅ **Approval gates** - APPROVAL.md reminds of H3 gate and PW ownership
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries
- 🚫 **Offline only** - No Loyverse write-back, no network calls
- ⚠️ **Never invents quantities** - All amounts from source CSVs only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-inventory-recon-pack
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

### Mode A: Prebuilt Diff Outputs

When you already have diff outputs from pw-grv-vs-stocktake-diff:

```bash
npm run pack -- --diff-outdir ../pw-grv-vs-stocktake-diff/out --outdir pack-out/
```

### Mode B: Prebuilt Normalized CSVs

When you have normalized GRV and stocktake CSVs:

```bash
npm run pack -- \
  --grv grv-normalized.csv \
  --stocktake stocktake-normalized.csv \
  --outdir pack-out/
```

### Mode C: Raw CSVs with Full Orchestration

When you have raw CSVs and want to normalize, diff, and digest rejected rows:

```bash
npm run pack -- \
  --grv-raw raw-grv.csv \
  --stock-raw raw-stocktake.csv \
  --run-normalize \
  --run-rejected-digest \
  --outdir pack-out/
```

### Optional Flags

- `--run-diff <true|false>` - Run pw-grv-vs-stocktake-diff (default: true when inputs present)
- `--run-rejected-digest` - Run pw-rejected-csv-digest on rejected.csv outputs
- `--rejected-outdir <dir>` - Use prebuilt rejected digest directory

## CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--grv` | Normalized GRV CSV | No* | - |
| `--stocktake` | Normalized stocktake CSV | No* | - |
| `--grv-raw` | Raw GRV CSV (requires --run-normalize) | No* | - |
| `--stock-raw` | Raw stocktake CSV (requires --run-normalize) | No* | - |
| `--run-normalize` | Run pw-grv-csv-normalize + pw-stocktake-csv-normalize | No | false |
| `--run-diff` | Run pw-grv-vs-stocktake-diff | No | true |
| `--run-rejected-digest` | Run pw-rejected-csv-digest on rejected CSVs | No | false |
| `--diff-outdir` | Prebuilt diff output directory | No* | - |
| `--rejected-outdir` | Prebuilt rejected digest directory | No | - |
| `--outdir` | Output directory | No | `./out` |
| `--help`, `-h` | Show help message | No | - |

\* At least one input mode required: (`--grv` + `--stocktake`), (`--grv-raw` + `--stock-raw` + `--run-normalize`), or (`--diff-outdir`)

## Output Files

The CLI generates a pack in the specified output directory:

### 1. PACK.md

**Index and counts only** (NO quantity/amount tables in prose):

- Included files list
- Summary statistics (row/key counts)
- Operations performed
- Usage instructions
- Critical reminders (amounts stay in files)

### 2. APPROVAL.md

Safety checklist for manual review:

- Perfect Water ownership
- Offline-only constraint
- Amounts stay in files
- H3 approval gate reminder
- Bot reminders (no pasting quantities into chat)

### 3. manifest.json

Machine-readable run metadata:

- Tool name and version
- Timestamp
- Input paths
- Operations performed
- Output file paths
- Summary statistics (counts, not amounts)

### 4. Copied/Referenced Files

When present, the pack includes:

- **diff.md** - Human-readable diff report (from pw-grv-vs-stocktake-diff)
- **diff.json** - Machine-readable diff data
- **missing-keys.md** - Items missing in one side or rejected rows
- **DIGEST.md** - Rejected row digest (from pw-rejected-csv-digest, if run)
- **reasons.json** - Machine-readable rejection reasons

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
2. Process prebuilt diff outputs in `fixtures/prebuilt-diff/`
3. Generate a pack in `test-out/`
4. Exit with code 0 (success)

The fixtures simulate realistic Perfect Water inventory scenarios and include no real quantities or business data.

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/pw-inventory-recon-pack/
├── src/
│   ├── index.ts              # CLI entry point with orchestration
│   ├── types.ts              # TypeScript type definitions
│   ├── pack-generator.ts     # PACK.md generation (counts only)
│   └── approval-generator.ts # APPROVAL.md generation
├── fixtures/
│   ├── prebuilt-diff/        # Prebuilt diff outputs for testing
│   │   ├── diff.md
│   │   ├── diff.json
│   │   └── missing-keys.md
│   └── README.md             # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── test-out/                 # Test outputs (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Pack Logic

1. **Determine input mode** - Prebuilt diff, normalized CSVs, or raw CSVs with normalization
2. **Run sibling tools** (if needed) - pw-grv-csv-normalize, pw-stocktake-csv-normalize, pw-grv-vs-stocktake-diff
3. **Optional rejected digest** - Run pw-rejected-csv-digest if `--run-rejected-digest` enabled
4. **Copy/reference outputs** - Gather diff.md, diff.json, missing-keys.md, DIGEST.md into pack directory
5. **Generate PACK.md** - Index with row/key counts only (no amount tables in prose)
6. **Generate APPROVAL.md** - Safety gates and PW ownership reminder
7. **Write manifest.json** - Run metadata and summary statistics

## Validation Rules

- At least one input mode must be provided
- `--grv-raw` and `--stock-raw` require `--run-normalize`
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

### "Must provide either --grv, --grv-raw, or --diff-outdir" error

Ensure you provide one of:
- `--grv` and `--stocktake` (normalized CSVs)
- `--grv-raw` and `--stock-raw` with `--run-normalize` (raw CSVs)
- `--diff-outdir` (prebuilt diff outputs)

### "Sibling tool not found" error

Ensure sibling tools exist and are built:
- `tools/pw-grv-csv-normalize`
- `tools/pw-stocktake-csv-normalize`
- `tools/pw-grv-vs-stocktake-diff`
- `tools/pw-rejected-csv-digest` (if using `--run-rejected-digest`)

Run `npm install && npm run build` in each sibling tool directory.

### "Diff output directory not found" error

Verify:
- `--diff-outdir` path is correct
- Directory exists and contains expected files (diff.md, diff.json)

## Example Workflows

### Workflow 1: Monthly Inventory Recon

```bash
# Export GRV and stocktake CSVs from Loyverse
# Save as: grv-sept-2026.csv, stocktake-sept-2026.csv

# Assemble pack with full orchestration
cd tools/pw-inventory-recon-pack
npm run pack -- \
  --grv-raw ../../exports/grv-sept-2026.csv \
  --stock-raw ../../exports/stocktake-sept-2026.csv \
  --run-normalize \
  --run-rejected-digest \
  --outdir ../../packs/sept-2026

# Review outputs
cat ../../packs/sept-2026/PACK.md
cat ../../packs/sept-2026/APPROVAL.md
open ../../packs/sept-2026/diff.md
```

### Workflow 2: Quick Recon from Prebuilt Diff

```bash
# Already ran pw-grv-vs-stocktake-diff
cd tools/pw-inventory-recon-pack
npm run pack -- \
  --diff-outdir ../pw-grv-vs-stocktake-diff/out \
  --outdir pack-out/

# Review outputs
cat pack-out/PACK.md
```

## Integration with Perfect Water Operations

### Typical Flow

1. **Export data** - From Loyverse, supplier emails, or manual entry → CSVs
2. **Run pack tool** - Normalize, diff, digest rejected rows
3. **Review PACK.md** - Check row/key counts and included files
4. **Open diff.md** - Inspect item-level deltas (amounts in file, not chat)
5. **Check missing-keys.md** - Investigate items in one side but not the other
6. **Review DIGEST.md** - Check rejected row patterns (if digest run)
7. **Perfect Water decides** - PW team makes inventory adjustment decisions
8. **Archive pack** - Store in Drive `30_PerfectWater/InventoryRecon/YYYY-MM/`

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate** - Before using diff data for PW inventory decisions
- **Grant approval required** - Before any stock adjustments based on pack outputs

### Bot Reminder

**Amounts stay in files.** Never paste quantity figures or amounts into chat unless explicitly requested by Grant.

## Use Cases

1. **Monthly inventory reconciliation** - Assemble GRV vs stocktake pack for CoS verification
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
- **pw-rejected-csv-digest** - Digest rejected.csv files into human review pack
- **pw-ordered-vs-sold-diff** - Compare ordered vs sold by SKU
- **pw-loyverse-daily-sales-digest** - Daily sales digest from Loyverse

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** inventory-alerts, stock-take-variance, supplier-po, bank-recon-exceptions

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
6. Conventional commit: `feat(tools): update pw-inventory-recon-pack`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
