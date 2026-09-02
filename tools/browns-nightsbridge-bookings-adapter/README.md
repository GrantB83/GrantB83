# Browns Nightsbridge Bookings Adapter CLI

An offline command-line tool that transforms Nightsbridge-ish day sheets (CSV/TSV/pasted tables) into the `bookings.json` schema consumed by `browns-daily-ops-brief`.

**Offline adapter only** - no Nightsbridge API, no browser automation, no auto-send.

Part of the Browns guest-flow automation for **Dullstroom The Browns Luxury Guest Suites**.

## Problem

SA Ops currently hand-builds `bookings.json` for the daily ops brief by manually transcribing data from the Nightsbridge screen. This adapter eliminates that repetitive work by accepting a simple CSV/TSV export or pasted table and outputting the exact JSON format that `browns-daily-ops-brief` expects.

## Solution

Paste or export your Nightsbridge day sheet → adapter transforms it → feed `bookings.json` into `browns-daily-ops-brief`.

## Features

- 📊 **Flexible input** - CSV, TSV, or stdin pasted table
- 🔍 **Auto-detect delimiter** - Comma or tab, no need to specify
- 🗂️ **Alias mapping** - Handles common header variations (guest/name/guestName, suite/room/unit, arrive/check-in, etc.)
- 📅 **Status derivation** - Infers arriving/inhouse/departing from target day vs. check-in/check-out dates
- ⚠️ **Late check-in detection** - Flags from column or notes ("late arrival", "late check-in")
- 📝 **Missing field tracking** - Reports rows/fields that couldn't be mapped
- 🎯 **Multiple outputs** - bookings.json, bookings.csv, missing-fields.md, APPROVAL.md, manifest.json
- ✅ **Offline & safe** - No API calls, no invented data, draft outputs only
- 🚀 **Zero runtime dependencies** - Pure TypeScript

## Purpose & Scope

**What this tool does:**
- Reads a Nightsbridge-ish CSV/TSV file or pasted table
- Normalizes header aliases to canonical field names
- Derives booking status from dates and target day
- Outputs bookings.json for `browns-daily-ops-brief`
- Flags missing or unmappable fields
- Generates approval documentation

**What this tool does NOT do:**
- ❌ Connect to Nightsbridge API
- ❌ Invent guest names, dates, or suite assignments
- ❌ Write back to Nightsbridge
- ❌ Send WhatsApp or email messages
- ❌ Generate rates or amounts

**Property:** Dullstroom The Browns Luxury Guest Suites only (v1)

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-nightsbridge-bookings-adapter
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
npm run adapt -- --day YYYY-MM-DD --input <file> [options]
```

### Examples

**From CSV file:**
```bash
npm run adapt -- --day 2026-09-20 --input nightsbridge-export.csv
```

**From TSV file:**
```bash
npm run adapt -- --day 2026-09-20 --input nightsbridge-export.tsv --outdir reports/
```

**From pasted table (stdin):**
```bash
cat table.txt | npm run adapt -- --day 2026-09-20 --paste
```

**Using test fixtures:**
```bash
npm run adapt -- --day 2026-09-20 --input fixtures/nightsbridge-good.csv --outdir out/
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--day` | ✅ Yes | Target date (YYYY-MM-DD) for status derivation | - |
| `--input` | Conditional | Path to CSV/TSV file | - |
| `--paste` | Conditional | Read from stdin (pasted text) | - |
| `--outdir` | No | Output directory | `./out` |
| `--help` | No | Show help message | - |

**Note:** Either `--input` or `--paste` is required (not both).

## Input Format

### Supported Headers (Case-Insensitive Aliases)

The adapter recognizes common header variations and maps them to canonical fields:

| Canonical Field | Accepted Aliases |
|----------------|------------------|
| `guestName` | guest, name, guestName, guest name, guest_name |
| `suiteOrUnit` | suite, unit, room, suiteOrUnit, suite or unit, suite/unit |
| `checkInDate` | arrive, checkin, check-in, check in, arrival, arrival date |
| `checkOutDate` | depart, checkout, check-out, check out, departure, departure date |
| `adults` | adults, adult, num_adults, number of adults |
| `children` | children, child, kids, num_children, number of children |
| `notes` | notes, note, comments, comment, special requests, remarks |
| `lateCheckIn` | late, latecheckin, late checkin, late check-in, late arrival |
| `status` | status, booking status |

### CSV Example

```csv
Guest Name,Suite,Check-in,Check-out,Adults,Children,Notes,Late
Sarah & Tom Henderson,Luxury Suite 1,2026-09-20,2026-09-22,2,0,Anniversary,false
The Mbeki Family,Family Suite 3,2026-09-20,2026-09-24,2,2,Late arrival ~19:00,true
```

### TSV Example

```tsv
name	room	arrive	depart	adults	kids	special requests
Emma Thompson	Garden Suite 2	2026-09-20	2026-09-22	1	0	Vegetarian breakfast
```

## Output Files

All outputs are written to `--outdir` (default: `./out`):

### 1. `bookings.json`

**Primary deliverable** - Array of booking objects matching the schema expected by `browns-daily-ops-brief`.

**Schema:**
```json
[
  {
    "guestName": "Sarah & Tom Henderson",
    "suiteOrUnit": "Luxury Suite 1",
    "status": "arriving",
    "checkInDate": "2026-09-20",
    "checkOutDate": "2026-09-22",
    "lateCheckIn": false,
    "adults": 2,
    "children": 0,
    "notes": "Anniversary celebration"
  }
]
```

**Fields:**
- `guestName` (string, required)
- `suiteOrUnit` (string, required)
- `status` (string, required) - One of: `arriving`, `inhouse`, `departing`, or empty string
- `checkInDate` (string, optional) - YYYY-MM-DD format
- `checkOutDate` (string, optional) - YYYY-MM-DD format
- `lateCheckIn` (boolean, optional)
- `adults` (number, optional)
- `children` (number, optional)
- `notes` (string, optional)

### 2. `bookings.csv`

Human-readable CSV version of bookings.json for spreadsheet review.

### 3. `missing-fields.md`

Markdown report of rows and fields that could not be mapped or are incomplete.

**Example:**
```markdown
# Missing Fields Report

⚠️ 2 field(s) missing or could not be mapped.

| Row | Guest | Field | Reason |
|-----|-------|-------|--------|
| 2 | Anna Müller | `suiteOrUnit` | Required field missing |
| 4 | Chris van Heerden | `checkInDate` | Date missing, cannot derive status |
```

**When no issues:**
```markdown
# Missing Fields Report

✅ No missing fields detected. All rows have complete required data.
```

### 4. `APPROVAL.md`

Human-readable approval checklist with summary stats, file inventory, pre-use checklist, and next-step command.

**Includes:**
- Booking counts (arrivals/inhouse/departures/blank)
- Missing field warnings
- Safety rules
- Command to run `browns-daily-ops-brief`

### 5. `manifest.json`

Machine-readable file inventory.

```json
[
  {
    "filename": "bookings.json",
    "type": "bookings-json",
    "recordCount": 5
  },
  {
    "filename": "bookings.csv",
    "type": "bookings-csv",
    "recordCount": 5
  }
]
```

## Status Derivation

If the input does not include a `status` column, the adapter derives status from the target day and check-in/check-out dates:

| Condition | Derived Status |
|-----------|----------------|
| `checkInDate == targetDay` | `arriving` |
| `checkOutDate == targetDay` | `departing` |
| `targetDay > checkInDate AND targetDay < checkOutDate` | `inhouse` |
| Missing checkInDate or checkOutDate | Empty string (flagged in missing-fields.md) |

**If `status` column is present and valid** (`arriving`, `inhouse`, `departing`), the explicit value is used instead of deriving.

## Late Check-In Detection

The adapter flags late check-ins using two methods:

1. **Explicit `lateCheckIn` column:** `true`, `1`, `yes`, or `late` → `lateCheckIn: true`
2. **Notes contain keywords:** "late check-in", "late checkin", or "late arrival" → `lateCheckIn: true`

## Workflow: From Nightsbridge to Daily Ops Brief

### Manual Process (v1)

1. **Open Nightsbridge** for the target date (e.g., 2026-09-20)
2. **Export or copy the day sheet** as CSV/TSV or paste into a text file
3. **Run the adapter:**
   ```bash
   npm run adapt -- --day 2026-09-20 --input nightsbridge.csv
   ```
4. **Review outputs:**
   - Open `out/bookings.json` (verify structure)
   - Open `out/missing-fields.md` (resolve any issues)
   - Open `out/APPROVAL.md` (checklist)
5. **If missing fields exist**, fix them in the source file and re-run
6. **Feed into daily ops brief:**
   ```bash
   cd ../browns-daily-ops-brief
   npm run brief -- --day 2026-09-20 --bookings ../browns-nightsbridge-bookings-adapter/out/bookings.json --outdir reports/
   ```

### Future: API Integration

A future version could:
- Fetch bookings directly from Nightsbridge API
- Auto-run adapter + brief on schedule
- Still maintain draft-only outputs and approval gates

**For now:** v1 is offline, manual input, and eliminates the hand-typing of bookings.json.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

**Test coverage:**
- Delimiter detection (CSV vs. TSV)
- Header alias normalization
- Status derivation
- Late check-in detection
- Missing field flagging
- Multiple bookings with varied data

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/nightsbridge-good.csv` (5 bookings).

**Expected outputs in `test-out/`:**
- `bookings.json` (5 records)
- `bookings.csv`
- `missing-fields.md` (no issues)
- `APPROVAL.md`
- `manifest.json`

### Test Individual Fixtures

```bash
npm run adapt -- --day 2026-09-20 --input fixtures/nightsbridge-tsv.tsv --outdir test-out-tsv
npm run adapt -- --day 2026-09-20 --input fixtures/nightsbridge-sparse.csv --outdir test-out-sparse
```

**Sparse fixture** should report 4 missing fields.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/browns-nightsbridge-bookings-adapter/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript interfaces, header aliases
│   ├── parser.ts             # CSV/TSV parsing, delimiter detection
│   ├── transformer.ts        # Row transformation, status derivation
│   ├── output-writer.ts      # File generation (JSON, CSV, MD)
│   ├── parser.test.ts        # Parser unit tests
│   └── transformer.test.ts   # Transformer unit tests
├── fixtures/
│   ├── nightsbridge-good.csv       # Happy-path CSV
│   ├── nightsbridge-tsv.tsv        # TSV test case
│   ├── nightsbridge-paste.csv      # Pasted table test
│   ├── nightsbridge-sparse.csv     # Missing fields test
│   └── README.md                   # Fixture documentation
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output directory (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                 # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No Nightsbridge writes** - Read-only workflow (manual export step)
- ❌ **No invented data** - Missing fields are flagged, never fabricated
- ❌ **No rates or amounts** - Not in scope (never were in daily ops brief)
- ❌ **No WhatsApp/email sends** - Outputs are drafts for downstream tools
- ❌ **No browser automation** - Offline only

### What This Tool Does

- ✅ **Accepts flexible input** - CSV, TSV, pasted tables
- ✅ **Normalizes headers** - Common aliases mapped automatically
- ✅ **Derives status** - Arriving/inhouse/departing from dates
- ✅ **Flags issues** - Missing fields reported clearly
- ✅ **Generates ready-to-use bookings.json** - Direct input for browns-daily-ops-brief

### Data Privacy

- **Never commit real guest data to git**
- Keep actual export files local only (e.g., `nightsbridge-2026-09-20.csv`)
- `.gitignore` already excludes `out/` directory
- Fixtures use fictional names for testing

## Troubleshooting

### "File not found"

Check the path:
```bash
ls -l nightsbridge.csv
npm run adapt -- --input ./nightsbridge.csv --day 2026-09-20
```

### "Invalid date format"

Use `YYYY-MM-DD`:
```bash
# Correct
--day 2026-09-20

# Incorrect
--day 20/09/2026
--day Sep 20 2026
```

### "Input is empty"

File must have at least a header row and one data row.

### Many missing fields reported

**Common causes:**
1. Missing headers in source file
2. Headers don't match any recognized alias (check `types.ts` for full list)
3. Empty cells in required columns (guestName, suiteOrUnit)
4. Missing check-in or check-out dates (status can't be derived)

**Solutions:**
- Add a header row if missing
- Rename headers to match common aliases (e.g., "Guest" → recognized, "Primary Name" → not recognized)
- Fill in empty cells in source file
- Re-run adapter after fixes

### Status is blank for all bookings

**Cause:** Missing `checkInDate` or `checkOutDate` columns, and no explicit `status` column.

**Solution:** Add date columns or add a `status` column with `arriving`, `inhouse`, or `departing`.

## Future Enhancements (Not in v1)

Possible future work (requires approval and API access):

- **Nightsbridge API integration** - Auto-fetch bookings by date
- **Scheduled runs** - Daily cron job to generate bookings.json
- **Multi-property support** - Rivendell, other Browns properties
- **Direct pipeline to daily-ops-brief** - Combined tool

**For now:** v1 is offline, manual export, and eliminates the JSON hand-typing burden.

## Related Tools

- **browns-daily-ops-brief** - Consumes `bookings.json` to generate team WhatsApp brief
- **browns-guest-comms-draft** - Generates guest welcome messages from bookings
- **browns-quote-invoice-draft** - Generates quote/invoice communications

## Browns Pipeline Integration

```
Nightsbridge screen (manual view)
    ↓
Export/paste day sheet
    ↓
browns-nightsbridge-bookings-adapter (this tool)
    ↓
bookings.json
    ↓
browns-daily-ops-brief (team coordination)
```

The adapter sits between Nightsbridge and the daily ops brief, eliminating the manual JSON transcription step.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` and `missing-fields.md` before feeding into `browns-daily-ops-brief`.
