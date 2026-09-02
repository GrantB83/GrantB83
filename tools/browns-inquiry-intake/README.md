# Browns Inquiry Intake

An offline CLI tool that extracts structured booking and quote data from freeform inquiry text (email/WhatsApp paste), closing the loop for Coexistence of Service (CoS) without moving WhatsApp operations off CoS.

## 🎯 Goal

**Browns guest-flow phase-5:** Turn freeform inquiry notes into structured `booking.json` and/or `quote.json` files that can be fed to sibling Browns tools (`browns-guest-comms-draft`, `browns-quote-invoice-draft`, daily-ops).

WhatsApp stays on CoS. This tool only produces files.

## 🚫 What This Tool Does NOT Do

- ❌ No LLM API calls
- ❌ No WhatsApp Cloud API integration
- ❌ No Gmail/email sending
- ❌ No Nightsbridge or booking system integration
- ❌ No automatic rate calculation or invention
- ❌ No automatic sending of any kind

## ✅ What This Tool DOES

- ✅ Heuristic extraction of guest details from paste text
- ✅ Date parsing (multiple formats supported)
- ✅ Extracts amounts ONLY if clearly present with currency
- ✅ Generates structured JSON compatible with sibling tools
- ✅ Creates missing-fields checklist for manual completion
- ✅ Produces APPROVAL.md for human review
- ✅ Works 100% offline
- ✅ Never invents rates or amounts

## 📦 Features

### Extracted Fields

**Guest Information:**
- Guest name
- Channel (email/whatsapp/unknown)

**Dates:**
- Check-in date
- Check-out date

**Accommodation:**
- Suite or unit preference
- Number of adults
- Number of children
- Late check-in flag

**Financial (ONLY if explicitly present):**
- Deposit amount
- Total amount
- Quote amount
- Currency

**Safety:**
- No rates are invented
- No amounts are calculated
- Missing fields are tracked
- Human approval required before downstream use

### Output Files

1. **booking.json** - Compatible with browns-guest-comms-draft / daily-ops
2. **quote.json** - Compatible with browns-quote-invoice-draft
3. **missing-fields.md** - Checklist of fields that need manual entry
4. **APPROVAL.md** - Review document with all extracted fields
5. **manifest.json** - Metadata about the extraction

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-inquiry-intake
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
| `--mode` | `-m` | Output mode: `booking`, `quote`, or `both` | `both` |
| `--outdir` | `-o` | Output directory | `./out/intake-<date>` |
| `--help` | `-h` | Show help message | - |

### Examples

```bash
# Extract with default settings (both booking and quote)
npm run intake -- --text fixtures/sample-inquiry.txt

# Extract only booking data
npm run intake -- --text inquiry.txt --mode booking

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
├── booking.json          # Structured booking data
├── quote.json            # Structured quote data
├── missing-fields.md     # Checklist of fields to fill manually
├── APPROVAL.md           # Review document (READ THIS FIRST)
└── manifest.json         # Extraction metadata
```

### File Contents

**booking.json:**
```json
{
  "guestName": "Sarah Williams",
  "checkInDate": "2026-10-15",
  "checkOutDate": "2026-10-17",
  "suiteOrUnit": "Garden Suite",
  "adults": 2,
  "children": 0,
  "lateCheckIn": true,
  "channel": "email",
  "notes": "..."
}
```

**quote.json:**
```json
{
  "guestName": "Sarah Williams",
  "checkInDate": "2026-10-15",
  "checkOutDate": "2026-10-17",
  "suiteOrUnit": "Garden Suite",
  "adults": 2,
  "children": 0,
  "channel": "email",
  "notes": "..."
}
```

**Note:** Amounts (`depositAmount`, `totalAmount`, `quoteAmount`) are ONLY included if explicitly present in the inquiry text with currency symbols or keywords.

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

### 1. CoS/SA Ops receives inquiry via WhatsApp or Email

Copy the inquiry text to a file:
```bash
cat > inquiry.txt << 'EOF'
Name: Sarah Williams
From: sarah.williams@example.com

Check-in: 2026-10-15
Check-out: 2026-10-17

We'll be 2 adults.
Garden Suite please.

Arriving late around 7pm.
EOF
```

### 2. Run the intake tool

```bash
cd tools/browns-inquiry-intake
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
# Edit booking.json to fill any missing fields
```

### 5. Feed to downstream tools

```bash
# Use booking.json with guest comms tool
cd ../../browns-guest-comms-draft
npm run draft -- --booking ../browns-inquiry-intake/out/intake-2026-09-02/booking.json

# OR use quote.json with quote/invoice tool
cd ../../browns-quote-invoice-draft
npm run quote -- --data ../browns-inquiry-intake/out/intake-2026-09-02/quote.json
```

## ⚠️ Safety & Validation

### Amount Extraction Rules

The tool follows strict rules for amounts:

1. **Only extract if explicitly present** with:
   - Currency symbols (R, ZAR, $)
   - Keywords (deposit, total, quote, price)
   - Actual numbers with currency

2. **Never calculate or invent** amounts based on:
   - Dates
   - Number of guests
   - Suite type
   - Historical rates

3. **Flag for review** when amounts are extracted

### Missing Fields

Common missing fields are tracked in `missing-fields.md`:
- Guest name (if not at start of text)
- Check-in or check-out dates
- Number of adults
- Suite/unit preference

### Required Review

**⚠️ ALWAYS review APPROVAL.md before using output files with downstream tools.**

The tool makes educated guesses but cannot guarantee 100% accuracy on:
- Date formats (DD/MM vs MM/DD)
- Guest names (especially in informal text)
- Suite names (multiple spellings)
- Amounts (decimal vs thousands separators)

## 🏗️ Project Structure

```
tools/browns-inquiry-intake/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── extractor.ts          # Heuristic extraction logic
│   ├── extractor.test.ts     # Extraction tests
│   └── generator.ts          # Output file generation
├── fixtures/
│   ├── sample-inquiry.txt         # Standard email inquiry
│   ├── whatsapp-inquiry.txt       # WhatsApp format inquiry
│   ├── inquiry-with-amounts.txt   # Inquiry with explicit pricing
│   └── README.md                  # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output location (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## 🔌 Integration with Sibling Tools

### browns-guest-comms-draft

Use `booking.json` to generate guest communication drafts:
```bash
cd ../browns-guest-comms-draft
npm run draft -- --booking ../browns-inquiry-intake/out/<date>/booking.json
```

### browns-quote-invoice-draft

Use `quote.json` to generate quote or invoice drafts:
```bash
cd ../browns-quote-invoice-draft
npm run quote -- --data ../browns-inquiry-intake/out/<date>/quote.json
```

### daily-ops

Use `booking.json` for daily operations:
```bash
cd ../daily-ops
npm run ops -- --bookings ../browns-inquiry-intake/out/<date>/booking.json
```

## 🐛 Troubleshooting

### "No fields extracted" or "All fields missing"

- Check that inquiry text has recognizable patterns
- Dates should be in formats like: YYYY-MM-DD, DD/MM/YYYY, "September 15"
- Guest name should be near the top or after "Name:", "From:", etc.

### "Amounts not extracted"

- This is expected if amounts aren't in the text
- The tool NEVER invents amounts
- Add amounts manually to JSON files if needed

### "Wrong date parsed"

- Check for ambiguous formats (is 01/02/2026 Jan 2 or Feb 1?)
- Use YYYY-MM-DD format in inquiries when possible
- Review and correct in APPROVAL.md before downstream use

### File not found

- Ensure the text file exists and path is correct
- Use absolute paths if relative paths don't work

## 📄 License

MIT

## 👤 Author

Grant Brown  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

## 💡 Why This Design?

### The Problem

Guest inquiries arrive via email and WhatsApp in freeform text. CoS (Coexistence of Service) is the approved WhatsApp platform, but downstream Browns tools need structured data, not paste blobs.

### The Solution

**Offline intake step** that:
1. Extracts structured data using pattern matching (no LLM cost)
2. Tracks missing fields for manual completion
3. Generates downstream-compatible JSON files
4. Requires human approval before use
5. Works offline (no API dependencies)
6. Doesn't move WhatsApp off CoS

### The Workflow

```
WhatsApp/Email → Copy text → browns-inquiry-intake → Review APPROVAL.md
→ Fill missing fields → Use booking.json/quote.json with sibling tools
```

### Safety First

- No automatic sending
- No rate invention
- No amount calculation
- Human review required
- For Dullstroom Browns only
- Offline only

This tool completes Browns guest-flow phase-5 while respecting all existing constraints and approval gates.
