# family-calendar-ics-digest

**One-line:** Offline CLI to parse .ics calendar exports and generate Family / CoS morning digest.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-calendar-ics-digest/`

## Purpose

Family morning digest sometimes needs calendar events from an exported .ics file (school/admin calendars that are not in Google Calendar). This offline parser extracts VEVENT entries within a date window and generates a numbered digest for morning review.

**Offline only. Never invents events or times. Pass-through data only.**

## Install and Run

```bash
cd tools/family-calendar-ics-digest
npm install
npm run build

# Basic usage
npm run digest -- --ics calendar.ics --from 2026-09-02 --to 2026-09-05 --outdir out/

# With custom timezone
npm run digest -- --ics calendar.ics --from 2026-09-01 --to 2026-09-30 --timezone America/New_York

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
REQUIRED:
  --ics <file>          Path to .ics calendar file
  --from <YYYY-MM-DD>   Start date (inclusive)
  --to <YYYY-MM-DD>     End date (inclusive)

OPTIONS:
  --outdir, -o <dir>    Output directory (default: ./out)
  --timezone, -t <tz>   Timezone for display (default: America/Chicago)
  --help, -h            Show this help message
```

## Output Files

All outputs are written to timestamped directory: `<outdir>/digest-YYYY-MM-DD/`

### `events.json`
Structured array of calendar events:
```json
[
  {
    "uid": "event1@example.com",
    "summary": "School Picture Day",
    "dtstart": "2026-09-03",
    "dtend": null,
    "location": "Elementary School",
    "description": "Professional photos - dress code applies",
    "allDay": true,
    "missingFields": []
  }
]
```

### `digest.md`
Human-readable numbered digest with full sentences, grouped by date:

```markdown
# Family Calendar Digest

**Date Range:** 2026-09-02 to 2026-09-05
**Timezone:** America/Chicago
**Event Count:** 4

## Events

### Tue, Sep 2, 2026

1. 8:30 AM - 3:00 PM — First Day of School @ Elementary School
   Welcome back students! First day of the 2026-2027 school year.

### Wed, Sep 3, 2026

2. All day — School Picture Day @ Elementary School
   Professional photos - dress code applies
```

### `missing-fields.md`
Report of events with incomplete data (missing SUMMARY, DTSTART, or LOCATION):

```markdown
# Missing Fields Report

Found 1 event(s) with missing fields:

## Event: Library Orientation

**Missing:** LOCATION
**Date:** Fri, Sep 5, 2026
```

### `APPROVAL.md`
Safety gates and ownership notice. **DRAFT ONLY. Never auto-send.**

Family bot / CoS owns WhatsApp send path.

### `manifest.json`
Machine-readable metadata:
```json
{
  "tool": "family-calendar-ics-digest",
  "version": "1.0.0",
  "generatedAt": "2026-09-02T12:00:00.000Z",
  "inputFile": "calendar.ics",
  "dateRange": {
    "from": "2026-09-02",
    "to": "2026-09-05"
  },
  "timezone": "America/Chicago",
  "eventCount": 4,
  "missingFieldsCount": 1
}
```

## ICS Field Handling

### Pass-Through Fields
- **SUMMARY**: Event title (flagged if missing)
- **DTSTART**: Start date/time (flagged if missing)
- **DTEND**: End date/time (optional)
- **LOCATION**: Event location (flagged if missing)
- **DESCRIPTION**: Event notes (optional)

### All-Day Events
Detected via `VALUE=DATE` on DTSTART. Displayed as "All day" in digest.

### Time Zones
The `--timezone` argument is used for display formatting only. The tool respects timezone data in the .ics file (VTIMEZONE components).

## Tests

```bash
# Run unit tests
npm test

# Run fixture tests (generates sample outputs)
npm run test:fixtures

# Clean generated artifacts
npm run clean
```

Unit tests cover:
- Date range filtering
- Event sorting by start date
- Missing field detection
- All-day event handling
- Digest formatting

Fixture tests generate complete output sets from:
- `fixtures/school-calendar.ics` - School events with various field combinations
- `fixtures/empty-calendar.ics` - Empty calendar (no events)

## Critical Safety Notes

- ✅ **Offline only** - No calendar API calls
- ✅ **Read-only** - Never modifies .ics files or live calendars
- ✅ **Pass-through only** - Never invents events, times, or locations
- ✅ **Date filtering** - Only includes VEVENT entries within specified date range
- ✅ **DRAFT ONLY** - Output is for review; does not send notifications
- ⚠️ **Family bot / CoS owns WhatsApp** - Manual approval required before posting digest
- ⚠️ **Not a calendar sync** - This is a one-time export parser, not a live calendar integration

## Use Cases

1. **School calendar exports** - AISD or district calendars exported as .ics
2. **Admin calendar digests** - Appointment calendars from services that offer .ics export
3. **One-time event lists** - Events shared via .ics file attachment
4. **Calendar consolidation** - Merge multiple .ics files into one digest (run tool multiple times, combine outputs)

## Workflow

1. Export calendar as .ics file (from email, web calendar, etc.)
2. Run: `npm run digest -- --ics school.ics --from 2026-09-01 --to 2026-09-30`
3. Review generated `digest.md` for accuracy
4. Check `missing-fields.md` for incomplete events
5. Family bot or CoS can include digest in morning pack
6. Manual WhatsApp send only (never auto-send)

## Integration Points

This tool is **standalone** and produces **read-only outputs**.

Integration options:
- Family bot can consume `digest.md` for morning digest workflow
- `events.json` can feed into other calendar processing tools
- Manual copy-paste from `digest.md` to WhatsApp Admin - Family

**Current state: Manual workflow only.**

## Dependencies

- **ical.js@2.0.1** - RFC 5545 iCalendar parser (pinned version, offline-capable)
- **TypeScript** - Build tooling
- **Node.js ≥18** - Runtime

No other external dependencies. No network calls.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
