# studio-brownie-pipeline-pack

**One-line:** Offline CLI orchestrator for BrownieTunez pipeline: lyric-package-stub → suno-validate → youtube-preflight.

**Owning desk(s):** Studio / BrownieTunez

**Location:** `tools/studio-brownie-pipeline-pack/`

## Purpose

Wire existing Studio tools (`studio-lyric-package-stub`, `studio-suno-package-validate`, `studio-youtube-preflight-pack`) into one pipeline pack so Studio can assemble a BrownieTunez run pack offline before Drive/CoS approval.

**No YouTube upload. No Suno API. No invented lyrics. Offline orchestrator only.**

## Install and Run

```bash
cd tools/studio-brownie-pipeline-pack
npm install
npm run build

# Option 1: Use existing lyric package (preferred)
npm run pipeline -- --pack ../studio-lyric-package-stub/out/my-song/

# Option 2: Generate lyric package first (rare)
npm run pipeline -- --run-lyric-stub --lyrics my-song.txt --title "Sunshine Day" --artist "Emma"

# With Drive URL and video for preflight
npm run pipeline -- --pack path/to/package --drive-url "https://drive.google.com/..." --video video.mp4

# Skip validation (multiple syntax options)
npm run pipeline -- --pack path/to/package --run-suno-validate=false
npm run pipeline -- --pack path/to/package --run-suno-validate false
npm run pipeline -- --pack path/to/package --no-run-suno-validate

# Skip preflight
npm run pipeline -- --pack path/to/package --no-run-youtube-preflight

# Skip both stages (rare)
npm run pipeline -- --pack path/to/package --no-run-suno-validate --no-run-youtube-preflight

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --pack <path>                   Path to existing lyric package [preferred]
  --run-lyric-stub                Run studio-lyric-package-stub first
  --run-suno-validate             Run studio-suno-package-validate [default: true]
                                  Accepts: --run-suno-validate, --run-suno-validate=true/false,
                                  --run-suno-validate true/false, --no-run-suno-validate
  --run-youtube-preflight         Run studio-youtube-preflight-pack [default: true]
                                  Accepts: --run-youtube-preflight, --run-youtube-preflight=true/false,
                                  --run-youtube-preflight true/false, --no-run-youtube-preflight
  --outdir <path>                 Output directory [default: ./out]
  --help, -h                      Show this help message

LYRIC STUB OPTIONS (when --run-lyric-stub is used):
  --lyrics <path>                 Path to lyrics text file [required]
  --title <string>                Song title (optional, derived from first line if omitted)
  --artist <string>               Artist name (child name or free text)
  --mood <string>                 Song mood/vibe
  --notes <path>                  Path to notes file

PREFLIGHT OPTIONS (when --run-youtube-preflight is used):
  --drive-url <url>               Drive approval link URL
  --drive-url-file <path>         File containing Drive approval link URL
  --video <path>                  Video file path (existence check only)
```

## Behavior

### Input Modes

**Mode 1 (preferred):** Use existing lyric package
- `--pack` path to a package folder produced by `studio-lyric-package-stub`
- Validates required files (`lyrics.cleaned.txt`, `checklist.md`, `manifest.json`)

**Mode 2 (rare):** Generate lyric package first
- `--run-lyric-stub` with same inputs `studio-lyric-package-stub` needs
- Runs `studio-lyric-package-stub` in temporary directory
- Proceeds to assemble pipeline pack from generated output

### Pipeline Stages

1. **Lyric package** (existing or generated)
2. **studio-suno-package-validate** [default: ON, skip with `--no-run-suno-validate`]
   - Validates required files present
   - Checks metadata JSON shape
   - Ensures lyrics not empty
   - Detects PII patterns
   - Verifies checklist mentions manual paste only
3. **studio-youtube-preflight-pack** [default: ON, skip with `--no-run-youtube-preflight`]
   - Checks required files present
   - Verifies Drive approval link present (if provided)
   - Checks video file exists (if provided)
   - Scans for PII patterns

### Pipeline Pack Assembly

Creates `<outdir>/brownie-pipeline-pack-YYYY-MM-DD/` with:

- **PACK.md** — Index of pipeline contents (only files actually present)
- **APPROVAL.md** — Drive approval and CoS approval reminders
- **lyrics.cleaned.txt** — From lyric package
- **meta.json** — From lyric package
- **checklist.md** — From lyric package
- **validate-report.json** — From validation (if run)
- **validate-report.md** — From validation (if run)
- **validate-APPROVAL.md** — From validation (if run)
- **preflight-PREFLIGHT.md** — From preflight (if run)
- **preflight-APPROVAL.md** — From preflight (if run)
- **preflight-missing.md** — From preflight (if run)
- **manifest.json** — Metadata with accurate file inventory

### Exit Codes

- `0` — Pipeline pack created successfully, all checks passed
- `1` — Pack path missing/invalid or pipeline stage failed

## Output Files

### PACK.md

Index and status:
```markdown
# BrownieTunez Pipeline Pack

Offline orchestrator assembling lyric package validation and YouTube preflight checks.

**Never uploads to YouTube. Never invents lyrics. Kids BrownieTunez only.**

## Contents

### Core Lyric Package Files
- **lyrics.cleaned.txt** — From lyric package
- **meta.json** — From lyric package
- **checklist.md** — From lyric package

### Validation Reports
- **validate-report.json** — From studio-suno-package-validate
- **validate-report.md** — From studio-suno-package-validate
- **validate-APPROVAL.md** — From studio-suno-package-validate

### Preflight Reports
- **preflight-PREFLIGHT.md** — From studio-youtube-preflight-pack
- **preflight-APPROVAL.md** — From studio-youtube-preflight-pack
- **preflight-missing.md** — From studio-youtube-preflight-pack

## Pipeline Status

✅ **Validation:** 5/5 checks passed
✅ **Preflight:** 5/5 checks passed

## Next Steps

1. Review validation reports (if present)
2. Review preflight reports (if present)
3. Check APPROVAL.md for workflow reminders
4. Finished video goes on thebrownsusa Drive
5. Grant approves in CoS chat before any YouTube upload

## Approval Gates

- **Drive Upload:** Finished video → thebrownsusa Drive (REQUIRED)
- **CoS Approval:** Grant must approve in CoS chat (BLOCKING)
- **YouTube Upload:** Only after Grant approval (NEVER AUTO-UPLOAD)
```

### APPROVAL.md

Safety gates and workflow reminders:
- Never uploads to YouTube
- Never invents lyrics
- Kids BrownieTunez only
- Drive approval required
- Grant approval in CoS required

### manifest.json

Machine-readable metadata:
```json
{
  "tool": "studio-brownie-pipeline-pack",
  "version": "1.0.0",
  "generatedAt": "2026-09-02T14:30:00.000Z",
  "packPath": "/workspace/tools/studio-lyric-package-stub/out/my-song",
  "lyricStubRan": false,
  "sunoValidateRan": true,
  "youtubePreflightRan": true,
  "allChecksPassed": true,
  "validationCheckCount": 5,
  "validationPassCount": 5,
  "validationFailCount": 0,
  "preflightCheckCount": 5,
  "preflightPassCount": 5,
  "preflightFailCount": 0,
  "files": [
    "PACK.md",
    "APPROVAL.md",
    "manifest.json",
    "lyrics.cleaned.txt",
    "meta.json",
    "checklist.md",
    "validate-report.json",
    "validate-report.md",
    "validate-APPROVAL.md",
    "preflight-PREFLIGHT.md",
    "preflight-APPROVAL.md",
    "preflight-missing.md"
  ]
}
```

## Workflow Integration

This tool is the final assembler in the BrownieTunez workflow:

```bash
# Step 1: Create lyric package (or use existing)
cd tools/studio-lyric-package-stub
npm run stub -- --lyrics my-song.txt --title "Sunshine Day" --artist "Emma" --outdir out/sunshine-day/

# Step 2: Assemble pipeline pack with validation and preflight
cd ../studio-brownie-pipeline-pack
npm run pipeline -- --pack ../studio-lyric-package-stub/out/sunshine-day/ --drive-url "https://drive.google.com/..."

# Step 3: Review outputs
cat out/brownie-pipeline-pack-2026-09-02/PACK.md
cat out/brownie-pipeline-pack-2026-09-02/validate-report.md
cat out/brownie-pipeline-pack-2026-09-02/preflight-PREFLIGHT.md

# Step 4: Manual Suno paste workflow (not automated)

# Step 5: Upload finished video to thebrownsusa Drive (REQUIRED)

# Step 6: Request Grant approval in CoS chat (BLOCKING)

# Step 7: Only after Grant approval, upload to YouTube
```

## Integration with Sibling Tools

This tool automatically builds sibling tools if their `dist/index.js` is missing. No manual build step required.

**Auto-Build Behavior:**

- Before calling `studio-suno-package-validate`, checks if `../studio-suno-package-validate/dist/index.js` exists
- Before calling `studio-youtube-preflight-pack`, checks if `../studio-youtube-preflight-pack/dist/index.js` exists
- If either is missing, runs `npm run build` in that tool's directory first
- Fails gracefully with clear error message if auto-build fails
- Makes fresh checkout / green-box fixture testing work with a single `npm run test:fixtures` command

### studio-lyric-package-stub

Primary input source (Mode 1) or called stage (Mode 2). Provides:
- `lyrics.cleaned.txt` (exact copy from input)
- `meta.json` (title, artist, mood, source, createdAt)
- `checklist.md` (manual paste workflow)
- `APPROVAL.md` (approval gates)
- `manifest.json` (package metadata)

### studio-suno-package-validate

Validation stage (default ON). Provides:
- `report.json` (machine-readable validation results)
- `report.md` (numbered pass/fail report)
- `APPROVAL.md` (safety gates)
- `manifest.json` (tool metadata)

Checks:
1. Required files present
2. Metadata JSON shape valid
3. Lyrics not empty
4. No PII patterns
5. Checklist mentions manual paste only

### studio-youtube-preflight-pack

Preflight stage (default ON). Provides:
- `PREFLIGHT.md` (numbered preflight checks)
- `APPROVAL.md` (approval gate rules)
- `missing.md` (what's blocking)
- `manifest.json` (tool metadata)

Checks:
1. Required files present
2. Drive approval link present (if provided)
3. Video file exists (if provided)
4. PII pattern scan

## Tests

```bash
# Run unit tests (when implemented)
npm test

# Run fixture tests (generates sample pipeline pack with demo Drive URL)
npm run test:fixtures

# Clean generated artifacts
npm run clean
```

**Fixture Testing Notes:**

- The `test:fixtures` script passes a demo Drive URL (`https://drive.google.com/file/d/FIXTURE-DEMO-ID/view`) to satisfy preflight checks in fixture smoke tests
- This demo URL is clearly marked as FIXTURE-DEMO and is not a real approval link
- Fixture tests exercise the full pipeline including validation and preflight stages
- Exit code 0 indicates fixture test success (all checks passed)

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never uploads** - No YouTube API, no Suno API, no Drive API
- ✅ **Read-only assembly** - Never modifies source package files
- ✅ **No invented data** - Never fabricates lyrics or titles
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ✅ **Accurate manifest** - Only lists files actually present (PR #116 pattern)
- ✅ **Kids BrownieTunez only** - Follow brownietunez-pipeline skill gates
- ⚠️ **Drive approval required** - Finished video → thebrownsusa Drive (REQUIRED)
- ⚠️ **Grant approval required** - Grant must approve in CoS chat (BLOCKING)
- ⚠️ **Manual review required** - Review PACK.md and reports before any YouTube upload

## Boolean Flag Patterns (PR #114)

This tool supports multiple boolean flag syntaxes for `--run-suno-validate` and `--run-youtube-preflight`:

1. **Bare flag:** `--run-suno-validate` (defaults to true)
2. **Equals sign:** `--run-suno-validate=true` or `--run-suno-validate=false`
3. **Space-separated:** `--run-suno-validate true` or `--run-suno-validate false`
4. **Negative flag:** `--no-run-suno-validate` (sets to false)
5. **Alternate values:** `yes`/`no`, `1`/`0` also accepted

Examples:
```bash
# All of these skip validation:
npm run pipeline -- --pack path/to/package --run-suno-validate=false
npm run pipeline -- --pack path/to/package --run-suno-validate false
npm run pipeline -- --pack path/to/package --run-suno-validate no
npm run pipeline -- --pack path/to/package --run-suno-validate 0
npm run pipeline -- --pack path/to/package --no-run-suno-validate
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
    "lyrics.cleaned.txt",
    "meta.json",
    "checklist.md"
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
    "lyrics.cleaned.txt",
    "meta.json",
    "checklist.md",
    "validate-report.json",
    "validate-report.md",
    "validate-APPROVAL.md",
    "validate-manifest.json"
  ]
}
```

## Entity Context

- **Lane:** Studio / BrownieTunez
- **Target:** Offline pipeline pack for Drive approval workflow
- **Frequency:** Before each BrownieTunez run
- **Owners:** Grant + Studio (review), CoS (approve)
- **Approval Gate:** Drive upload + CoS approval before any YouTube upload

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, validation reports, preflight reports
3. **Verify stage integration** - Ensure sibling tools run correctly
4. **NEVER auto-upload** - Manual review required

## Comparison to Sibling Pipeline Packs

### Similar to:

- `family-morning-digest-pipeline-pack` - Orchestrates multiple tools, default ON stages, boolean flag patterns
- `ledger-month-close-pipeline-pack` - Offline orchestrator, accurate manifest
- `hm-quote-pipeline-pack` - Offline orchestrator, never invents data

### Different from:

- **Studio-specific** - BrownieTunez only, kids content focus
- **Drive approval gates** - Finished video → thebrownsusa Drive (REQUIRED)
- **CoS approval gates** - Grant must approve in CoS chat (BLOCKING)
- **YouTube upload gates** - Never auto-upload (NEVER)

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
