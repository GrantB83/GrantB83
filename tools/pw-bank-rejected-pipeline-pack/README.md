# pw-bank-rejected-pipeline-pack

**One-line:** Offline CLI orchestrator combining pw-bank-csv-normalize and pw-rejected-csv-digest for Perfect Water bank reconciliation pipeline.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-bank-rejected-pipeline-pack/`

## Purpose

Wire bank CSV normalize → rejected-csv digest into one offline pipeline pack (same pattern as pw-inventory-recon-pack). Cash integrity is current Perfect Water priority. Never invents amounts. Never pays. Figures stay in files/sheet — not chat.

## Features

- 📦 **Pipeline orchestrator** - Calls pw-bank-csv-normalize and pw-rejected-csv-digest
- 📊 **Flexible inputs** - Bank CSV with normalization, OR prebuilt normalized outdir
- 🔍 **Rejected digest** - Default ON with PR #114 boolean skip flags
- 📝 **Complete pack** - PACK.md (index + counts), APPROVAL.md (H3 gates), manifest.json (PR #116 accuracy)
- ✅ **Offline only** - No bank login, no network calls, no payments
- 🚫 **Never invents amounts** - All rands from source CSV only
- ⚠️ **Perfect Water owns ops** - Draft digests only, PW makes final decisions

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools** (built):
  - `tools/pw-bank-csv-normalize`
  - `tools/pw-rejected-csv-digest`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/pw-bank-rejected-pipeline-pack
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

### Mode A: Raw Bank CSV with Normalization

When you have a raw bank CSV and want to normalize + digest rejected rows:

```bash
npm run pack -- --bank-csv raw-bank.csv --run-normalize --outdir pack-out/
```

### Mode B: Prebuilt Normalized Output (Default: With Rejected Digest)

When you already have normalized output from pw-bank-csv-normalize:

```bash
npm run pack -- --normalized-outdir normalized/ --outdir pack-out/
```

### Mode B: Skip Rejected Digest (PR #114 Boolean Flags)

Multiple syntax options to skip the rejected digest:

```bash
# Negative flag
npm run pack -- --normalized-outdir normalized/ --no-run-rejected-digest --outdir pack-out/

# Explicit false
npm run pack -- --normalized-outdir normalized/ --run-rejected-digest=false --outdir pack-out/

# Space-separated false
npm run pack -- --normalized-outdir normalized/ --run-rejected-digest false --outdir pack-out/
```

## CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--bank-csv` | Raw bank CSV file | No* | - |
| `--normalized-outdir` | Prebuilt normalized output directory | No* | - |
| `--run-normalize` | Run pw-bank-csv-normalize on raw CSV | No | false |
| `--run-rejected-digest` | Run pw-rejected-csv-digest on rejected rows | No | true |
| `--no-run-rejected-digest` | Skip rejected digest (PR #114 pattern) | No | - |
| `--outdir`, `-o` | Output directory | No | `./out` |
| `--help`, `-h` | Show help message | No | - |

\* At least one input mode required: (`--bank-csv` + `--run-normalize`) OR (`--normalized-outdir`)

## Output Files

The CLI generates a pack in the specified output directory:

### 1. PACK.md

**Pipeline pack index with counts only** (NO amount tables in prose):

- Pipeline overview
- Operations performed
- Summary statistics (normalized/rejected row counts)
- Included files list
- Usage instructions
- Critical reminders (amounts stay in files)

### 2. APPROVAL.md

Safety checklist for manual review:

- Perfect Water ownership
- Offline-only constraint
- Never invents amounts
- Figures stay in files (not chat)
- H3 approval gate reminder
- Bot reminders (no pasting amounts into prose)

### 3. manifest.json

Machine-readable run metadata:

- Tool name and version
- Timestamp
- Input mode (bank-csv-with-normalize or prebuilt-normalized)
- Operations performed (normalize, rejectedDigest)
- Output file paths
- Summary statistics (counts, not amounts)
- **PR #116 accuracy:** Only lists files actually present (excludes DIGEST-* files when rejected digest skipped)

### 4. Copied/Referenced Files

When present, the pack includes:

- **xero-bank-normalized.csv** - Normalized bank transactions (from pw-bank-csv-normalize)
- **rejected.csv** - Rejected rows with rejection reasons
- **missing-fields.md** - Report of missing fields
- **report.md** - Normalization summary
- **DIGEST-DIGEST.md** - Rejected row digest (from pw-rejected-csv-digest, if run)
- **DIGEST-reasons.json** - Machine-readable rejection reasons (if digest run)
- **DIGEST-missing-headers.md** - Missing headers report (if digest run)
- **DIGEST-APPROVAL.md** - Digest approval checklist (if digest run)

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test fixtures (no real bank data):

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Process prebuilt normalized outputs in `fixtures/prebuilt-normalized/`
3. Generate a pack in `test-out/`
4. Exit with code 0 (success)

The fixtures simulate realistic Perfect Water bank reconciliation scenarios and include no real account numbers or business data.

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/pw-bank-rejected-pipeline-pack/
├── src/
│   ├── index.ts              # CLI entry point with orchestration
│   ├── types.ts              # TypeScript type definitions
│   └── index.test.ts         # Tests
├── fixtures/
│   ├── prebuilt-normalized/  # Prebuilt normalized outputs for testing
│   │   ├── xero-bank-normalized.csv
│   │   ├── rejected.csv
│   │   ├── missing-fields.md
│   │   ├── report.md
│   │   └── manifest.json
│   └── README.md             # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── test-out/                 # Test outputs (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Pipeline Logic

1. **Validate inputs** - At least one input mode required
2. **Run normalization** (if `--run-normalize`) - Call pw-bank-csv-normalize on raw bank CSV
3. **Copy normalized outputs** - xero-bank-normalized.csv, rejected.csv, reports
4. **Run rejected digest** (default ON, PR #114 skip) - Call pw-rejected-csv-digest on rejected.csv
5. **Copy digest outputs** (if digest run) - DIGEST-DIGEST.md, reasons.json, reports
6. **Generate PACK.md** - Index with row counts only (no amount tables in prose)
7. **Generate APPROVAL.md** - Safety gates and PW ownership reminder
8. **Write manifest.json** - Run metadata with PR #116 accuracy (only present files)

## Boolean Flag Patterns (PR #114)

This tool supports multiple boolean flag syntaxes for `--run-rejected-digest`:

```bash
# Enable (default behavior)
--run-rejected-digest
--run-rejected-digest=true
--run-rejected-digest true

# Disable
--no-run-rejected-digest
--run-rejected-digest=false
--run-rejected-digest false
```

The tool parses `true/1/yes` as enable and `false/0/no` as disable (case-insensitive).

## Manifest Accuracy (PR #116)

The `manifest.json` only lists files that are actually present in the pipeline pack directory. It does not list files that were not generated because stages were skipped.

Example: When `--no-run-rejected-digest` is used, the manifest excludes:
- `DIGEST-DIGEST.md`
- `DIGEST-reasons.json`
- `DIGEST-missing-headers.md`
- `DIGEST-APPROVAL.md`

## Validation Rules

- At least one input mode must be provided
- `--bank-csv` requires `--run-normalize`
- `--run-normalize` requires `--bank-csv`
- Missing inputs cause exit code 1
- Sibling tool failures propagate and cause exit 1

## Limitations & Constraints

- ✅ **Offline only** - No APIs, no bank login, no network calls
- ✅ **No invented amounts** - All rands from source bank CSV only
- ✅ **Read-only** - Never writes back to bank systems
- ✅ **No payments** - Never initiates bank transfers or card charges
- ✅ **File-based** - All amounts stay in CSV files
- ✅ **Perfect Water owns ops** - PW makes all bank reconciliation decisions
- ✅ **Exit 1 on bad input** - Malformed CSVs or missing inputs caught early

## Troubleshooting

### "Must provide either --bank-csv or --normalized-outdir" error

Ensure you provide one of:
- `--bank-csv` and `--run-normalize` (raw CSV with normalization)
- `--normalized-outdir` (prebuilt normalized outputs)

### "When using --bank-csv, must also provide --run-normalize" error

If you provide `--bank-csv`, you must also enable `--run-normalize`.

### "Sibling tool not found" error

Ensure sibling tools exist and are built:
- `tools/pw-bank-csv-normalize`
- `tools/pw-rejected-csv-digest`

Run `npm install && npm run build` in each sibling tool directory.

### "No rejected.csv found, skipping digest" warning

If the normalization produced no rejected rows, the rejected digest is automatically skipped (this is not an error).

## Example Workflows

### Workflow 1: Monthly Bank Reconciliation

```bash
# Export bank statement from FNB/Standard Bank
# Save as: bank-sept-2026.csv

# Assemble pack with full orchestration
cd tools/pw-bank-rejected-pipeline-pack
npm run pack -- \
  --bank-csv ../../exports/bank-sept-2026.csv \
  --run-normalize \
  --outdir ../../packs/bank-sept-2026

# Review outputs
cat ../../packs/bank-sept-2026/PACK.md
cat ../../packs/bank-sept-2026/APPROVAL.md
open ../../packs/bank-sept-2026/rejected.csv
```

### Workflow 2: Quick Pack from Prebuilt Normalized

```bash
# Already ran pw-bank-csv-normalize
cd tools/pw-bank-rejected-pipeline-pack
npm run pack -- \
  --normalized-outdir ../pw-bank-csv-normalize/out \
  --outdir pack-out/

# Review outputs
cat pack-out/PACK.md
```

### Workflow 3: Skip Rejected Digest (Debugging/Testing)

```bash
# Only need normalized output, skip rejected digest
cd tools/pw-bank-rejected-pipeline-pack
npm run pack -- \
  --normalized-outdir ../pw-bank-csv-normalize/out \
  --no-run-rejected-digest \
  --outdir pack-out/
```

## Integration with Perfect Water Operations

### Typical Flow

1. **Export bank CSV** - From FNB/Standard Bank online banking → CSV
2. **Run pipeline pack** - Normalize + digest rejected rows
3. **Review PACK.md** - Check normalized/rejected row counts
4. **Open rejected.csv** - Inspect rows that failed validation (amounts in file, not chat)
5. **Check DIGEST-DIGEST.md** - Review rejection reason patterns (if digest run)
6. **Use xero-bank-normalized.csv** - Feed into loyverse-xero-recon for receipt matching
7. **Perfect Water decides** - PW CoS makes bank reconciliation decisions
8. **Archive pack** - Store in Drive `30_PerfectWater/BankRecon/YYYY-MM/`

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **H3 gate** - Before using normalized/rejected data for bank reconciliation
- **Grant approval required** - Before any payment decisions based on pack outputs

### Bot Reminder

**Amounts stay in files.** When referencing this pack in chat:
- ✅ "See rejected.csv row 3" (not "R1,234.56 was rejected")
- ✅ Refer to files, NOT inline amounts

## Use Cases

1. **Monthly bank reconciliation** - Normalize bank CSV and digest rejected rows for CoS review
2. **Receipt matching** - Prepare xero-bank-normalized.csv for loyverse-xero-recon receipt mode
3. **Data quality auditing** - Review rejected row patterns across multiple bank exports
4. **Cash integrity verification** - Validate bank deposits match expected Perfect Water sales
5. **Automated pack assembly** - One command to normalize, digest, and bundle outputs

## Safety

This tool is designed for Perfect Water / CoS bank reconciliation:

✅ **Offline only** - No APIs, no bank login, no network calls  
✅ **No invented amounts** - All rands from source bank CSV only  
✅ **Read-only** - Never writes back to bank systems  
✅ **No payments** - Never initiates transfers or card charges  
✅ **File-based** - All amounts stay in CSV files  
✅ **Exit 1 on bad input** - Malformed CSVs caught early  
✅ **Perfect Water owns ops** - PW makes all bank reconciliation decisions

**Never invent rands.** Only report what exists in source bank CSV.

## Related Tools

- **pw-bank-csv-normalize** - Normalize SA bank CSVs to Xero format (upstream tool)
- **pw-rejected-csv-digest** - Digest rejected.csv files into human review pack (upstream tool)
- **loyverse-xero-recon** - Reconcile Loyverse POS sales with Xero accounting (downstream consumer)
- **pw-inventory-recon-pack** - Similar pipeline pack pattern for GRV/stocktake recon

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** bank-recon-exceptions, cash-integrity, till-vs-bank

## Quality Gates

- **H3** - Before any bank reconciliation decisions based on pack outputs
- **Grant approval** - Before any payment decisions
- **Offline only** - This tool generates drafts; no auto-payments or bank writes

## Contributing

When updating this tool:
1. Maintain backward compatibility with sibling tool outputs
2. Follow PR #114 boolean flag patterns for new optional stages
3. Follow PR #116 manifest accuracy for file lists
4. Add new features to `src/` with tests
5. Update fixtures if pack structure changes
6. Run `npm run test:fixtures` and `npm test`
7. Update this README and tools catalog
8. Conventional commit: `feat(tools): update pw-bank-rejected-pipeline-pack`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
