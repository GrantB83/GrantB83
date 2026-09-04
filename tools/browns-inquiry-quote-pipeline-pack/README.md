# Browns Inquiry Quote Pipeline Pack

An offline CLI tool that orchestrates Browns inquiry → quote draft into one pipeline pack: `browns-inquiry-intake` (optional) → `browns-quote-invoice-draft` (default ON).

**Purpose:** Wire inquiry text/JSON into quote drafts for **The Browns Luxury Guest Suites Dullstroom** only. Never invents rates. Never auto-sends.

## 🎯 Goal

**Browns guest-flow orchestration:** SA Ops / Browns get one pack that coordinates the inquiry-to-quote pipeline for a single inquiry. Never invents amounts. Never sends mail/WhatsApp. H7 gate reminder.

WhatsApp stays on CoS (Coexistence of Service). This tool only produces files.

## 🚫 What This Tool Does NOT Do

- ❌ No LLM API calls
- ❌ No WhatsApp Cloud API integration
- ❌ No Gmail/email sending
- ❌ No automatic rate calculation or invention
- ❌ No auto-sending of any kind
- ❌ No access to live systems
- ❌ No invented rates or amounts in prose

## ✅ What This Tool DOES

- ✅ Orchestrates browns-inquiry-intake → browns-quote-invoice-draft
- ✅ Accepts inquiry text OR existing inquiry JSON
- ✅ Optionally runs browns-inquiry-intake (PR #114 boolean skip flags)
- ✅ Runs browns-quote-invoice-draft on structured inquiry (default ON)
- ✅ Assembles one pack: PACK.md index, quote drafts, missing-fields summary
- ✅ Generates APPROVAL.md with H7 gate reminder
- ✅ Creates manifest.json accurate to present files (PR #116)
- ✅ Works 100% offline
- ✅ Never invents data - only packages existing outputs
- ✅ Flags `[RATE CARD REQUIRED]` when amounts missing

## 📦 Features

### Orchestration Modes

**Mode 1: Existing Inquiry JSON (Recommended)**
- Use output from previous browns-inquiry-intake run
- Fastest and most predictable
- Recommended for production workflow

**Mode 2: Run Intake from Text**
- Shell out to browns-inquiry-intake
- Extract structured data from freeform inquiry text
- Useful for integrated workflows

### Optional Stages (PR #114 Pattern)

**Boolean skip flags:**
- `--run-intake` - Run browns-inquiry-intake (default: false, requires --text)
- `--run-quote` - Run browns-quote-invoice-draft (default: **true**)

**Skip syntax:**
```bash
# Default: quote runs
npm run pack -- --inquiry data.json --outdir out/

# Skip quote explicitly:
npm run pack -- --inquiry data.json --outdir out/ --run-quote=false
npm run pack -- --inquiry data.json --outdir out/ --run-quote false
npm run pack -- --inquiry data.json --outdir out/ --no-run-quote
```

### Output Pack

**Pack folder structure:**
```
out/pack-YYYYMMDD/
├── PACK.md                       # Pack index with inquiry/quote summary
├── APPROVAL.md                   # Approval checklist with H7 gate reminder
├── intake-booking.json           # From intake (if --run-intake)
├── intake-quote.json             # From intake (if --run-intake)
├── intake-missing-fields.md      # From intake (if --run-intake)
├── draft-quote-whatsapp.txt      # WhatsApp message draft (if --run-quote)
├── draft-quote-email.txt         # Email quote draft (if --run-quote)
├── draft-proforma-email.txt      # Proforma invoice (if amounts + --run-quote)
└── manifest.json                 # Machine-readable metadata (PR #116)
```

### PACK.md Contents

- Inquiry data summary (guest, dates, suite, guests)
- Amounts summary (if present) OR `[RATE CARD REQUIRED]` flag
- Generated files list (accurate to what was actually created)
- Warnings (if any inputs missing or stages skipped)
- Next steps checklist

### APPROVAL.md Contents

- **H7 gate:** `APPROVE SEND <thread-or-wa-id>` required before quote send
- **lane:hospitality-partners rules:** Dates + suite + guests confirmed
- **N7 reminder:** Never invent accommodation rates
- Data verification checklist
- `[RATE CARD REQUIRED]` alert if amounts missing
- Safety reminders

### manifest.json (PR #116)

Accurate metadata reflecting **only present files**:
```json
{
  "tool": "browns-inquiry-quote-pipeline-pack",
  "version": "1.0.0",
  "generatedAt": "2026-09-02T10:30:00.000Z",
  "intakeRan": true,
  "quoteRan": true,
  "files": [
    "PACK.md",
    "APPROVAL.md",
    "intake-booking.json",
    "draft-quote-whatsapp.txt",
    "manifest.json"
  ],
  "guestName": "Sarah Thompson",
  "checkInDate": "2026-12-15",
  "checkOutDate": "2026-12-18",
  "hasAmounts": false
}
```

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools** (if using --run-intake or --run-quote flags):
  - `tools/browns-inquiry-intake/`
  - `tools/browns-quote-invoice-draft/`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-inquiry-quote-pipeline-pack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## 🚀 Usage

### Basic Usage

Assemble pack from existing inquiry JSON:
```bash
npm run pack -- --inquiry <path> --outdir <dir>
```

Run intake from inquiry text:
```bash
npm run pack -- --run-intake --text <path> --outdir <dir>
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--text <path>` | Input inquiry text file (for --run-intake) | - |
| `--inquiry <path>` | Existing inquiry JSON file | - |
| `--run-intake` | Run browns-inquiry-intake (requires --text) | false |
| `--run-quote` | Run browns-quote-invoice-draft | **true** |
| `--intake-outdir <path>` | Custom intake output directory | - |
| `--notes <text>` | Additional notes | - |
| `--outdir <path>` | Output directory (required) | - |
| `--help, -h` | Show help message | - |

### Examples

**Use existing inquiry JSON (recommended):**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --inquiry ../browns-inquiry-intake/out/intake-20260902/booking.json
```

**Run intake from text:**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt
```

**Run intake + skip quote:**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt \
  --run-quote=false
```

**Test with included fixtures:**
```bash
npm run test:fixtures
```

## 📂 Output Structure

The tool creates a pack folder with this structure:

```
out/pack-2026-09-02/
├── PACK.md                       # Pack index and summary
├── APPROVAL.md                   # Checklist with H7 gate reminder
├── intake-booking.json           # From intake (if ran)
├── intake-quote.json             # From intake (if ran)
├── intake-missing-fields.md      # From intake (if ran)
├── draft-quote-whatsapp.txt      # WhatsApp draft (if ran)
├── draft-quote-email.txt         # Email draft (if ran)
├── draft-proforma-email.txt      # Proforma (if amounts present)
└── manifest.json                 # Metadata
```

### File Contents Examples

**PACK.md:**
```markdown
# Browns Inquiry Quote Pipeline Pack

**Purpose:** Dullstroom / The Browns orchestrated pack for single inquiry → quote draft.

**SAFETY:** Never invents rates. Never auto-sends mail/WhatsApp. H7 approval required.

## Pack Contents

### ✅ Inquiry Intake
- `intake-booking.json` — Structured booking data
- `intake-quote.json` — Structured quote data
- `intake-missing-fields.md` — Missing fields checklist

### ✅ Quote Drafts
- `draft-quote-whatsapp.txt` — WhatsApp message draft
- `draft-quote-email.txt` — Email quote draft

## Inquiry Summary

- **Guest:** Sarah Thompson
- **Dates:** 2026-12-15 to 2026-12-18
- **Suite:** Luxury Suite 1
- **Guests:** 2 adults
- **Channel:** email

### ⚠️  NO AMOUNTS PROVIDED

Drafts will be availability-only. Add amounts manually from rate card if needed.

[RATE CARD REQUIRED] if amounts are missing.

## Next Steps

1. Review this pack index
2. If amounts missing, fill from approved rate card (never invent)
3. Read APPROVAL.md
4. Get H7 approval before any guest send: `APPROVE SEND <thread-or-wa-id>`
5. Never auto-send — Grant/Liana review required
```

**APPROVAL.md:**
```markdown
# Browns Inquiry Quote Pipeline - APPROVAL CHECKLIST

## Hard Gates

### H7 - Quote Send
☐ **Required approval:** `APPROVE SEND <thread-or-wa-id>`

### lane:hospitality-partners Rules
☐ **Dates confirmed:** ✅ Yes
☐ **Suite confirmed:** ✅ Yes
☐ **Guests confirmed:** ✅ Yes

### N7 - Never Invent
☐ **No invented rates:** Amounts only from inquiry or approved rate card
☐ **Amounts source:** ⚠️  [RATE CARD REQUIRED]
☐ **No auto-send:** Human review required

## Data Verification

- Guest Name: Sarah Thompson
- Check-in: 2026-12-15
- Check-out: 2026-12-18
- Suite: Luxury Suite 1
- Guests: 2 adults

**⚠️  NO AMOUNTS PROVIDED**

[RATE CARD REQUIRED] — Add amounts manually from approved rate card before sending.

## Safety Reminders

- ✅ Offline only
- ✅ Never auto-send
- ✅ Dullstroom / The Browns only
- ⚠️  H7 gate required before any send
- ⚠️  Never invent rates or amounts

## Approval

☐ All hard gates checked
☐ Dates + suite + guests confirmed
☐ Amounts verified (or [RATE CARD REQUIRED] acknowledged)
☐ No invented rates/amounts
☐ H7 approval obtained
☐ Ready to proceed with quote send (Grant/Liana approval)
```

## 🧪 Testing

### Run All Tests

```bash
npm run build
npm test
```

### Test with Fixtures

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run on sample inquiry from fixtures/
3. Generate output in test-out/
4. Verify pack creation works

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### Scenario: New Browns inquiry received via WhatsApp

**Step 1: Extract inquiry (if needed)**

If starting with freeform text:
```bash
cd tools/browns-inquiry-quote-pipeline-pack
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt
```

If already have inquiry JSON from previous intake:
```bash
cd tools/browns-inquiry-quote-pipeline-pack
npm run pack -- \
  --outdir out/pack-20260902/ \
  --inquiry ../browns-inquiry-intake/out/intake-20260902/booking.json
```

**Step 2: Review pack**

```bash
cd out/pack-20260902/
cat PACK.md
cat APPROVAL.md
```

**Step 3: Fill missing fields**

If PACK.md shows `[RATE CARD REQUIRED]`:
- Get approved rate card from Grant
- Add amounts manually to inquiry JSON
- Re-run pack to regenerate drafts

**Step 4: Get approval and send**

- Review APPROVAL.md checklist
- Get `APPROVE SEND <thread-or-wa-id>` from Grant (H7)
- Liana reviews guest-facing drafts
- Send via CoS WhatsApp or manual copy (never auto-send)

### Alternative: Integrated Workflow

Run the entire pipeline in one command:

```bash
cd tools/browns-inquiry-quote-pipeline-pack
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt
  # --run-quote is default ON
```

## ⚠️ Safety & Validation

### H7 Gate - Quote Send

From `docs/automation/approval-gates.md`:

| Gate | Requirement |
|------|-------------|
| **H7** | `APPROVE SEND <thread-or-wa-id>` required for every quote |

Every Browns quote requires H7 approval before send. This tool generates the APPROVAL.md reminder but **does not send anything**.

### lane:hospitality-partners Rules

From `docs/automation/approval-gates.md`:

1. **Dates:** Must be confirmed before any quote
2. **Suite:** Must be confirmed before any quote
3. **Guests:** Number must be confirmed before any quote
4. **Liana:** Draft to her queue when guest-facing

APPROVAL.md checks these fields and flags missing data.

### N7 - Never Invent

From `docs/automation/approval-gates.md`:

Never invent **accommodation rates**, water prices, or sand quotes.

This tool:
- ✅ Never invents rates (leaves pricing for manual entry from rate card)
- ✅ Never calculates amounts (only uses provided amounts)
- ✅ Flags `[RATE CARD REQUIRED]` when amounts missing
- ✅ Never invents deposit amounts

### Missing Fields

Missing fields are tracked in PACK.md:

**Critical missing fields:**
- guestName
- checkInDate / checkOutDate
- suiteOrUnit
- adults

Pack will warn if these are missing. Fill manually before proceeding.

**When amounts missing:**
- PACK.md shows `⚠️  NO AMOUNTS PROVIDED`
- PACK.md shows `[RATE CARD REQUIRED]`
- APPROVAL.md shows `[RATE CARD REQUIRED]`
- Quote drafts will be availability-only

### Required Review

**⚠️ ALWAYS review APPROVAL.md before proceeding.**

The pack assembles existing outputs but cannot guarantee:
- Amounts are from approved rate card
- Guest details are accurate
- Dates are available in booking system

## 🏗️ Project Structure

```
tools/browns-inquiry-quote-pipeline-pack/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── assembler.ts          # Pack assembly logic
│   └── assembler.test.ts     # Tests
├── fixtures/
│   ├── sample-inquiry.txt              # Sample inquiry text
│   ├── sample-inquiry-with-amounts.json # Sample with amounts
│   └── README.md                       # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output location (generated)
├── package.json
├── tsconfig.json
├── .gitignore
├── APPROVAL.md               # Tool approval document
└── README.md                 # This file
```

## 🔌 Integration

### Workflow Position

This tool orchestrates two existing Browns tools:

```
inquiry.txt
     ↓
browns-inquiry-intake → booking.json / quote.json
     ↓
browns-quote-invoice-draft → draft-quote-*.txt
     ↓
browns-inquiry-quote-pipeline-pack → PACK.md + APPROVAL.md
     ↓
  Manual review + H7 approval
     ↓
  Send via CoS WhatsApp
```

### Approval Gates (from docs/automation/approval-gates.md)

| Gate | Requirement |
|------|-------------|
| **H7** | `APPROVE SEND <thread-or-wa-id>` required for every quote |
| **lane:hospitality-partners** | Dates + suite + guests confirmed |
| **N7** | Never invent **accommodation rates**, water prices, or sand quotes |
| **CoS** | WhatsApp send via Coexistence of Service only |

### Entity Map (from docs/automation/entity-map.yaml)

- **Lane:** hospitality-partners
- **Trading Names:** The Browns Guest Suites, Hospitality Partners
- **Location:** Dullstroom
- **Emails:** grant@thebrowns.co.za, stay@hospitality.partners
- **Existing Ops:** Hiver, NightsBridge, WhatsApp Cloud API (PR #2)

### Automation Target

This tool addresses the orchestration step in: `inquiry-to-quote` → booking workflow.

## 🐛 Troubleshooting

### "Sibling tool not found"

If you get errors about missing tools when using `--run-*` flags:

1. Ensure sibling tools are installed:
   ```bash
   cd tools/browns-inquiry-intake && npm install && npm run build
   cd ../browns-quote-invoice-draft && npm install && npm run build
   ```

2. Or use prebuilt outputs instead of `--run-*` flags

### "All fields missing" or warnings

- This is expected if inputs are omitted
- The tool will create pack structure and list warnings in PACK.md
- Exit code 0 (success) even with warnings
- Fill missing data manually before approval

### "[RATE CARD REQUIRED]" appears

- This is correct behavior when amounts are missing
- Get approved rate card from Grant
- Add amounts to inquiry JSON manually
- Re-run pack to regenerate quote drafts with amounts

### Boolean flag parsing (PR #114)

Supported syntaxes:
```bash
--run-quote           # Enable (default)
--run-quote=false     # Disable with equals
--run-quote false     # Disable with space
--no-run-quote        # Disable with negative flag
```

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Browns has two separate tools:
1. **browns-inquiry-intake** - Extracts structured data from freeform text
2. **browns-quote-invoice-draft** - Generates quote drafts from structured data

Running these manually is tedious and error-prone. Need one pack for approval workflow.

### The Solution

**Offline pack orchestrator** that:
1. Accepts inquiry text OR existing inquiry JSON
2. Optionally shells out to browns-inquiry-intake
3. Runs browns-quote-invoice-draft (default ON, PR #114 skip flags)
4. Copies all outputs into one dated folder
5. Generates PACK.md index with `[RATE CARD REQUIRED]` flag when amounts missing
6. Produces APPROVAL.md with H7 gate reminder
7. Never invents rates or amounts (N7 rule)
8. Works offline (no API dependencies)
9. Doesn't integrate with WhatsApp (CoS owns that)
10. Creates accurate manifest.json (PR #116)

### The Workflow

```
WhatsApp inquiry → browns-inquiry-intake → booking.json
                        ↓
             browns-quote-invoice-draft → drafts
                        ↓
         browns-inquiry-quote-pipeline-pack → PACK + APPROVAL
                        ↓
           Review APPROVAL.md → Fill [RATE CARD REQUIRED]
                        ↓
               Get H7 approval → Send via CoS
```

### Safety First

- No automatic sending
- No rate invention
- No amount calculation
- `[RATE CARD REQUIRED]` flag when amounts missing
- Human review required (APPROVAL.md)
- H7 gate reminder
- For Dullstroom / The Browns only
- Offline only
- Lane: hospitality-partners
- CoS owns WhatsApp

This tool completes the Browns inquiry-to-quote pipeline orchestration while respecting all existing constraints and approval gates.

## 📚 Related Tools

- **tools/browns-inquiry-intake/** - Extract structured data from inquiry text
- **tools/browns-quote-invoice-draft/** - Generate quote drafts from structured data
- **tools/hm-quote-pipeline-pack/** - Similar pattern for Heavy Metal
- **tools/family-morning-digest-pipeline-pack/** - Similar pattern for Family digest

## 🔗 Related Documentation

- `docs/automation/BUSINESS-REQUIREMENTS.md` - Phase 5 hospitality pipeline
- `docs/automation/SPEC.md` - Phase 5 booking pipeline details
- `docs/automation/approval-gates.md` - H7, N7, lane:hospitality-partners rules
- `docs/automation/entity-map.yaml` - hospitality-partners entity definition
- PR #114 - Boolean flag parsing pattern
- PR #116 - Accurate manifest.json pattern
