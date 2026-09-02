# browns-ct-pack-pipeline-pack

**One-line:** Offline CLI orchestrator for Browns CT pack pipeline: booking-change-check → ct-pack-assemble → optional ct-pack-post-checklist.

**Owning desk(s):** CoS / SA Ops

**Location:** `tools/browns-ct-pack-pipeline-pack/`

## Purpose

CoS runs Browns CT (America/Chicago timezone) timed packs for same-day operations at The Browns Dullstroom. This orchestrator combines outputs from multiple Browns CT tools into one dated pipeline pack folder ready for WhatsApp Admin posting.

**CT = America/Chicago timezone** for timed operations:
- **20:00 CT**: Same-day morning guest drafts (welcome messages)
- **09:00 CT**: After-hours check-ins review
- **21:00 CT**: Staff ops brief for team WhatsApp

This tool orchestrates:
1. **browns-booking-change-check** (optional) - Diff booking snapshots
2. **browns-ct-pack-assemble** (required) - Assemble CT pack from tool outputs
3. **browns-ct-pack-post-checklist** (optional, default ON) - Generate pre-WhatsApp post checklist

**NEVER auto-send.** Drafts only for CoS approval.

## Features

- 🎯 **Pipeline orchestration** - Wires booking-change-check → ct-pack-assemble → post-checklist
- 📦 **Prebuilt inputs preferred** - Accept existing pack output or bookings JSON
- 🔧 **Optional stages** - Run change-check (off by default), post-checklist (on by default)
- ⏰ **Timed workflow** - PACK.md includes 20:00 / 09:00 / 21:00 CT workflow
- ✅ **Flexible boolean parsing** - `--run-post-checklist=false`, `--no-run-post-checklist`, etc.
- 📋 **Accurate manifest** - When post-checklist skipped, POST-CHECKLIST.md / ISSUES.md not listed
- 🚀 **Zero dependencies** - Pure TypeScript
- 🔒 **Offline & safe** - No WhatsApp send, no invented data, draft-only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- Sibling tools (if using `--run-*` flags or `--bookings`):
  - `tools/browns-booking-change-check/`
  - `tools/browns-ct-pack-assemble/`
  - `tools/browns-ct-pack-post-checklist/`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-ct-pack-pipeline-pack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## Usage

### Basic Command

```bash
npm run pipeline -- --date YYYY-MM-DD --outdir <dir> [options]
```

### Examples

**Use existing pack, skip post-checklist:**
```bash
npm run pipeline -- \
  --date 2026-09-20 \
  --pack ../browns-ct-pack-assemble/out/ct-2026-09-20 \
  --outdir pipeline-out/ \
  --no-run-post-checklist
```

**Full pipeline with change-check and post-checklist:**
```bash
npm run pipeline -- \
  --date 2026-09-20 \
  --bookings bookings.json \
  --before before.json \
  --after after.json \
  --run-change-check \
  --outdir pipeline-out/
```

**Default (post-checklist runs):**
```bash
npm run pipeline -- \
  --date 2026-09-20 \
  --bookings bookings.json \
  --outdir pipeline-out/
```

**Disable post-checklist (multiple formats):**
```bash
# All equivalent:
--no-run-post-checklist
--run-post-checklist=false
--run-post-checklist false
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--date` | ✅ Yes | Target date (YYYY-MM-DD format) | - |
| `--outdir` | ✅ Yes | Output directory for pipeline pack | - |
| `--bookings` | Conditional | Path to bookings.json file | - |
| `--pack` | Conditional | Path to existing ct-pack-assemble output | - |
| `--change-check` | No | Path to existing change-check output | - |
| `--before` | No | Path to before.json (for change-check) | - |
| `--after` | No | Path to after.json (for change-check) | - |
| `--run-change-check` | No | Run browns-booking-change-check | false |
| `--run-post-checklist` | No | Run ct-pack-post-checklist | true |
| `--run-post-checklist=false` | No | Disable post-checklist | - |
| `--no-run-post-checklist` | No | Disable post-checklist | - |
| `--help`, `-h` | No | Show help message | - |

**Note:** Either `--pack` or `--bookings` is required. If `--run-change-check` is used, `--before` and `--after` are required.

## Pipeline Stages

### Stage 1: Booking Change Check (Optional)

**Trigger:** `--run-change-check` flag

**Requires:** `--before` and `--after` paths

**Purpose:** Detect booking changes between before/after snapshots

**Tool:** `browns-booking-change-check`

**Output:** `changes.md` (booking change report)

### Stage 2: CT Pack Assemble (Required)

**Options:**
- **Use existing pack:** `--pack <dir>` (fastest)
- **Run assemble:** Provide `--bookings` (tool invoked automatically)

**Purpose:** Assemble CT pack from bookings and tool outputs

**Tool:** `browns-ct-pack-assemble`

**Outputs:**
- `PACK.md` - Pack index with timed checklist
- `APPROVAL.md` - Approval gates
- `changes.md` - Booking changes (if provided)
- `daily-ops.md` - Daily operations brief
- `guest-*.md` - Guest communication drafts
- `welcome-*.md` - Welcome message drafts
- `queue.md` - Late check-in queue
- `manifest.json` - Pack metadata

### Stage 3: Post-Checklist (Optional, Default ON)

**Trigger:** Runs by default unless disabled with `--no-run-post-checklist`

**Purpose:** Generate pre-WhatsApp post checklist for CoS review

**Tool:** `browns-ct-pack-post-checklist`

**Outputs:**
- `POST-CHECKLIST.md` - Go/no-go checklist
- `ISSUES.md` - Validation warnings
- `APPROVAL.md` - Post-checklist approval gates

**Important:** When post-checklist is skipped, `POST-CHECKLIST.md` and `ISSUES.md` are **not** listed in `manifest.json` files array (accuracy fix matching PR #116 pattern).

## Output Files

The CLI generates outputs in the specified directory:

### 1. `PACK.md` - Pipeline Pack Index

**Primary deliverable:** Pipeline index with workflow summary

**Contents:**
- Date and generation timestamp
- Pipeline summary (which stages ran)
- Pack contents listing
- Warnings (if any)
- Next steps checklist
- Safety reminders

### 2. `CT-PACK.md` - CT Pack Index

Copied from `browns-ct-pack-assemble` output (renamed from `PACK.md`)

**Contents:**
- Timed checklist (20:00 / 09:00 / 21:00 CT)
- Pack contents table
- Sources and flags summary

### 3. `CT-PACK-APPROVAL.md` - CT Pack Approval

Copied from `browns-ct-pack-assemble` output (renamed from `APPROVAL.md`)

**Contents:**
- Hard gates
- Timed send checklist
- Approval phrase template

### 4. `POST-CHECKLIST.md` (if post-checklist ran)

Copied from `browns-ct-pack-post-checklist` output

**Contents:**
- Numbered go/no-go items
- Pack validation results
- CoS workflow reminder

### 5. `ISSUES.md` (if post-checklist ran)

Copied from `browns-ct-pack-post-checklist` output

**Contents:**
- Failures and warnings only
- Empty if all checks pass

### 6. `APPROVAL.md` (if post-checklist ran)

Copied from `browns-ct-pack-post-checklist` output

**Contents:**
- CoS owns WhatsApp
- Grant approval required
- Never auto-send
- Never invent data

### 7. `changes.md` (if change-check ran or provided)

Booking change report from `browns-booking-change-check`

### 8. `daily-ops.md` (if present in pack)

Daily operations brief for team WhatsApp

### 9. `guest-*.md` and `welcome-*.md` (if present in pack)

Guest communication drafts and welcome messages

### 10. `queue.md` and `unknown-time.md` (if present in pack)

Late check-in coordination queue files

### 11. `manifest.json` - Pipeline Metadata

**Machine-readable pipeline inventory**

**Schema:**
```json
{
  "tool": "browns-ct-pack-pipeline-pack",
  "version": "1.0.0",
  "timestamp": "2026-09-20T14:30:00.000Z",
  "date": "2026-09-20",
  "inputs": {
    "bookingsPath": "bookings.json",
    "changeCheckPath": null,
    "packPath": null,
    "beforePath": "before.json",
    "afterPath": "after.json"
  },
  "runOptions": {
    "ranChangeCheck": false,
    "ranAssemble": true,
    "ranPostChecklist": true
  },
  "files": [
    {
      "filename": "PACK.md",
      "type": "index",
      "description": "Pipeline pack index with workflow summary"
    }
  ]
}
```

**Important:** When `ranPostChecklist: false`, the `files` array does **not** include `POST-CHECKLIST.md` or `ISSUES.md` entries (accuracy fix).

## Workflow: CoS CT Pack Daily Routine

### Recommended Flow

**Option A: Prebuilt pack (most reliable)**

1. **Morning prep (before 20:00 CT)**
   - Run `browns-ct-pack-assemble` separately → verify output
   - Export before/after booking states if available

2. **Assemble pipeline pack**
   ```bash
   npm run pipeline -- \
     --date $(date +%Y-%m-%d) \
     --pack ../browns-ct-pack-assemble/out/ct-$(date +%Y-%m-%d) \
     --outdir pipeline-pack/
   ```

3. **Review outputs**
   - Open `POST-CHECKLIST.md` for go/no-go items
   - Review `ISSUES.md` for warnings
   - Check `CT-PACK.md` for timed checklist

4. **Timed sends (manual)**
   - **20:00 CT**: Guest welcome messages (Liana vet / Grant approve)
   - **09:00 CT**: After-hours check-in review
   - **21:00 CT**: Staff ops brief to team WhatsApp

**Option B: Run assemble during pipeline**

```bash
npm run pipeline -- \
  --date $(date +%Y-%m-%d) \
  --bookings bookings.json \
  --before before.json \
  --after after.json \
  --run-change-check \
  --outdir pipeline-pack/
```

This invokes tools as child processes. Less reliable if tools fail, but faster for simple packs.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Pipeline orchestration with existing pack
- Post-checklist skipping behavior
- Manifest.files accuracy when checklist skipped
- Input validation
- File copying

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/sample-pack/` (minimal ct-pack-assemble output).

**Expected output:**
- `test-out/PACK.md` - Pipeline index
- `test-out/CT-PACK.md` - CT pack index
- `test-out/manifest.json` - Pipeline metadata

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/browns-ct-pack-pipeline-pack/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── assembler.ts            # Pipeline orchestration logic
│   └── assembler.test.ts       # Assembler tests
├── fixtures/
│   ├── sample-pack/            # Minimal ct-pack-assemble output
│   │   ├── PACK.md
│   │   ├── APPROVAL.md
│   │   ├── changes.md
│   │   ├── daily-ops.md
│   │   ├── guest-henderson.md
│   │   └── manifest.json
│   └── README.md               # Fixture documentation
├── dist/                       # Compiled JavaScript (generated by tsc)
├── out/                        # Default output directory (generated by CLI)
├── test-out/                   # Test outputs (generated by npm run test:fixtures)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                   # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No auto-send** - All outputs are drafts for manual review and send
- ❌ **No WhatsApp API** - Does not connect to WhatsApp Business API
- ❌ **No email sending** - Does not send emails
- ❌ **No data invention** - Never fabricates guest phones, rates, or ETAs
- ❌ **No browser automation** - Offline only
- ❌ **No API calls** - Orchestrator calls local tools via npm run only

### What This Tool Does

- ✅ **Orchestrates sibling tools** via npm run child processes or accepts prebuilt outputs
- ✅ **Generates PACK.md** with pipeline summary
- ✅ **Copies tool outputs** into one dated pipeline pack folder
- ✅ **Produces manifest.json** for machine-readable inventory
- ✅ **Accurate manifest** - POST-CHECKLIST.md / ISSUES.md not listed when checklist skipped

### Data Privacy

- **Never commit real guest data to git**
- Keep actual pipeline pack folders local only (e.g., `pipeline-pack/`)
- `.gitignore` already excludes `out/` and `test-out/` directories
- Fixtures use fictional names for testing

## Sibling Tools Integration

### browns-booking-change-check

**Purpose:** Diff two booking snapshots and report changes

**Invoked with:** `--run-change-check` flag (requires `--before` and `--after`)

**Output copied:** `changes.md` → pipeline pack

**Status:** Optional, off by default

### browns-ct-pack-assemble

**Purpose:** Assemble CT pack from bookings and tool outputs

**Invoked with:** Automatically when `--bookings` provided (instead of `--pack`)

**Outputs copied:**
- `PACK.md` → `CT-PACK.md`
- `APPROVAL.md` → `CT-PACK-APPROVAL.md`
- `changes.md`, `daily-ops.md`, guest drafts, etc.

**Status:** Required (either via `--pack` or `--bookings`)

### browns-ct-pack-post-checklist

**Purpose:** Generate pre-WhatsApp post checklist from CT pack

**Invoked with:** Runs by default unless `--no-run-post-checklist`

**Outputs copied:**
- `POST-CHECKLIST.md` - Go/no-go checklist
- `ISSUES.md` - Validation warnings
- `APPROVAL.md` - Post-checklist approval gates

**Status:** Optional, default ON

**Important:** When skipped, `POST-CHECKLIST.md` and `ISSUES.md` are **not** listed in `manifest.json` files array.

## Troubleshooting

### "Error: --date is required"

Provide the target date:
```bash
npm run pipeline -- --date 2026-09-20 --pack ct-pack/ --outdir out/
```

### "Error: --date must be in YYYY-MM-DD format"

Use valid date format:
```bash
npm run pipeline -- --date 2026-09-20 --pack ct-pack/ --outdir out/
```

### "Error: Either --pack or --bookings is required"

Provide one of:
```bash
# Use existing pack:
--pack ../browns-ct-pack-assemble/out/ct-2026-09-20

# Or provide bookings to run assemble:
--bookings bookings.json
```

### "Error: --run-change-check requires --before and --after"

Provide both snapshot files:
```bash
npm run pipeline -- --date 2026-09-20 --bookings bookings.json \
  --run-change-check --before before.json --after after.json --outdir out/
```

### "Pack directory not found"

Ensure `--pack` path points to a valid ct-pack-assemble output folder:
```bash
ls ../browns-ct-pack-assemble/out/ct-2026-09-20/
# Should show: PACK.md, APPROVAL.md, ...
```

### "browns-ct-pack-assemble tool not found"

Ensure sibling tool exists and is built:
```bash
cd ../browns-ct-pack-assemble
npm install
npm run build
```

## Exit Codes

- **0** - Ran successfully
- **1** - Bad input, validation failure, or tool error

## Future Enhancements (Not in v1)

- `--run-adapter` flag to shell out to browns-nightsbridge-bookings-adapter
- Raw input options (`--nightsbridge-export`) for auto-running upstream tools
- Multi-property support (Rivendell, other Browns properties)
- WhatsApp pack preview (simulate what CoS will see before send)

**For now:** v1 is offline, orchestrator-only, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-booking-change-check** - Diff two booking snapshots and report changes
- **browns-ct-pack-assemble** - Assemble CT pack from bookings and tool outputs
- **browns-ct-pack-post-checklist** - Generate pre-WhatsApp post checklist from CT pack
- **browns-daily-ops-brief** - Daily team ops brief
- **browns-guest-comms-draft** - Guest welcome messages
- **browns-late-checkin-queue** - Late check-in coordination queue
- **browns-welcome-draft-pack** - Welcome message drafts for same-day arrivals

## CoS CT Pack Workflow Overview

```
Nightsbridge bookings export
    ↓
bookings.json + before.json + after.json
    ↓
browns-ct-pack-pipeline-pack (THIS TOOL)
    ↓ (orchestrates)
    ├── browns-booking-change-check (optional)
    ├── browns-ct-pack-assemble (required)
    └── browns-ct-pack-post-checklist (optional, default ON)
    ↓
pipeline-pack/
    ├── PACK.md (pipeline index)
    ├── CT-PACK.md (timed checklist)
    ├── POST-CHECKLIST.md (go/no-go)
    ├── ISSUES.md (warnings)
    ├── changes.md
    ├── daily-ops.md
    ├── guest-*.md
    └── manifest.json
    ↓
Manual review by Liana / Grant
    ↓
WhatsApp Admin - The Browns (CoS)
    ↓
Timed sends:
  20:00 CT - Guest welcome drafts
  09:00 CT - After-hours check-ins
  21:00 CT - Staff ops brief
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `POST-CHECKLIST.md` and `CT-PACK.md` before every send. CoS owns WhatsApp. Never auto-send. Never invent guest phones/rates/ETAs. Dullstroom / The Browns only.
