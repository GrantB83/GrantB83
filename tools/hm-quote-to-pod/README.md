# Heavy Metal Quote-to-POD Mapper

An offline CLI tool that maps `quote.json` (from hm-quote-intake) into a `pod.json` stub suitable for hm-delivery-pod-draft. Field bridge only — never invents volume, signature, or price. Never sends WhatsApp.

## 🎯 Goal

**Heavy Metal delivery workflow bridge:** Transform a quote into a POD stub so the next tool (hm-delivery-pod-draft) can generate proof-of-delivery notes. This mapper fills in what's known from the quote and explicitly flags what's missing.

WhatsApp stays on CoS (Coexistence of Service). This tool only produces files.

## 🚫 What This Tool Does NOT Do

- ❌ No LLM API calls
- ❌ No WhatsApp Cloud API integration
- ❌ No auto-sending of any kind
- ❌ No volume invention (if missing in quote, stays missing)
- ❌ No signature invention (signedBy always undefined)
- ❌ No pricing invention (POD schema doesn't have pricing anyway)
- ❌ No access to live systems

## ✅ What This Tool DOES

- ✅ Maps known fields from quote.json to pod.json structure
- ✅ Leaves missing fields undefined (explicit gaps)
- ✅ Takes first material if quote has multiple materials
- ✅ Appends optional notes from `--notes` argument
- ✅ Generates field mapping report (which fields carried vs missing)
- ✅ Produces APPROVAL.md for review
- ✅ Creates manifest.json with metadata
- ✅ Works 100% offline
- ✅ Never invents volumes, locations, or signatures

## 📦 Features

### Field Mapping

**From quote.json (hm-quote-intake) to pod.json (hm-delivery-pod-draft):**

| Quote Field        | POD Field         | Notes                                      |
|--------------------|-------------------|--------------------------------------------|
| customerName       | customer          | Direct copy                                |
| customerPhone      | phone             | Direct copy                                |
| materials[0]       | material          | First material only                        |
| volume             | volume            | Only if present (never invented)           |
| volumeUnit         | unit              | Direct copy                                |
| deliveryLocation   | deliveryLocation  | Direct copy                                |
| dateNeeded         | deliveredAt       | Placeholder (update with actual time)      |
| notes              | notes             | Copy + append --notes if provided          |
| —                  | vehicle           | Not in quote; left undefined               |
| —                  | driver            | Not in quote; left undefined               |
| —                  | signedBy          | NEVER populated (manual only)              |

**Pricing fields (pricePerUnit, totalPrice, currency):** Not carried to pod.json (POD schema doesn't include pricing).

### Output Files

1. **pod.json** - Mapped POD stub ready for hm-delivery-pod-draft
2. **mapping.md** - Field-by-field mapping report (carried vs missing)
3. **APPROVAL.md** - Review document with safety checklist
4. **manifest.json** - Metadata about the mapping

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/hm-quote-to-pod
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

Map from quote.json:
```bash
npm run map -- --quote path/to/quote.json
```

### CLI Options

| Option        | Description                                        | Default                    |
|---------------|----------------------------------------------------|----------------------------|
| `--quote`     | Path to quote.json (required)                      | -                          |
| `--outdir`    | Output directory                                   | `./out/map-<timestamp>`    |
| `--notes`     | Additional notes to append to pod notes field      | -                          |
| `--help, -h`  | Show help message                                  | -                          |

### Examples

```bash
# Basic mapping
npm run map -- --quote fixtures/sample-quote.json

# Custom output directory
npm run map -- --quote quote.json --outdir out/2026-09-02/

# With additional notes
npm run map -- --quote quote.json --notes "Rush delivery requested"

# Test with included fixtures
npm run test:fixtures
```

## 📂 Output Structure

The tool creates an output folder with this structure:

```
out/map-2026-09-02T14-30-00/
├── pod.json              # POD stub for hm-delivery-pod-draft
├── mapping.md            # Field mapping report
├── APPROVAL.md           # Review document
└── manifest.json         # Metadata
```

### File Contents

**pod.json:**
```json
{
  "customer": "Pieter van der Merwe",
  "phone": "+27823456789",
  "material": "Sand",
  "volume": 12,
  "unit": "m³",
  "deliveryLocation": "123 Main Road, Dullstroom",
  "deliveredAt": "2026-09-20",
  "notes": "Side gate access"
}
```

**Note:** `signedBy`, `vehicle`, and `driver` are NEVER populated by this mapper. They must be filled manually when known.

**mapping.md** shows which fields were carried from quote vs which are missing:

```markdown
## ✅ Fields Carried
1. customer (from customerName)
2. phone (from customerPhone)
3. material (Sand from materials[0])
4. volume
5. unit (from volumeUnit)
6. deliveryLocation
7. deliveredAt (from dateNeeded - placeholder only)
8. notes

## ❌ Fields Missing or Not Carried
1. vehicle (not in quote schema)
2. driver (not in quote schema)
3. signedBy (NEVER populated by mapper - manual only)

## 📝 Mapping Notes
1. deliveredAt copied from dateNeeded as placeholder. Update with actual delivery timestamp.
2. signedBy field intentionally left undefined. NEVER invent signatures.
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
2. Run on sample quote from fixtures/
3. Generate output in test-out/
4. Verify mapping works

### Test Scenarios

The fixtures cover:
- **sample-quote.json**: Full quote with all fields and pricing
- **minimal-quote.json**: Minimal quote with missing volume and phone
- **multi-material-quote.json**: Quote with multiple materials (tests first-material logic)

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### Scenario: Quote accepted, now preparing for delivery

1. **Quote exists** (from hm-quote-intake):
   ```json
   {
     "customerName": "Pieter van der Merwe",
     "customerPhone": "+27823456789",
     "materials": ["Sand"],
     "volume": 12,
     "volumeUnit": "m³",
     "deliveryLocation": "123 Main Road, Dullstroom",
     "dateNeeded": "2026-09-20"
   }
   ```

2. **Map to POD stub:**
   ```bash
   cd tools/hm-quote-to-pod
   npm run map -- --quote quote.json --outdir out/2026-09-20/
   ```

3. **Review mapping:**
   ```bash
   cd out/2026-09-20
   cat mapping.md
   ```

4. **Fill additional POD fields manually** (vehicle, driver, actual delivery time):
   ```bash
   # Edit pod.json to add:
   # - vehicle: "GP 123 ABC"
   # - driver: "Johannes Malema"
   # - deliveredAt: "2026-09-20 14:30" (actual time, not just date)
   ```

5. **Generate POD draft:**
   ```bash
   cd ../../hm-delivery-pod-draft
   npm run draft -- --pod ../hm-quote-to-pod/out/2026-09-20/pod.json
   ```

6. **Review POD draft and file for records**

## ⚠️ Safety & Validation

### Field Rules

From `docs/automation/approval-gates.md` lane:heavy-metal:

1. **Volume:**
   - If present in quote → carried to pod
   - If missing in quote → left undefined (NEVER invented)
   - Must be confirmed before delivery

2. **Signature:**
   - signedBy field is ALWAYS undefined from this mapper
   - Only populate manually when delivery is actually signed for
   - Unsigned deliveries are valid

3. **Location:**
   - Copied from quote if present
   - Never modified or invented

4. **Dates:**
   - dateNeeded from quote → deliveredAt in pod (placeholder)
   - Update deliveredAt with actual delivery timestamp before filing

### Missing Fields

Common missing fields tracked in `mapping.md`:
- **vehicle** (not in quote; fill when delivery is scheduled)
- **driver** (not in quote; fill when delivery is scheduled)
- **signedBy** (NEVER pre-filled; manual only after delivery)
- **volume** (if missing in quote, stays missing - do not invent)
- **phone** (if missing in quote, stays missing)

### Multiple Materials Handling

If quote contains multiple materials:
- Mapper takes first material: `materials[0]`
- Other materials noted in `mapping.md`
- Review APPROVAL.md to verify correct material chosen

### Required Review

**⚠️ ALWAYS review APPROVAL.md before using pod.json.**

The tool performs field mapping but cannot guarantee:
- Customer names are spelled correctly
- Volume and location match the actual quote agreement
- Material selection is correct (if multiple materials listed)
- Dates are in the expected format

## 🏗️ Project Structure

```
tools/hm-quote-to-pod/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── mapper.ts             # Quote-to-POD mapping logic
│   ├── mapper.test.ts        # Mapper tests
│   └── generator.ts          # Output file generation
├── fixtures/
│   ├── sample-quote.json             # Full quote
│   ├── minimal-quote.json            # Minimal quote
│   ├── multi-material-quote.json     # Multiple materials
│   └── README.md                     # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output location (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## 🔌 Integration

### Workflow Position

This tool bridges two existing Heavy Metal tools:

```
hm-quote-intake → quote.json
       ↓
 hm-quote-to-pod → pod.json (stub)
       ↓
hm-delivery-pod-draft → pod.md (POD note)
```

### Approval Gates (from docs/automation/approval-gates.md)

| Gate | Requirement |
|------|-------------|
| **lane:heavy-metal** | Confirm volume + location before any delivery communication |
| **N7** | Never invent accommodation rates, water prices, or **sand quotes** |
| **CoS** | WhatsApp send via Coexistence of Service only |

### Entity Map (from docs/automation/entity-map.yaml)

- **Lane:** heavy-metal
- **Trading Name:** Heavy Metal Sand & Stone
- **Location:** Dullstroom (yard)
- **Emails:** grant@hmsand.co.za, mail@hmsand.co.za
- **Existing Ops:** WhatsApp-centric sales

### Automation Target

This tool addresses the bridge step in: `structured-whatsapp-quotes` → POD generation workflow.

## 🐛 Troubleshooting

### "Quote file not found"

- Check that the path to quote.json is correct
- Use absolute path or relative path from current directory
- Verify file exists: `ls -la path/to/quote.json`

### "Failed to read or parse quote.json"

- Ensure quote.json is valid JSON
- Check with: `cat quote.json | jq`
- Verify file is not corrupted

### "All fields missing" or "No fields carried"

- Verify quote.json contains expected fields
- Check field names match hm-quote-intake schema
- Review quote.json format against fixtures/sample-quote.json

### "Multiple materials in quote"

- This is expected behavior (not an error)
- Mapper takes first material: `materials[0]`
- Other materials noted in `mapping.md`
- Review and edit pod.json if different material should be primary

### "Volume missing in pod.json"

- This is expected if volume was missing in quote.json
- The tool NEVER invents volumes
- Fill volume manually in pod.json before delivery

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Heavy Metal has two separate tools:
1. **hm-quote-intake** - Extracts quote.json from WhatsApp inquiry text
2. **hm-delivery-pod-draft** - Generates POD notes from pod.json

But their schemas don't match:
- Quote has `customerName`, POD needs `customer`
- Quote has `volumeUnit`, POD needs `unit`
- Quote has `materials[]`, POD needs single `material`
- POD needs `vehicle`, `driver`, `signedBy` — not in quotes

Manual copying is error-prone and tedious.

### The Solution

**Offline field bridge** that:
1. Maps known quote fields to pod fields automatically
2. Takes first material from materials array
3. Leaves missing fields explicitly undefined
4. Never invents data (volume, signature, etc.)
5. Generates mapping report showing what was carried vs missing
6. Allows optional notes append via `--notes`
7. Works offline (no API dependencies)
8. Doesn't integrate with WhatsApp (CoS owns that)

### The Workflow

```
WhatsApp inquiry → hm-quote-intake → quote.json
                        ↓
                 hm-quote-to-pod
                        ↓
                   pod.json (stub)
   [Manual: add vehicle, driver, actual delivery time]
                        ↓
             hm-delivery-pod-draft → pod.md
                        ↓
           File for records / send summary via CoS
```

### Safety First

- No automatic sending
- No volume invention
- No location invention
- **No signature invention**
- Human review required
- For Dullstroom Heavy Metal only
- Offline only
- Lane: heavy-metal
- CoS owns WhatsApp

This tool completes the quote-to-POD bridge while respecting all existing constraints and approval gates.
