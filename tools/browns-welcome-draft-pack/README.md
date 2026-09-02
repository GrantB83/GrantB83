# Browns Welcome Draft Pack

Offline CLI that generates welcome message stubs for CoS WhatsApp Admin from `bookings.json` (adapter output). 

**⚠️ CRITICAL: Offline only. Never auto-sends. Never invents guest phone or amounts.**

## Purpose

From `bookings.json` (output of `browns-nightsbridge-bookings-adapter`), draft same-day/upcoming welcome message stubs for CoS WhatsApp Admin. Offline only. Never auto-sends. Never invents guest phone or amounts.

Scope: **The Browns Luxury Guest Suites, Dullstroom** — CoS / SA Ops workflow.

## Features

- 📝 **Offline-only** — No WhatsApp API, no NightsBridge, no browser
- 🔍 **Smart filtering** — Check-in within configurable window (default: same-day)
- 🎨 **Warm tone** — Learned from Browns templates (warm, practical, Dullstroom)
- 🚫 **Never invents** — Placeholders `[GUEST_PHONE]` / `[RATE CARD REQUIRED]` when unknown
- 📦 **Guest facts integration** — Optional merge with `browns-guest-facts-pack` output
- ✅ **Approval gates** — APPROVAL.md in every pack
- 🧪 **Fully tested** — TypeScript with fixture tests

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-welcome-draft-pack
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
npm run draft-pack -- --bookings <json-file> [options]
```

### Required Arguments

- `--bookings, -b` — Path to bookings JSON file (from `browns-nightsbridge-bookings-adapter`)

### Optional Arguments

- `--as-of` — Date to filter from (YYYY-MM-DD, default: today)
- `--window-days` — Check-in within N days of as-of (default: 1)
- `--facts, -f` — Path to guest facts JSON (from `browns-guest-facts-pack`)
- `--outdir, -o` — Output directory for pack folder (default: `./out`)

### Examples

**Basic usage (same-day check-ins):**

```bash
npm run draft-pack -- --bookings bookings.json --outdir out/
```

**With guest facts:**

```bash
npm run draft-pack -- \
  --bookings bookings.json \
  --facts guest-facts.json \
  --outdir out/
```

**Custom window (check-ins within 2 days):**

```bash
npm run draft-pack -- \
  --bookings bookings.json \
  --as-of 2026-09-03 \
  --window-days 2 \
  --outdir out/
```

**Production workflow (CoS):**

```bash
# Step 1: Get bookings from adapter
cd tools/browns-nightsbridge-bookings-adapter
npm run adapt -- --day 2026-09-20 --input nightsbridge.csv

# Step 2: Generate welcome stubs
cd ../browns-welcome-draft-pack
npm run draft-pack -- \
  --bookings ../browns-nightsbridge-bookings-adapter/out/bookings.json \
  --facts /workspace/guest-facts/facts.json \
  --outdir packs/welcome-2026-09-20/
```

## Input Format

### Bookings JSON

Array of booking objects (from `browns-nightsbridge-bookings-adapter`):

```json
[
  {
    "guestName": "Emma Thompson",
    "checkInDate": "2026-09-02",
    "checkOutDate": "2026-09-05",
    "suiteOrUnit": "Rivendell Suite",
    "adults": 2,
    "children": 0,
    "guestPhone": "+27821234567",
    "ratePerNight": 2500,
    "currency": "ZAR",
    "notes": "Celebrating anniversary"
  }
]
```

**Required fields:**
- `guestName` — Guest name (bookings without name are skipped)
- `checkInDate` — Check-in date (YYYY-MM-DD)

**Optional fields:**
- `checkOutDate` — Check-out date (YYYY-MM-DD)
- `suiteOrUnit` — Suite/unit name
- `adults` — Number of adults
- `children` — Number of children
- `guestPhone` — Guest contact number
- `ratePerNight` — Rate per night (number)
- `currency` — Currency code (e.g., "ZAR")
- `notes` — Booking notes

### Guest Facts JSON (Optional)

Array of guest fact objects (from `browns-guest-facts-pack`):

```json
[
  {
    "guestName": "Emma Thompson",
    "preferences": "Prefers ground floor rooms",
    "allergies": "Gluten intolerant",
    "phone": "+27821234567",
    "notes": "Return guest from 2025"
  }
]
```

Facts are merged by normalized guest name (case-insensitive, whitespace-normalized).

## Output Files

All files are written to `<outdir>/`:

### `queue.md`

Numbered list of welcome stubs for CoS WhatsApp posting.

Example:
```markdown
# Welcome Message Queue

## 1. Emma Thompson — 2 Sep

See: `drafts/emma-thompson-20260902.md`

---

## 2. John Smith — 2 Sep

**Missing:** [GUEST_PHONE], [RATE CARD REQUIRED]

See: `drafts/john-smith-20260902.md`
```

### `drafts/<safe-name>.md`

Individual welcome stub per guest with warm, practical Dullstroom tone.

Example:
```markdown
# Welcome Message Stub — Emma Thompson

**Check-in:** Tuesday, 2 Sep 2026
**Check-out:** Friday, 5 Sep 2026
**Suite:** Rivendell Suite
**Guests:** 2 adults

---

Hi there,

Looking forward to welcoming you to The Browns in Dullstroom on Tuesday, 2 Sep 2026!

We've noted: Prefers ground floor rooms

**Notes:**
Celebrating anniversary

Let us know if you have any questions ahead of your stay.

Warm regards,
The Browns Team
Dullstroom
```

### `missing-fields.md`

Report of guests missing phone numbers or rate cards. Never invented — flagged for manual resolution.

### `APPROVAL.md`

Review checklist with safety gates and approval workflow:
- Offline only
- DRAFT ONLY (never sends)
- Never invents guest phone or rates
- CoS owns WhatsApp
- Grant approval required

### `manifest.json`

Machine-readable pack metadata:
```json
{
  "toolName": "browns-welcome-draft-pack",
  "version": "1.0.0",
  "generatedAt": "2026-09-02T14:30:00.000Z",
  "asOfDate": "2026-09-02",
  "windowDays": 1,
  "totalBookings": 5,
  "draftCount": 3,
  "skippedNoName": 1,
  "missingPhones": 2,
  "missingRates": 2,
  "outdir": "./out"
}
```

## Critical Safety Notes

- ✅ **Offline only** — No WhatsApp API or NightsBridge integration
- ✅ **DRAFT ONLY** — Never sends messages automatically
- ✅ **Never invents guest phone** — Placeholder `[GUEST_PHONE]` when unknown
- ✅ **Never invents rates** — Placeholder `[RATE CARD REQUIRED]` when unknown
- ✅ **CoS owns WhatsApp** — Coexistence of Service required for all Admin posts
- ✅ **Skips missing names** — Bookings without `guestName` are filtered out
- ⚠️ **Manual approval required** — Review APPROVAL.md before every WhatsApp post
- ⚠️ **Grant approval required** — Before posting to WhatsApp Admin - The Browns

## Integration

### Consumes

- **`browns-nightsbridge-bookings-adapter`** — `bookings.json`
- **`browns-guest-facts-pack`** — `guest-facts.json` (optional)

### Feeds Into

- **`browns-guest-comms-draft`** — For full welcome messages
- **`browns-ct-pack-assemble`** — For timed CT packs (automated integration via `--run-welcome`)

### Wire Integration with browns-ct-pack-assemble

The welcome-draft-pack is now wired into `browns-ct-pack-assemble` via the `--run-welcome` flag:

```bash
# Automated integration (recommended)
cd ../browns-ct-pack-assemble
npm run assemble -- \
  --day 2026-09-20 \
  --outdir out/ct-2026-09-20/ \
  --bookings bookings.json \
  --run-welcome

# With facts (optional)
npm run assemble -- \
  --day 2026-09-20 \
  --outdir out/ct-2026-09-20/ \
  --bookings bookings.json \
  --facts facts.json \
  --run-welcome
```

The CT pack assembler will:
1. Shell out to `browns-welcome-draft-pack` with `--as-of` set to pack day
2. Copy `queue.md` → `welcome-queue.md` in CT pack
3. Copy `drafts/*.md` → `welcome-*.md` in CT pack
4. Fold welcome drafts into 20:00 CT morning guest drafts slot
5. Note welcome pack in `APPROVAL.md` and `manifest.json`

This integration provides a single-command workflow for assembling all timed CT pack components, including same-day welcome messages.

## Testing

### Run All Fixture Tests

```bash
npm run test:fixtures
```

This runs three test scenarios:
1. **Basic** — No guest facts
2. **Facts** — With guest facts merging
3. **Window** — Custom date window (2-day window from Sep 3)

### Run Individual Tests

```bash
# Basic test
npm run test:fixtures:basic

# Test with facts
npm run test:fixtures:facts

# Test with custom window
npm run test:fixtures:window
```

### Manual Testing

```bash
# Build first
npm run build

# Test with custom data
npm run draft-pack -- \
  --bookings path/to/bookings.json \
  --facts path/to/facts.json \
  --as-of 2026-09-05 \
  --window-days 3 \
  --outdir test-output/
```

## Behavioral Details

### Filtering Logic

1. **Filter by check-in date:** `asOfDate <= checkInDate < asOfDate + windowDays`
2. **Skip missing guest name:** Bookings without `guestName` are excluded
3. **Default window:** 1 day (same-day check-ins only)

### Safe Filename Generation

Guest names are converted to safe filenames:
- Lowercase
- Non-alphanumeric replaced with `-`
- Appended with check-in date slug
- Example: `emma-thompson-20260902.md`

### Guest Facts Merging

- Guest facts are matched by normalized name (case-insensitive, whitespace-normalized)
- Known facts (preferences, allergies) are included in welcome stubs
- Phone from facts takes precedence if booking phone is missing

### Placeholder Rules

- **`[GUEST_PHONE]`** — When `guestPhone` missing in booking and facts
- **`[RATE CARD REQUIRED]`** — When `ratePerNight` or `currency` missing in booking

## Troubleshooting

### Error: Bookings file not found

**Solution:** Verify the path to `bookings.json` is correct.

### Error: Bookings JSON must be an array

**Solution:** Ensure `bookings.json` is a JSON array, not a single object.

### Warning: Guest facts file not found

**Solution:** The `--facts` argument is optional. If provided, ensure the path is correct.

### No drafts generated

**Check:**
1. Are there bookings with `checkInDate` within the window?
2. Do the bookings have `guestName` filled?
3. Is the `--as-of` date correct?

## Development

### Build

```bash
npm run build
```

### Clean

```bash
npm run clean
```

### Project Structure

```
tools/browns-welcome-draft-pack/
├── src/
│   ├── index.ts           # CLI entry point and argument parsing
│   ├── types.ts           # TypeScript interfaces
│   ├── filter.ts          # Booking filtering by date window
│   ├── facts-loader.ts    # Guest facts loading and merging
│   ├── generator.ts       # Welcome stub generation
│   └── output-writer.ts   # Output file writing
├── fixtures/
│   ├── sample-bookings.json
│   ├── sample-facts.json
│   └── README.md
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
