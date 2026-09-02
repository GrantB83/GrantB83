# career-weekday-improve-pack

Offline CLI tool to orchestrate career-hunt-run-log outputs into career-live-improve-digest results for folding into learning.md.

## Purpose

Career / CoS get one weekday pack that assembles career-hunt-run-log outputs (runs.jsonl, runs.md) and career-live-improve-digest results (LEARNING-DRAFT.md, stats.json) into a single review pack. Never invents scores or employers. Never auto-updates learning.md. Career owns apply + fold-in.

## Owning Desk(s)

Career / CoS

## Features

- ✅ **Orchestrator** - Assembles digest outputs or runs career-live-improve-digest
- ✅ **Offline only** - No job board APIs or network calls
- ✅ **Never invents data** - Only packages existing outputs
- ✅ **Exit 1 on missing inputs** - Validation failures are fatal
- ✅ **Career owns apply** - Never auto-updates learning.md
- ✅ **Facts-only tracking** - All data from provided inputs
- ✅ **Optional time filter** - `--since YYYY-MM-DD` passes through to digest

## Install and Run

```bash
cd tools/career-weekday-improve-pack
npm install
npm run build

# Mode 1: Use prebuilt digest
npm run pack -- --outdir pack-out/ --digest-outdir ../career-live-improve-digest/out/

# Mode 2: Run digest tool during pack
npm run pack -- --outdir pack-out/ --run-digest --log runs.jsonl

# With time filter
npm run pack -- --outdir pack-out/ --run-digest --log runs.jsonl --since 2026-08-01

# With summary instead of log
npm run pack -- --outdir pack-out/ --run-digest --summary runs.md

# Test with fixtures
npm run test:fixtures
```

## Input Modes

### Mode 1: Prebuilt Digest (Recommended)

Use when you've already run `career-live-improve-digest`:

```bash
# Step 1: Generate digest
cd tools/career-live-improve-digest
npm run digest -- --log runs.jsonl --outdir digest-out/

# Step 2: Assemble pack
cd ../career-weekday-improve-pack
npm run pack -- --outdir pack-out/ --digest-outdir ../career-live-improve-digest/digest-out/
```

### Mode 2: Run Digest During Pack

Let the pack tool run `career-live-improve-digest` for you:

```bash
npm run pack -- --outdir pack-out/ --run-digest --log runs.jsonl
```

## CLI Options

| Option | Required | Description |
|--------|----------|-------------|
| `--outdir` | ✅ Yes | Output directory for pack |
| `--digest-outdir` | Conditional | Path to prebuilt digest output (required if not --run-digest) |
| `--run-digest` | Conditional | Run career-live-improve-digest (requires --log or --summary) |
| `--log` | No | Path to runs.jsonl (from career-hunt-run-log) |
| `--summary` | No | Path to runs.md (from career-hunt-run-log) |
| `--since` | No | Optional date filter (YYYY-MM-DD) passed to digest |
| `--help, -h` | No | Show help message |

## Output Structure

Generates a weekday pack folder with:

```
pack-out/
├── PACK.md              # Index with counts and summary (no invented employers)
├── LEARNING-DRAFT.md    # Copy from digest (numbered patterns)
├── stats.json           # Copy from digest (machine-readable)
├── runs.md              # Hunt runs summary (if available)
├── APPROVAL.md          # Safety gates and Career ownership
└── manifest.json        # Tool metadata
```

### PACK.md

Pack index with:
- Overview and generation timestamp
- Period info (if --since used)
- Summary counts (entries, scored, applied, skipped, rejected)
- Score distribution (if available)
- Pack contents list
- Next steps checklist
- Safety notes

### LEARNING-DRAFT.md

Copied from digest output:
- Numbered skip patterns with counts
- Score band distribution
- Gate fail patterns
- Source distribution
- Notes for learning.md fold-in

### stats.json

Copied from digest output:
- Machine-readable statistics
- Period info
- Totals by action
- Score bands
- Gate fails
- Skip reasons
- Source distribution

### APPROVAL.md

Safety gates and ownership:
- **Career owns apply decisions** - Pack is learning input only
- **Never invents employers** - Only quotes from logs
- **Never auto-updates learning.md** - Manual fold-in required
- Review checklist
- Next steps
- Never list (auto-apply, invent data, etc.)

### manifest.json

Machine-readable metadata:
- Tool version and timestamp
- Input paths (log, summary, digestOutdir)
- Run options (runDigest, since)
- Output file list
- Checks (which files are present)

## Behavior

1. **Validate inputs**:
   - Exit 1 if --outdir missing
   - Exit 1 if neither --digest-outdir nor --run-digest provided
   - Exit 1 if both --digest-outdir and --run-digest provided
   - Exit 1 if --run-digest without --log or --summary

2. **Resolve digest outputs**:
   - If --run-digest: shell out to `career-live-improve-digest` via npm run
   - If --digest-outdir: use prebuilt digest output directory
   - Exit 1 if digest output not found

3. **Copy digest outputs**:
   - Copy LEARNING-DRAFT.md (warn if missing)
   - Copy stats.json (warn if missing)

4. **Copy runs.md**:
   - If --summary provided and exists: copy it
   - If --log provided: look for runs.md in same directory
   - Warn if not found (non-fatal)

5. **Generate pack files**:
   - PACK.md with index, counts, and summary
   - APPROVAL.md with safety gates
   - manifest.json with metadata

6. **Exit codes**:
   - 0 = success (warnings are non-fatal)
   - 1 = fatal error (missing required inputs, digest tool failed)

## Integration with Career Tools

This tool works with other Career / CoS tools:

```bash
# Full workflow
cd tools

# Step 1: Log a hunt run
cd career-hunt-run-log
npm run log -- --run run-2026-09-02.json --outdir hunt-log/

# Step 2: Generate digest
cd ../career-live-improve-digest
npm run digest -- --log ../career-hunt-run-log/hunt-log/runs.jsonl --outdir digest-out/

# Step 3: Assemble weekday pack
cd ../career-weekday-improve-pack
npm run pack -- --outdir pack-out/ --digest-outdir ../career-live-improve-digest/digest-out/

# Step 4: Review pack
cat pack-out/PACK.md
cat pack-out/LEARNING-DRAFT.md
```

Or use the orchestrator mode:

```bash
# One-step pack (runs digest automatically)
cd tools/career-weekday-improve-pack
npm run pack -- \\
  --outdir pack-out/ \\
  --run-digest \\
  --log ../career-hunt-run-log/hunt-log/runs.jsonl \\
  --since 2026-08-01
```

## Critical Safety Notes

- ✅ **Offline only** - No job board APIs or network calls
- ✅ **Never invents scores** - Only quotes from digest
- ✅ **Never invents employers** - Only quotes from logs
- ✅ **Career owns apply** - This tool does not apply to jobs
- ✅ **Facts-only tracking** - All data from provided inputs
- ✅ **Never auto-updates learning.md** - Manual fold-in required
- ✅ **Exit 1 on bad input** - Validation failures are fatal
- ⚠️ **Review APPROVAL.md** - Before folding into learning.md

## Use Cases

1. **Weekly review** - Assemble week's hunt activity for learning review
2. **Pattern identification** - Identify skip/reject patterns for process improvement
3. **Learning fold-in** - Package digest for Career to review and fold into learning.md
4. **Hunt retrospectives** - Review scoring trends and decision patterns

## Exit Codes

- **0** - Success (warnings are non-fatal)
- **1** - Fatal error (missing inputs, digest tool failed, etc.)

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test with fixtures
npm run test:fixtures

# Clean build artifacts
npm run clean
```

## Testing

### Fixture Tests

```bash
npm run test:fixtures
```

Tests:
1. Prebuilt digest mode (fixtures/digest-out exists)
2. Pack assembly with LEARNING-DRAFT.md and stats.json
3. PACK.md generation with counts
4. APPROVAL.md and manifest.json generation

## Fixtures

Test fixtures are provided in `fixtures/`:

- `digest-out/` - Sample digest output directory
  - `LEARNING-DRAFT.md` - Sample numbered patterns
  - `stats.json` - Sample statistics
  - `APPROVAL.md` - Digest approval file

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
