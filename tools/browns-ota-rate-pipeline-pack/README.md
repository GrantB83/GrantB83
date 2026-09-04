# Browns OTA Rate Pipeline Pack

An offline CLI tool that orchestrates Browns OTA rate worksheet packing for SA Ops / CoS:

1. **browns-ota-rate-worksheet** (default ON)
2. **Light post-checklist verification** (inline - verifies pack files exist + APPROVAL present)

**Purpose:** One dated pipeline pack from rate-card CSV → OTA promotional rate worksheet (CSV + Markdown) + PACK.md + APPROVAL.md for Nightsbridge/Grant review. Dullstroom The Browns Luxury Guest Suites only. Never invents rates or discounts (blanks stay blank). Never writes to Nightsbridge/Booking.com. Never auto-sends. Offline only.

## Features

- 🎯 **Pipeline orchestration** - Wires browns-ota-rate-worksheet into one pack
- 📦 **Auto-build sibling** - Builds browns-ota-rate-worksheet if `dist/` missing
- 🔧 **Optional stage** - Run worksheet (default ON), can skip with --no-run-worksheet
- ✅ **Flexible boolean parsing** - `--run-worksheet`, `--no-run-worksheet`, `--run-worksheet=false`, etc. (PR #114)
- 📋 **Accurate manifest** - Files array only lists files actually written (PR #116 pattern)
- 🚀 **Zero dependencies** - Pure TypeScript
- 🔒 **Offline & safe** - No OTA API calls, no invented data, draft-only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tool** (auto-built if missing):
  - `tools/browns-ota-rate-worksheet/`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-ota-rate-pipeline-pack
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
npm run pack -- --rates <path> [--promo <path>] [--as-of YYYY-MM-DD] [options]
```

### Examples

**Basic usage (rates only):**
```bash
npm run pack -- \
  --rates browns-rates-2024.csv \
  --as-of 2026-09-20
```

**With promotions:**
```bash
npm run pack -- \
  --rates browns-rates-2024.csv \
  --promo summer-promos.json \
  --as-of 2026-09-20
```

**Using --rate-card alias:**
```bash
npm run pack -- \
  --rate-card browns-rates-2024.csv \
  --outdir packs/
```

**Test with fixtures:**
```bash
npm run test:fixtures
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--rates` | ✅ Yes | Path to rates CSV file (rate card) | - |
| `--rate-card` | Alternative | Alternative to --rates (same meaning) | - |
| `--promo` | No | Path to promo JSON or CSV file | - |
| `--as-of` | No | Pack date for naming (YYYY-MM-DD format) | Today |
| `--outdir` | No | Output directory for pack | `./out` |
| `--run-worksheet` | No | Run browns-ota-rate-worksheet | **true** |
| `--help`, `-h` | No | Show help message | - |

**Boolean Flag Syntax (PR #114 pattern):**
```bash
--run-worksheet          # Enable (default)
--run-worksheet=true     # Enable with equals
--run-worksheet true     # Enable with space
--no-run-worksheet       # Disable with negative flag
--run-worksheet=false    # Disable with equals
--run-worksheet false    # Disable with space
```

## Pipeline Stage

### Stage 1: browns-ota-rate-worksheet (Default ON)

**Trigger:** Enabled by default, disable with `--no-run-worksheet`

**Purpose:** Generate OTA promotional rate worksheet from rate card CSV

**Tool:** `browns-ota-rate-worksheet`

**Outputs:**
- `worksheet.csv` → Machine-readable worksheet
- `worksheet.md` → Human-friendly checklist
- `APPROVAL.md` → Copied into pack
- `manifest.json` → Metadata from worksheet tool

**Note:** When stage is skipped, its outputs are **not** listed in `manifest.json` files array (PR #116 accuracy pattern).

## Output Files

The CLI generates outputs in `<outdir>/pack-<YYYY-MM-DD>/`:

### 1. `PACK.md` - Pipeline Pack Index

**Primary deliverable:** Pipeline index with workflow summary

**Contents:**
- Date and generation timestamp
- Pipeline summary (worksheet ran/skipped)
- Input files (rates, promo)
- Pack contents listing
- Warnings (if any)
- Next steps checklist
- Safety reminders

### 2. `APPROVAL.md` - Approval Checklist

**Contents:**
- Hard gates (never auto-apply, never invent rates)
- Pipeline summary
- Data verification checklist
- Safety reminders
- Approval phrase template

### 3. OTA Rate Worksheet Outputs (if `--run-worksheet`)

- `worksheet.csv` - Machine-readable plan for Nightsbridge entry
- `worksheet.md` - Human checklist with blanks where rates missing

### 4. `manifest.json` - Pipeline Metadata

**Machine-readable pipeline inventory**

**Schema:**
```json
{
  "tool": "browns-ota-rate-pipeline-pack",
  "version": "1.0.0",
  "timestamp": "2026-09-20T14:30:00.000Z",
  "date": "2026-09-20",
  "inputs": {
    "ratesPath": "/path/to/rates.csv",
    "promoPath": "/path/to/promo.json"
  },
  "runOptions": {
    "ranWorksheet": true
  },
  "files": [
    {
      "filename": "PACK.md",
      "type": "index",
      "description": "Pipeline pack index with workflow summary"
    }
  ]
}
```

**Important:** When stage is skipped, its outputs are **not** included in the `files` array (PR #116 accuracy pattern).

## Workflow: SA Ops OTA Rate Update Routine

### Recommended Flow

```bash
cd tools/browns-ota-rate-pipeline-pack
npm run pack -- \
  --rates browns-rates-2024.csv \
  --promo summer-promos.json \
  --as-of 2026-09-20 \
  --outdir packs/
```

### Steps After Pack Generation

1. **Review PACK.md** - Check pipeline summary and warnings
2. **Review APPROVAL.md** - Verify safety checklist
3. **Review worksheet.md** - Human-friendly rate checklist
4. **Verify worksheet.csv** - Machine-readable data accuracy
5. **Get Grant approval** - Required before any OTA changes
6. **Manual Nightsbridge entry** - Use worksheet.md as checklist
7. **Verify in Booking.com** - After Nightsbridge sync

## Auto-Build Sibling Tool

**Behavior (PR #132 pattern):**

When worksheet stage runs (`--run-worksheet`), this tool:

1. **Checks if sibling tool exists** at `../browns-ota-rate-worksheet/`
2. **Checks if built** by looking for `dist/index.js`
3. **Auto-builds if missing:**
   - Runs `npm install` if `node_modules/` missing
   - Runs `npm run build`
4. **Shells out** to sibling CLI with correct args
5. **Discovers outputs** (flat files)
6. **Copies to pack** directory

**Fixture tests run on green box** without requiring manual sibling builds.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Boolean flag parsing (PR #114 pattern)
- Manifest file listing accuracy (PR #116 pattern)
- Safety rule verification

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/sample-rates.csv` (6 rate entries) and `fixtures/sample-promo.json` (3 promos).

**Expected output:**
- `test-out/pack-2026-09-20/PACK.md` - Pipeline index
- `test-out/pack-2026-09-20/APPROVAL.md` - Approval checklist
- `test-out/pack-2026-09-20/worksheet.csv` - Rate worksheet
- `test-out/pack-2026-09-20/worksheet.md` - Rate checklist
- `test-out/pack-2026-09-20/manifest.json` - Pipeline metadata

**Sibling tool is auto-built** during fixture test if needed.

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/browns-ota-rate-pipeline-pack/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── assembler.ts            # Pipeline orchestration logic
│   └── assembler.test.ts       # Tests
├── fixtures/
│   ├── sample-rates.csv        # Sample rate card
│   ├── sample-promo.json       # Sample promotions
│   └── README.md               # Fixture documentation
├── dist/                       # Compiled JavaScript (generated by tsc)
├── out/                        # Default output directory (generated by CLI)
├── test-out/                   # Test outputs (generated by npm run test:fixtures)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                   # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No auto-apply** - All outputs are drafts for manual review
- ❌ **No Nightsbridge API** - Does not connect to Nightsbridge
- ❌ **No Booking.com API** - Does not connect to Booking.com
- ❌ **No data invention** - Never fabricates rates or discounts (preserved from sibling)
- ❌ **No browser automation** - Offline only
- ❌ **No API calls** - Orchestrator calls local tools via npm run only

### What This Tool Does

- ✅ **Orchestrates sibling tool** via npm run child process
- ✅ **Auto-builds sibling** if `dist/` missing (PR #132 pattern)
- ✅ **Discovers outputs** (flat files from worksheet tool)
- ✅ **Generates PACK.md** with pipeline summary
- ✅ **Copies tool outputs** into one dated pipeline pack folder
- ✅ **Produces manifest.json** for machine-readable inventory (PR #116 accuracy)
- ✅ **Light post-checklist** - Verifies pack files exist + APPROVAL present

### Data Privacy

- **Never commit real rate data to git** (unless approved for fixtures)
- Keep actual pipeline pack folders local only (e.g., `packs/`)
- `.gitignore` already excludes `out/` and `test-out/` directories
- Fixtures use sample data for testing

## Sibling Tool Integration

### browns-ota-rate-worksheet

**Purpose:** Generate OTA promotional rate worksheet from rate card CSV

**Invoked with:** Enabled by default (disable with `--no-run-worksheet`)

**Outputs copied:** `worksheet.csv`, `worksheet.md`, `APPROVAL.md`, `manifest.json`

**Status:** Default ON

**Safety preserved:**
- Never invents rates (blanks stay blank)
- Never invents promo discounts (drafts stay draft)
- Flags incomplete data clearly

## Troubleshooting

### "Error: --rates or --rate-card is required"

Provide the rates file path:
```bash
npm run pack -- --rates browns-rates-2024.csv --as-of 2026-09-20
```

### "Error: Date must be in YYYY-MM-DD format"

Use valid date format:
```bash
npm run pack -- --rates browns-rates-2024.csv --as-of 2026-09-20
```

### "Rates file not found"

Ensure the `--rates` path is correct:
```bash
ls -l browns-rates-2024.csv
npm run pack -- --rates ./browns-rates-2024.csv --as-of 2026-09-20
```

### "Sibling tool not found"

Ensure sibling tool exists:
```bash
ls -la ../browns-ota-rate-worksheet/
```

The tool will auto-build sibling if it exists but is not built.

### "Failed to build sibling tool"

If auto-build fails:
```bash
cd ../browns-ota-rate-worksheet
npm install
npm run build
```

Then retry the pipeline pack.

## Exit Codes

- **0** - Ran successfully
- **1** - Bad input, validation failure, or tool error

## Future Enhancements (Not in v1)

- Multi-property support (Rivendell, other Browns properties)
- Integration with Nightsbridge API (when approved)
- Booking.com extranet preview (when approved)
- Automated rate comparison reports

**For now:** v1 is offline, orchestrator-only, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-ota-rate-worksheet** - OTA rate worksheet generator (sibling)
- **browns-inquiry-quote-pipeline-pack** - Inquiry-to-quote pipeline pack
- **browns-welcome-late-pipeline-pack** - Welcome + late check-in pipeline pack

## SA Ops Workflow Overview

```
Rate card CSV + promo JSON
    ↓
browns-ota-rate-pipeline-pack (THIS TOOL)
    ↓ (orchestrates)
browns-ota-rate-worksheet
    ↓
pack-YYYY-MM-DD/
    ├── PACK.md (pipeline index)
    ├── APPROVAL.md (approval checklist)
    ├── worksheet.csv (machine-readable)
    ├── worksheet.md (human checklist)
    └── manifest.json
    ↓
Manual review by Grant
    ↓
Manual Nightsbridge entry
    ↓
Nightsbridge → Booking.com sync
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` and `PACK.md` before any Nightsbridge/OTA changes. Never auto-apply. Never invent rates or discounts. Dullstroom / The Browns only.
