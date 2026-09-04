# Browns Guest Comms Pipeline Pack

An offline CLI tool that orchestrates Browns guest communication drafts for SA Ops / CoS:

1. **browns-guest-facts-pack** (optional / default OFF unless --facts-md given or --run-facts)
2. **browns-guest-comms-draft** (default ON)

**Purpose:** One dated pipeline pack: optional knowledge-md → facts.json/snippets → draft WhatsApp/email/late/team notes from booking JSON. Dullstroom The Browns Luxury Guest Suites only. Never invents rates, Wi-Fi passwords, phones, or amenities. Never auto-sends WhatsApp/email. Offline only. WhatsApp stays on CoS send path — drafts only for Grant approval.

## Features

- 🎯 **Pipeline orchestration** - Wires optional browns-guest-facts-pack → browns-guest-comms-draft
- 📦 **Auto-build siblings** - Builds sibling tools automatically if `dist/` missing (PR #132)
- 🔧 **Optional stages** - Run facts (default OFF), comms (default ON)
- ✅ **Flexible boolean parsing** - `--run-facts`, `--no-run-comms`, `--run-facts=false`, etc. (PR #114)
- 📋 **Accurate manifest** - Files array only lists files actually written (PR #116 pattern)
- 🚀 **Zero dependencies** - Pure TypeScript
- 🔒 **Offline & safe** - No WhatsApp send, no invented data, draft-only

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools** (auto-built if missing):
  - `tools/browns-guest-facts-pack/`
  - `tools/browns-guest-comms-draft/`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-guest-comms-pipeline-pack
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
npm run pack -- --booking <path> [options]
```

### Examples

**Basic usage (comms only, no facts):**
```bash
npm run pack -- \
  --booking booking.json
```

**With existing facts JSON:**
```bash
npm run pack -- \
  --booking booking.json \
  --facts-json guest-facts.json
```

**With markdown (auto-runs facts stage):**
```bash
npm run pack -- \
  --booking booking.json \
  --facts-md the-browns.md
```

**Explicit facts + comms:**
```bash
npm run pack -- \
  --booking booking.json \
  --run-facts \
  --facts-md the-browns.md \
  --seeds redacted-seeds/
```

**Test with fixtures:**
```bash
npm run test:fixtures
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--booking`, `--bookings` | ✅ Yes | Path to booking JSON file | - |
| `--facts-md` | No | Markdown knowledge file (auto-enables facts stage) | - |
| `--facts-json` | No | Existing facts JSON file (skips facts stage) | - |
| `--seeds` | No | Directory with seed tone samples | - |
| `--outdir` | No | Output directory for pack | `./out` |
| `--as-of` | No | Date for pack timestamp (YYYY-MM-DD) | today |
| `--run-facts` | No | Run browns-guest-facts-pack | **false** |
| `--run-comms` | No | Run browns-guest-comms-draft | **true** |
| `--help`, `-h` | No | Show help message | - |

**Boolean Flag Syntax (PR #114 pattern):**
```bash
--run-facts              # Enable
--run-facts=true         # Enable with equals
--run-facts true         # Enable with space
--no-run-facts           # Disable with negative flag
--run-facts=false        # Disable with equals
--run-facts false        # Disable with space
```

## Pipeline Stages

### Stage 1: browns-guest-facts-pack (Default OFF)

**Trigger:** Enabled when `--facts-md` provided OR `--run-facts` explicit

**Purpose:** Extract structured guest facts from markdown knowledge files

**Tool:** `browns-guest-facts-pack`

**Outputs:**
- `facts.json` → copied as `facts.json`
- `snippets/*.txt` → copied as `snippets/*.txt`
- `missing-fields.md` → copied as `facts-missing-fields.md`
- `APPROVAL.md` → copied as `facts-APPROVAL.md`

### Stage 2: browns-guest-comms-draft (Default ON)

**Trigger:** Enabled by default, disable with `--no-run-comms`

**Purpose:** Generate draft guest communications from booking JSON

**Tool:** `browns-guest-comms-draft`

**Outputs:**
- `draft-welcome-whatsapp.txt`
- `draft-welcome-email.txt`
- `draft-late-checkin.txt`
- `draft-team-checkin.txt`
- `APPROVAL.md`
- `manifest.json`

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

### 3. Guest Facts Pack Outputs (if `--run-facts`)

- `facts.json` - Structured guest facts (JSON)
- `snippets/*.txt` - Individual snippet files
- `facts-missing-fields.md` - Missing fields report
- `facts-APPROVAL.md` - Facts-specific approval checklist

### 4. Guest Communications Draft Outputs (if `--run-comms`)

- `draft-welcome-whatsapp.txt` - Guest welcome message for WhatsApp
- `draft-welcome-email.txt` - Guest welcome email
- `draft-late-checkin.txt` - Late check-in coordination
- `draft-team-checkin.txt` - Internal team note
- `APPROVAL.md` - Communications approval checklist

### 5. `manifest.json` - Pipeline Metadata

**Machine-readable pipeline inventory**

**Schema:**
```json
{
  "tool": "browns-guest-comms-pipeline-pack",
  "version": "1.0.0",
  "timestamp": "2026-09-20T14:30:00.000Z",
  "date": "2026-09-20",
  "inputs": {
    "bookingPath": "/path/to/booking.json",
    "factsMdPath": "/path/to/knowledge.md",
    "factsJsonPath": null,
    "seedsPath": "/path/to/seeds/"
  },
  "runOptions": {
    "ranFacts": true,
    "ranComms": true
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

## Workflow: SA Ops Smoke Path

### Recommended Flow

**Option A: Comms-only (fastest)**

```bash
cd tools/browns-guest-comms-pipeline-pack
npm run pack -- \
  --booking bookings/2026-09-20.json \
  --facts-json /workspace/stay-knowledge/the-browns-facts.json \
  --seeds /workspace/redacted-seeds/ \
  --outdir packs/
```

**Option B: Full pipeline with facts extraction**

```bash
cd tools/browns-guest-comms-pipeline-pack
npm run pack -- \
  --booking bookings/2026-09-20.json \
  --facts-md /workspace/stay-knowledge/the-browns.md \
  --seeds /workspace/redacted-seeds/ \
  --outdir packs/
```

### After Pack Generation

1. Review `PACK.md` for summary
2. Check `APPROVAL.md` for safety gates
3. Review all `draft-*.txt` files
4. Verify no invented data
5. Get approval: `APPROVE SEND GUEST COMMS PACK <date>`
6. Send manually via CoS WhatsApp

## Auto-Build Sibling Tools

**Behavior (PR #132 pattern):**

When a stage runs (e.g., `--run-facts`), this tool:

1. **Checks if sibling tool exists** at `../browns-guest-facts-pack/`
2. **Checks if built** by looking for `dist/index.js`
3. **Auto-builds if missing:**
   - Runs `npm install` if `node_modules/` missing
   - Runs `npm run build`
4. **Shells out** to sibling CLI with correct args
5. **Discovers outputs** (flat files and/or dated subdirectories)
6. **Copies to pack** with renamed files where appropriate

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

Uses `fixtures/sample-booking.json`.

**Expected output:**
- `test-out/pack-2026-09-20/PACK.md` - Pipeline index
- `test-out/pack-2026-09-20/APPROVAL.md` - Approval checklist
- `test-out/pack-2026-09-20/draft-*.txt` - Communication drafts
- `test-out/pack-2026-09-20/manifest.json` - Pipeline metadata

**Sibling tools are auto-built** during fixture test if needed.

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/browns-guest-comms-pipeline-pack/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── assembler.ts            # Pipeline orchestration logic
│   └── assembler.test.ts       # Tests
├── fixtures/
│   ├── sample-booking.json     # Sample booking
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
- ❌ **No data invention** - Never fabricates rates, Wi-Fi passwords, phones, or amenities
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

### browns-guest-facts-pack

**Purpose:** Extract structured guest facts from markdown knowledge files

**Invoked with:** Enabled when `--facts-md` provided OR `--run-facts` explicit

**Outputs copied:** `facts.json`, `snippets/*.txt`, `missing-fields.md`, `APPROVAL.md`

**Status:** Default OFF

### browns-guest-comms-draft

**Purpose:** Generate draft guest communications from booking JSON

**Invoked with:** Enabled by default (disable with `--no-run-comms`)

**Outputs copied:** `draft-*.txt`, `APPROVAL.md`, `manifest.json`

**Status:** Default ON

## Troubleshooting

### "Error: --booking is required"

Provide the booking file path:
```bash
npm run pack -- --booking booking.json
```

### "Booking file not found"

Ensure the `--booking` path is correct:
```bash
ls -l booking.json
npm run pack -- --booking ./booking.json
```

### "Sibling tool not found"

Ensure sibling tools exist:
```bash
ls -la ../browns-guest-facts-pack/
ls -la ../browns-guest-comms-draft/
```

The tool will auto-build siblings if they exist but are not built.

### "Failed to build sibling tool"

If auto-build fails:
```bash
cd ../browns-guest-facts-pack
npm install
npm run build
```

Then retry the pipeline pack.

## Exit Codes

- **0** - Ran successfully
- **1** - Bad input, validation failure, or tool error

## Future Enhancements (Not in v1)

- Multi-property support (Rivendell, other Browns properties)
- Direct NightsBridge integration (requires G2 approval)
- Email pack preview

**For now:** v1 is offline, orchestrator-only, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-guest-facts-pack** - Extract structured guest facts from markdown
- **browns-guest-comms-draft** - Generate draft guest communications
- **browns-welcome-late-pipeline-pack** - Welcome + late check-in pack
- **browns-inquiry-quote-pipeline-pack** - Inquiry → quote pipeline

## CoS Workflow Overview

```
booking.json + optional knowledge.md
    ↓
browns-guest-comms-pipeline-pack (THIS TOOL)
    ↓ (orchestrates)
    ├── browns-guest-facts-pack (optional, default OFF)
    └── browns-guest-comms-draft (default ON)
    ↓
pack-YYYY-MM-DD/
    ├── PACK.md (pipeline index)
    ├── APPROVAL.md (approval checklist)
    ├── facts.json (if facts ran)
    ├── snippets/*.txt (if facts ran)
    ├── draft-welcome-whatsapp.txt
    ├── draft-welcome-email.txt
    └── manifest.json
    ↓
Manual review by Liana / Grant
    ↓
WhatsApp Admin - The Browns (CoS)
    ↓
Manual send only (never auto-send)
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` and `PACK.md` before every send. CoS owns WhatsApp. Never auto-send. Never invent rates/Wi-Fi passwords/phones/amenities. Dullstroom / The Browns only.
