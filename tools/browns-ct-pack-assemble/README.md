# Browns CT Pack Assembler

An offline command-line orchestrator that assembles Browns CT timed packs for CoS WhatsApp Admin. **CT = America/Chicago timezone** for timed operations at The Browns Dullstroom. Combines outputs from multiple existing offline tools into one dated pack folder ready for manual WhatsApp approval and send.

Part of the Browns guest-flow automation for **Dullstroom The Browns Luxury Guest Suites**.

## Purpose

CoS runs timed Browns CT packs for same-day operations coordination (CT = Chicago Time):
- **20:00 CT**: Same-day morning guest drafts (welcome messages for arrivals)
- **09:00 CT (next morning)**: After-hours check-ins review
- **21:00 CT**: Staff ops brief for team WhatsApp

This orchestrator calls existing offline tools (or accepts already-built JSON inputs) to create one cohesive pack folder. **NEVER auto-send.**

## Features

- 🎯 **Orchestrator only** - Calls sibling tools via npm run child processes
- 📦 **Prebuilt inputs preferred** - Accept JSON outputs from tools already run
- 🔧 **Optional tool runners** - Can invoke sibling tools with flags when needed
- ⏰ **Timed checklist** - PACK.md includes 20:00 / 09:00 / 21:00 CT workflow
- ✅ **Approval gates** - APPROVAL.md reminds: never auto-send, CoS owns WhatsApp
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries
- 🔒 **Offline & safe** - No auto-send, no invented data, draft-only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- Sibling tools installed (if using `--run-*` flags):
  - `browns-nightsbridge-bookings-adapter`
  - `browns-booking-change-check` (not yet implemented)
  - `browns-daily-ops-brief`
  - `browns-guest-comms-draft`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-ct-pack-assemble
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
npm run assemble -- --day YYYY-MM-DD --outdir out/ct-YYYY-MM-DD/ [options]
```

### Examples

**Prebuilt inputs only (recommended for reliability):**
```bash
npm run assemble -- \\
  --day 2026-09-20 \\
  --outdir out/ct-2026-09-20/ \\
  --bookings bookings.json \\
  --before before.json \\
  --after after.json
```

**Run sibling tools:**
```bash
npm run assemble -- \\
  --day 2026-09-20 \\
  --outdir out/ct-2026-09-20/ \\
  --bookings bookings.json \\
  --run-daily-ops \\
  --run-guest-comms \\
  --guest-booking guest.json
```

**Minimal pack (index and approval only):**
```bash
npm run assemble -- \\
  --day 2026-09-20 \\
  --outdir out/ct-2026-09-20/
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--day` | ✅ Yes | Target date in YYYY-MM-DD format | - |
| `--outdir` | ✅ Yes | Output directory for the pack | - |
| `--bookings` | No | Path to bookings JSON file | - |
| `--before` | No | Path to before.json (for change-check) | - |
| `--after` | No | Path to after.json (for change-check) | - |
| `--facts` | No | Path to facts JSON file | - |
| `--guest-booking` | No | Path to guest booking JSON (single guest) | - |
| `--run-adapter` | No | Run browns-nightsbridge-bookings-adapter | false |
| `--run-change-check` | No | Run browns-booking-change-check (needs before+after) | false |
| `--run-daily-ops` | No | Run browns-daily-ops-brief (needs bookings) | false |
| `--run-guest-comms` | No | Run browns-guest-comms-draft (needs guest-booking) | false |
| `--help` | No | Show help message | - |

## Input Files

### Bookings File

**Format:** Same as `browns-daily-ops-brief` bookings JSON

```json
[
  {
    "guestName": "Sarah & Tom Henderson",
    "suiteOrUnit": "Luxury Suite 1",
    "status": "arriving",
    "checkInDate": "2026-09-20",
    "checkOutDate": "2026-09-22",
    "adults": 2,
    "children": 0,
    "notes": "Anniversary celebration"
  }
]
```

### Before/After Files

**Format:** JSON arrays representing booking state before and after changes

Used by `--run-change-check` to detect:
- Guest name changes
- Suite reassignments
- Date changes
- Cancellations

### Facts File

**Format:** Key-value pairs for daily context

```json
{
  "Weather": "Clear skies, 22°C",
  "Breakfast Service": "07:00 - 10:00",
  "Special Notes": "Trail maintenance scheduled"
}
```

### Guest Booking File

**Format:** Single booking JSON for guest welcome drafts

Same structure as one element from the bookings array. Used by `browns-guest-comms-draft`.

## Output Files

The CLI generates outputs in the specified directory:

### 1. `PACK.md`

**Primary deliverable:** Pack index with timed checklist

**Contents:**
- Date and generation timestamp
- Purpose statement
- **Timed checklist** with 20:00 / 09:00 / 21:00 CT sections
- Pack contents table
- Sources and flags summary
- Safety reminder

**Example snippet:**
```markdown
# Browns CT Pack
Date: 2026-09-20

## Timed Checklist

### 20:00 CT
Review and send same-day morning guest drafts

**Files:**
- guest-*.md

### 09:00 CT (next morning)
Review after-hours check-ins and booking changes

**Files:**
- changes.md

### 21:00 CT
Send staff ops brief to team WhatsApp

**Files:**
- daily-ops.md
```

### 2. `APPROVAL.md`

**Safety gates and approval requirements**

**Contents:**
- Summary of pack purpose
- Hard gates:
  - Gate 1: Change check required
  - Gate 2: Never auto-send
  - Gate 3: CoS ownership
  - Gate 4: Never invent data
  - Gate 5: Dullstroom / The Browns only
- Timed send checklist (checkboxes)
- Approval phrase template

**Example approval phrase:**
```
APPROVE SEND CT PACK 2026-09-20
```

### 3. `changes.md` (if change-check run or before/after provided)

Booking change check output from `browns-booking-change-check` tool.

If before/after provided but tool not run, generates placeholder reminding to review changes manually.

### 4. `daily-ops.md` (if `--run-daily-ops`)

Copied from `browns-daily-ops-brief` output (`draft-team-group-whatsapp.txt`).

Contains:
- Arrivals, in-house, departures
- Guest counts
- Special notes
- Staff coordination needs

### 5. `guest-*.md` (if `--run-guest-comms`)

Guest welcome draft files copied from `browns-guest-comms-draft` output.

Renamed from `draft-*.md` to `guest-*.md` for clarity in the pack.

### 6. `manifest.json`

**Machine-readable pack inventory**

```json
{
  "day": "2026-09-20",
  "generatedAt": "2026-09-20T14:30:00.000Z",
  "files": [
    {
      "filename": "PACK.md",
      "type": "index",
      "description": "Pack index with timed checklist"
    }
  ],
  "sources": {
    "bookingsProvided": true,
    "beforeAfterProvided": true,
    "factsProvided": false,
    "guestBookingProvided": true
  },
  "flags": {
    "ranAdapter": false,
    "ranChangeCheck": false,
    "ranDailyOps": true,
    "ranGuestComms": true
  }
}
```

## Workflow: CoS CT Pack Daily Routine

### Recommended Flow

**Option A: Prebuilt inputs (most reliable)**

1. **Morning prep (before 20:00 CT)**
   - Run `browns-nightsbridge-bookings-adapter` → bookings.json
   - Run `browns-daily-ops-brief` separately → verify output
   - Run `browns-guest-comms-draft` for each arriving guest → verify tone
   - Capture before/after booking states if available

2. **Assemble pack**
   ```bash
   npm run assemble -- \\
     --day $(date +%Y-%m-%d) \\
     --outdir out/ct-$(date +%Y-%m-%d)/ \\
     --bookings bookings.json \\
     --before before.json \\
     --after after.json \\
     --facts facts.json
   ```

3. **Review pack**
   - Open `PACK.md` for timed checklist
   - Review `APPROVAL.md` for safety gates
   - Verify all guest/ops drafts

4. **Timed sends**
   - **20:00 CT**: Guest welcome messages (Liana vet / Grant approve)
   - **09:00 CT**: After-hours check-in review
   - **21:00 CT**: Staff ops brief to team WhatsApp

**Option B: Run sibling tools during assembly**

```bash
npm run assemble -- \\
  --day $(date +%Y-%m-%d) \\
  --outdir out/ct-$(date +%Y-%m-%d)/ \\
  --bookings bookings.json \\
  --run-daily-ops \\
  --run-guest-comms \\
  --guest-booking arriving-guest.json
```

This invokes tools as child processes. Less reliable if tools fail, but faster for simple packs.

### Why Separate Tools Then Assemble?

**Reliability:** Running tools separately first allows verification of each output before assembly. If a tool fails during assembly, the entire pack is blocked.

**Flexibility:** CoS may want to hand-edit a guest draft or ops brief before including it in the pack.

**Cost-conscious:** One orchestrator, minimal token usage, offline-first.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Pack index generation
- Timed checklist formatting
- Sources and flags tracking
- Minimal pack handling

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/sample-*.json` (2 bookings, before/after states, facts).

**Expected output:**
- `test-out/PACK.md` - Full pack index with timed checklist
- `test-out/APPROVAL.md` - Safety gates
- `test-out/changes.md` - Placeholder (change-check tool not run)
- `test-out/manifest.json` - File inventory

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/browns-ct-pack-assemble/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── tool-runner.ts          # Sibling tool invocation via npm run
│   ├── pack-generator.ts       # PACK.md generation with timed checklist
│   ├── output-writer.ts        # File writing, copying, manifest
│   └── pack-generator.test.ts  # Pack generator tests
├── fixtures/
│   ├── sample-bookings.json    # 2 bookings (arriving, in-house)
│   ├── sample-before.json      # Booking state before changes
│   ├── sample-after.json       # Booking state after changes
│   ├── sample-facts.json       # Daily facts
│   └── README.md               # Fixture documentation
├── dist/                       # Compiled JavaScript (generated by tsc)
├── out/                        # Default output directory (generated by CLI)
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
- ❌ **No rates or amounts** - Does not generate pricing (passes through from tools)
- ❌ **No phone invention** - Never fabricates guest phone numbers
- ❌ **No browser automation** - Offline only
- ❌ **No API calls** - Orchestrator calls local tools via npm run

### What This Tool Does

- ✅ **Orchestrates sibling tools** via npm run child processes
- ✅ **Accepts prebuilt inputs** (recommended for reliability)
- ✅ **Generates PACK.md** with timed checklist
- ✅ **Generates APPROVAL.md** with safety gates
- ✅ **Copies tool outputs** into one dated pack folder
- ✅ **Produces manifest.json** for machine-readable inventory

### Data Privacy

- **Never commit real guest data to git**
- Keep actual pack folders local only (e.g., `out/ct-2026-09-20/`)
- `.gitignore` already excludes `out/` directory
- Fixtures use fictional names for testing

## Sibling Tools Integration

### browns-nightsbridge-bookings-adapter

**Purpose:** Transform Nightsbridge day sheets into bookings.json

**Invoked with:** `--run-adapter` flag

**Not yet implemented in assembler** - Manual export workflow preferred for v1.

### browns-booking-change-check

**Purpose:** Detect booking changes between before/after states

**Invoked with:** `--run-change-check` flag (requires `--before` and `--after`)

**Status:** Tool does not exist yet. Assembler skips with warning. Use placeholder changes.md for now.

### browns-daily-ops-brief

**Purpose:** Generate daily team ops brief from bookings

**Invoked with:** `--run-daily-ops` flag (requires `--bookings`)

**Output copied:** `draft-team-group-whatsapp.txt` → `daily-ops.md`

### browns-guest-comms-draft

**Purpose:** Generate guest welcome drafts from booking JSON

**Invoked with:** `--run-guest-comms` flag (requires `--guest-booking`)

**Output copied:** `draft-*.md` files → `guest-*.md` files

## Troubleshooting

### "Error: --day is required"

Provide the target date:
```bash
npm run assemble -- --day 2026-09-20 --outdir out/
```

### "Error: --outdir is required"

Specify output directory:
```bash
npm run assemble -- --day 2026-09-20 --outdir out/ct-2026-09-20/
```

### "Error: --run-daily-ops requires --bookings"

Provide bookings file when running daily-ops:
```bash
npm run assemble -- --day 2026-09-20 --outdir out/ \\
  --bookings bookings.json --run-daily-ops
```

### "Daily ops brief failed"

Check that `browns-daily-ops-brief` tool is built:
```bash
cd ../browns-daily-ops-brief
npm install
npm run build
```

### "Sibling tool not found"

Ensure sibling tools exist in `tools/` directory and have `npm run <script>` commands matching the tool-runner script map.

## Future Enhancements (Not in v1)

- **browns-booking-change-check tool** - Detect booking deltas
- **browns-phone-helpers integration** - Guest phone extraction and validation
- **Multi-property support** - Rivendell, other Browns properties
- **WhatsApp pack preview** - Simulate what CoS will see before send
- **Automated pack archival** - Move completed packs to archive after send

**For now:** v1 is offline, orchestrator-only, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-nightsbridge-bookings-adapter** - Transform Nightsbridge exports to bookings.json
- **browns-daily-ops-brief** - Daily team ops brief
- **browns-guest-comms-draft** - Guest welcome messages
- **browns-guest-facts-pack** - Extract brand facts from knowledge files
- **browns-quote-invoice-draft** - Quote and invoice communications

## CoS CT Pack Workflow Overview

```
Nightsbridge screen / manual bookings
    ↓
browns-nightsbridge-bookings-adapter (optional)
    ↓
bookings.json + before.json + after.json + facts.json
    ↓
browns-ct-pack-assemble (THIS TOOL)
    ↓ (optionally invokes)
    ├── browns-booking-change-check (not yet implemented)
    ├── browns-daily-ops-brief
    └── browns-guest-comms-draft
    ↓
out/ct-YYYY-MM-DD/
    ├── PACK.md (timed checklist)
    ├── APPROVAL.md (safety gates)
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

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` before every send. CoS owns WhatsApp. Never auto-send.
