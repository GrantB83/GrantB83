# Heavy Metal Quote Intake

An offline CLI tool that extracts structured quote data from Heavy Metal Sand & Stone WhatsApp inquiry text. Designed for SA Ops workflow where WhatsApp inquiries are pasted, processed, and drafted for manual approval.

## 🎯 Goal

**Heavy Metal quote-flow:** Turn freeform WhatsApp inquiry text into structured `quote.json` files with draft replies, never inventing volume, price, or delivery location.

WhatsApp stays on CoS (Coexistence of Service). This tool only produces files.

## 🚫 What This Tool Does NOT Do

- ❌ No LLM API calls
- ❌ No WhatsApp Cloud API integration
- ❌ No auto-sending of any kind
- ❌ No rate or price calculation
- ❌ No volume or location invention
- ❌ No access to live systems

## ✅ What This Tool DOES

- ✅ Heuristic extraction of customer details from paste text
- ✅ Material keyword detection (sand, stone, gravel, crusher dust, etc.)
- ✅ Volume and unit parsing (m³, ton, load)
- ✅ Extracts pricing ONLY if explicitly present with currency
- ✅ Generates structured JSON for downstream use
- ✅ Creates missing-fields checklist for manual completion
- ✅ Produces APPROVAL.md for human review before every send
- ✅ Works 100% offline
- ✅ Never invents rates, volumes, or locations

## 📦 Features

### Extracted Fields

**Customer Information:**
- Customer name
- Customer phone number (SA formats)

**Materials:**
- Sand, stone, gravel, crusher dust, fill, aggregate, rock, pebble, ballast, G5, G7

**Volume:**
- Quantity (number)
- Unit (m³, ton, load, etc.)

**Delivery:**
- Delivery location/address
- Date needed

**Financial (ONLY if explicitly present):**
- Price per unit
- Total price
- Currency (ZAR, USD)

**Safety:**
- No rates are invented
- No volumes are calculated
- Missing fields are tracked
- Human approval required before downstream use

### Output Files

1. **quote.json** - Structured quote data
2. **draft-reply.md** - Draft WhatsApp reply with placeholders
3. **missing-fields.md** - Checklist of fields that need manual entry
4. **APPROVAL.md** - Review document with all extracted fields and safety checklist
5. **manifest.json** - Metadata about the extraction

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/hm-quote-intake
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

Extract from a text file:
```bash
npm run intake -- --text inquiry.txt
```

Extract from stdin:
```bash
cat inquiry.txt | npm run intake -- --stdin
```

### CLI Options

| Option | Shorthand | Description | Default |
|--------|-----------|-------------|---------|
| `--text` | `-t` | Path to inquiry text file | - |
| `--stdin` | - | Read from stdin instead of file | false |
| `--outdir` | `-o` | Output directory | `./out/intake-<date>` |
| `--help` | `-h` | Show help message | - |

### Examples

```bash
# Extract with default settings
npm run intake -- --text fixtures/sample-inquiry.txt

# Custom output directory
npm run intake -- --text inquiry.txt --outdir out/

# Read from stdin
cat inquiry.txt | npm run intake -- --stdin

# Test with included fixtures
npm run test:fixtures
```

## 📂 Output Structure

The tool creates an output folder with this structure:

```
out/intake-2026-09-02/
├── quote.json            # Structured quote data
├── draft-reply.md        # Draft WhatsApp reply (PLACEHOLDERS ONLY)
├── missing-fields.md     # Checklist of fields to fill manually
├── APPROVAL.md           # Review document (READ THIS FIRST)
└── manifest.json         # Extraction metadata
```

### File Contents

**quote.json:**
```json
{
  "customerName": "Pieter van der Merwe",
  "customerPhone": "+27823456789",
  "materials": ["Sand"],
  "volume": 12,
  "volumeUnit": "m³",
  "deliveryLocation": "123 Main Road, Dullstroom",
  "dateNeeded": "2026-09-20",
  "notes": "..."
}
```

**Note:** Pricing fields (`pricePerUnit`, `totalPrice`, `currency`) are ONLY included if explicitly present in the inquiry text with currency symbols.

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
4. Verify extraction works

### Clean Test Artifacts

```bash
npm run clean
```

## 📝 Example Workflow

### 1. SA Ops receives inquiry via WhatsApp

Copy the inquiry text to a file:
```bash
cat > inquiry.txt << 'EOF'
Name: Pieter van der Merwe
Phone: 0823456789

I need 12 m³ of building sand delivered to Dullstroom.
Date needed: 2026-09-20

Please quote.
EOF
```

### 2. Run the intake tool

```bash
cd tools/hm-quote-intake
npm run intake -- --text inquiry.txt --outdir out/
```

### 3. Review output

```bash
cd out/intake-2026-09-02
cat APPROVAL.md
```

### 4. Fill missing fields

```bash
cat missing-fields.md
# Edit quote.json to fill any missing fields
# Check approved price card for rates
```

### 5. Review draft reply

```bash
cat draft-reply.md
# Replace placeholders with actual rates from price card
# Never invent rates
```

### 6. Manual approval and send

- Review APPROVAL.md checklist
- Get `APPROVE SEND <whatsapp-id>` from Grant
- Send via CoS WhatsApp (never auto-send)

## ⚠️ Safety & Validation

### Amount Extraction Rules

The tool follows strict rules for amounts:

1. **Only extract if explicitly present** with:
   - Currency symbols (R, ZAR, $)
   - Keywords (price, cost, quote, total)
   - Actual numbers with currency

2. **Never calculate or invent** amounts based on:
   - Volume
   - Materials
   - Location
   - Historical rates

3. **Flag for review** when amounts are extracted

### Missing Fields

Common missing fields are tracked in `missing-fields.md`:
- Customer name
- Customer phone
- Materials
- Volume or unit
- Delivery location
- Date needed

### Required Review

**⚠️ ALWAYS review APPROVAL.md before using output files.**

The tool makes educated guesses but cannot guarantee 100% accuracy on:
- Customer names (especially in informal text)
- Phone number formats
- Volume units (load vs m³ vs ton)
- Delivery locations (full address vs town name)
- Date formats (DD/MM vs MM/DD)

## 🏗️ Project Structure

```
tools/hm-quote-intake/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── extractor.ts          # Heuristic extraction logic
│   ├── extractor.test.ts     # Extraction tests
│   └── generator.ts          # Output file generation
├── fixtures/
│   ├── sample-inquiry.txt            # Standard inquiry
│   ├── inquiry-with-pricing.txt      # Inquiry with explicit pricing
│   ├── minimal-inquiry.txt           # Sparse inquiry
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
| **H1** | `APPROVE SEND <thread-or-wa-id>` required for every quote |
| **lane:heavy-metal** | Confirm volume + location before any quote |
| **N7** | Never invent accommodation rates, water prices, or **sand quotes** |

### Entity Map (from docs/automation/entity-map.yaml)

- **Lane:** heavy-metal
- **Trading Name:** Heavy Metal Sand & Stone
- **Location:** Dullstroom (yard)
- **Emails:** grant@hmsand.co.za, mail@hmsand.co.za
- **Existing Ops:** WhatsApp-centric sales

### Automation Target

This tool addresses: `structured-whatsapp-quotes` from entity-map automation targets.

## 🐛 Troubleshooting

### "No fields extracted" or "All fields missing"

- Check that inquiry text has recognizable patterns
- Materials should match keywords: sand, stone, gravel, crusher dust, etc.
- Customer name should be near the top or after "Name:", "From:", etc.
- Phone should be SA format: 082..., +27..., etc.

### "Amounts not extracted"

- This is expected if amounts aren't in the text
- The tool NEVER invents amounts
- Add pricing manually from approved price card

### "Wrong volume parsed"

- Check for ambiguous units (load vs m³ vs ton)
- Review and correct in quote.json before use

### "Location not found"

- Delivery location needs to be after keywords like "deliver", "to", "location"
- Add manually if not detected

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Heavy Metal quotes arrive via WhatsApp in freeform text. SA Ops needs structured data for quote drafts, but WhatsApp must stay on CoS. No auto-send. No rate invention. Manual approval required.

### The Solution

**Offline intake step** that:
1. Extracts structured data using pattern matching (no LLM cost)
2. Tracks missing fields for manual completion
3. Generates draft reply with placeholders only
4. Requires human approval before every send
5. Works offline (no API dependencies)
6. Doesn't move WhatsApp off CoS

### The Workflow

```
WhatsApp inquiry → Copy text → hm-quote-intake → Review APPROVAL.md
→ Fill missing fields → Check price card → Manual approve → Send via CoS
```

### Safety First

- No automatic sending
- No rate invention
- No volume or location invention
- Human review required
- For Dullstroom Heavy Metal only
- Offline only
- Lane: heavy-metal
- Gate: H1 + confirm volume + location

This tool completes Heavy Metal structured-whatsapp-quotes while respecting all existing constraints and approval gates.
