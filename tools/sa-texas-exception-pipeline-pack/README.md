# sa-texas-exception-pipeline-pack

**One-line:** Offline CLI pipeline pack assembler combining sa-texas-morning-exception-pack and sa-texas-exception-post-checklist for SA Ops / CoS weekday Texas-morning workflow.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/sa-texas-exception-pipeline-pack/`

## Purpose

Assemble a complete pipeline pack that combines `sa-texas-morning-exception-pack` output with `sa-texas-exception-post-checklist` validation before WhatsApp Admin handoff. Never sends. Never invents Heavy Metal rates/volumes or Browns guest facts. Perfect Water excluded.

**No sending. No WhatsApp API. Offline validation only. CoS / SA Ops owns send workflow.**

## Install and Run

```bash
cd tools/sa-texas-exception-pipeline-pack
npm install
npm run build

# Option 1: Use existing morning exception pack (preferred)
npm run pipeline -- --pack ../sa-texas-morning-exception-pack/out/pack-2026-09-02

# Option 2: Generate morning exception pack first
npm run pipeline -- --run-morning-pack --date 2026-09-02 \
  --browns-bookings bookings.json \
  --hm-quotes-dir ./hm-open/ \
  --notes notes.md

# With explicit date and output directory
npm run pipeline -- --pack path/to/pack --date 2026-09-02 --outdir reports/

# Skip post-checklist (multiple syntax options - PR #114)
npm run pipeline -- --pack path/to/pack --run-post-checklist=false
npm run pipeline -- --pack path/to/pack --run-post-checklist false
npm run pipeline -- --pack path/to/pack --no-run-post-checklist

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --pack, -p                  Path to existing sa-texas-morning-exception-pack output [preferred]
  --run-morning-pack          Run sa-texas-morning-exception-pack first
  --run-post-checklist        Run sa-texas-exception-post-checklist [default: true]
                              Accepts: --run-post-checklist, --run-post-checklist=true/false,
                              --run-post-checklist true/false, --no-run-post-checklist
  --date, -d                  Date label (YYYY-MM-DD) [required for --run-morning-pack]
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

MORNING PACK OPTIONS (when --run-morning-pack is used):
  --browns-bookings           Path to Browns bookings JSON file
  --hm-quotes-dir             Path to Heavy Metal open quotes directory
  --notes                     Path to exception notes markdown file
```

## Behavior

### Input Modes

**Mode 1 (preferred):** Use existing morning exception pack
- `--pack` path to a pack folder produced by sa-texas-morning-exception-pack
- Validates required files (PACK.md, hospitality.md, heavy-metal.md, APPROVAL.md)
- Date extracted from pack path or provided via `--date`

**Mode 2:** Generate morning exception pack first
- `--run-morning-pack` with same inputs morning-exception-pack needs
- Runs sa-texas-morning-exception-pack in temporary directory
- Proceeds to assemble pipeline pack from generated output

### Pipeline Pack Assembly

Creates `<outdir>/pipeline-pack-YYYY-MM-DD/` with:

- **PACK.md** — Index of morning exception pack + post-checklist status
- **hospitality.md** — From morning exception pack (The Browns exceptions)
- **heavy-metal.md** — From morning exception pack (HM open quotes)
- **APPROVAL.md** — From morning exception pack (CoS / SA Ops owns WhatsApp; never auto-send)
- **POST-CHECKLIST.md** — From post-checklist (if run)
- **ISSUES.md** — From post-checklist (if run)
- **manifest.json** — Metadata

### Post-Checklist Integration

When `--run-post-checklist` is true (default):
1. Shells out to `../sa-texas-exception-post-checklist`
2. Runs validation checks on morning exception pack
3. Copies POST-CHECKLIST.md and ISSUES.md to pipeline pack
4. Updates PACK.md with check status

### Exit Codes
- `0` — Pipeline pack created successfully, all checks passed
- `1` — Pack path missing/invalid, morning pack failed, or checklist failed

## Output Files

### PACK.md
Index and status:
```markdown
# SA Texas Exception Pipeline Pack — 2026-09-02

Assembled pipeline pack combining Texas-morning exception digest and post-checklist validation.

**Never sends. Never invents rates, volumes, or guest facts. Heavy Metal + hospitality only. Perfect Water excluded.**

## Contents

### Morning Exception Pack Files
- **hospitality.md** — From morning exception pack
- **heavy-metal.md** — From morning exception pack
- **APPROVAL.md** — From morning exception pack

### Post-Checklist Files
- **POST-CHECKLIST.md** — Pre-WhatsApp validation
- **ISSUES.md** — Pre-WhatsApp validation

## Post-Checklist Status

✅ **All checks PASSED**

## Next Steps

1. Review POST-CHECKLIST.md for go/no-go status (if present)
2. Check ISSUES.md for any failures or warnings (if present)
3. Review hospitality.md and heavy-metal.md for accuracy
4. Confirm no invented rates, volumes, or guest facts
5. Verify Heavy Metal + hospitality only (Perfect Water excluded)
6. CoS / SA Ops posts to WhatsApp Admin

## Safety Reminders

- **Never auto-send** to WhatsApp
- **Never invent** Heavy Metal rates, volumes, or Browns guest facts
- **Offline only** — No WhatsApp API, Gmail API, or network calls
- **CoS / SA Ops owns send** workflow
- **Manual review required** before every post
- **Perfect Water excluded** from scope
- **Heavy Metal + hospitality only** — USA hours
```

### manifest.json
Machine-readable metadata (PR #116 pattern - accurate file list):
```json
{
  "tool": "sa-texas-exception-pipeline-pack",
  "version": "1.0.0",
  "date": "2026-09-02",
  "generatedAt": "2026-09-02T14:30:00.000Z",
  "packPath": "/workspace/tools/sa-texas-morning-exception-pack/out/pack-2026-09-02",
  "morningPackRan": false,
  "postChecklistRan": true,
  "allChecksPassed": true,
  "checkCount": 4,
  "passCount": 4,
  "failCount": 0,
  "warningCount": 0,
  "files": [
    "PACK.md",
    "manifest.json",
    "hospitality.md",
    "heavy-metal.md",
    "APPROVAL.md",
    "POST-CHECKLIST.md",
    "ISSUES.md"
  ]
}
```

**Important:** When `--run-post-checklist` is false or skipped, `POST-CHECKLIST.md` and `ISSUES.md` are **not** listed in `manifest.json` files array (PR #116 accuracy pattern).

## Workflow Integration

This tool is the final assembler in the SA Texas-morning exception workflow:

```bash
# Step 1: Generate morning exception pack (or use existing)
cd tools/sa-texas-morning-exception-pack
npm run pack -- --date 2026-09-02 \
  --browns-bookings bookings.json \
  --hm-quotes-dir ./hm-open/ \
  --notes notes.md

# Step 2: Assemble pipeline pack with validation
cd ../sa-texas-exception-pipeline-pack
npm run pipeline -- --pack ../sa-texas-morning-exception-pack/out/pack-2026-09-02

# Step 3: Review outputs
cat out/pipeline-pack-2026-09-02/PACK.md
cat out/pipeline-pack-2026-09-02/POST-CHECKLIST.md
cat out/pipeline-pack-2026-09-02/ISSUES.md

# Step 4: If all checks pass, CoS / SA Ops posts to WhatsApp Admin
```

## Integration with Sibling Tools

### sa-texas-morning-exception-pack

Primary input source. Provides:
- hospitality.md (The Browns exceptional bookings)
- heavy-metal.md (HM open quotes, filenames only)
- APPROVAL.md (approval document)

### sa-texas-exception-post-checklist

Validation layer. Provides:
- POST-CHECKLIST.md (go/no-go checks)
- ISSUES.md (failures and warnings)
- Validation of hospitality and heavy-metal sections
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
- Manifest generation (PR #116 pattern)
- Post-checklist integration

Fixture tests generate complete outputs from:
- `fixtures/healthy-pack` - Valid morning exception pack (should pass)

## Boolean Flag Patterns (PR #114)

The tool supports flexible boolean parsing for `--run-post-checklist`:

```bash
# Enable (explicit)
--run-post-checklist
--run-post-checklist=true
--run-post-checklist=1
--run-post-checklist=yes
--run-post-checklist true
--run-post-checklist 1
--run-post-checklist yes

# Disable (explicit)
--run-post-checklist=false
--run-post-checklist=0
--run-post-checklist=no
--run-post-checklist false
--run-post-checklist 0
--run-post-checklist no
--no-run-post-checklist
```

## Manifest Accuracy (PR #116)

When post-checklist is skipped (`--no-run-post-checklist`), the manifest accurately reflects files present:

```json
{
  "postChecklistRan": false,
  "files": [
    "PACK.md",
    "manifest.json",
    "hospitality.md",
    "heavy-metal.md",
    "APPROVAL.md"
  ]
}
```

**No POST-CHECKLIST.md or ISSUES.md** listed when post-checklist was not run.

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never sends** - No WhatsApp API, no Gmail API
- ✅ **Read-only assembly** - Never modifies source pack files
- ✅ **No invented data** - Never fabricates rates, volumes, or guest facts
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ✅ **Heavy Metal + hospitality only** - Perfect Water excluded
- ✅ **USA hours** - America/Chicago timezone workflow context
- ✅ **Accurate manifest** - Only lists files actually present (PR #116 pattern)
- ⚠️ **CoS / SA Ops owns send** - WhatsApp Admin posting via CoS workflow
- ⚠️ **Manual review required** - Review PACK.md, POST-CHECKLIST.md, and ISSUES.md before every post

## Entity Context

- **Lanes:** heavy-metal, hospitality (The Browns only)
- **Excluded:** perfect-water (separate Perfect Water bot)
- **Timezone:** America/Chicago (Texas morning workflow context)
- **Target desk:** SA Ops / CoS
- **Approval Gate:** Manual review of pipeline pack outputs before every post

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, POST-CHECKLIST.md, ISSUES.md
3. **Verify post-checklist integration** - Ensure checks run automatically
4. **NEVER auto-send** - Manual review required

## Scope Boundaries

### In Scope
- Heavy Metal Sand & Stone: open quotes (filename validation only)
- The Browns: exceptional bookings validation
- Pack structure validation
- Pre-WhatsApp post go/no-go checklist

### Out of Scope
- Perfect Water operations (separate bot/workflow)
- Automated WhatsApp sending (CoS manual workflow only)
- Inventing rates, volumes, or guest facts (source data only)
- Network operations or API calls (offline only)

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
