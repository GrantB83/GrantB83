# Browns Guest Communications Draft Tool

Offline CLI that generates **DRAFT** guest communications (WhatsApp, email, team notes) from booking JSON for **The Browns Luxury Guest Suites** in Dullstroom.

**⚠️ CRITICAL: DRAFT ONLY. Never sends WhatsApp/email. Never pays. Never invents rates.**

## Purpose

Phase-1 definite win for hospitality ops: turn booking facts into draft communications with appropriate tone, **without** touching live systems or sending messages.

Scope: **Dullstroom only** (Rivendell sold).

## Features

- 📝 **Offline-only** - No Gmail/WhatsApp/NightsBridge APIs; no browser
- 🎨 **Tone learning** - Loads redacted seed samples to mimic hospitality voice
- 🏨 **Multiple outputs** - WhatsApp, email, late check-in, team check-in notes
- ✅ **Approval gates** - APPROVAL.md in every job folder
- 🧪 **Fully tested** - TypeScript tests for template fill, late-check-in branching, validation
- 🔒 **No secrets** - Synthetic fixtures only in git; safe for public repo

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-guest-comms-draft
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
npm run draft -- --booking <booking-json> [--seeds <dir>] [--facts <file>] [--outdir <dir>]
```

### Required Arguments

- `--booking, -b` - Path to booking JSON file

### Optional Arguments

- `--seeds, -s` - Directory containing tone seed samples (*.txt files)
- `--facts, -f` - Path to brand facts file (JSON or Markdown)
- `--outdir, -o` - Output directory for draft job folder (default: `./out`)

### Examples

**Basic usage with fixtures:**

```bash
npm run draft -- --booking fixtures/sample-booking.json --outdir out/
```

**With seed samples:**

```bash
npm run draft -- --booking fixtures/sample-booking.json --seeds fixtures/seeds --outdir out/
```

**Production usage (SA Ops box):**

```bash
npm run draft -- \
  --booking data/booking-2026-09-20.json \
  --seeds /workspace/redacted-seeds/ \
  --facts /workspace/stay-knowledge/the-browns.md \
  --outdir drafts/
```

## Booking JSON Schema

Required fields:

```json
{
  "guestName": "string (required)",
  "checkInDate": "YYYY-MM-DD (required)",
  "checkOutDate": "YYYY-MM-DD (required)",
  "suiteOrUnit": "string (required)",
  "lateCheckIn": "boolean (optional)",
  "adults": "number (required, >= 1)",
  "children": "number (optional)",
  "notes": "string (optional)",
  "channel": "whatsapp | email (required)",
  "guestPhone": "string (optional, E.164 or local SA format)"
}
```

**Example:**

```json
{
  "guestName": "Alex Johnson",
  "checkInDate": "2026-09-20",
  "checkOutDate": "2026-09-22",
  "suiteOrUnit": "The Browns Suite",
  "lateCheckIn": true,
  "adults": 2,
  "children": 1,
  "notes": "Anniversary celebration",
  "channel": "whatsapp",
  "guestPhone": "+27 83 645 1234"
}
```

### Guest Phone Field

The optional `guestPhone` field supports E.164 format (e.g., `+27 83 645 1234`) or local SA format (e.g., `083 645 1234`).

**When present:**
- Included in team check-in notes as `Guest phone: ...`
- WhatsApp link helper included in team-facing drafts (e.g., `https://wa.me/27836451234`)
- Included in APPROVAL.md summary for CoS admin reference

**When absent:**
- Phone section omitted entirely from all drafts (no placeholders)

**Critical:** Guest phone is NEVER included in guest-facing messages (WhatsApp welcome, email welcome). It appears only in team/admin-facing drafts.

## Output Files

Each run creates a timestamped job folder (e.g., `2026-09-02T12-30-00-alex-johnson/`) with:

| File | Description |
|------|-------------|
| `draft-welcome-whatsapp.txt` | Guest welcome message for WhatsApp |
| `draft-welcome-email.txt` | Guest welcome email (subject + body) |
| `draft-late-checkin.txt` | Late check-in coordination (or N/A with template) |
| `draft-team-checkin.txt` | Internal team daily check-in note |
| `APPROVAL.md` | Approval gate reminder (H1/H2 required) |
| `manifest.json` | Job metadata |

## Seed Samples Workflow

### What are seeds?

Redacted past guest messages that demonstrate the hospitality tone. The tool analyzes them for:

- Warm greeting style ("We're delighted" vs. formal)
- First-person plural usage ("we", "our team")
- Conciseness
- Structure and sign-off patterns

### Expected structure:

```
seeds/
├── welcome-1.txt
├── welcome-2.txt
├── late-checkin-1.txt
├── late-checkin-2.txt
├── quote-followup-1.txt
└── quote-followup-2.txt
```

### Production workflow:

1. Grant/Liana drop real redacted samples into `/workspace/redacted-seeds/` on ops box
2. No code changes needed - tool reads directory dynamically
3. Fixtures in git remain synthetic for public safety

## Brand Facts

Optional file with property details. Can be JSON or Markdown.

**Production location:** `/workspace/stay-knowledge/the-browns.md` (not in this repo)

**Embedded safe defaults:**

- Address: The Browns Luxury Guest Suites, Dullstroom
- Suites: The Browns Suite, Garden Suite
- WiFi: Available (details at check-in)
- Parking: On-site parking available
- Contact email: stay@hospitality.partners
- Contact WhatsApp: +27 83 645 8313
- Check-in/out: "Team will confirm" (never invents times)

**Markdown format:**

```markdown
Address: The Browns Luxury Guest Suites, Dullstroom
Email: stay@hospitality.partners
WhatsApp: +27 83 645 8313
WiFi: Full fiber connection, details at check-in
Parking: Secure on-site parking
```

**JSON format:**

```json
{
  "address": "The Browns Luxury Guest Suites, Dullstroom",
  "contactEmail": "stay@hospitality.partners",
  "contactWhatsApp": "+27 83 645 8313",
  "wifi": "Full fiber connection",
  "parking": "Secure on-site parking"
}
```

## Testing

### Run automated tests:

```bash
npm run build
npm test
```

Tests cover:
- Template slot filling (guest name, dates, suite)
- Late check-in branch logic
- Missing guestName failure
- Never inventing rates or times
- Contact information inclusion

### Test with fixtures:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Generate drafts from `fixtures/sample-booking.json`
3. Use seed samples from `fixtures/seeds/`
4. Output to `out/` directory
5. Exit with success code

Inspect the `out/` folder to review generated drafts.

### Clean up:

```bash
npm run clean
```

## Project Structure

```
tools/browns-guest-comms-draft/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── seed-loader.ts        # Load and analyze seed samples
│   ├── facts-loader.ts       # Load brand facts (JSON/Markdown)
│   ├── generator.ts          # Generate all draft templates
│   ├── output-writer.ts      # Write job folder outputs
│   └── generator.test.ts     # Automated tests
├── fixtures/
│   ├── sample-booking.json   # Example booking data
│   ├── seeds/                # Synthetic seed samples
│   │   ├── welcome-*.txt
│   │   ├── late-checkin-*.txt
│   │   └── quote-followup-*.txt
│   └── README.md
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output directory (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Safety & Constraints

### ✅ What this tool DOES:

- Reads booking JSON
- Loads seed samples to learn tone
- Generates DRAFT text files
- Creates approval reminder
- Runs 100% offline

### ❌ What this tool NEVER does:

- Send WhatsApp messages
- Send emails
- Access Gmail/WhatsApp/NightsBridge APIs
- Invent rates, deposits, or pricing
- Invent check-in/check-out times
- Confirm availability
- Access live booking systems
- Store secrets in git

### Approval gates:

All guest-facing communications require:
- **H1**: `APPROVE SEND <thread-or-wa-id>` (per message)
- **H2**: `APPROVE SEQUENCE <name> <entity>` (template after sample)

See: `docs/automation/approval-gates.md`

## For SA Ops / CoS

### How to run:

1. Receive booking confirmation from NightsBridge or inquiry
2. Create booking JSON file with guest details
3. Run CLI:
   ```bash
   cd /workspace/GrantB83/tools/browns-guest-comms-draft
   npm run draft -- \
     --booking /path/to/booking.json \
     --seeds /workspace/redacted-seeds/ \
     --facts /workspace/stay-knowledge/the-browns.md \
     --outdir /workspace/drafts/
   ```
4. Review job folder outputs
5. Edit drafts if needed
6. Get approval (H1/H2)
7. Send manually or via approved sequence

### Seeds workflow:

Production redacted samples go in `/workspace/redacted-seeds/` on the ops box. Drop new samples there; no code changes needed. Never commit real guest PII to git.

### Facts updates:

Edit `/workspace/stay-knowledge/the-browns.md` when property details change (WiFi password, parking instructions, etc.). Tool reads it dynamically.

## Troubleshooting

### "Missing required booking fields" error

Check that booking JSON has all required fields:
- guestName
- checkInDate (YYYY-MM-DD)
- checkOutDate (YYYY-MM-DD)
- suiteOrUnit
- adults (number >= 1)
- channel ("whatsapp" or "email")

### Seeds not loading

Ensure seed files:
- Are in a directory (not a single file)
- End with `.txt`
- Follow naming pattern: `welcome-*.txt`, `late-checkin-*.txt`, etc.

### Facts not loading

Check facts file:
- Path exists
- Is valid JSON or Markdown
- Has readable permissions

If facts file is missing, tool uses safe embedded defaults.

## Hypothesis (non-binding)

Seed-dir + slot fill should be enough for v1. Real `stay@` redacted samples will be dropped into seeds later without code changes.

Future enhancements might include:
- Direct NightsBridge integration (requires G2 approval)
- Template variants per suite
- Seasonal messaging
- Multi-language support

For now: **offline, draft-only, approval-gated.**

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
