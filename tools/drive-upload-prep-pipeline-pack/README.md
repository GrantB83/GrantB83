# drive-upload-prep-pipeline-pack

**One-line:** Offline CLI orchestrator for Drive handoff prep: validates and prepares files for Google Drive upload without using Drive API.

**Owning desk(s):** Studio / Career / CoS / Perfect Water / Hospitality

**Location:** `tools/drive-upload-prep-pipeline-pack/`

## Purpose

One dated pipeline pack that prepares files for Google Drive upload (metadata + checklist) without using a Drive browser session. Orchestrates two sibling tools:

1. **drive-create-file-validate** (optional, default OFF) — Validates Drive `create_file` JSON payloads
2. **drive-pdf-upload-prep** (default ON) — Prepares PDFs for Drive upload with base64 encoding

**Offline only. Never uploads. Never invents Drive URLs or file IDs. Outputs PACK.md + APPROVAL.md for human upload via connector/approved path.**

## Install and Run

### System Dependencies

For drive-pdf-upload-prep stage (Python-based):

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ghostscript poppler-utils python3-pip

# macOS
brew install ghostscript poppler python3

# Alpine (Cloud Agent VMs)
apk add ghostscript poppler-utils python3
```

### Node.js Setup

```bash
cd tools/drive-upload-prep-pipeline-pack

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Basic Usage

```bash
# Default: upload-prep only
npm run pipeline -- --source-pdf invoice.pdf --parent-id 1A2B3C4D5E6F --title "Invoice 2026"

# With validation enabled
npm run pipeline -- --source-pdf invoice.pdf --parent-id 1A2B3C4D5E6F --run-validate

# Skip upload-prep (validation only)
npm run pipeline -- --source-file data.json --no-run-upload-prep --run-validate --max-b64 15500

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --source-file <path>           Path to source file (generic)
  --source-pdf <path>            Path to source PDF (for upload-prep)
  --title <string>               Title/filename for Drive upload
  --outdir <path>                Output directory [default: ./out]
  --as-of <YYYY-MM-DD>           As-of date for metadata [default: today]
  --run-validate                 Run drive-create-file-validate [default: false]
  --run-upload-prep              Run drive-pdf-upload-prep [default: true]
                                 Accepts: --run-upload-prep, --run-upload-prep=true/false,
                                 --run-upload-prep true/false, --no-run-upload-prep
  --help, -h                     Show this help message

DRIVE-CREATE-FILE-VALIDATE OPTIONS (when --run-validate is used):
  --max-b64 <number>             Max base64 bytes [default: 15500]
  --require-pdf-magic            Require %PDF magic bytes for PDFs

DRIVE-PDF-UPLOAD-PREP OPTIONS (when --run-upload-prep is used):
  --parent-id <id>               Google Drive folder ID for uploads [required]
```

## Behavior

### Pipeline Stages

1. **drive-create-file-validate** [default: OFF, enable with `--run-validate`]
   - Validates JSON payloads for Drive MCP `create_file`
   - Checks base64 encoding, size limits, required fields
   - Produces: `validate-valid.json`, `validate-invalid.json`, `validate-report.md`

2. **drive-pdf-upload-prep** [default: ON, disable with `--no-run-upload-prep`]
   - Converts PDFs to base64 JSON payloads
   - Auto-compresses PDFs exceeding size limits
   - Produces: `upload-prep-manifest.json`, `upload-prep-*.json`

### Pipeline Pack Assembly

Creates `<outdir>/drive-upload-prep-pack-YYYY-MM-DD/` with:

- **PACK.md** — Index of pipeline contents (only files actually present)
- **APPROVAL.md** — Approval gate reminders
- **Source file** — Copy of input file
- **validate-*.json/md** — Validation reports (if validation ran)
- **upload-prep-*.json** — Upload payloads (if upload prep ran)
- **manifest.json** — Metadata with accurate file inventory (PR #116 pattern)

### Exit Codes

- `0` — Pipeline pack created successfully, all checks passed
- `1` — Invalid inputs or pipeline stage failed

## Output Files

### PACK.md

Index and status of pipeline pack contents. Lists only files actually present.

### APPROVAL.md

Safety gates and workflow reminders:
- Never uploads to Drive
- Never invents Drive URLs/IDs
- Offline only
- Human approval required
- Approved connector/path only

### manifest.json

Machine-readable metadata:
```json
{
  "tool": "drive-upload-prep-pipeline-pack",
  "version": "1.0.0",
  "generatedAt": "2026-09-04T14:30:00.000Z",
  "sourceFile": "/path/to/invoice.pdf",
  "title": "Invoice 2026",
  "asOf": "2026-09-04",
  "validateRan": false,
  "uploadPrepRan": true,
  "allChecksPassed": true,
  "validationFailCount": 0,
  "uploadPrepFailCount": 0,
  "files": [
    "PACK.md",
    "APPROVAL.md",
    "manifest.json",
    "invoice.pdf",
    "upload-prep-manifest.json",
    "upload-prep-invoice.json"
  ]
}
```

## Workflow Integration

This tool orchestrates sibling tools for offline Drive prep:

```bash
# Step 1: Prepare pipeline pack
cd tools/drive-upload-prep-pipeline-pack
npm run pipeline -- \
  --source-pdf path/to/invoice.pdf \
  --parent-id 1A2B3C4D5E6F \
  --title "Invoice 2026-09" \
  --run-validate

# Step 2: Review outputs
cat out/drive-upload-prep-pack-2026-09-04/PACK.md
cat out/drive-upload-prep-pack-2026-09-04/validate-report.md
cat out/drive-upload-prep-pack-2026-09-04/upload-prep-manifest.json

# Step 3: Human approval (REQUIRED)

# Step 4: Upload via approved connector/path only
# (Manual step or via approved bot workflow)
```

## Integration with Sibling Tools

This tool automatically discovers sibling tools. No manual build step required for Python-based siblings.

**Sibling Tools:**

### drive-create-file-validate (optional stage, default OFF)

Preflight validator for Drive `create_file` JSON payloads. Validates:
- Required keys present
- Correct types
- Strict base64 encoding
- Size limits
- Non-empty fields
- Optional PDF magic bytes

Provides:
- `valid.json` (list of valid files)
- `invalid.json` (list of invalid files with errors)
- `report.md` (human-readable report)

### drive-pdf-upload-prep (default stage, ON)

Prepares PDFs for Drive upload. Provides:
- `manifest.json` (processing summary with compression stats)
- `*.json` (Drive create_file payloads, one per PDF)

Auto-compresses PDFs exceeding size limits using ghostscript or rasterization.

## Tests

```bash
# Run unit tests (when implemented)
npm test

# Run fixture tests (generates sample pipeline pack)
npm run test:fixtures

# Clean generated artifacts
npm run clean
```

**Fixture Testing Notes:**

- The `test:fixtures` script uses a minimal test PDF and demo parent ID
- Fixture tests exercise the default pipeline (upload-prep ON, validation OFF)
- Exit code 0 indicates fixture test success

## Critical Safety Notes

- ✅ **Offline only** - No Drive API calls
- ✅ **Never uploads** - No Drive API, no browser, no MCP calls
- ✅ **Read-only assembly** - Never modifies source files
- ✅ **No invented data** - Never fabricates Drive URLs or file IDs
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ✅ **Accurate manifest** - Only lists files actually present (PR #116 pattern)
- ⚠️ **Human approval required** - Review PACK.md before any upload
- ⚠️ **Approved connector only** - Use approved connector/path for upload

## Boolean Flag Patterns (PR #114)

This tool supports multiple boolean flag syntaxes for `--run-validate` and `--run-upload-prep`:

1. **Bare flag:** `--run-validate` (sets to true)
2. **Equals sign:** `--run-validate=true` or `--run-validate=false`
3. **Space-separated:** `--run-validate true` or `--run-validate false`
4. **Negative flag:** `--no-run-validate` (sets to false)
5. **Alternate values:** `yes`/`no`, `1`/`0` also accepted

Examples:
```bash
# All of these enable validation:
npm run pipeline -- --source-pdf invoice.pdf --parent-id ABC --run-validate
npm run pipeline -- --source-pdf invoice.pdf --parent-id ABC --run-validate=true
npm run pipeline -- --source-pdf invoice.pdf --parent-id ABC --run-validate true

# All of these skip upload-prep:
npm run pipeline -- --source-pdf invoice.pdf --parent-id ABC --run-upload-prep=false
npm run pipeline -- --source-pdf invoice.pdf --parent-id ABC --run-upload-prep false
npm run pipeline -- --source-pdf invoice.pdf --parent-id ABC --no-run-upload-prep
```

## Manifest Accuracy (PR #116)

The `manifest.json` only lists files that are actually present in the pipeline pack directory. It does not list files that were not generated because stages were skipped.

Example when validation is skipped:
```json
{
  "files": [
    "PACK.md",
    "APPROVAL.md",
    "manifest.json",
    "invoice.pdf",
    "upload-prep-manifest.json",
    "upload-prep-invoice.json"
  ]
}
```

Example when validation is run:
```json
{
  "files": [
    "PACK.md",
    "APPROVAL.md",
    "manifest.json",
    "invoice.pdf",
    "validate-valid.json",
    "validate-report.md",
    "upload-prep-manifest.json",
    "upload-prep-invoice.json"
  ]
}
```

## Entity Context

- **Lane:** Studio / Career / CoS / Perfect Water / Hospitality
- **Target:** Offline pipeline pack for Drive upload workflow
- **Frequency:** Before each Drive upload batch
- **Owners:** Grant + entity desk (review), Grant (approve)
- **Approval Gate:** Human review + approved connector/path before any Drive upload

## Use Cases

### Studio / Career - Document Submission

Prepare résumés, cover letters, portfolios for Drive upload:

```bash
npm run pipeline -- \
  --source-pdf resume-2026.pdf \
  --parent-id 1STUDIO2FOLDER3ID \
  --title "Resume Grant Brown 2026" \
  --run-validate
```

### Perfect Water / Hospitality - Invoice Archival

Prepare invoices for Drive vault:

```bash
npm run pipeline -- \
  --source-pdf invoice-PW-2026-09.pdf \
  --parent-id 1PW2INVOICES3ID \
  --title "PW Invoice 2026-09" \
  --run-validate \
  --require-pdf-magic
```

### CoS - General File Prep

Prepare any file type with validation:

```bash
npm run pipeline -- \
  --source-file data.json \
  --no-run-upload-prep \
  --run-validate \
  --max-b64 12000
```

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, validation reports, upload payloads
3. **Verify stage integration** - Ensure sibling tools run correctly
4. **NEVER auto-upload** - Manual review required

## Comparison to Sibling Pipeline Packs

### Similar to:

- `studio-brownie-pipeline-pack` - Orchestrates multiple tools, default ON/OFF stages, boolean flag patterns
- `family-morning-digest-pipeline-pack` - Offline orchestrator, accurate manifest
- `ledger-month-close-pipeline-pack` - Never invents data, offline only

### Different from:

- **Multi-entity** - Studio, Career, CoS, PW, Hospitality (not single-entity)
- **Drive-specific** - Drive upload prep only (not general pipeline)
- **Optional validation** - Validation is OFF by default (not always ON)

## Known Limitations

1. **Python dependencies required** - drive-pdf-upload-prep needs ghostscript and poppler
2. **One file at a time** - Pipeline pack processes one source file per run
3. **No batch upload** - Tool generates payloads only (upload is separate step)
4. **No Drive API** - Cannot verify parent IDs or check existing files

## Troubleshooting

### "Source file does not exist"

Check file path. Use absolute paths or relative to current directory.

### "parentId is required for upload-prep stage"

Pass `--parent-id` when `--run-upload-prep` is enabled (default).

### "drive-pdf-upload-prep tool not found"

Ensure sibling tool exists at `../drive-pdf-upload-prep/`.

### Python dependencies missing

Install ghostscript, poppler, and python3 (see Install section).

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
