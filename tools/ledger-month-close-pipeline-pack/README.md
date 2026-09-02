# ledger-month-close-pipeline-pack

**One-line:** Offline CLI tool assembling unmatched-merchant-queue → merchant-alias-suggest → alias-apply-checklist → month-close-pack artifacts.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-month-close-pipeline-pack/`

## Purpose

USA Budget month-end close (typically the 7th) needs a repeatable pipeline pack assembling outputs from multiple ledger tools. This tool orchestrates the full pipeline into one deliverable for Ledger / CoS review.

**Critical:** Amounts stay in files — never in PACK.md prose. H2 before any sheet writes. Offline only.

## Features

- 📦 **Pipeline orchestration** - Assemble outputs from 4 ledger tools into one pack
- 📋 **PACK.md index** - Stage presence summary (NO amount tables)
- 🔒 **Amount safety** - Amounts stay in stage output files, never in PACK.md prose
- ✅ **H2 approval gates** - APPROVAL.md with sheet write workflow
- 📊 **Stage validation** - Exit 1 if zero stage inputs present
- 🚀 **Offline only** - No Google Sheets API or network calls
- 📦 **Machine-readable** - manifest.json with stage presence flags

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/ledger-month-close-pipeline-pack
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

### Basic Command (Prebuilt Stage Outputs)

```bash
npm run pack -- \
  --month 2024-01 \
  --unmatched-outdir ../ledger-unmatched-merchant-queue/out/ \
  --suggest-outdir ../ledger-merchant-alias-suggest/out/ \
  --alias-checklist-outdir ../ledger-alias-apply-checklist/out/ \
  --close-outdir ../ledger-month-close-pack/out/ \
  --outdir pipeline-pack/
```

### With Partial Stages

Not all stages are required. The tool will assemble whatever stage outputs are available:

```bash
npm run pack -- \
  --month 2024-01 \
  --unmatched-outdir ../ledger-unmatched-merchant-queue/out/ \
  --close-outdir ../ledger-month-close-pack/out/ \
  --outdir pipeline-pack/
```

### CLI Options

| Option | Description | Required | Example |
|--------|-------------|----------|---------|
| `--month` | Month label (YYYY-MM format) | ✅ Yes | `2024-01` |
| `--outdir` | Output directory for assembled pack | ✅ Yes | `out/` |
| `--unmatched-outdir` | ledger-unmatched-merchant-queue output directory | No | `../unmatched/out/` |
| `--suggest-outdir` | ledger-merchant-alias-suggest output directory | No | `../suggest/out/` |
| `--alias-checklist-outdir` | ledger-alias-apply-checklist output directory | No | `../alias-checklist/out/` |
| `--close-outdir` | ledger-month-close-pack output directory | No | `../close-pack/out/` |
| `--help`, `-h` | Show help message | No | - |

**Note:** At least one stage output directory must be provided. Tool exits 1 if zero stage inputs are present.

## Behaviors

### Stage Discovery

The tool scans specified output directories for expected files:

- **unmatched-outdir** → `queue.md` (unmatched merchant research queue)
- **suggest-outdir** → `suggestions.md` (alias suggestions via token overlap)
- **alias-checklist-outdir** → `APPLY-CHECKLIST.md` (H2-ready apply checklist)
- **close-outdir** → `CLOSE.md` and `APPROVAL.md` (month-close checklist)

### File Copying

Present stage files are copied into `--outdir`:

- `queue.md` → Unmatched merchant research queue
- `suggestions.md` → Alias suggestions
- `APPLY-CHECKLIST.md` → Human tick-off checklist
- `CLOSE.md` → Month-close sanity checks
- `CLOSE-APPROVAL.md` → Month-close approval gates (renamed from `APPROVAL.md`)

### PACK.md Generation

Generated index includes:

- ✅ **Pipeline stages included** - Which stages are present
- ✅ **File presence table** - Per-stage file status
- ❌ **NO amount tables** - Amounts stay in stage output files only
- ✅ **Safety reminders** - Offline only, H2 required, Ledger owns sheet writes
- ✅ **Next steps** - Workflow guidance for Ledger / CoS

### APPROVAL.md Generation

Generated approval workflow includes:

- **H2 gate required** - Before any Google Sheet writes
- **What Ledger owns** - Research, verification, sheet writes
- **What Coding/CoS never does** - No auto-apply, no invented amounts, no Sheets API
- **Approval workflow** - Step-by-step checklist
- **Hard constraints** - Offline only, H2 before writes, amounts stay in files

### Exit Code Behavior

- **Exit 0:** At least one stage input present, pack assembled successfully
- **Exit 1:** Zero stage inputs found, or `--month` missing/invalid

## Output Files

The tool generates these files in `--outdir`:

### 1. `PACK.md` - Pipeline Pack Index

Human-readable index with:
- Month label
- Pipeline flow diagram
- Stage presence summary (✅/❌ icons)
- File presence table
- Safety reminders (NO amounts in prose)
- Next steps checklist

### 2. `APPROVAL.md` - H2 Gate Workflow

Human-readable approval guidance with:
- H2 gate reminder
- What this pack contains
- What Ledger owns
- What Coding/CoS never does
- Approval workflow steps
- Hard constraints

### 3. `manifest.json` - Machine-Readable Metadata

```json
{
  "tool": "ledger-month-close-pipeline-pack",
  "version": "1.0.0",
  "generatedAt": "2024-01-07T14:30:00.000Z",
  "month": "2024-01",
  "stages": {
    "unmatchedQueue": true,
    "aliasSuggest": true,
    "aliasChecklist": true,
    "monthClose": true
  },
  "files": [
    {
      "stage": "queue",
      "filename": "queue.md",
      "sourcePath": "../unmatched/out/queue.md",
      "present": true,
      "description": "Unmatched merchant research queue"
    }
  ],
  "totalStages": 4
}
```

### 4. Stage Output Files (if present)

- `queue.md` - Unmatched merchant research queue
- `suggestions.md` - Alias suggestions
- `APPLY-CHECKLIST.md` - Human tick-off checklist
- `CLOSE.md` - Month-close sanity checks
- `CLOSE-APPROVAL.md` - Month-close approval gates

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic stage outputs for all 4 pipeline stages:

```bash
npm run test:fixtures
```

Expected results:
- 4 stages detected as present
- All stage files copied to `test-out/`
- PACK.md index generated with stage summaries
- APPROVAL.md generated with H2 gate reminder
- manifest.json shows `totalStages: 4`
- Exit code 0 (success)

See `fixtures/README.md` for fixture details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Pipeline Flow

This tool is the final step in the month-close pipeline:

```
ledger-unmatched-merchant-queue → ledger-merchant-alias-suggest → 
ledger-alias-apply-checklist → ledger-month-close-pack → 
ledger-month-close-pipeline-pack (this tool)
```

## Integration with Other Tools

### Full Pipeline Example

```bash
# Step 1: Build unmatched merchant queue
cd tools/ledger-unmatched-merchant-queue
npm run queue -- \
  --input exports/january-2024.csv \
  --outdir unmatched-out/ \
  --status-col MatchStatus

# Step 2: Suggest aliases
cd ../ledger-merchant-alias-suggest
npm run suggest -- \
  --unmatched ../ledger-unmatched-merchant-queue/unmatched-out/queue.json \
  --aliases ~/ledger-knowledge/aliases.json \
  --outdir suggest-out/

# Step 3: Generate apply checklist
cd ../ledger-alias-apply-checklist
npm run apply -- \
  --suggestions ../ledger-merchant-alias-suggest/suggest-out/suggestions.json \
  --no-match ../ledger-merchant-alias-suggest/suggest-out/no-match.md \
  --month 2024-01 \
  --outdir checklist-out/

# Step 4: Build month-close pack
cd ../ledger-month-close-pack
npm run pack -- \
  --month 2024-01 \
  --exports-dir ~/exports/january/ \
  --outdir close-out/ \
  --require-headers Date,Amount,Merchant

# Step 5: Assemble pipeline pack
cd ../ledger-month-close-pipeline-pack
npm run pack -- \
  --month 2024-01 \
  --unmatched-outdir ../ledger-unmatched-merchant-queue/unmatched-out/ \
  --suggest-outdir ../ledger-merchant-alias-suggest/suggest-out/ \
  --alias-checklist-outdir ../ledger-alias-apply-checklist/checklist-out/ \
  --close-outdir ../ledger-month-close-pack/close-out/ \
  --outdir pipeline-pack-jan-2024/

# Step 6: Review PACK.md and follow APPROVAL.md workflow
```

## Example Workflow

1. **Run upstream tools** - Generate outputs from each pipeline stage
2. **Assemble pack** - Run this tool to combine all stage outputs
3. **Review PACK.md** - Check stage presence and file status
4. **Follow workflow** - Complete research, verification, and checklist items
5. **Request H2 approval** - "APPROVE ALIAS UPDATES"
6. **Manual sheet update** - Ledger updates Google Sheet after approval

## Project Structure

```
tools/ledger-month-close-pipeline-pack/
├── src/
│   ├── types.ts              # TypeScript type definitions
│   └── pack-builder.ts       # Main pack orchestration
├── fixtures/
│   ├── stage-outputs/
│   │   ├── unmatched/
│   │   │   └── queue.md
│   │   ├── suggest/
│   │   │   └── suggestions.md
│   │   ├── alias-checklist/
│   │   │   └── APPLY-CHECKLIST.md
│   │   └── close/
│   │       ├── CLOSE.md
│   │       └── APPROVAL.md
│   └── README.md             # Fixture documentation
├── index.ts                  # CLI entry point
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Safety Notes

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies stage output files
- ✅ **No amounts in PACK.md** - Amounts stay in stage output files only
- ✅ **H2 approval required** - Before any Google Sheet writes
- ⚠️ **Ledger owns sheet writes** - Coding/CoS never writes Budget directly
- ⚠️ **Manual verification required** - Review all stage outputs before approval
- ⚠️ **Never writes Budget sheet** - Google Sheets API is never called

## Troubleshooting

### "No stage inputs found" error

- Verify at least one `--*-outdir` path is provided
- Ensure specified directories exist and contain expected files
- Check file permissions

### "Month must be in YYYY-MM format" error

- Month must be `YYYY-MM` format (e.g., `2024-01`, not `2024-1` or `Jan 2024`)

### Missing stage files in output

- Review PACK.md file presence table to see which stages were found
- Check that upstream tools ran successfully and produced expected files
- Verify `--*-outdir` paths point to correct output directories

### Empty PACK.md or missing stages

- Tool will assemble whatever stage outputs are available
- At least one stage must be present (tool exits 1 if zero stages found)
- Review manifest.json `stages` object to see which stages were detected

## Future Enhancements (Not in v1)

- `--run-*` flags to shell out to sibling tools via npm run (currently not implemented)
- Raw input options (`--transactions`, `--aliases`, `--exports-dir`) for auto-running upstream tools
- Validation of stage output file contents (currently presence-only)

For v1, use prebuilt stage outputs via `--*-outdir` flags only.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
