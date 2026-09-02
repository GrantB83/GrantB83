# family-digest-post-checklist

**One-line:** Offline CLI to validate family-morning-digest-pack output before WhatsApp Admin posting with go/no-go checklist.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-digest-post-checklist/`

## Purpose

Generate a pre-WhatsApp post checklist from a `family-morning-digest-pack` output folder before any Admin post. Never sends. Never invents school facts. Provides numbered go/no-go checks for Family / CoS before posting to WhatsApp Admin - Grant & Liana Private.

**No sending. No WhatsApp API. Offline validation only. Family / CoS owns send workflow.**

## Install and Run

```bash
cd tools/family-digest-post-checklist
npm install
npm run build

# Basic usage
npm run check -- --pack path/to/pack-2026-09-02

# With explicit date and output directory
npm run check -- --pack path/to/pack --date 2026-09-02 --outdir reports/

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --pack, -p            Path to pack folder (from family-morning-digest-pack) [REQUIRED]
  --date, -d            Date label (YYYY-MM-DD) [optional, extracted from pack if not provided]
  --outdir, -o          Output directory [default: ./out]
  --help, -h            Show this help message
```

## Behavior

### Input
- `--pack` path to a pack folder produced by family-morning-digest-pack
- Expects PACK.md, school.md, family.md
- Optional calendar.md and school-due-queue.md files

### Checks (heuristic, read-only)
1. Required files present (PACK.md, school.md, family.md)
2. school.md and family.md both exist and are non-empty OR explicitly empty-with-header
3. No obvious duplicate line items between school.md and family.md (simple normalized-line overlap)
4. APPROVAL.md present in pack (or flag missing)
5. Warn if calendar/due sections referenced in PACK.md but files missing

### Outputs
All outputs written to `--outdir`:

- **POST-CHECKLIST.md** — Numbered go/no-go ticks for Family before WhatsApp Admin - Grant & Liana Private
- **ISSUES.md** — Failures/warnings only
- **APPROVAL.md** — Family/CoS owns WhatsApp send; never auto-send; full sentences; Kids School vs Family separation; offline only
- **manifest.json** — Metadata

### Exit Codes
- `0` — All checks passed, pack ready for review
- `1` — Pack path missing, required files absent, or checks failed

## Example Workflow

```bash
# Step 1: Generate morning digest pack
cd tools/family-morning-digest-pack
npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest

# Step 2: Validate pack before posting
cd ../family-digest-post-checklist
npm run check -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

# Step 3: Review outputs
cat out/POST-CHECKLIST.md
cat out/ISSUES.md
cat out/APPROVAL.md

# Step 4: If all checks pass, Family / CoS posts to WhatsApp Admin
```

## Output Files

### POST-CHECKLIST.md

Numbered go/no-go checks with status indicators:

```markdown
# POST-CHECKLIST — Family Digest Pack 2026-09-02

Pre-WhatsApp posting checklist for Family / CoS before WhatsApp Admin - Grant & Liana Private.

## Go/No-Go Checks

1. ✅ Required files present (PACK.md, school.md, family.md)
   - All required files present
2. ✅ Content files are non-empty or empty-with-header
   - Content files are valid (non-empty or empty-with-header)
3. ✅ No duplicate items between school.md and family.md
   - No duplicate items detected
4. ✅ APPROVAL.md present in pack
   - APPROVAL.md present
5. ✅ Calendar/due sections referenced in PACK.md have matching files
   - All referenced files present

## Result: ✅ READY FOR REVIEW

All checks passed. This pack is ready for Family / CoS review before posting.

## Safety Reminders

- Never auto-send to WhatsApp Admin
- Never invent school facts
- Family / CoS owns WhatsApp send workflow
- Manual review required before every post
- Kids School vs Family separation must be maintained
```

### ISSUES.md

Failures and warnings only (empty if all checks passed):

```markdown
# ISSUES — Family Digest Pack 2026-09-02

No issues detected. All checks passed.
```

### APPROVAL.md

Full approval document for Family / CoS review:

```markdown
# APPROVAL — Family Digest Pack 2026-09-02

Family / CoS owns WhatsApp Admin send workflow. Never auto-send.

## Pre-Post Review

Before posting to WhatsApp Admin - Grant & Liana Private:

1. Read POST-CHECKLIST.md and verify all checks passed
2. Review school.md for Kids School accuracy
3. Review family.md for Family Admin accuracy
4. Verify Kids School vs Family separation (no duplicate items)
5. Confirm no invented school facts, due dates, or times
6. Check calendar.md if present (no invented events)
7. Check school-due-queue.md if present (no invented dues)

## Full Sentences Required

All digest items must be in full sentences. Subjects-only format is not acceptable for WhatsApp Admin posting.

## Kids School vs Family Separation

Kids School section includes:
- AISD and campus mail
- Teacher communications
- School forms and permissions
- PTA and volunteer requests
- Bus schedules and school calendars

Family Admin section includes:
- Household bills and finance
- Medical appointments
- Car payments
- Utilities
- General household admin

Each item appears exactly once (no duplicates between sections).

## Offline Only

This checklist tool operates offline. No WhatsApp API, Gmail API, or other network calls.

## Approval Statement

By posting this digest to WhatsApp Admin - Grant & Liana Private, Family / CoS confirms:
- All checks in POST-CHECKLIST.md passed
- Content reviewed for accuracy
- No invented facts
- Kids School vs Family separation maintained
- Manual send workflow followed (no auto-post)
```

### manifest.json

Machine-readable metadata:

```json
{
  "tool": "family-digest-post-checklist",
  "version": "1.0.0",
  "date": "2026-09-02",
  "generatedAt": "2026-09-02T14:30:00.000Z",
  "packPath": "/workspace/tools/family-morning-digest-pack/out/pack-2026-09-02",
  "allPassed": true,
  "checkCount": 5,
  "passCount": 5,
  "failCount": 0,
  "warningCount": 0
}
```

## Integration with family-morning-digest-pack

This tool is designed to run immediately after `family-morning-digest-pack`:

```bash
# Generate pack
cd tools/family-morning-digest-pack
npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest

# Validate pack
cd ../family-digest-post-checklist
npm run check -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

# Review and post (manual)
# ... Family / CoS reviews outputs and posts to WhatsApp Admin ...
```

## Tests

```bash
# Run unit tests
npm test

# Run fixture tests (generates sample outputs)
npm run test:fixtures

# Clean generated artifacts
npm run clean
```

Unit tests cover:
- Required file checks
- Content validation
- Duplicate detection
- Approval file presence
- Referenced file warnings

Fixture tests generate complete outputs from:
- `fixtures/healthy-pack` - Valid pack (should pass)
- `fixtures/missing-school-pack` - Missing school.md (should fail)
- `fixtures/duplicate-item-pack` - Duplicate items (should fail)

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never sends** - No WhatsApp API, no Gmail API
- ✅ **Read-only checks** - Never modifies pack files
- ✅ **No invented data** - Never fabricates school facts or due dates
- ✅ **Heuristic checks** - Simple text matching for duplicate detection
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ⚠️ **Family / CoS owns send** - WhatsApp Admin posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review POST-CHECKLIST.md and APPROVAL.md before every post
- ⚠️ **Kids School vs Family separation** - Must be maintained in source pack

## Entity Context

- **Lane:** family
- **Target:** WhatsApp Admin - Grant & Liana Private (CoS sends)
- **Frequency:** Before every morning digest post
- **Owners:** Grant + Liana (review), Family bot / CoS (send)
- **Approval Gate:** Manual review of checklist outputs before every post

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check POST-CHECKLIST.md and ISSUES.md
3. **Verify duplicate detection** - Test with duplicate-item-pack
4. **NEVER auto-send** - Manual review required

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
