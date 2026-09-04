# attachment-filename-index-pipeline-pack

**One-line:** Offline CLI pipeline pack orchestrating attachment-filename-index into structured index packs for Vault / Family / CoS.

**Owning desk(s):** Vault / Family / CoS

**Location:** `tools/attachment-filename-index-pipeline-pack/`

## Purpose

Wire `attachment-filename-index` into one offline pipeline pack (same pattern as `ledger-alias-pipeline-pack` / `vault-entity-due-pipeline-pack`). Never opens file bodies. Never invents dates/amounts/legal positions. Offline validation only.

**No Google Drive/Gmail API. No file body reads. Offline indexing only. Manual review required.**

## Install and Run

```bash
cd tools/attachment-filename-index-pipeline-pack
npm install
npm run build

# Option 1: From filename list (preferred)
npm run pack -- --files filenames.txt

# Option 2: From directory
npm run pack -- --dir /vault/documents

# With mail subject matching
npm run pack -- --files filenames.txt --subjects mail-subjects.csv

# With as-of date label
npm run pack -- --files filenames.txt --as-of 2026-09-04

# Skip index stage (PR #114 pattern)
npm run pack -- --files filenames.txt --no-run-index
npm run pack -- --files filenames.txt --run-index=false
npm run pack -- --files filenames.txt --run-index false

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
REQUIRED (one of):
  --files <path>              Path to filename list (text or CSV)
  --dir <path>                Path to directory listing file or directory to scan

OPTIONS:
  --subjects <path>           Optional: Path to CSV/TXT file with mail subjects
  --run-index                 Run attachment-filename-index [default: true]
                              Accepts: --run-index, --run-index=true/false,
                              --run-index true/false, --no-run-index
  --as-of <YYYY-MM-DD>        As-of date label for the pack
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message
```

## Behavior

### Input Modes

**Mode 1 (preferred):** Filename list
- `--files` path to text or CSV file with filename list
- Runs `attachment-filename-index` to generate structured index
- As-of date provided via `--as-of` if needed

**Mode 2:** Directory scan
- `--dir` path to directory to scan (basenames only, no file body reads)
- Runs `attachment-filename-index` to generate structured index
- Proceeds to assemble pipeline pack from generated output

### Pipeline Pack Assembly

Creates `<outdir>/attachment-index-pack[-YYYY-MM-DD]/` with:

- **PACK.md** — Index of pipeline pack with workflow summary (no invented data)
- **index.csv** — From attachment-filename-index (machine-readable CSV)
- **index.md** — From attachment-filename-index (human-readable Markdown report)
- **APPROVAL.md** — Review workflow gates
- **manifest.json** — Metadata (PR #116 pattern - only lists files actually present)

### Index Stage Integration

When `--run-index` is true (default):
1. Auto-builds `attachment-filename-index` if `dist/` missing (PR #132 pattern)
2. Shells out to `../attachment-filename-index` via `node dist/index.js` (PR #141 pattern)
3. Runs index generation on input files or directory
4. Copies index.csv and index.md to pipeline pack
5. Updates PACK.md with index status

### Exit Codes

- `0` — Pipeline pack created successfully
- `1` — Index stage failed or inputs missing/invalid

## Output Files

### PACK.md

Pipeline pack index and summary:
```markdown
# Attachment Filename Index Pipeline Pack — 2026-09-04

Assembled pipeline pack combining `attachment-filename-index` for offline 
filename indexing and structured index generation.

**Never opens file bodies. Never invents dates/amounts/legal positions. 
Filename heuristics only.**

## Contents

### Index Files

- **index.csv** — Machine-readable CSV index with all indexed files
- **index.md** — Human-readable Markdown report with summary and entity counts

### Pack Metadata

- **PACK.md** — This file (pipeline pack index)
- **APPROVAL.md** — Review workflow gates
- **manifest.json** — Machine-readable metadata

## Workflow Integration

This pack orchestrates filename indexing for Vault, Family, and CoS operations:

\`\`\`
Filename list or directory → attachment-filename-index → Structured index pack
\`\`\`

## Next Steps

1. Review **index.md** for human-readable index report
2. Use **index.csv** for spreadsheet operations or filtering
3. Review **APPROVAL.md** for workflow gates
4. Apply manual review and action as needed

## Safety Reminders

- ✅ **Offline only** — No Google Drive/Gmail API or network calls
- ✅ **No file body reads** — Filename heuristics only
- ✅ **Read-only** — Never modifies source files
- ✅ **No invented data** — Never fabricates dates/amounts/legal positions
- ⚠️ **Manual review required** — Review all index outputs before action
- ⚠️ **Heuristic-based** — Entity tagging may have false positives/negatives
```

### manifest.json

Machine-readable metadata (PR #116 - accurate file list):
```json
{
  "tool": "attachment-filename-index-pipeline-pack",
  "version": "1.0.0",
  "asOf": "2026-09-04",
  "generatedAt": "2026-09-04T22:00:00.000Z",
  "indexRan": true,
  "inputFiles": {
    "filesPath": "/workspace/tools/attachment-filename-index-pipeline-pack/fixtures/sample-filenames.txt"
  },
  "files": [
    "PACK.md",
    "index.csv",
    "index.md",
    "APPROVAL.md",
    "manifest.json"
  ]
}
```

**Note:** The `files` array only lists files actually present in the pack directory. If `--run-index` is disabled, index files are excluded from the manifest (PR #116 pattern).

## Workflow Integration

This tool is the pipeline orchestrator for filename indexing workflows:

```bash
# Step 1: Prepare filename list or directory path
cat vault-filenames.txt

# Step 2: Assemble pipeline pack
cd tools/attachment-filename-index-pipeline-pack
npm run pack -- \\
  --files vault-filenames.txt \\
  --as-of 2026-09-04

# Step 3: Review outputs
cat out/attachment-index-pack-2026-09-04/PACK.md
cat out/attachment-index-pack-2026-09-04/index.md

# Step 4: Use index.csv for filtering or spreadsheet operations
```

## Integration with Sibling Tools

### attachment-filename-index

Primary index tool. Provides:
- index.csv (machine-readable CSV with all indexed files)
- index.md (human-readable Markdown report)

Supports:
- Directory scanning (basenames only, no file body reads)
- Filename list mode
- Mail subject matching
- Entity tagging (21 entity categories)
- Date extraction (multiple formats)

## Boolean Flag Patterns (PR #114)

This tool supports multiple boolean flag syntaxes for `--run-index`:

```bash
# Enable index (default)
npm run pack -- --files filenames.txt
npm run pack -- --files filenames.txt --run-index
npm run pack -- --files filenames.txt --run-index=true
npm run pack -- --files filenames.txt --run-index true

# Disable index
npm run pack -- --files filenames.txt --run-index=false
npm run pack -- --files filenames.txt --run-index false
npm run pack -- --files filenames.txt --no-run-index
```

## Manifest Accuracy (PR #116)

The `manifest.json` only lists files that are actually present in the pipeline pack directory. It does not list files that were not generated because stages were skipped.

Example: If `--run-index=false`, the manifest will not include:
- index.csv
- index.md

This ensures the manifest accurately reflects the pack contents.

## Auto-Build Pattern (PR #132 / #141)

This tool follows the PR #141 pattern: prefer `node sibling/dist/index.js` over nested `npm run`.

If `attachment-filename-index` dist/ is missing, this tool will:
1. Install dependencies (`npm install`)
2. Build the tool (`npm run build`)
3. Run via `node dist/index.js`

This ensures sibling tools are always available and up-to-date.

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
- Input validation
- Boolean flag parsing (PR #114 pattern)
- Manifest generation (PR #116 accuracy)
- Auto-build sibling pattern (PR #132 / #141)

Fixture tests generate complete outputs from:
- `fixtures/sample-filenames.txt` - 20 synthetic filenames (should pass)

## Critical Safety Notes

- ✅ **Offline only** - No Google Drive/Gmail API or network calls
- ✅ **Read-only assembly** - Never modifies source files
- ✅ **No file body reads** - Filename heuristics only
- ✅ **No invented data** - Never fabricates dates/amounts/legal positions
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ✅ **Accurate manifest** - Only lists files actually present (PR #116 pattern)
- ⚠️ **Manual review required** - Review PACK.md and index outputs before action
- ⚠️ **Heuristic-based** - Entity tagging may have false positives/negatives

## Entity Context

- **Lane:** vault / family / cos
- **Target:** Offline pipeline pack for Vault / Family / CoS review
- **Frequency:** After each document intake cycle
- **Owners:** Vault / Family / CoS (review and action), CoS (pipeline tooling)

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, index.md, index.csv
3. **Verify index accuracy** - Ensure entity tags and dates are reasonable
4. **NEVER auto-action** - Manual review and approval required

## Use Cases

### For Vault Due-Queue Intake

Index attachment filenames from Vault mail exports to locate Plimmer/Charisse/tax-emigration files:

```bash
npm run pack -- --files vault-attachments.txt --as-of 2026-09-04
```

### For Family School Attachments

Index school attachment filenames to classify by subject and date:

```bash
npm run pack -- --files school-attachments.txt --subjects school-mail-subjects.csv
```

### For CoS Document Cleanup

Index CoS hub mail attachments to identify files for filing or cleanup:

```bash
npm run pack -- --dir /cos-mail-attachments --as-of 2026-09-04
```

## Ritual Removed

**Before this tool:** Manually run attachment-filename-index, copy files by hand, write PACK.md manually, track which files were generated.

**After this tool:** Automated pipeline pack with index stage, PACK.md, APPROVAL.md, accurate manifest of files actually present.

**Artifact Grant can use this week:** `PACK.md` with pipeline summary + complete index.csv / index.md + manifest.json listing only files actually present.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
