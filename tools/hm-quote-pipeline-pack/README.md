# Heavy Metal Quote Pipeline Pack

An offline CLI orchestrator that assembles Heavy Metal quote pipeline outputs into one approval-ready pack: hm-quote-intake → hm-quote-to-pod → optional hm-delivery-pod-draft for a single inquiry.

## 🎯 Goal

**Heavy Metal quote-flow orchestration:** SA Ops / Heavy Metal get one pack that coordinates the quote pipeline for a single inquiry. Never invents volume/price/location/signature. Never sends WhatsApp. H1 gate reminder.

WhatsApp stays on CoS (Coexistence of Service). This tool only produces files.

## 🚫 What This Tool Does NOT Do

- ❌ No LLM API calls
- ❌ No WhatsApp Cloud API integration
- ❌ No auto-sending of any kind
- ❌ No volume, price, location, or signature invention
- ❌ No access to live systems
- ❌ No invented rates, volumes, locations, or signatures in prose

## ✅ What This Tool DOES

- ✅ Orchestrates hm-quote-intake → hm-quote-to-pod → optional hm-delivery-pod-draft
- ✅ Accepts prebuilt outputs OR shells out to sibling tools via npm run
- ✅ Assembles one pack: PACK.md index, quote.json, pod.json, optional pod.md
- ✅ Generates missing-fields summary (no invented rates/volumes in prose)
- ✅ Produces APPROVAL.md with H1 gate reminder
- ✅ Creates manifest.json with metadata
- ✅ Works 100% offline
- ✅ Never invents data - only packages existing outputs

## 📦 Features

### Orchestration Modes

**Mode 1: Prebuilt Outputs (Recommended)**
- Copy existing quote.json, pod.json, pod.md from sibling tool outputs
- Fastest and most predictable
- Recommended for production workflow

**Mode 2: Shell Out to Sibling Tools**
- Optional `--run-intake` / `--run-map` / `--run-pod`
- Requires sibling tools installed and built
- Useful for testing or integrated workflows

### Output Pack

**Pack folder structure:**
```
out/pack-YYYYMMDD/
├── PACK.md              # Pack index with quote/pod summary
├── APPROVAL.md          # Approval checklist with H1 gate reminder
├── quote.json           # Copy of quote (if present)
├── pod.json             # Copy of pod (if present)
├── pod.md               # Copy of pod draft (if present)
└── manifest.json        # Machine-readable metadata
```

### PACK.md Contents

- Quote data summary (customer, material, volume, location)
- POD data summary (if applicable)
- Missing fields list (no invented rates/volumes/locations)
- Warnings (if any inputs missing)
- Next steps checklist

### APPROVAL.md Contents

- **H1 gate:** `APPROVE SEND <whatsapp-id>` required before quote send
- **lane:heavy-metal rules:** Confirm volume + location before any quote
- **N7 reminder:** Never invent rates, volumes, locations, signatures
- Data verification checklist
- Critical missing fields alert (if applicable)
- Safety reminders

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Sibling tools** (if using `--run-*` flags):
  - `tools/hm-quote-intake/`
  - `tools/hm-quote-to-pod/`
  - `tools/hm-delivery-pod-draft/`

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/hm-quote-pipeline-pack
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

Assemble pack from prebuilt outputs:
```bash
npm run pack -- --outdir <dir> [options]
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--text <path>` | Input inquiry text file (for --run-intake) | - |
| `--quote <path>` | Existing quote.json file | - |
| `--run-intake` | Run hm-quote-intake (requires --text) | false |
| `--run-map` | Run hm-quote-to-pod (requires quote) | false |
| `--run-pod` | Run hm-delivery-pod-draft (requires pod) | false |
| `--quote-outdir <path>` | Prebuilt quote output directory | - |
| `--pod-outdir <path>` | Prebuilt pod output directory | - |
| `--pod-draft-outdir <path>` | Prebuilt pod draft output directory | - |
| `--notes <text>` | Additional notes for map step | - |
| `--outdir <path>` | Output directory (required) | - |
| `--help, -h` | Show help message | - |

### Examples

**Use prebuilt outputs (recommended):**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --quote-outdir ../hm-quote-intake/out/intake-20260902/ \
  --pod-outdir ../hm-quote-to-pod/out/map-20260902/
```

**With specific quote file:**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --quote quote.json \
  --pod-outdir ../hm-quote-to-pod/out/map-20260902/
```

**Run intake and map tools:**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt \
  --run-map
```

**Full pipeline:**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt \
  --run-map \
  --run-pod
```

**With additional notes for map step:**
```bash
npm run pack -- \
  --outdir out/pack-20260902/ \
  --quote quote.json \
  --run-map --notes "Rush delivery requested"
```

**Test with included fixtures:**
```bash
npm run test:fixtures
```

## 📂 Output Structure

The tool creates a pack folder with this structure:

```
out/pack-2026-09-02/
├── PACK.md              # Pack index and summary
├── APPROVAL.md          # Checklist with H1 gate reminder
├── quote.json           # Copy of quote (if provided)
├── pod.json             # Copy of pod (if provided)
├── pod.md               # Copy of pod draft (if provided)
└── manifest.json        # Metadata
```

### File Contents

**PACK.md:**
```markdown
# Heavy Metal Quote Pipeline Pack

**Purpose:** SA Ops / Heavy Metal orchestrated pack for single inquiry.

## Pack Contents

### ✅ Quote Data
- Customer: Pieter van der Merwe
- Phone: +27823456789
- Material: Sand
- Volume: 12 m³
- Location: 123 Main Road, Dullstroom
- Date Needed: 2026-09-20

### ✅ POD Data
- Customer: Pieter van der Merwe
- Material: Sand
- Volume: 12 m³
- Location: 123 Main Road, Dullstroom
- Vehicle: _Not Set_
- Driver: _Not Set_
- Signed By: _Not Signed_

## Missing Fields
**Quote Fields:** ✅ All required fields present
**POD Fields:** vehicle, driver (OK - fill when delivery scheduled)

## Next Steps
1. Review this pack index
2. Fill any missing fields in quote.json or pod.json
3. Read APPROVAL.md
4. Get approval before any send: `APPROVE SEND <whatsapp-id>` (H1)
5. WhatsApp stays on CoS - never auto-send
```

**APPROVAL.md:**
```markdown
# Heavy Metal Quote Pipeline - APPROVAL CHECKLIST

## Hard Gates

### H1 - Quote Send
☐ **Required approval:** `APPROVE SEND <whatsapp-id>`

### lane:heavy-metal Rules
☐ **Volume confirmed:** ✅ Yes
☐ **Location confirmed:** ✅ Yes
☐ **Material confirmed:** ✅ Yes

### N7 - Never Invent
☐ **No invented rates:** Pricing only from approved price card
☐ **No invented volumes:** All volumes from inquiry or manual entry
☐ **No invented locations:** All locations from inquiry or manual entry
☐ **No invented signatures:** signedBy field only when delivery actually signed

## Data Verification
[... full quote and pod data ...]

## Safety Reminders
- ✅ Offline only
- ✅ Never auto-send
- ✅ WhatsApp on CoS
- ⚠️ H1 gate required before any send

## Approval
☐ All hard gates checked
☐ Volume + location confirmed
☐ No invented rates/volumes/locations
☐ Missing fields filled (if applicable)
☐ H1 approval obtained
☐ Ready to proceed with quote send via CoS
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
2. Assemble pack from sample fixtures
3. Generate output in test-out/pack-YYYYMMDD/
4. Verify pack creation works

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### Scenario: New Heavy Metal inquiry received via WhatsApp

**Step 1: Extract quote from inquiry**

```bash
cd tools/hm-quote-intake
npm run intake -- --text inquiry.txt --outdir out/intake-20260902/
```

**Step 2: Map quote to POD stub**

```bash
cd ../hm-quote-to-pod
npm run map -- \
  --quote ../hm-quote-intake/out/intake-20260902/quote.json \
  --outdir out/map-20260902/
```

**Step 3: Assemble pack**

```bash
cd ../hm-quote-pipeline-pack
npm run pack -- \
  --outdir out/pack-20260902/ \
  --quote-outdir ../hm-quote-intake/out/intake-20260902/ \
  --pod-outdir ../hm-quote-to-pod/out/map-20260902/
```

**Step 4: Review pack**

```bash
cd out/pack-20260902/
cat PACK.md
cat APPROVAL.md
```

**Step 5: Fill missing fields**

```bash
# Edit quote.json to add pricing from approved price card
# Edit pod.json to add vehicle/driver when delivery scheduled
```

**Step 6: Get approval and send**

- Review APPROVAL.md checklist
- Get `APPROVE SEND <whatsapp-id>` from Grant (H1)
- Send via CoS WhatsApp (never auto-send)

### Alternative: Integrated Workflow

Run the entire pipeline in one command:

```bash
cd tools/hm-quote-pipeline-pack
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt \
  --run-map
```

## ⚠️ Safety & Validation

### H1 Gate - Quote Send

From `docs/automation/approval-gates.md`:

| Gate | Requirement |
|------|-------------|
| **H1** | `APPROVE SEND <thread-or-wa-id>` required for every quote |

Every Heavy Metal quote requires H1 approval before send. This tool generates the APPROVAL.md reminder but **does not send anything**.

### lane:heavy-metal Rules

From `docs/automation/approval-gates.md`:

1. **Volume:** Must be confirmed before any quote
2. **Location:** Must be confirmed before any quote
3. **Material:** Must be confirmed before any quote

APPROVAL.md checks these fields and flags missing data.

### N7 - Never Invent

From `docs/automation/approval-gates.md`:

Never invent accommodation rates, water prices, or **sand quotes**.

This tool:
- ✅ Never invents rates (leaves pricing for manual entry from price card)
- ✅ Never invents volumes (flags missing volumes)
- ✅ Never invents locations (flags missing locations)
- ✅ Never invents signatures (leaves signedBy undefined)

### Missing Fields

Missing fields are tracked in PACK.md:

**Critical missing fields:**
- volume
- material / materials
- deliveryLocation

Pack will warn if these are missing. Fill manually before proceeding.

**Optional missing fields:**
- customerPhone
- vehicle
- driver
- notes

These are tracked but not critical.

### Required Review

**⚠️ ALWAYS review APPROVAL.md before proceeding.**

The pack assembles existing outputs but cannot guarantee:
- Pricing is from approved price card
- Volumes and locations match inquiry
- Customer details are accurate

## 🏗️ Project Structure

```
tools/hm-quote-pipeline-pack/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   └── assembler.ts          # Pack assembly logic
├── fixtures/
│   ├── prebuilt-quote.json           # Sample quote
│   ├── prebuilt-pod.json             # Sample pod
│   ├── minimal-quote.json            # Minimal quote for testing
│   └── README.md                     # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output location (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## 🔌 Integration

### Workflow Position

This tool orchestrates three existing Heavy Metal tools:

```
hm-quote-intake → quote.json
       ↓
 hm-quote-to-pod → pod.json
       ↓
hm-delivery-pod-draft → pod.md
       ↓
hm-quote-pipeline-pack → PACK.md + APPROVAL.md
       ↓
   Manual review + H1 approval
       ↓
   Send via CoS WhatsApp
```

### Approval Gates (from docs/automation/approval-gates.md)

| Gate | Requirement |
|------|-------------|
| **H1** | `APPROVE SEND <thread-or-wa-id>` required for every quote |
| **lane:heavy-metal** | Confirm volume + location before any quote |
| **N7** | Never invent accommodation rates, water prices, or **sand quotes** |
| **CoS** | WhatsApp send via Coexistence of Service only |

### Entity Map (from docs/automation/entity-map.yaml)

- **Lane:** heavy-metal
- **Trading Name:** Heavy Metal Sand & Stone
- **Location:** Dullstroom (yard)
- **Emails:** grant@hmsand.co.za, mail@hmsand.co.za
- **Existing Ops:** WhatsApp-centric sales

### Automation Target

This tool addresses the orchestration step in: `structured-whatsapp-quotes` → POD → delivery workflow.

## 🐛 Troubleshooting

### "Sibling tool not found"

If you get errors about missing tools when using `--run-*` flags:

1. Ensure sibling tools are installed:
   ```bash
   cd tools/hm-quote-intake && npm install && npm run build
   cd ../hm-quote-to-pod && npm install && npm run build
   cd ../hm-delivery-pod-draft && npm install && npm run build
   ```

2. Or use prebuilt outputs instead of `--run-*` flags

### "Quote file not found"

- Check that the path to quote.json is correct
- Use `--quote-outdir` for a directory or `--quote` for a specific file
- Verify file exists: `ls -la path/to/quote.json`

### "All fields missing" or warnings

- This is expected if inputs are omitted
- The tool will create pack structure and list warnings in PACK.md
- Exit code 0 (success) even with warnings
- Fill missing data manually before approval

### "Critical missing fields"

- APPROVAL.md will flag volume, material, or location missing
- Cannot proceed until these are filled
- Edit quote.json or pod.json to add missing data
- Re-run pack to regenerate APPROVAL.md

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Heavy Metal has three separate tools:
1. **hm-quote-intake** - Extracts quote.json from WhatsApp inquiry text
2. **hm-quote-to-pod** - Maps quote.json to pod.json stub
3. **hm-delivery-pod-draft** - Generates POD notes from pod.json

Running these manually is tedious and error-prone. Need one pack for approval workflow.

### The Solution

**Offline pack orchestrator** that:
1. Accepts prebuilt outputs OR shells out to sibling tools
2. Copies all outputs into one dated folder
3. Generates PACK.md index with missing fields (no invented rates/volumes)
4. Produces APPROVAL.md with H1 gate reminder
5. Never invents data (volume, price, location, signature)
6. Works offline (no API dependencies)
7. Doesn't integrate with WhatsApp (CoS owns that)

### The Workflow

```
WhatsApp inquiry → hm-quote-intake → quote.json
                        ↓
                 hm-quote-to-pod → pod.json
                        ↓
             (optional) hm-delivery-pod-draft → pod.md
                        ↓
              hm-quote-pipeline-pack → PACK + APPROVAL
                        ↓
           Review APPROVAL.md → Fill missing fields
                        ↓
               Get H1 approval → Send via CoS
```

### Safety First

- No automatic sending
- No volume invention
- No location invention
- No price invention
- **No signature invention**
- Human review required (APPROVAL.md)
- H1 gate reminder
- For Dullstroom Heavy Metal only
- Offline only
- Lane: heavy-metal
- CoS owns WhatsApp

This tool completes the Heavy Metal quote pipeline orchestration while respecting all existing constraints and approval gates.
