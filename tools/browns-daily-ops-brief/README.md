# Browns Daily Ops Brief CLI

An offline command-line tool that generates draft daily operational briefs for The Browns guesthouse team WhatsApp group, plus optional per-guest welcome message stubs. **DRAFT ONLY** - never sends messages automatically.

Part of the Browns guest-flow phase-3 automation for **Dullstroom The Browns Luxury Guest Suites**.

## Features

- 📅 **Simple input** - JSON or CSV bookings file (no API, no browser)
- 🏨 **Three sections** - Arrivals, In-house, Departures
- ⚠️ **Flags late check-ins** - Automatically highlights timing coordination needs
- 📝 **Guest notes included** - Special requests and important details surfaced
- 👥 **Guest counts** - Adults and children tallied when provided
- 📋 **Optional facts** - Add weather, staff notes, or daily reminders
- 🎯 **Guest welcome stubs** - Placeholder files for arrivals (use `browns-guest-comms-draft` for full messages)
- ✅ **Approval workflow** - Every output includes APPROVAL.md with safety checklist
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries
- 🔒 **Offline & safe** - No auto-send, no Nightsbridge writes, no invented rates

## Purpose & Scope

**What this tool does:**
- Reads a bookings file (manual export or typed list)
- Organizes by arrival/in-house/departure status
- Generates a formatted daily team brief (text file)
- Creates welcome stubs for arriving guests
- Provides approval documentation

**What this tool does NOT do:**
- ❌ Connect to Nightsbridge API (v1 limitation)
- ❌ Send WhatsApp or email messages
- ❌ Modify calendars or reservations
- ❌ Generate or quote rates/amounts
- ❌ Make decisions about pricing or policy

**Property:** Dullstroom The Browns Luxury Guest Suites only (v1)

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-daily-ops-brief
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
npm run brief -- --day YYYY-MM-DD --bookings <file> [options]
```

### Examples

**Minimum required:**
```bash
npm run brief -- --day 2026-09-20 --bookings bookings.json
```

**With facts and custom output directory:**
```bash
npm run brief -- --day 2026-09-25 --bookings bookings.csv --facts daily-facts.json --outdir reports/sep-25/
```

**Using test fixtures:**
```bash
npm run brief -- --day 2026-09-20 --bookings fixtures/sample-day.json --outdir out/
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--day` | ✅ Yes | Target date in YYYY-MM-DD format | - |
| `--bookings` | ✅ Yes | Path to bookings JSON or CSV file | - |
| `--facts` | No | Path to facts JSON file (key-value pairs) | - |
| `--outdir` | No | Output directory for generated files | `./out` |
| `--help` | No | Show help message | - |

## Input Files

### Bookings File (JSON)

**Format:** Array of booking objects

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

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `guestName` | ✅ Yes | string | Guest name(s) |
| `suiteOrUnit` | ✅ Yes | string | Suite assignment |
| `status` | ✅ Yes | string | One of: `arriving`, `inhouse`, `departing` |
| `checkInDate` | No | string | Check-in date (YYYY-MM-DD) |
| `checkOutDate` | No | string | Check-out date (YYYY-MM-DD) |
| `lateCheckIn` | No | boolean | Flag for late arrivals requiring coordination |
| `adults` | No | number | Number of adult guests |
| `children` | No | number | Number of children |
| `notes` | No | string | Special requests, dietary needs, early checkout, etc. |

### Bookings File (CSV)

**Format:** CSV with header row

```csv
guestName,suiteOrUnit,status,checkInDate,checkOutDate,lateCheckIn,notes,adults,children
Sarah & Tom Henderson,Luxury Suite 1,arriving,2026-09-20,2026-09-22,false,Anniversary celebration,2,0
Patricia van der Merwe,Garden Suite 2,inhouse,2026-09-18,2026-09-21,false,Quiet retreat,1,0
```

**Note:** Column names are case-insensitive. Boolean `lateCheckIn` accepts `true`/`false` or `1`/`0`.

### Facts File (Optional)

**Format:** JSON object (key-value pairs)

```json
{
  "Weather": "Clear skies, 22°C",
  "Breakfast Service": "07:00 - 10:00",
  "Housekeeping Lead": "Thandi on duty",
  "Special Notes": "Trail maintenance - inform guests"
}
```

Facts appear at the top of the team brief under "TODAY'S FACTS".

## Output Files

The CLI generates outputs in the specified directory (default: `./out`):

### 1. `draft-team-group-whatsapp.txt`

**Primary deliverable:** Formatted daily ops brief for the team WhatsApp group.

**Contents:**
- Date header
- Optional facts section
- **Arrivals** - Guests checking in today, with late check-in flags
- **In-house** - Current guests staying over
- **Departures** - Guests checking out today
- Guest counts (adults/children when provided)
- Special notes for each booking
- Draft-only footer

**Example snippet:**
```
============================================================
THE BROWNS DAILY OPS BRIEF
Saturday, 20 September 2026
============================================================

📋 TODAY'S FACTS:
  • Weather: Clear skies, 22°C
  • Breakfast Service: 07:00 - 10:00

────────────────────────────────────────────────────────────
🛬 ARRIVALS
────────────────────────────────────────────────────────────

  Guest: The Mbeki Family
  Suite: Family Suite 3
  Check-in: 2026-09-20
  ⚠️  LATE CHECK-IN - Coordinate timing
  Guests: 2 adults, 2 children
  Notes: Late arrival ~19:00. Extra bedding requested.

────────────────────────────────────────────────────────────
🏠 IN-HOUSE
────────────────────────────────────────────────────────────
...
```

### 2. `draft-guest-welcome-stubs/` (if arrivals exist)

One text file per arriving guest, sanitized filename from guest name.

**Contents:** Short stub pointing to `browns-guest-comms-draft` for full welcome messages.

**Example:**
```
Welcome stub for: Sarah & Tom Henderson
Suite: Luxury Suite 1

This is a STUB ONLY.

For a full draft welcome message, use:
  browns-guest-comms-draft

Do NOT send welcome messages without approval.
```

**Purpose:** Reminder that full guest comms need the dedicated tool, not hand-typed messages.

### 3. `APPROVAL.md`

Human-readable approval checklist.

**Contents:**
- Summary (arrival/in-house/departure counts)
- File inventory
- Pre-send checklist (verify names, check notes, confirm timing)
- Safety rules
- Approval phrase template

**Example approval phrase:**
```
APPROVE SEND DAILY BRIEF 2026-09-20
```

### 4. `manifest.json`

Machine-readable file inventory.

```json
[
  {
    "filename": "draft-team-group-whatsapp.txt",
    "type": "team-message"
  },
  {
    "filename": "draft-guest-welcome-stubs/sarah-tom-henderson.txt",
    "type": "guest-stub",
    "guest": "Sarah & Tom Henderson"
  }
]
```

## Workflow: From Nightsbridge Screen to Team Brief

Since this tool does not connect to the Nightsbridge API (v1), here's how to use it:

### Manual Process

1. **Open Nightsbridge** for the target date (e.g., 2026-09-20)
2. **Review the day's bookings** - arrivals, in-house, departures
3. **Create a bookings file** (JSON or CSV):
   - Copy guest names
   - Note suite assignments
   - Mark status (arriving/inhouse/departing)
   - Flag late check-ins
   - Add special notes (dietary, early checkout, celebrations)
4. **Optional:** Create a facts file with weather, staff notes, reminders
5. **Run the CLI:**
   ```bash
   npm run brief -- --day 2026-09-20 --bookings bookings.json --outdir reports/
   ```
6. **Review outputs:**
   - Open `draft-team-group-whatsapp.txt`
   - Check guest names, suite assignments, notes
   - Verify late check-in flags
7. **Review APPROVAL.md** and confirm safety checklist
8. **Manual send:** Copy/paste the brief into the team WhatsApp group (when approved)

### Future: API Integration

A future version could:
- Fetch bookings directly from Nightsbridge API
- Auto-generate briefs on schedule
- Still require human approval before send

**For now:** This offline tool reduces the manual formatting burden and provides a consistent brief format, even if you still type the booking details.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Parsing JSON and CSV bookings
- Validation (required fields, valid status values)
- Grouping by status
- Brief generation with all sections
- Late check-in flagging
- Facts inclusion
- Guest welcome stub generation

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/sample-day.json` (5 bookings: 2 arrivals, 2 in-house, 1 departure).

**Expected output:**
- `test-out/draft-team-group-whatsapp.txt` - Full team brief
- `test-out/draft-guest-welcome-stubs/` - 2 welcome stubs
- `test-out/APPROVAL.md` - Approval checklist
- `test-out/manifest.json` - File inventory

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Example Daily Routine (SA Ops)

Suggested workflow for Dullstroom ops:

**Morning (before 09:00 SAST):**
1. Log into Nightsbridge
2. Check today's arrivals, in-house, departures
3. Create `bookings-YYYY-MM-DD.json` with guest details
4. Optional: Create `facts-YYYY-MM-DD.json` (weather, staff notes)
5. Run CLI:
   ```bash
   npm run brief -- --day $(date +%Y-%m-%d) --bookings bookings-$(date +%Y-%m-%d).json --facts facts-$(date +%Y-%m-%d).json
   ```
6. Review `draft-team-group-whatsapp.txt`
7. Copy approved text to team WhatsApp group

**Why this helps:**
- Consistent format every day
- No forgotten late check-ins
- Guest counts and notes always visible
- Reminder to use dedicated tool for guest welcome messages
- Audit trail (files saved with dates)

## Project Structure

```
tools/browns-daily-ops-brief/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── types.ts                 # TypeScript type definitions
│   ├── parser.ts                # JSON & CSV parsing, validation
│   ├── brief-generator.ts       # Team brief and guest stub generation
│   ├── output-writer.ts         # File writing, manifest generation
│   ├── parser.test.ts           # Parser tests
│   └── brief-generator.test.ts  # Generator tests
├── fixtures/
│   ├── sample-day.json          # Sample bookings (5 records)
│   ├── sample-facts.json        # Sample daily facts
│   └── README.md                # Fixture documentation
├── dist/                        # Compiled JavaScript (generated by tsc)
├── out/                         # Default output directory (generated by CLI)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                    # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No auto-send** - All outputs are drafts for manual review and send
- ❌ **No WhatsApp API** - Does not connect to WhatsApp Business API
- ❌ **No email sending** - Does not send emails
- ❌ **No rates or amounts** - Does not generate pricing or payment info
- ❌ **No Nightsbridge writes** - Read-only workflow (manual input file creation)
- ❌ **No guest data invention** - Only formats what you provide
- ❌ **No decisions** - Human approval required for every send

### What This Tool Does

- ✅ **Organizes bookings** by status (arriving/inhouse/departing)
- ✅ **Formats briefs** with consistent structure
- ✅ **Flags late check-ins** for coordination
- ✅ **Surfaces notes** so special requests aren't missed
- ✅ **Generates stubs** as reminders to use full guest comms tool
- ✅ **Provides approval docs** with safety checklist

### Data Privacy

- **Never commit real guest data to git**
- Keep actual booking files local only (e.g., `bookings-2026-09-20.json`)
- `.gitignore` already excludes `out/` directory
- Fixtures use fictional names for testing

## Troubleshooting

### "Bookings file not found"

Check the path:
```bash
ls -l bookings.json
npm run brief -- --bookings ./bookings.json --day 2026-09-20
```

### "Booking status must be one of: arriving, inhouse, departing"

Fix typos in your bookings file. Valid statuses (case-sensitive):
- `arriving`
- `inhouse`
- `departing`

### "Each booking must have a guestName"

Every booking record needs a `guestName` field (string).

### Date format error

Use `YYYY-MM-DD` format for `--day`:
```bash
# Correct
--day 2026-09-20

# Incorrect
--day 20/09/2026
--day Sep 20 2026
```

### Empty brief sections

If all sections say "No arrivals/in-house/departures", check:
1. Bookings file is not empty
2. Status values are correct (`arriving`, `inhouse`, `departing`)
3. File path is correct

## Future Enhancements (Not in v1)

Possible future work (requires approval and API access):

- **Nightsbridge API integration** - Auto-fetch bookings
- **Scheduled generation** - Daily cron job
- **Multi-property support** - Rivendell, other Browns properties
- **WhatsApp integration** - Post drafts to approval channel before team group
- **Calendar sync** - Cross-check bookings against calendar truth
- **Occupancy stats** - Rolled-up metrics for the week

**For now:** v1 is offline, manual input, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-guest-comms-draft** - Full guest welcome messages (not stubs)
- **browns-guest-flow** - End-to-end inquiry-to-booking pipeline
- **browns-hk-scheduler** - Housekeeping run-sheets per suite

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` before every send.
