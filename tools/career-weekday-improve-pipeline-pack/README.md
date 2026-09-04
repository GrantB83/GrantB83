# career-weekday-improve-pipeline-pack

**One-line:** Offline CLI pipeline pack assembler combining career-weekday-improve-pack with optional career-live-improve-digest and career-hunt-run-log for Career weekday workflow.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-weekday-improve-pipeline-pack/`

## Purpose

Assemble a complete Career weekday pipeline pack that combines `career-weekday-improve-pack` output with optional `career-live-improve-digest` results and `career-hunt-run-log` append for Career learning.md fold-in. Never invents Grant facts. Never loosens DNC / $180k+ / WFH hard gates. Never auto-applies.

**Offline orchestrator only. No job board APIs. Career owns apply + learning.md fold-in.**

## Install and Run

```bash
cd tools/career-weekday-improve-pipeline-pack
npm install
npm run build

# Option 1: Use existing improve pack (preferred, digest default ON)
npm run pipeline -- --pack ../career-weekday-improve-pack/out/pack-2026-09-02

# Option 2: Use existing improve pack, skip digest
npm run pipeline -- --pack ../career-weekday-improve-pack/out/pack-2026-09-02 --no-run-digest

# Option 3: Generate improve pack first
npm run pipeline -- --run-improve-pack --date 2026-09-02 --log runs.jsonl

# With explicit date and output directory
npm run pipeline -- --pack path/to/pack --date 2026-09-02 --outdir reports/

# Skip digest (multiple syntax options)
npm run pipeline -- --pack path/to/pack --run-digest=false
npm run pipeline -- --pack path/to/pack --run-digest false
npm run pipeline -- --pack path/to/pack --no-run-digest

# Run hunt-log append (default OFF)
npm run pipeline -- --pack path/to/pack --run-hunt-log --log runs.jsonl

# With time filter
npm run pipeline -- --pack path/to/pack --since 2026-08-01

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --pack, -p                  Path to existing career-weekday-improve-pack output [preferred]
  --run-improve-pack          Run career-weekday-improve-pack first
  --run-digest                Run career-live-improve-digest [default: true]
                              Accepts: --run-digest, --run-digest=true/false,
                              --run-digest true/false, --no-run-digest
  --run-hunt-log              Append to career-hunt-run-log [default: false]
                              Accepts: --run-hunt-log, --run-hunt-log=true/false,
                              --run-hunt-log true/false, --no-run-hunt-log
  --date, -d                  Date label (YYYY-MM-DD) [required for --run-improve-pack]
  --outdir, -o                Output directory [default: ./out]
  --help, -h                  Show this help message

IMPROVE PACK / DIGEST OPTIONS:
  --log                       Path to runs.jsonl (from career-hunt-run-log)
  --summary                   Path to runs.md (from career-hunt-run-log)
  --since                     Optional date filter (YYYY-MM-DD) for digest
```

## Behavior

### Input Modes

**Mode 1 (preferred):** Use existing improve pack
- `--pack` path to a pack folder produced by career-weekday-improve-pack
- Validates required files (PACK.md, LEARNING-DRAFT.md, APPROVAL.md)
- Date extracted from pack path or provided via `--date`

**Mode 2:** Generate improve pack first
- `--run-improve-pack` with same inputs improve-pack needs
- Runs career-weekday-improve-pack in temporary directory
- Proceeds to assemble pipeline pack from generated output

### Optional Stages (Flexible Boolean Flags)

**Digest (default ON):**
- `--run-digest` (default true): Run career-live-improve-digest
- Skip with `--no-run-digest` or `--run-digest=false`
- When run, adds DIGEST-LEARNING-DRAFT.md and DIGEST-stats.json to pack

**Hunt Log (default OFF):**
- `--run-hunt-log` (default false): Append to career-hunt-run-log
- Turn on with `--run-hunt-log` or `--run-hunt-log=true`
- Requires `--log` or `--summary` input
- When run, adds HUNT-LOG-runs.jsonl and HUNT-LOG-runs.md to pack

### Pipeline Pack Assembly

Creates `<outdir>/pipeline-pack-YYYY-MM-DD/` with:

- **PACK.md** — Index of improve pack + optional digest + hunt-log status
- **LEARNING-DRAFT.md** — From improve pack (numbered patterns)
- **stats.json** — From improve pack (if present)
- **runs.md** — From improve pack (if present)
- **APPROVAL.md** — Career owns apply; hard gates unchanged; no invented facts
- **DIGEST-LEARNING-DRAFT.md** — From digest (if --run-digest)
- **DIGEST-stats.json** — From digest (if --run-digest)
- **HUNT-LOG-runs.jsonl** — From hunt-log (if --run-hunt-log)
- **HUNT-LOG-runs.md** — From hunt-log (if --run-hunt-log)
- **manifest.json** — Metadata (accurate to present files)

### Exit Codes
- `0` — Pipeline pack created successfully
- `1` — Pack path missing/invalid, improve pack failed, or required tool failed

## Output Files

### PACK.md
Index and status:
```markdown
# Career Weekday Improve Pipeline Pack — 2026-09-02

Assembled pipeline pack combining career improve pack with optional digest and hunt-log.

**Offline only. Never invents scores/employers. Career owns apply + learning.md fold-in.**

## Contents

### Improve Pack Files
- **PACK.md** — From career-weekday-improve-pack
- **LEARNING-DRAFT.md** — From career-weekday-improve-pack
- **stats.json** — From career-weekday-improve-pack (if present)
- **APPROVAL.md** — From career-weekday-improve-pack

### Digest Files (if --run-digest)
- **DIGEST-LEARNING-DRAFT.md** — From career-live-improve-digest
- **DIGEST-stats.json** — From career-live-improve-digest

### Hunt Log Files (if --run-hunt-log)
- **HUNT-LOG-runs.jsonl** — From career-hunt-run-log
- **HUNT-LOG-runs.md** — From career-hunt-run-log

## Pipeline Status

- **Improve Pack:** Assembled from pack-2026-09-02
- **Digest:** ✅ Ran / ⏭️  Skipped
- **Hunt Log:** ✅ Ran / ⏭️  Skipped

## Next Steps

1. Review LEARNING-DRAFT.md for patterns to fold into learning.md
2. Compare DIGEST-LEARNING-DRAFT.md with improve pack insights (if digest ran)
3. Review HUNT-LOG-runs.md for tracking accuracy (if hunt-log ran)
4. Verify no invented scores, employers, or compensation claims
5. Career manually folds insights into learning.md

## Safety Reminders

- **Never auto-update learning.md** — Manual fold-in required
- **Never invent** scores, employers, or compensation
- **Offline only** — No job board APIs or live data
- **Career owns apply** — This pack is learning input only
- **Hard gates unchanged** — $180k+ / DNC list / WFH remain
```

### APPROVAL.md
Safety gates and Career ownership:
```markdown
# Career Weekday Improve Pipeline Pack Approval

## Critical Rules

1. **Career owns apply decisions** - This pipeline is for learning only
2. **Never invents employers** - Only quotes from provided logs
3. **Never invents scores** - Only processes provided scores
4. **Never invents compensation** - No salary/comp claims fabricated
5. **Offline only** - No job board APIs or live data
6. **Never auto-updates learning.md** - Career reviews and folds manually
7. **Hard gates unchanged** - $180k+, DNC list, WFH requirements remain
8. **Never loosens gates** - No relaxation of hard requirements
9. **Never auto-applies** - Career bot owns apply workflow separately

## Review Checklist

- [ ] All companies/titles quoted from provided logs
- [ ] No invented skip reasons or patterns
- [ ] Score bands reflect actual distribution from logs
- [ ] No compensation claims fabricated
- [ ] Hard gates ($180k+, DNC, WFH) unchanged
- [ ] Period filter applied correctly (if --since used)
- [ ] Digest outputs match improve pack inputs
- [ ] Hunt log entries (if ran) are append-only

## Never

- ❌ Auto-apply insights without Career review
- ❌ Invent companies, roles, or scores not in logs
- ❌ Fabricate compensation or gate outcomes
- ❌ Loosen hard gates ($180k+, DNC, WFH)
- ❌ Write directly to learning.md
- ❌ Auto-apply to jobs
- ❌ Invent Grant facts or work history
```

### manifest.json
Machine-readable metadata:
```json
{
  "tool": "career-weekday-improve-pipeline-pack",
  "version": "1.0.0",
  "date": "2026-09-02",
  "generatedAt": "2026-09-02T14:30:00.000Z",
  "packPath": "/workspace/tools/career-weekday-improve-pack/out/pack-2026-09-02",
  "improvePackRan": false,
  "digestRan": true,
  "huntLogRan": false,
  "files": [
    "PACK.md",
    "manifest.json",
    "APPROVAL.md",
    "LEARNING-DRAFT.md",
    "stats.json",
    "DIGEST-LEARNING-DRAFT.md",
    "DIGEST-stats.json"
  ],
  "inputs": {
    "improvePack": "/workspace/tools/career-weekday-improve-pack/out/pack-2026-09-02",
    "since": "2026-08-01"
  }
}
```

## Workflow Integration

This tool is the final assembler in the Career weekday workflow:

```bash
# Step 1: Generate or use existing improve pack
cd tools/career-weekday-improve-pack
npm run pack -- --outdir out/ --run-digest --log runs.jsonl

# Step 2: Assemble pipeline pack with optional stages
cd ../career-weekday-improve-pipeline-pack
npm run pipeline -- --pack ../career-weekday-improve-pack/out/pack-2026-09-02

# Step 3: Review outputs
cat out/pipeline-pack-2026-09-02/PACK.md
cat out/pipeline-pack-2026-09-02/APPROVAL.md
cat out/pipeline-pack-2026-09-02/LEARNING-DRAFT.md
cat out/pipeline-pack-2026-09-02/DIGEST-LEARNING-DRAFT.md

# Step 4: Career manually folds insights into learning.md
```

## Integration with Sibling Tools

### career-weekday-improve-pack

Primary input source. Provides:
- LEARNING-DRAFT.md (numbered patterns)
- stats.json (machine-readable counts)
- runs.md (hunt runs summary, if available)
- APPROVAL.md (approval document)

### career-live-improve-digest

Optional digest layer (default ON). Provides:
- DIGEST-LEARNING-DRAFT.md (patterns from runs.jsonl)
- DIGEST-stats.json (statistics)
- Additional pattern analysis

### career-hunt-run-log

Optional append layer (default OFF). Provides:
- HUNT-LOG-runs.jsonl (append-only log)
- HUNT-LOG-runs.md (summary with counts)
- Tracking for learning analytics

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
- Optional stage file exclusion

Fixture tests generate complete outputs from:
- `fixtures/healthy-improve-pack` - Valid improve pack (should pass)

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never auto-applies** - Career bot owns apply workflow
- ✅ **Never auto-updates learning.md** - Manual fold-in required
- ✅ **Read-only assembly** - Never modifies source pack files
- ✅ **No invented data** - Never fabricates scores, employers, or compensation
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ✅ **Hard gates unchanged** - $180k+, DNC list, WFH requirements remain
- ✅ **Flexible boolean flags** - PR #114 style for optional stages
- ✅ **Accurate manifest** - PR #116 pattern excludes optional files when skipped
- ⚠️ **Career owns apply** - Apply decisions separate from learning workflow
- ⚠️ **Manual review required** - Review PACK.md and APPROVAL.md before fold-in

## Entity Context

- **Lane:** career
- **Target:** learning.md (Career bot review and fold-in)
- **Frequency:** After weekday improve runs
- **Owners:** Career bot (fold-in), CoS (orchestration)
- **Approval Gate:** Manual review of pipeline pack outputs before learning.md update

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check PACK.md, APPROVAL.md, LEARNING-DRAFT.md
3. **Verify optional stage behavior** - Test --run-digest and --run-hunt-log flags
4. **NEVER auto-update learning.md** - Manual review required
5. **NEVER auto-apply** - Career bot owns separate apply workflow

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
