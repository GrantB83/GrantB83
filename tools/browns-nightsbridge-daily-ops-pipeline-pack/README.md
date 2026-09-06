# Browns Nightsbridge Daily Ops Pipeline Pack

An offline CLI tool that orchestrates Browns Dullstroom daily ops from Nightsbridge day-sheet exports:

1. **browns-nightsbridge-bookings-adapter** (default ON) — Nightsbridge export → `bookings.json`
2. **browns-daily-ops-brief** (default ON) — bookings → staff ops brief draft
3. **browns-booking-change-check** (default ON when `--prior-bookings` given; OFF otherwise) — diff prior vs current bookings snapshot
4. **browns-late-checkin-queue** (default OFF; opt-in `--run-late`) — after-hours queue from bookings

**Purpose:** One dated pipeline pack from Nightsbridge CSV/TSV → complete daily ops materials for SA Ops / CoS. Wire into existing SAST ops flows. Never invents guest phone, ETA, rates, or amounts. Never auto-sends WhatsApp/email. Offline only. Dullstroom The Browns Luxury Guest Suites only.

## Features

- 🎯 **Pipeline orchestration** - Wires adapter → brief → optional change-check → optional late-queue
- 📦 **Auto-build siblings** - Builds sibling tools automatically if `dist/` missing
- 🔧 **Optional stages** - Adapter (default ON), brief (default ON), change-check (ON when prior bookings given), late queue (default OFF)
- ✅ **Flexible boolean parsing** - `--run-late`, `--no-run-brief`, `--run-change-check=false`, etc.
- 📋 **Accurate manifest** - Files array only lists files actually written (PR #116 pattern)
- 🚀 **Zero dependencies** - Pure TypeScript
- 🔒 **Offline & safe** - No WhatsApp send, no invented data, draft-only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools** (auto-built if missing):
  - `tools/browns-nightsbridge-bookings-adapter/`
  - `tools/browns-daily-ops-brief/`
  - `tools/browns-booking-change-check/`
  - `tools/browns-late-checkin-queue/`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-nightsbridge-daily-ops-pipeline-pack
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
npm run pack -- --input <path> --day YYYY-MM-DD [options]
```

or with stdin:

```bash
cat file.txt | npm run pack -- --paste --day YYYY-MM-DD [options]
```

### Examples

**Basic usage (adapter + brief, no change check, no late queue):**
```bash
npm run pack -- \
  --input nightsbridge.csv \
  --day 2026-09-20
```

**With prior bookings for change check:**
```bash
npm run pack -- \
  --input nightsbridge.csv \
  --day 2026-09-20 \
  --prior-bookings bookings-yesterday.json
```

**All stages including late queue:**
```bash
npm run pack -- \
  --input nightsbridge.csv \
  --day 2026-09-20 \
  --prior-bookings bookings-yesterday.json \
  --run-late
```

**With facts file:**
```bash
npm run pack -- \
  --input nightsbridge.csv \
  --day 2026-09-20 \
  --facts daily-facts.json
```

**From stdin (pasted table):**
```bash
cat table.txt | npm run pack -- \
  --paste \
  --day 2026-09-20
```

**Test with fixtures:**
```bash
npm run test:fixtures
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--input` | Conditional | Path to Nightsbridge CSV/TSV file | - |
| `--paste` | Conditional | Read from stdin (pasted text) | - |
| `--day` | ✅ Yes | Target date (YYYY-MM-DD format) | - |
| `--as-of` | No | Alternative to --day (same meaning) | - |
| `--prior-bookings` | No | Path to prior bookings.json for change check | - |
| `--facts` | No | Path to daily facts JSON file | - |
| `--outdir` | No | Output directory for pack | `./out` |
| `--run-adapter` | No | Run browns-nightsbridge-bookings-adapter | **true** |
| `--run-brief` | No | Run browns-daily-ops-brief | **true** |
| `--run-change-check` | No | Run browns-booking-change-check | **true if --prior-bookings given** |
| `--run-late` | No | Run browns-late-checkin-queue | **false** |
| `--help`, `-h` | No | Show help message | - |

**Note:** Either `--input` or `--paste` is required (not both).

**Boolean Flag Syntax (PR #114 pattern):**
```bash
--run-late               # Enable
--run-late=true          # Enable with equals
--run-late true          # Enable with space
--no-run-late            # Disable with negative flag
--run-late=false         # Disable with equals
--run-late false         # Disable with space
```

## Pipeline Stages

### Stage 1: browns-nightsbridge-bookings-adapter (Default ON)

**Trigger:** Enabled by default, disable with `--no-run-adapter`

**Purpose:** Transform Nightsbridge CSV/TSV export into bookings.json

**Tool:** `browns-nightsbridge-bookings-adapter`

**Outputs:**
- `bookings.json` → primary deliverable
- `bookings.csv` → human-readable
- `missing-fields.md` → data quality report
- `APPROVAL.md` → adapter approval checklist

### Stage 2: browns-daily-ops-brief (Default ON)

**Trigger:** Enabled by default, disable with `--no-run-brief`

**Purpose:** Generate staff ops brief WhatsApp draft from bookings

**Tool:** `browns-daily-ops-brief`

**Outputs:**
- `draft-team-group-whatsapp.txt` → copied as `daily-ops-brief.txt`
- `draft-guest-welcome-stubs/` → copied as `ops-brief-stubs/`
- `APPROVAL.md` → copied as `brief-APPROVAL.md`

### Stage 3: browns-booking-change-check (Default ON when --prior-bookings given)

**Trigger:** Enabled by default when `--prior-bookings` is provided, disable with `--no-run-change-check`

**Purpose:** Diff prior vs current bookings snapshot to detect last-minute changes

**Tool:** `browns-booking-change-check`

**Outputs:**
- `changes.md` → copied as `change-check-changes.md`
- `changes.json` → copied as `change-check-changes.json`
- `APPROVAL.md` → copied as `change-check-APPROVAL.md`

**Note:** When `--prior-bookings` is not provided, this stage is skipped by default.

### Stage 4: browns-late-checkin-queue (Default OFF)

**Trigger:** Disabled by default, enable with `--run-late`

**Purpose:** Generate late/after-hours check-in coordination queue

**Tool:** `browns-late-checkin-queue`

**Outputs:**
- `queue.md` → copied as `late-queue.md`
- `queue.json` → copied as `late-queue.json`
- `unknown-time.md` → copied as `late-unknown-time.md`
- `missing-fields.md` → copied as `late-missing-fields.md`
- `APPROVAL.md` → copied as `late-APPROVAL.md`

**Note:** When a stage is skipped, its outputs are **not** listed in `manifest.json` files array (PR #116 accuracy pattern).

## Output Files

The CLI generates outputs in `<outdir>/pack-<YYYY-MM-DD>/`:

### 1. `PACK.md` - Pipeline Pack Index

**Primary deliverable:** Pipeline index with workflow summary

**Contents:**
- Date and generation timestamp
- Pipeline summary (which stages ran)
- Pack contents listing by stage
- Warnings (if any)
- Next steps checklist
- Safety reminders

### 2. `APPROVAL.md` - Approval Checklist

**Contents:**
- Hard gates (never auto-send, never invent data)
- Pipeline summary
- Data verification checklist
- Safety reminders
- Approval phrase template

### 3. Adapter Outputs (if `--run-adapter`)

- `bookings.json` - Canonical bookings data
- `bookings.csv` - Human-readable CSV
- `adapter-missing-fields.md` - Data quality report
- `adapter-APPROVAL.md` - Adapter-specific approval

### 4. Brief Outputs (if `--run-brief`)

- `daily-ops-brief.txt` - Team WhatsApp draft
- `ops-brief-stubs/` - Guest welcome stubs directory
- `brief-APPROVAL.md` - Brief-specific approval

### 5. Change Check Outputs (if `--run-change-check` and `--prior-bookings` given)

- `change-check-changes.md` - Human-readable changes report
- `change-check-changes.json` - Machine-readable changes
- `change-check-APPROVAL.md` - Change check approval

### 6. Late Checkin Outputs (if `--run-late`)

- `late-queue.md` - Late/after-hours check-in queue
- `late-queue.json` - Machine-readable queue
- `late-unknown-time.md` - Arrivals with unknown check-in times
- `late-missing-fields.md` - Data quality report
- `late-APPROVAL.md` - Late checkin approval

### 7. `manifest.json` - Pipeline Metadata

**Machine-readable pipeline inventory**

**Schema:**
```json
{
  "tool": "browns-nightsbridge-daily-ops-pipeline-pack",
  "version": "1.0.0",
  "timestamp": "2026-09-20T14:30:00.000Z",
  "date": "2026-09-20",
  "inputs": {
    "inputPath": "/path/to/nightsbridge.csv",
    "priorBookingsPath": "/path/to/prior.json",
    "factsPath": "/path/to/facts.json"
  },
  "runOptions": {
    "ranAdapter": true,
    "ranBrief": true,
    "ranChangeCheck": true,
    "ranLate": false
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

**Important:** When a stage is skipped, its outputs are **not** included in the `files` array (PR #116 accuracy pattern).

## Workflow: SA Ops Daily Routine

### Recommended Flow

**Morning (before 09:00 SAST):**

1. **Export Nightsbridge day sheet** for target date
2. **Save prior bookings** (if doing change check):
   ```bash
   # Copy yesterday's bookings.json as prior snapshot
   cp packs/pack-2026-09-19/bookings.json exports/bookings-2026-09-19.json
   ```

3. **Run the pipeline pack:**
   ```bash
   cd tools/browns-nightsbridge-daily-ops-pipeline-pack
   npm run pack -- \
     --input ~/exports/nightsbridge-2026-09-20.csv \
     --day 2026-09-20 \
     --prior-bookings ~/exports/bookings-2026-09-19.json \
     --run-late \
     --outdir ~/packs/
   ```

4. **Review outputs:**
   - Open `~/packs/pack-2026-09-20/PACK.md` - pipeline index
   - Review `bookings.json` - verify guest data
   - Review `daily-ops-brief.txt` - team brief
   - Review `change-check-changes.md` - last-minute changes (if ran)
   - Review `late-queue.md` - after-hours coordination (if ran)

5. **Review approval checklist:**
   - Open `APPROVAL.md`
   - Verify all hard gates checked
   - Confirm no invented data
   - Check missing fields resolved

6. **Manual posting:**
   - Copy approved brief to team WhatsApp
   - Post late queue to CoS (if applicable)
   - Manual send only (SA Ops / CoS owns send path)

### When to Use Change Check

**Always run with `--prior-bookings`** before posting daily ops materials. Detects:
- Last-minute cancellations
- New bookings added after initial export
- Suite reassignments
- Updated guest notes (late arrivals, special requests)

### When to Use Late Queue

**Run with `--run-late`** when:
- After-hours check-ins expected (typically 15:00+ SAST arrivals)
- Coordinating evening access and key handover
- Preparing 09:00 CT (16:00-17:00 SAST) after-hours pack

## Auto-Build Sibling Tools

**Behavior (PR #132 pattern):**

When a stage runs (e.g., `--run-adapter`), this tool:

1. **Checks if sibling tool exists** at `../browns-nightsbridge-bookings-adapter/`
2. **Checks if built** by looking for `dist/index.js`
3. **Auto-builds if missing:**
   - Runs `npm install` if `node_modules/` missing
   - Runs `npm run build`
4. **Shells out** to sibling CLI with correct args
5. **Discovers outputs** (flat files and/or dated subdirectories)
6. **Copies to pack** with renamed files

**Fixture tests run on green box** without requiring manual sibling builds.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Boolean flag parsing (PR #114 pattern)
- Manifest file listing accuracy (PR #116 pattern)

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/nightsbridge-sample.csv` (3 arriving guests on 2026-09-20).

**Expected output:**
- `test-out/pack-2026-09-20/PACK.md` - Pipeline index
- `test-out/pack-2026-09-20/APPROVAL.md` - Approval checklist
- `test-out/pack-2026-09-20/bookings.json` - Canonical bookings
- `test-out/pack-2026-09-20/daily-ops-brief.txt` - Team brief
- `test-out/pack-2026-09-20/manifest.json` - Pipeline metadata

**Sibling tools are auto-built** during fixture test if needed.

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/browns-nightsbridge-daily-ops-pipeline-pack/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── assembler.ts            # Pipeline orchestration logic
│   └── assembler.test.ts       # Tests
├── fixtures/
│   ├── nightsbridge-sample.csv # Sample Nightsbridge export
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

- ✅ **Orchestrates sibling tools** via npm run child processes
- ✅ **Auto-builds siblings** if `dist/` missing (PR #132 pattern)
- ✅ **Discovers outputs** (flat files and/or dated child dirs)
- ✅ **Generates PACK.md** with pipeline summary
- ✅ **Copies tool outputs** into one dated pipeline pack folder
- ✅ **Produces manifest.json** for machine-readable inventory (PR #116 accuracy)

### Data Privacy

- **Never commit real guest data to git**
- Keep actual pipeline pack folders local only (e.g., `~/packs/`)
- `.gitignore` already excludes `out/` and `test-out/` directories
- Fixtures use fictional names for testing

## Sibling Tools Integration

### browns-nightsbridge-bookings-adapter

**Purpose:** Transform Nightsbridge CSV/TSV export into bookings.json

**Invoked with:** Enabled by default (disable with `--no-run-adapter`)

**Outputs copied:** `bookings.json`, `bookings.csv`, `missing-fields.md`, `APPROVAL.md`

**Status:** Default ON

### browns-daily-ops-brief

**Purpose:** Generate staff ops brief WhatsApp draft from bookings

**Invoked with:** Enabled by default (disable with `--no-run-brief`)

**Outputs copied:** `daily-ops-brief.txt`, `ops-brief-stubs/`, `APPROVAL.md`

**Status:** Default ON

### browns-booking-change-check

**Purpose:** Diff prior vs current bookings snapshot

**Invoked with:** Enabled by default when `--prior-bookings` given (disable with `--no-run-change-check`)

**Outputs copied:** `changes.md`, `changes.json`, `APPROVAL.md`

**Status:** Default ON when `--prior-bookings` given; OFF otherwise

### browns-late-checkin-queue

**Purpose:** Generate late/after-hours check-in coordination queue

**Invoked with:** Disabled by default (enable with `--run-late`)

**Outputs copied:** `queue.md`, `queue.json`, `unknown-time.md`, `missing-fields.md`, `APPROVAL.md`

**Status:** Default OFF

## Troubleshooting

### "Error: Either --input or --paste is required"

Provide the input method:
```bash
npm run pack -- --input nightsbridge.csv --day 2026-09-20
```

or:
```bash
cat table.txt | npm run pack -- --paste --day 2026-09-20
```

### "Error: Either --day or --as-of is required"

Provide the target date:
```bash
npm run pack -- --input nightsbridge.csv --day 2026-09-20
```

### "Error: Date must be in YYYY-MM-DD format"

Use valid date format:
```bash
npm run pack -- --input nightsbridge.csv --day 2026-09-20
```

### "Input file not found"

Ensure the `--input` path is correct:
```bash
ls -l nightsbridge.csv
npm run pack -- --input ./nightsbridge.csv --day 2026-09-20
```

### "Sibling tool not found"

Ensure sibling tools exist:
```bash
ls -la ../browns-nightsbridge-bookings-adapter/
ls -la ../browns-daily-ops-brief/
ls -la ../browns-booking-change-check/
ls -la ../browns-late-checkin-queue/
```

The tool will auto-build siblings if they exist but are not built.

### "Failed to build sibling tool"

If auto-build fails:
```bash
cd ../browns-nightsbridge-bookings-adapter
npm install
npm run build
```

Then retry the pipeline pack.

## Exit Codes

- **0** - Ran successfully
- **1** - Bad input, validation failure, or tool error

## Future Enhancements (Not in v1)

- Multi-property support (Rivendell, other Browns properties)
- WhatsApp pack preview (simulate what SA Ops will see before send)
- Email pack generation (for email-based comms)
- Scheduled runs (automated daily pack generation)

**For now:** v1 is offline, orchestrator-only, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-nightsbridge-bookings-adapter** - Nightsbridge export → bookings.json
- **browns-daily-ops-brief** - Staff ops brief from bookings
- **browns-booking-change-check** - Diff bookings snapshots
- **browns-late-checkin-queue** - After-hours check-in queue

## SA Ops Workflow Overview

```
Nightsbridge day-sheet export (CSV/TSV)
    ↓
browns-nightsbridge-daily-ops-pipeline-pack (THIS TOOL)
    ↓ (orchestrates)
    ├── browns-nightsbridge-bookings-adapter (default ON)
    │       ↓
    │   bookings.json
    │       ↓
    ├── browns-daily-ops-brief (default ON)
    │       ↓
    │   daily-ops-brief.txt
    │       ↓
    ├── browns-booking-change-check (default ON when --prior-bookings)
    │       ↓
    │   changes.md
    │       ↓
    └── browns-late-checkin-queue (default OFF; opt-in --run-late)
            ↓
        late-queue.md
    ↓
pack-YYYY-MM-DD/
    ├── PACK.md (pipeline index)
    ├── APPROVAL.md (approval checklist)
    ├── bookings.json
    ├── daily-ops-brief.txt
    ├── change-check-changes.md (if ran)
    ├── late-queue.md (if ran)
    └── manifest.json
    ↓
Manual review by SA Ops / CoS
    ↓
WhatsApp posting (SA Ops / CoS approval)
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` and `PACK.md` before every send. SA Ops / CoS owns WhatsApp. Never auto-send. Never invent phone/ETA/rates/amounts. Dullstroom / The Browns only. Prefer `node dist/` over nested npm exec (avoids hang on shared box).
