# ledger-alias-pipeline-pack

**One-line:** Offline CLI pipeline pack orchestrating ledger-merchant-alias-suggest → ledger-alias-apply-checklist into one outdir with PACK.md + manifest.json.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-alias-pipeline-pack/`

## Purpose

Wire `ledger-merchant-alias-suggest` → `ledger-alias-apply-checklist` into one offline pipeline pack (same pattern as `family-morning-digest-pipeline-pack` / `career-weekday-improve-pipeline-pack`). Never invents amounts. Never pays. Never writes the live Budget sheet — checklist/draft only for Ledger to apply.

**No Google Sheets API. No payments. Offline validation only. Ledger owns sheet writes.**

## Install and Run

```bash
cd tools/ledger-alias-pipeline-pack
npm install
npm run build

# Option 1: Use existing suggest output (preferred)
npm run pipeline -- --suggest-outdir ../ledger-merchant-alias-suggest/out/

# Option 2: Run suggest first
npm run pipeline -- \\
  --run-suggest \\
  --unmatched-queue ../ledger-unmatched-merchant-queue/out/queue.json \\
  --aliases aliases.json \\
  --month 2026-09

# With explicit output directory
npm run pipeline -- --suggest-outdir path/to/suggest-out --outdir reports/

# Skip apply-checklist (multiple syntax options - PR #114)
npm run pipeline -- --suggest-outdir path/to/suggest-out --run-apply-checklist=false
npm run pipeline -- --suggest-outdir path/to/suggest-out --run-apply-checklist false
npm run pipeline -- --suggest-outdir path/to/suggest-out --no-run-apply-checklist

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --suggest-outdir            Path to existing ledger-merchant-alias-suggest output [preferred]
  --run-suggest               Run ledger-merchant-alias-suggest first
  --run-apply-checklist       Run ledger-alias-apply-checklist [default: true]
                              Accepts: --run-apply-checklist, --run-apply-checklist=true/false,
                              --run-apply-checklist true/false, --no-run-apply-checklist
  --month                     Optional month label (YYYY-MM format, e.g., 2026-09)
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

SUGGEST OPTIONS (when --run-suggest is used):
  --unmatched-queue           Path to unmatched queue JSON (from ledger-unmatched-merchant-queue)
  --merchants                 Path to plain text merchant list (one per line)
  --aliases                   Path to aliases JSON file [required for --run-suggest]
```

## Behavior

### Input Modes

**Mode 1 (preferred):** Use existing suggest output
- `--suggest-outdir` path to output from ledger-merchant-alias-suggest
- Validates required files (suggestions.json)
- Month label provided via `--month` if needed

**Mode 2:** Run suggest first
- `--run-suggest` with suggest tool inputs
- Runs ledger-merchant-alias-suggest in temporary directory
- Proceeds to assemble pipeline pack from generated output

### Pipeline Pack Assembly

Creates `<outdir>/ledger-alias-pack[-YYYY-MM]/` with:

- **PACK.md** — Index of suggest output + checklist status (no invented amounts)
- **suggestions.json** — From suggest (structured merchant→alias data)
- **suggestions.md** — From suggest (human-readable suggestions)
- **no-match.md** — From suggest (manual research queue)
- **APPROVAL.md** — From suggest (approval gates and workflow)
- **APPLY-CHECKLIST.md** — From checklist (if run, H2-ready tick-off list)
- **SKIPPED.md** — From checklist (if run, low-confidence items)
- **APPROVAL-CHECKLIST.md** — From checklist (if run, checklist approval workflow)
- **manifest.json** — Metadata (PR #116 pattern - only lists files actually present)

### Apply-Checklist Integration

When `--run-apply-checklist` is true (default):
1. Shells out to `../ledger-alias-apply-checklist`
2. Runs checklist generation on suggest output
3. Copies APPLY-CHECKLIST.md, SKIPPED.md, and APPROVAL-CHECKLIST.md to pipeline pack
4. Updates PACK.md with checklist status

### Exit Codes
- `0` — Pipeline pack created successfully
- `1` — Suggest output missing/invalid or tools failed

## Output Files

### PACK.md
Index and status:
```markdown
# Ledger Alias Pipeline Pack — 2026-09

Assembled pipeline pack combining ledger-merchant-alias-suggest and 
ledger-alias-apply-checklist for offline merchant alias research and 
approval workflow.

**Never invents amounts. Never pays. Never writes the live Budget sheet 
— checklist/draft only for Ledger to apply.**

## Contents

### Suggestion Files
- **suggestions.json** — Structured merchant→alias suggestions with scores
- **suggestions.md** — Human-readable suggestions organized by confidence
- **no-match.md** — Merchants with no matches (manual research required)
- **APPROVAL.md** — Approval gates and workflow guidance

### Apply Checklist Files
- **APPLY-CHECKLIST.md** — H2-ready numbered tick-off checklist
- **SKIPPED.md** — Low-confidence and no-match items for research
- **APPROVAL-CHECKLIST.md** — Checklist approval workflow

### Pack Metadata
- **PACK.md** — This file (pipeline pack index)
- **manifest.json** — Machine-readable metadata

## Workflow Integration

This pack orchestrates the merchant alias research and approval workflow:

```
ledger-unmatched-merchant-queue → ledger-merchant-alias-suggest → 
ledger-alias-apply-checklist → H2 approval → Manual sheet update
```

## Next Steps

1. Review **suggestions.md** for suggested merchant→alias mappings
2. Check **no-match.md** for merchants requiring manual research
3. Review **APPLY-CHECKLIST.md** for numbered tick-off items
4. Check **SKIPPED.md** for items excluded from checklist
5. Get **H2 approval** before any Budget sheet writes
6. Ledger manually applies approved changes to Budget sheet

## Safety Reminders

- ✅ **Offline only** — No Google Sheets API or network calls
- ✅ **Read-only** — Never modifies input files
- ✅ **H2 approval required** — Never writes to Budget sheet
- ✅ **No invented amounts or aliases** — Pass-through only
- ✅ **Ledger owns sheet writes** — Coding/CoS provides tooling only
- ⚠️ **Manual review required** — Review all suggestions before applying
- ⚠️ **Amounts stay on sheet** — Never paste amounts into chat
```

### manifest.json
Machine-readable metadata (PR #116 - accurate file list):
```json
{
  "tool": "ledger-alias-pipeline-pack",
  "version": "1.0.0",
  "month": "2026-09",
  "generatedAt": "2026-09-04T04:30:00.000Z",
  "suggestRan": false,
  "applyChecklistRan": true,
  "suggestOutdir": "/workspace/tools/ledger-merchant-alias-suggest/out",
  "inputFiles": {},
  "files": [
    "PACK.md",
    "suggestions.json",
    "suggestions.md",
    "no-match.md",
    "APPROVAL.md",
    "APPLY-CHECKLIST.md",
    "SKIPPED.md",
    "APPROVAL-CHECKLIST.md",
    "manifest.json"
  ]
}
```

**Note:** The `files` array only lists files actually present in the pack directory. If `--run-apply-checklist` is disabled, checklist files are excluded from the manifest (PR #116 pattern).

## Workflow Integration

This tool is the pipeline orchestrator in the merchant alias workflow:

```bash
# Step 1: Build unmatched queue (or use existing)
cd tools/ledger-unmatched-merchant-queue
npm run queue -- --input transactions.csv --outdir queue-out/

# Step 2: Generate suggestions (or use existing)
cd ../ledger-merchant-alias-suggest
npm run suggest -- \\
  --unmatched ../ledger-unmatched-merchant-queue/queue-out/queue.json \\
  --aliases known-aliases.json \\
  --outdir suggestions/

# Step 3: Assemble pipeline pack with checklist
cd ../ledger-alias-pipeline-pack
npm run pipeline -- \\
  --suggest-outdir ../ledger-merchant-alias-suggest/suggestions/ \\
  --month 2026-09

# Step 4: Review outputs
cat out/ledger-alias-pack-2026-09/PACK.md
cat out/ledger-alias-pack-2026-09/APPLY-CHECKLIST.md

# Step 5: Get H2 approval and apply manually
```

## Integration with Sibling Tools

### ledger-unmatched-merchant-queue

Provides unmatched merchant lists:
- queue.json (structured queue)
- queue.md (human-readable list)
- Can be passed to suggest tool via `--unmatched-queue` when using `--run-suggest`

### ledger-merchant-alias-suggest

Primary suggest tool. Provides:
- suggestions.json (structured suggestions with scores)
- suggestions.md (human-readable suggestions)
- no-match.md (merchants needing manual research)
- APPROVAL.md (approval workflow)

### ledger-alias-apply-checklist

Checklist generator. Provides:
- APPLY-CHECKLIST.md (H2-ready tick-off list)
- SKIPPED.md (low-confidence items for research)
- APPROVAL.md (checklist approval workflow, renamed to APPROVAL-CHECKLIST.md in pack)

## Boolean Flag Patterns (PR #114)

This tool supports multiple boolean flag syntaxes for `--run-apply-checklist`:

```bash
# Enable apply-checklist (default)
npm run pipeline -- --suggest-outdir out/
npm run pipeline -- --suggest-outdir out/ --run-apply-checklist
npm run pipeline -- --suggest-outdir out/ --run-apply-checklist=true
npm run pipeline -- --suggest-outdir out/ --run-apply-checklist true

# Disable apply-checklist
npm run pipeline -- --suggest-outdir out/ --run-apply-checklist=false
npm run pipeline -- --suggest-outdir out/ --run-apply-checklist false
npm run pipeline -- --suggest-outdir out/ --no-run-apply-checklist
```

## Manifest Accuracy (PR #116)

The `manifest.json` only lists files that are actually present in the pipeline pack directory. It does not list files that were not generated because stages were skipped.

Example: If `--run-apply-checklist=false`, the manifest will not include:
- APPLY-CHECKLIST.md
- SKIPPED.md
- APPROVAL-CHECKLIST.md

This ensures the manifest accurately reflects the pack contents.

## Tests

```bash
# Run unit tests
npm test

# Run fixture tests (generates sample pipeline pack)
npm run test:fixtures

# Clean generated artifacts
npm run clean
```

Unit tests cover:
- Suggest output validation
- Required file checks
- Pipeline pack assembly
- Manifest generation (PR #116 accuracy)
- Apply-checklist integration

Fixture tests generate complete outputs from:
- `fixtures/suggest-out` - Valid suggest output (should pass)

## Critical Safety Notes

- ✅ **Offline only** - No Google Sheets API or network calls
- ✅ **Read-only assembly** - Never modifies source files
- ✅ **No invented data** - Never fabricates amounts, aliases, or merchant identities
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ✅ **Accurate manifest** - Only lists files actually present (PR #116 pattern)
- ✅ **H2 approval required** - Never writes to Budget sheet
- ⚠️ **Ledger owns sheet writes** - Manual application after approval
- ⚠️ **Manual review required** - Review PACK.md and checklists before applying
- ⚠️ **Amounts stay on sheet** - Never paste transaction amounts into chat

## Entity Context

- **Lane:** ledger
- **Target:** Offline pipeline pack for Ledger / CoS review
- **Frequency:** After each unmatched merchant queue research cycle
- **Owners:** Ledger (review and apply), CoS (pipeline tooling)
- **Approval Gate:** H2 required before any Budget sheet writes

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, APPLY-CHECKLIST.md
3. **Verify checklist integration** - Ensure apply-checklist runs automatically (or can be skipped)
4. **NEVER auto-write sheet** - Manual review and H2 approval required

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
