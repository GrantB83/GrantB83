# family-school-pipeline-pack

**One-line:** Offline CLI pipeline pack assembler orchestrating Family school morning pieces for AISD / Kids School workflows.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-school-pipeline-pack/`

## Purpose

One dated pipeline pack for Family / CoS morning school digests from pasted email subjects (and optional ICS). Never opens email bodies or attachments. Never invents due dates or school facts. Never auto-sends. Offline only. AISD / Kids School workflows.

**No sending. No Gmail API. Offline validation only. Family / CoS owns send workflow.**

## Orchestrated Stages

This tool orchestrates three family school tools:

1. **family-school-subject-digest** (default ON) — Classify and digest email subjects
2. **family-school-due-queue** (default ON) — Extract due/deadline signals
3. **family-calendar-ics-digest** (default OFF) — Parse .ics calendar exports

## Install and Run

```bash
cd tools/family-school-pipeline-pack
npm install
npm run build

# Basic usage (digest + due-queue enabled by default):
npm run pack -- --subjects subjects.txt --date 2026-09-04

# With filenames for due-queue:
npm run pack -- --subjects subjects.txt --filenames files.txt

# With calendar:
npm run pack -- --subjects subjects.txt --ics school.ics --run-calendar

# Skip digest:
npm run pack -- --subjects subjects.txt --run-digest=false

# Skip due-queue:
npm run pack -- --subjects subjects.txt --no-run-due-queue

# Test with fixtures:
npm run test:fixtures
```

## Command Line Options

```
Required:
  --subjects <path>          Path to subjects file (one subject per line)
  OR --input <path>          Alias for --subjects

Optional Inputs:
  --filenames <path>         Path to filenames file (for due-queue attachment mode)
  --ics <path>               Path to .ics calendar file (for calendar stage)

Date & Output:
  --date <YYYY-MM-DD>        Date label [default: today]
  --timezone <tz>            Timezone [default: America/Chicago]
  --outdir <path>            Output directory [default: ./out]

Stage Flags (PR #114 pattern):
  --run-digest               Run family-school-subject-digest [default: true]
                             Accepts: --run-digest, --run-digest=true/false,
                             --run-digest true/false, --no-run-digest
  --run-due-queue            Run family-school-due-queue [default: true]
                             Same syntax as --run-digest
  --run-calendar             Run family-calendar-ics-digest [default: false]
                             Requires --ics when enabled

Other:
  --help, -h                 Show this help message
```

## Behavior

### Stage Defaults

- **family-school-subject-digest:** Default ON
- **family-school-due-queue:** Default ON
- **family-calendar-ics-digest:** Default OFF (requires --ics and --run-calendar)

### Boolean Flag Syntax (PR #114)

All stage flags support multiple syntaxes:

```bash
--run-digest           # Enable (default)
--run-digest=false     # Disable with equals
--run-digest false     # Disable with space
--no-run-digest        # Disable with negative flag
```

### Pipeline Pack Assembly

Creates `<outdir>/pack-YYYY-MM-DD/` with:

- **PACK.md** — Index of stages and outputs (no invented facts)
- **APPROVAL.md** — Safety checklist (never opens bodies, never invents dates, never sends)
- **digest-digest.md** — From family-school-subject-digest (if run)
- **digest-items.json** — From family-school-subject-digest (if run)
- **digest-missing-fields.md** — From family-school-subject-digest (if run)
- **queue-queue.md** — From family-school-due-queue (if run)
- **queue-queue.json** — From family-school-due-queue (if run)
- **queue-missing-signals.md** — From family-school-due-queue (if run)
- **calendar-digest.md** — From family-calendar-ics-digest (if run)
- **calendar-events.json** — From family-calendar-ics-digest (if run)
- **calendar-missing-fields.md** — From family-calendar-ics-digest (if run)
- **manifest.json** — Metadata (files[] only lists present files, PR #116)

### Auto-Build Sibling Tools

The tool automatically builds sibling tools if their `dist/` directories are missing (PR #132 pattern). This ensures:
- Fresh checkouts work immediately
- No manual build steps required
- Dependencies are installed if needed

### Output Discovery

The tool discovers the real output directory structure from each sibling tool (PR #132 pattern):
- Handles flat output layouts
- Handles subdirectory layouts
- Copies only present files to the pack

### Exit Codes

- `0` — Pipeline pack created successfully
- `1` — Error occurred (input missing, stage failed, etc.)

## Output Files

### PACK.md

Index and status:

```markdown
# Family School Pipeline Pack — 2026-09-04

Orchestrated school morning pack for Family / CoS AISD workflows.

**Never opens email bodies. Never invents due dates. Never auto-sends.**

## Contents

### ✅ School Subject Digest
- **digest-digest.md** — From family-school-subject-digest
- **digest-items.json** — From family-school-subject-digest
- **digest-missing-fields.md** — From family-school-subject-digest

### ✅ School Due Queue
- **queue-queue.md** — From family-school-due-queue
- **queue-queue.json** — From family-school-due-queue
- **queue-missing-signals.md** — From family-school-due-queue

### ⚠️  Calendar Digest
- Skipped (--run-calendar=false or no --ics)

## Next Steps

1. Review digest outputs for accuracy
2. Check missing-fields / missing-signals files
3. Review APPROVAL.md for safety gates
4. Verify no invented due dates
5. Family / CoS owns WhatsApp send workflow

## Safety Reminders

- **Never opens** email bodies or attachments
- **Never invents** due dates or school facts
- **Offline only** — No Gmail API, no network calls
- **Never auto-sends** — Manual review required
- **Family / CoS owns send** workflow
```

### APPROVAL.md

Safety checklist:

```markdown
# Family School Pipeline Pack - APPROVAL CHECKLIST

## Hard Gates

### Never Open Email Bodies
☐ **Verified:** Pack generated from subjects/filenames only (never opened bodies/attachments)

### Never Invent Due Dates
☐ **Verified:** All due dates extracted from explicit signals (never invented)
☐ **Check:** missing-signals.md for items needing manual review

### Never Auto-Send
☐ **Verified:** No automatic WhatsApp/email sends configured
☐ **Manual review required** before any Family bot post

## Data Verification

☐ Review digest outputs for accuracy
☐ Check missing-fields files for incomplete data
☐ Verify AISD vs Family separation
☐ Confirm no school facts invented

## Safety Reminders

- ✅ Offline only
- ✅ Never opens email bodies/attachments
- ✅ Never invents due dates
- ✅ Never auto-sends
- ⚠️  Family / CoS owns send workflow
- ⚠️  Manual review required before every post
```

### manifest.json (PR #116)

Accurate metadata reflecting **only present files**:

```json
{
  "tool": "family-school-pipeline-pack",
  "version": "1.0.0",
  "date": "2026-09-04",
  "generatedAt": "2026-09-04T12:00:00.000Z",
  "stages": {
    "digest": true,
    "dueQueue": true,
    "calendar": false
  },
  "files": [
    "PACK.md",
    "APPROVAL.md",
    "manifest.json",
    "digest-digest.md",
    "digest-items.json",
    "digest-missing-fields.md",
    "queue-queue.md",
    "queue-queue.json",
    "queue-missing-signals.md"
  ],
  "warnings": []
}
```

## Workflow Integration

This tool is the orchestrator for the Family school morning workflow:

```bash
# Step 1: Copy email subjects from Gmail to subjects.txt
# (Manual step by Grant/Liana)

# Step 2: Run pipeline pack
cd tools/family-school-pipeline-pack
npm run pack -- --subjects subjects.txt --date 2026-09-04

# Step 3: Review outputs
cd out/pack-2026-09-04/
cat PACK.md
cat APPROVAL.md
cat digest-digest.md
cat queue-queue.md

# Step 4: Check for missing signals/fields
cat digest-missing-fields.md
cat queue-missing-signals.md

# Step 5: If all checks pass, Family bot / CoS posts to WhatsApp Admin
```

## Integration with Sibling Tools

### family-school-subject-digest

Classifies and digests email subjects. Provides:
- digest.md (Grant/Liana-facing full sentences)
- items.json (structured data)
- missing-fields.md (items needing clarification)

### family-school-due-queue

Extracts due/deadline signals from subjects or filenames. Provides:
- queue.md (due items in chronological order)
- queue.json (structured data)
- missing-signals.md (items with no date signals)

### family-calendar-ics-digest

Parses .ics calendar exports. Provides:
- digest.md (numbered digest with full sentences)
- events.json (structured event data)
- missing-fields.md (events with incomplete data)

## Tests

```bash
# Run unit tests
npm test

# Run fixture tests (generates sample pipeline packs)
npm run test:fixtures

# Clean generated artifacts
npm run clean
```

Unit tests cover:
- Boolean flag parsing (PR #114 pattern)

Fixture tests generate complete outputs from:
- `fixtures/sample-subjects.txt` - Sample school email subjects

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never opens email bodies** - Only subjects/filenames processed
- ✅ **Never invents data** - Only extracts explicit signals
- ✅ **Never sends** - No WhatsApp API, no Gmail API
- ✅ **Exit codes** - 0 = success, 1 = fail (scriptable)
- ✅ **Full sentences** - Per Family skill tone
- ✅ **AISD vs Family separation** - Maintained by subject-digest
- ⚠️ **Family / CoS owns send** - WhatsApp posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review PACK.md and APPROVAL.md before every post

## Entity Context

- **Lane:** family
- **Target:** WhatsApp Admin - Grant & Liana Private (Family bot sends)
- **Frequency:** Before every school morning digest post
- **Owners:** Grant + Liana (review), Family bot / CoS (send)
- **Approval Gate:** Manual review of pipeline pack outputs before every post

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, APPROVAL.md, digest outputs
3. **Verify sibling auto-build** - Ensure dist/ directories are built automatically
4. **NEVER auto-send** - Manual review required

## Family Smoke Test Path

Quick validation that the tool works end-to-end:

```bash
# 1. Build the tool
cd tools/family-school-pipeline-pack
npm install
npm run build

# 2. Run fixture test
npm run test:fixtures

# 3. Check output exists
ls -la test-out-full/pack-2026-09-04/

# 4. Verify PACK.md has content
cat test-out-full/pack-2026-09-04/PACK.md

# 5. Verify manifest.json lists only present files
cat test-out-full/pack-2026-09-04/manifest.json

# 6. Clean up
npm run clean
```

Expected result: Exit 0, output directory created, all files present.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
