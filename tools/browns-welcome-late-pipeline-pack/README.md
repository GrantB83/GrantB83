# Browns Welcome Late Pipeline Pack

An offline CLI tool that orchestrates Browns same-day guest packs for SA Ops / CoS:

1. **browns-welcome-draft-pack** (default ON)
2. **browns-late-checkin-queue** (default ON)  
3. **browns-daily-ops-brief** (default OFF)

**Purpose:** One dated pipeline pack from `bookings.json` (adapter output) → welcome draft stubs + late/after-hours check-in queue (+ optional daily ops brief). Wire into existing CT morning / 09:00 after-hours flows. Never invents guest phone, ETA, rates, or amounts. Never auto-sends WhatsApp/email. Offline only. Dullstroom The Browns Luxury Guest Suites only.

## Features

- 🎯 **Pipeline orchestration** - Wires welcome-draft-pack → late-checkin-queue → optional daily-ops-brief
- 📦 **Auto-build siblings** - Builds sibling tools automatically if `dist/` missing
- 🔧 **Optional stages** - Run welcome (default ON), late (default ON), daily-ops (default OFF)
- ✅ **Flexible boolean parsing** - `--run-daily-ops`, `--no-run-welcome`, `--run-late=false`, etc.
- 📋 **Accurate manifest** - Files array only lists files actually written (PR #116 pattern)
- 🚀 **Zero dependencies** - Pure TypeScript
- 🔒 **Offline & safe** - No WhatsApp send, no invented data, draft-only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools** (auto-built if missing):
  - `tools/browns-welcome-draft-pack/`
  - `tools/browns-late-checkin-queue/`
  - `tools/browns-daily-ops-brief/`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-welcome-late-pipeline-pack
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
npm run pack -- --bookings <path> --day YYYY-MM-DD [options]
```

### Examples

**Basic usage (welcome + late, no daily ops):**
```bash
npm run pack -- \
  --bookings bookings.json \
  --day 2026-09-20
```

**With guest facts:**
```bash
npm run pack -- \
  --bookings bookings.json \
  --day 2026-09-20 \
  --facts guest-facts.json
```

**All stages including daily ops:**
```bash
npm run pack -- \
  --bookings bookings.json \
  --day 2026-09-20 \
  --run-daily-ops
```

**Skip welcome, run late only:**
```bash
npm run pack -- \
  --bookings bookings.json \
  --day 2026-09-20 \
  --no-run-welcome
```

**Test with fixtures:**
```bash
npm run test:fixtures
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--bookings` | ✅ Yes | Path to bookings.json file | - |
| `--day` | ✅ Yes | Target date (YYYY-MM-DD format) | - |
| `--as-of` | No | Alternative to --day (same meaning) | - |
| `--facts` | No | Path to guest facts JSON file | - |
| `--outdir` | No | Output directory for pack | `./out` |
| `--run-welcome` | No | Run browns-welcome-draft-pack | **true** |
| `--run-late` | No | Run browns-late-checkin-queue | **true** |
| `--run-daily-ops` | No | Run browns-daily-ops-brief | **false** |
| `--help`, `-h` | No | Show help message | - |

**Boolean Flag Syntax (PR #114 pattern):**
```bash
--run-daily-ops          # Enable
--run-daily-ops=true     # Enable with equals
--run-daily-ops true     # Enable with space
--no-run-daily-ops       # Disable with negative flag
--run-daily-ops=false    # Disable with equals
--run-daily-ops false    # Disable with space
```

## Pipeline Stages

### Stage 1: browns-welcome-draft-pack (Default ON)

**Trigger:** Enabled by default, disable with `--no-run-welcome`

**Purpose:** Generate welcome message stubs for same-day check-ins

**Tool:** `browns-welcome-draft-pack`

**Outputs:**
- `queue.md` → copied as `welcome-queue.md`
- `drafts/*.md` → copied as `welcome-*.md`
- `missing-fields.md` → copied as `welcome-missing-fields.md`
- `APPROVAL.md` → copied as `welcome-APPROVAL.md`

### Stage 2: browns-late-checkin-queue (Default ON)

**Trigger:** Enabled by default, disable with `--no-run-late`

**Purpose:** Generate late/after-hours check-in coordination queue

**Tool:** `browns-late-checkin-queue`

**Outputs:**
- `queue.md` → copied as `late-queue.md`
- `queue.json` → copied as `late-queue.json`
- `unknown-time.md` → copied as `late-unknown-time.md`
- `missing-fields.md` → copied as `late-missing-fields.md`
- `APPROVAL.md` → copied as `late-APPROVAL.md`

### Stage 3: browns-daily-ops-brief (Default OFF)

**Trigger:** Disabled by default, enable with `--run-daily-ops`

**Purpose:** Generate daily team ops brief for WhatsApp group

**Tool:** `browns-daily-ops-brief`

**Outputs:**
- `draft-team-group-whatsapp.txt` → copied as `daily-ops-brief.txt`
- `draft-guest-welcome-stubs/` → copied as `daily-ops-stubs/`
- `APPROVAL.md` → copied as `daily-ops-APPROVAL.md`

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

### 3. Welcome Draft Pack Outputs (if `--run-welcome`)

- `welcome-queue.md` - Numbered welcome message queue
- `welcome-*.md` - Individual guest welcome stubs
- `welcome-missing-fields.md` - Data quality report
- `welcome-APPROVAL.md` - Welcome-specific approval checklist

### 4. Late Check-In Queue Outputs (if `--run-late`)

- `late-queue.md` - Late/after-hours check-in queue
- `late-queue.json` - Machine-readable queue
- `late-unknown-time.md` - Arrivals with unknown check-in times
- `late-missing-fields.md` - Data quality report
- `late-APPROVAL.md` - Late check-in approval checklist

### 5. Daily Ops Brief Outputs (if `--run-daily-ops`)

- `daily-ops-brief.txt` - Team WhatsApp brief
- `daily-ops-stubs/` - Guest welcome stubs directory
- `daily-ops-APPROVAL.md` - Daily ops approval checklist

### 6. `manifest.json` - Pipeline Metadata

**Machine-readable pipeline inventory**

**Schema:**
```json
{
  "tool": "browns-welcome-late-pipeline-pack",
  "version": "1.0.0",
  "timestamp": "2026-09-20T14:30:00.000Z",
  "date": "2026-09-20",
  "inputs": {
    "bookingsPath": "/path/to/bookings.json",
    "factsPath": "/path/to/facts.json"
  },
  "runOptions": {
    "ranWelcome": true,
    "ranLate": true,
    "ranDailyOps": false
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

## Workflow: CoS Same-Day Guest Pack Routine

### Recommended Flow

**Option A: CT Pack Integration (preferred)**

This tool is designed to integrate with `browns-ct-pack-assemble` for timed CT workflows:

```bash
# browns-ct-pack-assemble already calls:
# - browns-welcome-draft-pack (via --run-welcome)
# - browns-late-checkin-queue (via --run-late)
# - browns-daily-ops-brief (via --run-daily-ops)

cd tools/browns-ct-pack-assemble
npm run assemble -- \
  --day 2026-09-20 \
  --bookings bookings.json \
  --run-welcome \
  --run-late \
  --outdir out/ct-2026-09-20/
```

**Option B: Standalone Pipeline Pack**

If you need a standalone pack outside the CT workflow:

```bash
cd tools/browns-welcome-late-pipeline-pack
npm run pack -- \
  --bookings bookings.json \
  --day 2026-09-20 \
  --facts facts.json \
  --outdir packs/
```

### Timed Sends (Manual)

After reviewing the pack:

- **20:00 CT**: Guest welcome messages (Liana vet / Grant approve)
- **09:00 CT**: After-hours check-in review
- **21:00 CT**: Staff ops brief to team WhatsApp (if daily-ops ran)

## Auto-Build Sibling Tools

**Behavior (PR #132 pattern):**

When a stage runs (e.g., `--run-welcome`), this tool:

1. **Checks if sibling tool exists** at `../browns-welcome-draft-pack/`
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

Uses `fixtures/sample-bookings.json` (3 arriving guests).

**Expected output:**
- `test-out/pack-2026-09-20/PACK.md` - Pipeline index
- `test-out/pack-2026-09-20/APPROVAL.md` - Approval checklist
- `test-out/pack-2026-09-20/welcome-queue.md` - Welcome drafts
- `test-out/pack-2026-09-20/late-queue.md` - Late check-in queue
- `test-out/pack-2026-09-20/manifest.json` - Pipeline metadata

**Sibling tools are auto-built** during fixture test if needed.

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/browns-welcome-late-pipeline-pack/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── assembler.ts            # Pipeline orchestration logic
│   └── assembler.test.ts       # Tests
├── fixtures/
│   ├── sample-bookings.json    # Sample bookings
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
- Keep actual pipeline pack folders local only (e.g., `packs/`)
- `.gitignore` already excludes `out/` and `test-out/` directories
- Fixtures use fictional names for testing

## Sibling Tools Integration

### browns-welcome-draft-pack

**Purpose:** Generate welcome message stubs for same-day check-ins

**Invoked with:** Enabled by default (disable with `--no-run-welcome`)

**Outputs copied:** `queue.md`, `drafts/*.md`, `missing-fields.md`, `APPROVAL.md`

**Status:** Default ON

### browns-late-checkin-queue

**Purpose:** Generate late/after-hours check-in coordination queue

**Invoked with:** Enabled by default (disable with `--no-run-late`)

**Outputs copied:** `queue.md`, `queue.json`, `unknown-time.md`, `missing-fields.md`, `APPROVAL.md`

**Status:** Default ON

### browns-daily-ops-brief

**Purpose:** Generate daily team ops brief for WhatsApp group

**Invoked with:** Disabled by default (enable with `--run-daily-ops`)

**Outputs copied:** `draft-team-group-whatsapp.txt`, `draft-guest-welcome-stubs/`, `APPROVAL.md`

**Status:** Default OFF

## Troubleshooting

### "Error: --bookings is required"

Provide the bookings file path:
```bash
npm run pack -- --bookings bookings.json --day 2026-09-20
```

### "Error: Either --day or --as-of is required"

Provide the target date:
```bash
npm run pack -- --bookings bookings.json --day 2026-09-20
```

### "Error: Date must be in YYYY-MM-DD format"

Use valid date format:
```bash
npm run pack -- --bookings bookings.json --day 2026-09-20
```

### "Bookings file not found"

Ensure the `--bookings` path is correct:
```bash
ls -l bookings.json
npm run pack -- --bookings ./bookings.json --day 2026-09-20
```

### "Sibling tool not found"

Ensure sibling tools exist:
```bash
ls -la ../browns-welcome-draft-pack/
ls -la ../browns-late-checkin-queue/
ls -la ../browns-daily-ops-brief/
```

The tool will auto-build siblings if they exist but are not built.

### "Failed to build sibling tool"

If auto-build fails:
```bash
cd ../browns-welcome-draft-pack
npm install
npm run build
```

Then retry the pipeline pack.

## Exit Codes

- **0** - Ran successfully
- **1** - Bad input, validation failure, or tool error

## Future Enhancements (Not in v1)

- Multi-property support (Rivendell, other Browns properties)
- WhatsApp pack preview (simulate what CoS will see before send)
- Email pack generation (for email-based guests)
- Integration with browns-nightsbridge-bookings-adapter for auto-fetch

**For now:** v1 is offline, orchestrator-only, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-welcome-draft-pack** - Welcome message stubs for same-day arrivals
- **browns-late-checkin-queue** - Late/after-hours check-in coordination queue
- **browns-daily-ops-brief** - Daily team ops brief
- **browns-ct-pack-assemble** - CT pack assembler (upstream orchestrator)
- **browns-nightsbridge-bookings-adapter** - Bookings feed generator

## CoS Workflow Overview

```
Nightsbridge bookings export
    ↓
bookings.json + guest-facts.json
    ↓
browns-welcome-late-pipeline-pack (THIS TOOL)
    ↓ (orchestrates)
    ├── browns-welcome-draft-pack (default ON)
    ├── browns-late-checkin-queue (default ON)
    └── browns-daily-ops-brief (default OFF)
    ↓
pack-YYYY-MM-DD/
    ├── PACK.md (pipeline index)
    ├── APPROVAL.md (approval checklist)
    ├── welcome-queue.md
    ├── welcome-*.md
    ├── late-queue.md
    ├── late-unknown-time.md
    └── manifest.json
    ↓
Manual review by Liana / Grant
    ↓
WhatsApp Admin - The Browns (CoS)
    ↓
Timed sends:
  20:00 CT - Guest welcome drafts
  09:00 CT - After-hours check-ins
  21:00 CT - Staff ops brief (if ran)
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` and `PACK.md` before every send. CoS owns WhatsApp. Never auto-send. Never invent guest phones/rates/ETAs. Dullstroom / The Browns only.
