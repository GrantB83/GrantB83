# family-morning-digest-pipeline-pack

**One-line:** Offline CLI pipeline pack assembler combining family-morning-digest-pack and family-digest-post-checklist for Family / CoS morning workflow.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-morning-digest-pipeline-pack/`

## Purpose

Assemble a complete pipeline pack that combines `family-morning-digest-pack` output with `family-digest-post-checklist` validation before WhatsApp Admin handoff. Never sends. Never invents school facts. Kids School vs Family separation preserved.

**No sending. No WhatsApp API. Offline validation only. Family / CoS owns send workflow.**

## Install and Run

```bash
cd tools/family-morning-digest-pipeline-pack
npm install
npm run build

# Option 1: Use existing morning pack (preferred)
npm run pipeline -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

# Option 2: Generate morning pack first
npm run pipeline -- --run-morning-pack --date 2026-09-02 --subjects subjects.txt --run-subject-digest

# With explicit date and output directory
npm run pipeline -- --pack path/to/pack --date 2026-09-02 --outdir reports/

# Skip post-checklist (not recommended)
npm run pipeline -- --pack path/to/pack --run-post-checklist=false

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --pack, -p                  Path to existing family-morning-digest-pack output [preferred]
  --run-morning-pack          Run family-morning-digest-pack first
  --run-post-checklist        Run family-digest-post-checklist [default: true]
  --date, -d                  Date label (YYYY-MM-DD) [required for --run-morning-pack]
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

MORNING PACK OPTIONS (when --run-morning-pack is used):
  --subjects, -s              Path to subjects file
  --ics                       Path to .ics calendar file
  --timezone                  Timezone for calendar digest [default: America/Chicago]
  --run-subject-digest        Shell out to family-school-subject-digest
  --run-ics-digest            Shell out to family-calendar-ics-digest
  --school-due-subjects       Path to school subjects file for due queue
  --school-due-files          Path to school filenames file for due queue
  --run-school-due            Shell out to family-school-due-queue
```

## Behavior

### Input Modes

**Mode 1 (preferred):** Use existing morning pack
- `--pack` path to a pack folder produced by family-morning-digest-pack
- Validates required files (PACK.md, school.md, family.md, APPROVAL.md)
- Date extracted from pack path or provided via `--date`

**Mode 2:** Generate morning pack first
- `--run-morning-pack` with same inputs morning-digest-pack needs
- Runs family-morning-digest-pack in temporary directory
- Proceeds to assemble pipeline pack from generated output

### Pipeline Pack Assembly

Creates `<outdir>/pipeline-pack-YYYY-MM-DD/` with:

- **PACK.md** — Index of morning pack + post-checklist status (no invented facts)
- **school.md** — From morning pack (Kids School items)
- **family.md** — From morning pack (Family Admin items)
- **calendar.md** — From morning pack (if present)
- **school-due-queue.md** — From morning pack (if present)
- **APPROVAL.md** — From morning pack (Family/CoS owns WhatsApp; never auto-send)
- **POST-CHECKLIST.md** — From post-checklist (if run)
- **ISSUES.md** — From post-checklist (if run)
- **manifest.json** — Metadata

### Post-Checklist Integration

When `--run-post-checklist` is true (default):
1. Shells out to `../family-digest-post-checklist`
2. Runs validation checks on morning pack
3. Copies POST-CHECKLIST.md and ISSUES.md to pipeline pack
4. Updates PACK.md with check status

### Exit Codes
- `0` — Pipeline pack created successfully, all checks passed
- `1` — Pack path missing/invalid, morning pack failed, or checklist failed

## Output Files

### PACK.md
Index and status:
```markdown
# Family Morning Digest Pipeline Pack — 2026-09-02

Assembled pipeline pack combining morning digest and post-checklist validation.

**Never sends. Never invents school facts. Kids School vs Family separation preserved.**

## Contents

### Morning Digest Files
- **school.md** — From morning digest pack
- **family.md** — From morning digest pack
- **calendar.md** — From morning digest pack
- **APPROVAL.md** — From morning digest pack

### Post-Checklist Files
- **POST-CHECKLIST.md** — Pre-WhatsApp validation
- **ISSUES.md** — Pre-WhatsApp validation

## Post-Checklist Status

✅ **All checks PASSED**

## Next Steps

1. Review POST-CHECKLIST.md for go/no-go status
2. Check ISSUES.md for any failures or warnings
3. Review school.md and family.md for accuracy
4. Verify Kids School vs Family separation
5. Confirm no invented school facts or due dates
6. Family / CoS posts to WhatsApp Admin - Grant & Liana Private

## Safety Reminders

- **Never auto-send** to WhatsApp Admin
- **Never invent** school facts, due dates, or times
- **Offline only** — No WhatsApp API, Gmail API, or network calls
- **Family / CoS owns send** workflow
- **Manual review required** before every post
- **Kids School vs Family separation** must be maintained
```

### manifest.json
Machine-readable metadata:
```json
{
  "tool": "family-morning-digest-pipeline-pack",
  "version": "1.0.0",
  "date": "2026-09-02",
  "generatedAt": "2026-09-02T14:30:00.000Z",
  "packPath": "/workspace/tools/family-morning-digest-pack/out/pack-2026-09-02",
  "morningPackRan": false,
  "postChecklistRan": true,
  "allChecksPassed": true,
  "checkCount": 5,
  "passCount": 5,
  "failCount": 0,
  "warningCount": 0,
  "files": [
    "PACK.md",
    "manifest.json",
    "school.md",
    "family.md",
    "calendar.md",
    "calendar-events.json",
    "school-due-queue.md",
    "APPROVAL.md",
    "POST-CHECKLIST.md",
    "ISSUES.md"
  ]
}
```

## Workflow Integration

This tool is the final assembler in the Family morning workflow:

```bash
# Step 1: Generate morning pack (or use existing)
cd tools/family-morning-digest-pack
npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest

# Step 2: Assemble pipeline pack with validation
cd ../family-morning-digest-pipeline-pack
npm run pipeline -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

# Step 3: Review outputs
cat out/pipeline-pack-2026-09-02/PACK.md
cat out/pipeline-pack-2026-09-02/POST-CHECKLIST.md
cat out/pipeline-pack-2026-09-02/ISSUES.md

# Step 4: If all checks pass, Family / CoS posts to WhatsApp Admin
```

## Integration with Sibling Tools

### family-morning-digest-pack

Primary input source. Provides:
- school.md (Kids School items)
- family.md (Family Admin items)
- calendar.md (calendar events, if present)
- school-due-queue.md (school due queue, if present)
- APPROVAL.md (approval document)

### family-digest-post-checklist

Validation layer. Provides:
- POST-CHECKLIST.md (go/no-go checks)
- ISSUES.md (failures and warnings)
- Validation of Kids School vs Family separation
- Detection of duplicate items
- File presence checks

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
- Pack path validation
- Required file checks
- Pipeline pack assembly
- Manifest generation
- Post-checklist integration

Fixture tests generate complete outputs from:
- `fixtures/healthy-morning-pack` - Valid morning pack (should pass)
- `fixtures/missing-pack-fail` - Missing pack (should fail)

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never sends** - No WhatsApp API, no Gmail API
- ✅ **Read-only assembly** - Never modifies source pack files
- ✅ **No invented data** - Never fabricates school facts or due dates
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ✅ **Full sentences** - Per Family skill tone
- ✅ **Kids School vs Family separation** - Validated by post-checklist
- ⚠️ **Family / CoS owns send** - WhatsApp Admin posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review PACK.md, POST-CHECKLIST.md, and ISSUES.md before every post

## Entity Context

- **Lane:** family
- **Target:** WhatsApp Admin - Grant & Liana Private (CoS sends)
- **Frequency:** Before every morning digest post
- **Owners:** Grant + Liana (review), Family bot / CoS (send)
- **Approval Gate:** Manual review of pipeline pack outputs before every post

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, POST-CHECKLIST.md, ISSUES.md
3. **Verify post-checklist integration** - Ensure checks run automatically
4. **NEVER auto-send** - Manual review required

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
