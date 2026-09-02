# Heavy Metal Delivery POD Draft

An offline CLI tool that generates DRAFT proof-of-delivery notes from Heavy Metal Sand & Stone delivery data. Designed for SA Ops workflow where delivery details are captured in structured JSON or paste text format, processed offline, and drafted for manual review.

## 🎯 Goal

**Heavy Metal delivery POD workflow:** Turn structured delivery data or freeform paste text into DRAFT proof-of-delivery notes, **never inventing volumes or signatures**.

WhatsApp stays on CoS (Coexistence of Service). This tool only produces files.

## 🚫 What This Tool Does NOT Do

- ❌ No LLM API calls
- ❌ No WhatsApp Cloud API integration
- ❌ No auto-sending of any kind
- ❌ No volume or location invention
- ❌ No signature invention
- ❌ No access to live systems

## ✅ What This Tool DOES

- ✅ Process structured JSON delivery data
- ✅ Extract POD data from paste text (driver notes, delivery slips)
- ✅ Generate DRAFT proof-of-delivery markdown
- ✅ Normalize data to pod.json format
- ✅ Track missing fields for manual completion
- ✅ Flag unsigned deliveries (never invents signatures)
- ✅ Produce APPROVAL.md for human review
- ✅ Works 100% offline
- ✅ Never invents volumes, locations, or signatures

## 📦 Features

### Input Modes

1. **Structured JSON** (`--pod pod.json`)
   - Complete delivery data in JSON format
   - All fields optional except what's present
   - Clean data entry for planned deliveries

2. **Paste Text** (`--text paste.txt`)
   - Extract from freeform text (driver notes, delivery slips, WhatsApp pastes)
   - Heuristic pattern matching
   - Handles various formats

### Extracted Fields

**Required (flagged if missing):**
- Customer name
- Material type (sand, stone, gravel, crusher dust, fill, aggregate, rock, pebble, ballast, G5, G7)
- Volume (quantity)
- Unit (m³, ton, load, etc.)
- Delivery location
- Delivered date/time

**Optional (tracked but not required):**
- Customer phone
- Vehicle/registration
- Driver name
- Notes
- **signedBy** (CRITICAL: NEVER invented - only recorded if actually present)

### Output Files

1. **pod.json** - Normalized POD data (machine-readable)
2. **pod.md** - DRAFT proof-of-delivery note (human-readable, marked as DRAFT)
3. **missing-fields.md** - Checklist of fields to fill manually
4. **APPROVAL.md** - Review document with all data and safety checklist
5. **manifest.json** - Metadata about the generation

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/hm-delivery-pod-draft
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

Generate from JSON:
```bash
npm run draft -- --pod pod.json
```

Generate from paste text:
```bash
npm run draft -- --text delivery-paste.txt
```

### CLI Options

| Option | Shorthand | Description | Default |
|--------|-----------|-------------|---------|
| `--pod` | - | Path to pod.json file | - |
| `--text` | - | Path to paste text file | - |
| `--outdir` | `-o` | Output directory | `./out/pod-<date>` |
| `--help` | `-h` | Show help message | - |

### Examples

```bash
# Generate from JSON with default output
npm run draft -- --pod fixtures/sample-pod.json

# Generate from paste text with custom output
npm run draft -- --text delivery-notes.txt --outdir out/2026-09-02/

# Test with included fixtures
npm run test:fixtures
```

## 📂 Output Structure

The tool creates an output folder with this structure:

```
out/pod-2026-09-02/
├── pod.json              # Normalized POD data
├── pod.md                # DRAFT proof-of-delivery note (MARKED AS DRAFT)
├── missing-fields.md     # Checklist of fields to fill
├── APPROVAL.md           # Review document (READ THIS FIRST)
└── manifest.json         # Generation metadata
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
  "deliveredAt": "2026-09-02 14:30",
  "vehicle": "GP 123 ABC",
  "driver": "Johannes Malema",
  "notes": "Delivered to side gate as requested.",
  "signedBy": "P. van der Merwe"
}
```

**pod.md** (DRAFT proof-of-delivery note):
```markdown
# Heavy Metal Sand & Stone - Proof of Delivery

**DRAFT ONLY - Review and complete before filing**

---

## Delivery Details

**Date:** 2026-09-02 14:30
**Customer:** Pieter van der Merwe
**Phone:** +27823456789

## Material Delivered

**Material:** Sand
**Volume:** 12 m³

## Delivery Location

123 Main Road, Dullstroom

## Delivery Details

**Vehicle:** GP 123 ABC
**Driver:** Johannes Malema

**Notes:** Delivered to side gate as requested.

---

## Signature

**Received and signed by:** P. van der Merwe

✅ Signature recorded

---

**Status:** DRAFT
**Entity:** Heavy Metal Sand & Stone, Dullstroom

⚠️ **CoS owns WhatsApp send. Never auto-send.**
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
2. Run on sample POD from fixtures/
3. Generate output in test-out/
4. Verify generation works

### Test Scenarios

The fixtures cover:
- **sample-pod.json**: Full delivery with all fields and signature
- **minimal-pod.json**: Minimum required fields only
- **sample-paste.txt**: Paste text with full information
- **unsigned-paste.txt**: Unsigned delivery (tests that signedBy is NOT invented)

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflows

### Workflow 1: JSON Entry

**SA Ops receives delivery completion via phone:**

1. Create pod.json:
   ```json
   {
     "customer": "Johan Botha",
     "phone": "0827654321",
     "material": "Stone",
     "volume": 15,
     "unit": "m³",
     "deliveryLocation": "45 Industrial Drive, Dullstroom",
     "deliveredAt": "2026-09-02 10:15",
     "vehicle": "MP 456 XYZ",
     "driver": "Thabo Mbeki",
     "notes": "Left at main entrance.",
     "signedBy": "J. Botha"
   }
   ```

2. Generate POD draft:
   ```bash
   cd tools/hm-delivery-pod-draft
   npm run draft -- --pod pod.json --outdir out/2026-09-02/
   ```

3. Review outputs:
   ```bash
   cd out/2026-09-02
   cat APPROVAL.md
   cat pod.md
   ```

4. Verify all fields accurate
5. File pod.md for records

### Workflow 2: Paste Text Extraction

**Driver sends WhatsApp delivery notes:**

1. Copy paste to file:
   ```bash
   cat > delivery-notes.txt << 'EOF'
   Customer: Maria Fernandes
   0834567890

   Gravel - 10 tons
   Delivered to: 78 Church Street, Lydenburg
   2026-08-30

   Driver: David Nkosi
   EOF
   ```

2. Extract and generate:
   ```bash
   cd tools/hm-delivery-pod-draft
   npm run draft -- --text delivery-notes.txt --outdir out/
   ```

3. Review missing-fields.md:
   ```bash
   cat out/pod-2026-09-02/missing-fields.md
   ```

4. Fill any missing data in pod.json
5. Review pod.md
6. File for records

### Workflow 3: Unsigned Delivery

**Delivery completed but customer not present to sign:**

1. Create pod.json WITHOUT signedBy field:
   ```json
   {
     "customer": "Test Customer",
     "material": "Sand",
     "volume": 8,
     "unit": "m³",
     "deliveryLocation": "Farm Road, Belfast",
     "deliveredAt": "2026-09-01",
     "driver": "Driver Name"
   }
   ```

2. Generate POD:
   ```bash
   npm run draft -- --pod pod.json
   ```

3. Review pod.md:
   - ⚠️ Will show "No signature recorded"
   - ✅ Will NOT invent a signature
   - ✅ POD is valid even unsigned

4. File pod.md noting unsigned status

## ⚠️ Safety & Validation

### Volume & Location Rules

From `docs/automation/approval-gates.md` lane:heavy-metal:
- **Confirm volume + location** for every delivery
- Never guess or estimate volumes
- Location must match actual delivery site

### Signature Rules

**CRITICAL: The tool NEVER invents the `signedBy` field.**

- If delivery was signed for, record it
- If delivery was NOT signed for, field stays `undefined`
- Unsigned deliveries are valid
- Tool explicitly flags unsigned status in pod.md
- APPROVAL.md emphasizes never inventing signatures

### Missing Fields

Common missing/optional fields tracked in `missing-fields.md`:
- Customer phone (optional)
- Vehicle/registration (optional)
- Driver name (optional)
- Notes (optional)
- Signature (optional but tracked)

### Required Review

**⚠️ ALWAYS review APPROVAL.md before using output files.**

The tool makes educated guesses but cannot guarantee 100% accuracy on:
- Customer names (especially in informal text)
- Phone number formats
- Volume units (load vs m³ vs ton)
- Delivery locations (full address vs town name)
- Date/time formats

## 🏗️ Project Structure

```
tools/hm-delivery-pod-draft/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── extractor.ts          # Heuristic extraction logic (from paste text)
│   ├── extractor.test.ts     # Extraction tests
│   └── generator.ts          # Output file generation
├── fixtures/
│   ├── sample-pod.json               # Full POD with signature
│   ├── minimal-pod.json              # Minimum fields only
│   ├── sample-paste.txt              # Paste text with signature
│   ├── unsigned-paste.txt            # Unsigned delivery (critical test)
│   └── README.md                     # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output location (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## 🔌 Integration

### Approval Gates (from docs/automation/approval-gates.md)

| Gate | Requirement |
|------|-------------|
| **lane:heavy-metal** | Confirm volume + location before any communication |
| **N7** | Never invent accommodation rates, water prices, or **sand quotes** |
| **CoS** | WhatsApp send via Coexistence of Service only |

### Entity Map (from docs/automation/entity-map.yaml)

- **Lane:** heavy-metal
- **Trading Name:** Heavy Metal Sand & Stone
- **Location:** Dullstroom (yard)
- **Emails:** grant@hmsand.co.za, mail@hmsand.co.za
- **Existing Ops:** WhatsApp-centric sales

### Automation Target

This tool addresses: `delivery-day-and-pod` from entity-map automation targets.

## 🐛 Troubleshooting

### "No fields extracted" or "All fields missing"

From paste text:
- Check that text has recognizable patterns
- Materials should match keywords: sand, stone, gravel, etc.
- Customer name should be labeled or at the top
- Volume should have number + unit

From JSON:
- Verify JSON is valid (use `cat pod.json | jq`)
- Check field names match expected schema

### "Signature not extracted"

- This is EXPECTED if delivery was unsigned
- The tool NEVER invents signatures
- Check source text for "Signed by:", "Signature:", "Received by:"
- If legitimately unsigned, this is correct behavior

### "Wrong volume parsed"

From paste text:
- Check for ambiguous units (load vs m³ vs ton)
- Review and correct in pod.json before use

From JSON:
- Verify volume and unit fields in source

### "Location not found"

From paste text:
- Location needs keywords like "delivered to", "location", "at"
- Add manually if not detected

From JSON:
- Check deliveryLocation field spelling

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Heavy Metal deliveries need proof-of-delivery records. Delivery data arrives as:
1. Structured entry (office entry from phone calls)
2. Driver notes via WhatsApp (paste text)
3. Delivery slips (manual transcription)

Need DRAFT POD notes for filing, but:
- Must NEVER invent volumes (legal/billing risk)
- Must NEVER invent signatures (legal/proof risk)
- WhatsApp must stay on CoS
- No auto-send
- Manual approval required

### The Solution

**Offline draft generator** that:
1. Accepts structured JSON OR paste text
2. Extracts data using pattern matching (no LLM cost)
3. Tracks missing fields for manual completion
4. **NEVER invents signedBy field** (unsigned deliveries are valid)
5. Generates DRAFT pod.md marked clearly as draft
6. Requires human review via APPROVAL.md
7. Works offline (no API dependencies)
8. Doesn't integrate with WhatsApp (CoS owns that)

### The Workflow

```
Delivery completion → JSON entry OR paste text → hm-delivery-pod-draft
→ Review APPROVAL.md → Fill missing fields → Verify accuracy
→ File pod.md for records → (Optional) Send summary via CoS
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

This tool completes Heavy Metal delivery-day-and-pod while respecting all existing constraints and approval gates.
