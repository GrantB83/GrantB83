# Browns Quote & Invoice Draft Generator

An offline CLI that drafts quote and invoice/proforma email + WhatsApp text from a booking/quote JSON for **The Browns Luxury Guest Suites Dullstroom**.

## 🎯 Purpose

Phase 2 of Browns guest-flow automation: Generate draft communications that Grant/Liana can review before sending.

**CRITICAL SAFETY:** This tool NEVER invents rates or totals. All amounts must come from the input JSON. Missing amounts result in availability-only drafts.

## ⚠️ Important Constraints

- **DRAFT ONLY** — Never sends email or WhatsApp
- **NO PAYMENT** — Never processes payments or payment links
- **NO INVENTED RATES** — Missing amounts = availability confirmation only
- **Dullstroom property only** — The Browns Luxury Guest Suites Dullstroom
- **Grant approval required** — All drafts must be reviewed before sending

## 📋 Features

- 📝 **WhatsApp quote drafts** — Short, warm messages for mobile
- 📧 **Email quote drafts** — Professional, formatted quotes
- 🧾 **Proforma invoice drafts** — When deposit or includeProforma flag is set
- ✅ **Approval checklist** — APPROVAL.md flags missing amounts
- 🔒 **Rate safety** — Tests prove missing amounts never generate numbers
- 🌍 **Multi-language** — English default, Afrikaans optional

## 🚀 Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-quote-invoice-draft
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## 📖 Usage

### Basic Command

```bash
npm run draft -- --quote <file> [--outdir <dir>]
```

### Examples

**Full quote with amounts:**
```bash
npm run draft -- --quote fixtures/sample-quote.json --outdir out/
```

**Availability inquiry (no amounts):**
```bash
npm run draft -- --quote fixtures/sample-quote-no-amounts.json --outdir out/
```

**With proforma invoice:**
```bash
npm run draft -- --quote fixtures/sample-booking-with-deposit.json --outdir out/
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--quote` | `-q` | Path to quote JSON file | ✅ Yes | - |
| `--outdir` | `-o` | Output directory | No | `./out` |
| `--help` | `-h` | Show help message | No | - |

## 📄 Input JSON Format

### Required Fields

```json
{
  "guestName": "John Smith",
  "checkInDate": "2026-12-15",
  "checkOutDate": "2026-12-18",
  "suiteOrUnit": "Luxury Suite 1"
}
```

### Optional Fields

```json
{
  "adults": 2,
  "children": 1,
  "notes": "Anniversary celebration",
  "channel": "direct",
  "nightlyRate": 2800,
  "nights": 3,
  "total": 8400,
  "depositRequired": 4200,
  "currency": "ZAR",
  "includeProforma": true,
  "language": "en"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `guestName` | string | Guest name (required) |
| `checkInDate` | string | ISO date or YYYY-MM-DD (required) |
| `checkOutDate` | string | ISO date or YYYY-MM-DD (required) |
| `suiteOrUnit` | string | Suite name (required) |
| `adults` | number | Number of adults |
| `children` | number | Number of children |
| `notes` | string | Additional notes for drafts |
| `channel` | string | Source channel (direct, email, whatsapp, ota) |
| `nightlyRate` | number | Rate per night |
| `nights` | number | Number of nights |
| `total` | number | Total accommodation cost |
| `depositRequired` | number | Deposit amount |
| `currency` | string | Currency code (default: ZAR) |
| `includeProforma` | boolean | Force proforma generation |
| `language` | string | 'en' or 'af' (default: en) |

## 📤 Output Files

Each run generates files in the specified output directory:

```
<outdir>/
├── draft-quote-whatsapp.txt      # WhatsApp message draft
├── draft-quote-email.txt         # Email quote draft
├── draft-proforma-email.txt      # Proforma invoice (if applicable)
├── APPROVAL.md                   # Approval checklist
└── manifest.json                 # Generation metadata
```

### When Proforma is Generated

A proforma invoice is created when:
- `depositRequired` is present and > 0, OR
- `includeProforma: true` is set

Otherwise, only quote drafts are generated.

## 🧪 Testing

### Run Automated Tests

```bash
npm run build
npm test
```

Tests include:
- ✅ Full amounts generate complete quotes
- ✅ Missing amounts NEVER invent numbers
- ✅ Partial amounts don't calculate missing values
- ✅ Proforma generation logic
- ✅ Property name appears in all drafts

### Test with Fixtures

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run on all fixtures in `fixtures/`
3. Generate output in `test-out/` and `test-out-no-amounts/`
4. Exit with code 0 on success

### Critical Safety Test

The most important test is `sample-quote-no-amounts.json`:

```bash
npm run draft -- --quote fixtures/sample-quote-no-amounts.json --outdir safety-test
```

**Verify:**
- ❌ NO currency amounts (e.g., `R2500`) in any draft
- ✅ Drafts say "confirm availability" or "send formal quote"
- ✅ `APPROVAL.md` shows `⚠️ NO AMOUNTS PROVIDED`

### Clean Up Test Artifacts

```bash
npm run clean
```

## 🎨 Tone & Style

All drafts follow Browns brand guidelines:

- **Short, warm sentences** — Easy to read, friendly
- **Signature:** "Kind regards" or "Kindest regards" + Grant Brown
- **Professional but approachable** — Luxury without stuffiness
- **Minimal emoji use** — Default is none (can be enabled if needed)
- **Property name:** The Browns Luxury Guest Suites Dullstroom
- **Languages:** English (default), Afrikaans optional

### Example WhatsApp Draft (with amounts)

```
Hi Sarah and Michael Thompson

Thank you for your inquiry about The Browns Luxury Guest Suites Dullstroom.

*Your Quote:*
Suite: Luxury Suite 1
Check-in: Friday, 15 December 2026
Check-out: Monday, 18 December 2026
Nights: 3
Rate: R2800.00 per night
Total: R8400.00

Deposit required: R4200.00

Please let me know if you would like to proceed with the booking.

Kind regards
Grant Brown
```

### Example Email Draft (no amounts)

```
Subject: Your Booking Inquiry - The Browns Luxury Guest Suites Dullstroom

Hi Emma Wilson,

Thank you for your interest in The Browns Luxury Guest Suites Dullstroom.

I can confirm availability for the following dates:

Suite: Garden Suite
Check-in: Tuesday, 20 January 2027
Check-out: Saturday, 24 January 2027

Guests: 2 adults, 1 child

Our reservations team will send you the formal quote and booking confirmation shortly.

Kindest regards,

Grant Brown
The Browns Luxury Guest Suites Dullstroom
grant@thebrowns.co.za
```

## 📁 Project Structure

```
tools/browns-quote-invoice-draft/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── json-parser.ts          # JSON input parser
│   ├── validators.ts           # Input validation
│   ├── tone.ts                 # Tone and formatting helpers
│   ├── draft-generator.ts      # Draft generation logic
│   └── draft-generator.test.ts # Critical safety tests
├── fixtures/
│   ├── sample-quote.json                   # Full amounts
│   ├── sample-quote-no-amounts.json        # No amounts (critical test)
│   ├── sample-booking-with-deposit.json    # With proforma
│   └── README.md                           # Fixture documentation
├── seeds/
│   └── README.md               # Future: real correspondence patterns
├── dist/                       # Compiled JavaScript (generated)
├── out/                        # Default output (generated)
├── package.json
├── tsconfig.json
└── README.md                   # This file
```

## 🔒 Rate Safety Logic

### When Amounts Are Provided

If the input JSON includes `nightlyRate`, `nights`, `total`, or `depositRequired`, those exact values are used in drafts:

```typescript
Rate: R2800.00 per night
Total: R8400.00
Deposit required: R4200.00
```

### When Amounts Are Missing

If amount fields are absent or zero, drafts indicate availability without numbers:

```typescript
I can confirm availability for:
Suite: Garden Suite
Check-in: Tuesday, 20 January 2027
Check-out: Saturday, 24 January 2027

Our reservations team will send you the formal quote and booking confirmation shortly.
```

### Partial Amounts

If only some fields are provided (e.g., `nightlyRate` but not `total`), the tool:
- ❌ Does NOT calculate missing values
- ✅ Shows only the provided amounts
- ✅ Indicates full details will follow

### Placeholders (Not Used by Default)

The original spec mentioned `[AMOUNT]`, `[DEPOSIT]`, `[PAYMENT_LINK]` placeholders. This implementation:
- Prefers natural language ("will send formal quote") over placeholders
- Can be extended to use placeholders if Grant requests it

## 🚦 Approval Workflow

Every run generates `APPROVAL.md` with:

1. **Booking details** — Guest, suite, dates, channel
2. **Amounts status** — Present vs missing
3. **Generated files list**
4. **Approval checklist:**
   - [ ] Amounts verified correct (or confirmed as availability-only)
   - [ ] Tone appropriate for guest
   - [ ] Ready to send via appropriate channel

**Grant must check all boxes before sending.**

## 🛠️ Troubleshooting

### "Failed to parse quote JSON" error

Ensure your JSON file:
- Is valid JSON (use a validator like `jq`)
- Contains required fields: `guestName`, `checkInDate`, `checkOutDate`, `suiteOrUnit`

### "Validation failed" errors

Check:
- Dates are in ISO format (YYYY-MM-DD)
- `checkOutDate` is after `checkInDate`
- All required fields are present and non-empty

### No proforma generated when expected

Proforma is only generated if:
- `depositRequired` is set and > 0, OR
- `includeProforma: true` is explicitly set

### Build errors

```bash
npm run clean
npm install
npm run build
```

## 🔗 Integration Points

This tool is designed to integrate with:

- **Phase 1 WhatsApp intake** (PR #2) — Slot collection → JSON → this tool
- **Phase 5 booking pipeline** — NightsBridge/Hiver → JSON → this tool
- **Conversation objects** — Input JSON can come from Phase 1 structured intakes
- **Future automation** — Grok Bot can trigger this CLI on new booking objects

## 📚 Related Documentation

- `docs/automation/BUSINESS-REQUIREMENTS.md` — Browns guest-flow context
- `docs/automation/SPEC.md` — Phase 5 hospitality pipeline
- `tools/loyverse-xero-recon/` — Sibling tool structure reference

## 🤝 For SA Ops Team

### Quick Start for SA Operations

1. **Receive booking inquiry** (WhatsApp, email, or phone)
2. **Create JSON file** with guest details:
   ```bash
   nano data/booking-$(date +%Y%m%d).json
   ```
3. **Run draft generator:**
   ```bash
   cd tools/browns-quote-invoice-draft
   npm run draft -- --quote data/booking-20261215.json --outdir drafts/
   ```
4. **Review outputs** in `drafts/` folder
5. **Check APPROVAL.md** — verify amounts (if present)
6. **Send to Grant/Liana** for approval
7. **After approval:** Copy drafts to WhatsApp/email

### Important Notes for Ops

- ⚠️ **NEVER SEND without Grant approval** — This is a draft tool only
- ✅ Always run on a fresh JSON for each inquiry
- ✅ Keep guest data secure (JSON files are not committed to git)
- ✅ Double-check dates and suite names before generating
- ❌ Do not modify drafts to add amounts that weren't in the input

### When to Use This Tool

**DO use for:**
- Direct inquiries (email, WhatsApp, phone)
- Availability confirmations
- Quote follow-ups
- Deposit requests

**DO NOT use for:**
- Booking.com or other OTA bookings (use their system)
- Price changes (get updated rate card from Grant first)
- Cancellations or refunds (follow cancellation policy)

## 📝 License

MIT

## 👤 Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** This tool DRAFTS only. Grant or Liana must approve before sending.
