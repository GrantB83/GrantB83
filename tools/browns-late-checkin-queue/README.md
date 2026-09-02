# Browns Late Check-In Queue CLI

An offline command-line tool that generates a queue of late/after-hours check-in arrivals for the CoS (Chief of Staff) 09:00 CT after-hours check-in pack. **DRAFT ONLY** - never sends messages automatically.

Part of the Browns guest-flow automation for **Dullstroom The Browns Luxury Guest Suites**.

## Purpose

SA Ops needs to coordinate late arrivals (typically after 15:00 SAST) for guest access, key handover, and welcome preparation. This tool processes the daily bookings feed and creates a structured queue specifically for late/after-hours check-ins.

## Features

- 🕐 **Time-based filtering** - Flags check-ins at/after configurable threshold (default 15:00)
- 🔍 **Keyword detection** - Identifies late/after-hours/ETA keywords in notes
- ⚠️ **Unknown time handling** - Separate queue for arrivals without check-in times
- 📝 **Guest details** - Name, suite, ETA, phone (when available), notes
- 📋 **Data quality tracking** - Reports missing fields without inventing data
- ✅ **Approval workflow** - Every output includes APPROVAL.md with safety checklist
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries
- 🔒 **Offline & safe** - No auto-send, no APIs, no invented times/phones/rates

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-late-checkin-queue
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
npm run queue -- --bookings <file> --day YYYY-MM-DD [options]
```

### Examples

**Minimum required:**
```bash
npm run queue -- --bookings bookings.json --day 2026-09-20
```

**With custom after-hours threshold:**
```bash
npm run queue -- --bookings bookings.json --day 2026-09-20 --after-hour 17
```

**With custom output directory:**
```bash
npm run queue -- --bookings bookings.json --day 2026-09-20 --outdir reports/sep-20/
```

**Using test fixtures:**
```bash
npm run queue -- --bookings fixtures/sample-bookings.json --day 2026-09-20 --outdir out/
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--bookings` | ✅ Yes | Path to bookings JSON file | - |
| `--day` | ✅ Yes | Target check-in date (YYYY-MM-DD) | - |
| `--outdir` | No | Output directory | `./out` |
| `--after-hour` | No | Late check-in threshold hour (0-23) | `15` |
| `--timezone` | No | Timezone for interpretation | `Africa/Johannesburg` |
| `--help` | No | Show help message | - |

## Input File

### Bookings JSON Format

**Source:** Output from `browns-nightsbridge-bookings-adapter`

```json
[
  {
    "guestName": "Sarah & Tom Henderson",
    "suiteOrUnit": "Luxury Suite 1",
    "status": "arriving",
    "checkInDate": "2026-09-20",
    "checkInTime": "16:30",
    "checkOutDate": "2026-09-22",
    "lateCheckIn": false,
    "adults": 2,
    "children": 0,
    "guestPhone": "+27 82 123 4567",
    "notes": "Anniversary celebration"
  }
]
```

**Required fields:**
- `guestName` (string)
- `suiteOrUnit` (string)
- `status` (string: `arriving`, `inhouse`, or `departing`)

**Optional fields:**
- `checkInDate` (string, YYYY-MM-DD)
- `checkInTime` (string, HH:MM or HHMM)
- `checkOutDate` (string, YYYY-MM-DD)
- `lateCheckIn` (boolean)
- `adults` (number)
- `children` (number)
- `guestPhone` (string)
- `notes` (string)

## Queue Inclusion Rules

A booking is included in the late check-in queue if **arriving on the target day** AND meets **any** of:

1. **Check-in time at/after threshold** - `checkInTime` is at or after `--after-hour` (default 15:00)
2. **Late keyword flag** - `notes` contains late/after-hours/ETA keywords
3. **Missing check-in time** - `checkInTime` is absent (→ `unknown-time.md`)

**Late keywords detected:**
- "late arrival"
- "late check-in" / "late checkin"
- "after hours" / "after-hours"
- "eta"
- "arriving late"
- "evening arrival"

**Never invented:**
- Check-in times
- Phone numbers
- Rates or amounts

## Output Files

The CLI generates outputs in the specified directory (default: `./out`):

### 1. `queue.json`

**Machine-readable structured queue.**

```json
{
  "targetDay": "2026-09-20",
  "afterHourThreshold": 15,
  "timezone": "Africa/Johannesburg",
  "generatedAt": "2026-09-02T08:00:00.000Z",
  "lateCheckins": [
    {
      "guestName": "Sarah & Tom Henderson",
      "suiteOrUnit": "Luxury Suite 1",
      "checkInDate": "2026-09-20",
      "checkInTime": "16:30",
      "guestPhone": "+27 82 123 4567",
      "notes": "Anniversary celebration",
      "reason": "after-hours-time"
    }
  ],
  "unknownTimeCheckins": []
}
```

### 2. `queue.md`

**Human-readable numbered list for the CoS pack.**

```markdown
# Late Check-In Queue

**Target Day:** 2026-09-20
**After-Hours Threshold:** 15:00 Africa/Johannesburg

## Late Check-Ins (2)

### 1. Sarah & Tom Henderson
- **Suite:** Luxury Suite 1
- **Check-In Date:** 2026-09-20
- **ETA:** 16:30
- **Phone:** +27 82 123 4567
- **Notes:** Anniversary celebration

### 2. Patricia van der Merwe
...
```

### 3. `unknown-time.md` (if applicable)

**Bookings without check-in times that need ETA confirmation.**

```markdown
# Unknown Check-In Time Queue

**Target Day:** 2026-09-20

⚠️ **These bookings are missing check-in times. Confirm ETA before CoS WhatsApp pack.**

### 1. The Mbeki Family
- **Suite:** Family Suite 3
- **Check-In Date:** 2026-09-20
- **ETA:** ⚠️ MISSING
- **Notes:** After-hours check-in expected
```

### 4. `missing-fields.md`

**Data quality report.**

```markdown
# Missing Fields Report

**Target Day:** 2026-09-20

⚠️ **2 booking(s) have missing fields:**

1. **The Mbeki Family**
   - Missing: checkInTime, guestPhone

**Note:** This tool never invents times, phone numbers, or rates.
Resolve missing fields before including entries in the CoS WhatsApp pack.
```

### 5. `APPROVAL.md`

**Human-readable approval checklist.**

Includes:
- Summary (counts)
- File inventory
- Pre-send checklist
- Safety rules
- Approval phrase template

**Example approval phrase:**
```
APPROVE LATE CHECKIN QUEUE 2026-09-20
```

### 6. `manifest.json`

**Run metadata and file inventory.**

```json
{
  "generatedAt": "2026-09-02T08:00:00.000Z",
  "targetDay": "2026-09-20",
  "afterHourThreshold": 15,
  "timezone": "Africa/Johannesburg",
  "counts": {
    "lateCheckins": 2,
    "unknownTimeCheckins": 1,
    "missingFields": 2
  },
  "files": [
    { "name": "queue.json", "type": "structured-queue" },
    { "name": "queue.md", "type": "human-readable-queue" },
    { "name": "unknown-time.md", "type": "unknown-time-queue" },
    { "name": "missing-fields.md", "type": "data-quality" },
    { "name": "APPROVAL.md", "type": "approval-checklist" }
  ]
}
```

## Workflow: From Bookings to CoS Pack

### Step 1: Get Bookings Feed

Use `browns-nightsbridge-bookings-adapter` to transform the Nightsbridge day sheet:

```bash
cd tools/browns-nightsbridge-bookings-adapter
npm run adapt -- --day 2026-09-20 --input nightsbridge.csv --outdir feeds/
```

This produces `feeds/bookings.json`.

### Step 2: Generate Late Check-In Queue

```bash
cd tools/browns-late-checkin-queue
npm run queue -- --bookings ../browns-nightsbridge-bookings-adapter/feeds/bookings.json --day 2026-09-20
```

### Step 3: Review Outputs

1. Open `out/queue.md` - Primary late check-in list
2. Review `out/unknown-time.md` - Resolve missing ETAs
3. Check `out/missing-fields.md` - Data quality issues
4. Read `out/APPROVAL.md` - Safety checklist

### Step 4: Resolve Unknowns

For entries in `unknown-time.md`:
- Confirm ETA with guest or team
- Update source bookings if needed
- Re-run queue generator
- Do NOT invent times

### Step 5: Manual CoS WhatsApp Send

After approval:
- Copy content from `queue.md`
- Paste into CoS WhatsApp group
- Use Coexistence of Service platform

**Never auto-send** - human approval required every time.

## Example Daily Routine (SA Ops)

**Texas Morning (09:00 CT / 16:00-17:00 SAST):**

1. Export Nightsbridge day sheet for today
2. Run `browns-nightsbridge-bookings-adapter`
3. Run `browns-late-checkin-queue`
4. Review `queue.md` and `unknown-time.md`
5. Confirm missing ETAs with team or guests
6. Approve and send to CoS WhatsApp

**Why this helps:**
- Proactive coordination for late arrivals
- No missed after-hours check-ins
- Structured handover to on-site team
- Audit trail (files saved with dates)

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/sample-bookings.json` (6 bookings: 4 arrivals on 2026-09-20).

**Expected output:**
- `test-out/queue.json` - 2 late check-ins
- `test-out/queue.md` - Numbered list
- `test-out/unknown-time.md` - 1 unknown-time entry
- `test-out/missing-fields.md` - 2 entries with missing fields
- `test-out/APPROVAL.md` - Approval checklist
- `test-out/manifest.json` - Run metadata

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Project Structure

```
tools/browns-late-checkin-queue/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── parser.ts               # JSON parsing and validation
│   ├── queue-builder.ts        # Late check-in queue logic
│   └── output-writer.ts        # File writing (JSON, MD, manifest)
├── fixtures/
│   ├── sample-bookings.json    # Sample day with 6 bookings
│   └── README.md               # Fixture documentation
├── dist/                       # Compiled JavaScript (generated)
├── out/                        # Default output directory (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                   # This file
```

## Safety & Constraints

### What This Tool Never Does

- ❌ **No auto-send** - All outputs are drafts for manual review
- ❌ **No WhatsApp API** - Does not connect to WhatsApp Business API
- ❌ **No time invention** - Missing ETA stays missing
- ❌ **No phone invention** - Missing phone stays missing
- ❌ **No rate/amount handling** - Not in scope
- ❌ **No guest data invention** - Only formats what you provide

### What This Tool Does

- ✅ **Filters arrivals** by date and time threshold
- ✅ **Detects late keywords** in notes and status
- ✅ **Tracks unknowns** separately for ETA confirmation
- ✅ **Reports data quality** without fabricating
- ✅ **Generates draft queue** for human approval

### Hard Constraints

1. **Dullstroom only** - The Browns Luxury Guest Suites Dullstroom (v1)
2. **Offline only** - No APIs, no network calls
3. **Heuristic only** - No LLM, no AI, keyword patterns only
4. **Source-faithful** - Never invents times, phones, or rates
5. **Draft outputs** - Manual CoS WhatsApp send required

## Integration with Other Tools

### browns-nightsbridge-bookings-adapter

**Upstream dependency** - Provides the bookings.json feed:

```bash
browns-nightsbridge-bookings-adapter → bookings.json
                                          ↓
                              browns-late-checkin-queue
```

### browns-daily-ops-brief

**Parallel tool** - General daily ops brief for all arrivals/in-house/departures:

```bash
bookings.json → browns-daily-ops-brief (full team brief)
             ↘
              browns-late-checkin-queue (late check-ins only)
```

Both tools can run on the same `bookings.json` feed for different audiences.

## Troubleshooting

### "Bookings file not found"

Check the path:
```bash
ls -l bookings.json
npm run queue -- --bookings ./bookings.json --day 2026-09-20
```

### "Booking status must be one of: arriving, inhouse, departing"

Fix typos in your bookings file. Valid statuses (case-sensitive):
- `arriving`
- `inhouse`
- `departing`

### Date format error

Use `YYYY-MM-DD` format for `--day`:
```bash
# Correct
--day 2026-09-20

# Incorrect
--day 20/09/2026
--day Sep 20 2026
```

### Empty queue

If `queue.md` says "No late check-ins", verify:
1. Bookings file has arrivals on the target day
2. Check-in times are at/after threshold (default 15:00)
3. Or notes contain late/after-hours keywords

### All arrivals in unknown-time.md

If all arrivals appear in `unknown-time.md`:
- Bookings are missing `checkInTime` field
- Add check-in times to source data
- Or confirm ETAs manually before CoS send

## Future Enhancements (Not in v1)

Possible future work (requires approval and API access):

- **Multi-property support** - Rivendell, other Browns properties
- **WhatsApp integration** - Post drafts to approval channel
- **Calendar sync** - Cross-check bookings against calendar
- **SMS alerts** - Auto-notify team of late arrivals (after approval)
- **ETA update workflow** - Structured process for resolving unknown times

**For now:** v1 is offline, manual CoS send, draft-only. Ship the labor reduction first.

## Related Tools

- **browns-nightsbridge-bookings-adapter** - Transform day sheets into bookings.json
- **browns-daily-ops-brief** - Full team brief (all arrivals/in-house/departures)
- **browns-guest-comms-draft** - Guest welcome messages

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` before every CoS WhatsApp send. Never invent times, phones, or rates.
