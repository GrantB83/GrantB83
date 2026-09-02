# Browns Booking Change Check CLI

An offline command-line tool that diffs two booking snapshots and generates a human-readable change report for CoS SA Ops. Used for **last-minute booking change verification** before posting guest-comms or daily-ops drafts to WhatsApp Admin.

**Offline diff only** - no Nightsbridge API, no auto-send, never invents data.

Part of the Browns guest-flow automation for **Dullstroom The Browns Luxury Guest Suites**.

## Problem

CoS SA Ops prepares CT-pack materials (guest welcome messages, daily ops briefs) at ~20:00 SAST for next-day operations. Between snapshot collection and final posting, bookings can change:
- Last-minute additions or cancellations
- Suite reassignments
- Updated guest notes (late arrivals, special requests)
- Phone number corrections

Today this requires manual cross-checking of Nightsbridge before every WhatsApp Admin post. This tool automates the diff and highlights what changed.

## Solution

Export bookings twice → diff snapshots → review changes.md → update drafts if needed → post to WhatsApp Admin.

## Features

- 📊 **Flexible matching** - Uses explicit `id` if present, else normalized `guestName|checkInDate|checkOutDate|suiteOrUnit`
- 🔍 **Three change types** - Additions, removals, updates (with field-level detail)
- 📝 **Human-readable digest** - Numbered prose report for quick review
- ✅ **Structured output** - JSON for downstream tools
- 🎯 **Field tracking** - Reports which fields changed (room, dates, status, phone, notes)
- 🚫 **Never invents data** - Missing fields flagged as blank/unknown
- 🔒 **Offline & safe** - No API calls, no auto-send, draft outputs only
- 🚀 **Zero dependencies** - Pure TypeScript

## Purpose & Scope

**What this tool does:**
- Reads two bookings.json files (before/after snapshots)
- Matches bookings using id or normalized guest/date/room key
- Detects adds, removes, and field-level updates
- Generates numbered prose digest for CoS review
- Provides approval documentation

**What this tool does NOT do:**
- ❌ Connect to Nightsbridge API
- ❌ Invent rates, amounts, or missing guest data
- ❌ Send WhatsApp or email messages
- ❌ Modify calendars or reservations
- ❌ Make decisions about pricing or policy

**Property:** Dullstroom The Browns Luxury Guest Suites only (v1)

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-booking-change-check
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
npm run check -- --before <file> --after <file> [options]
```

### Examples

**Minimum required:**
```bash
npm run check -- --before bookings-1900.json --after bookings-2045.json
```

**With target day and custom output:**
```bash
npm run check -- \
  --before before.json \
  --after after.json \
  --day 2026-09-20 \
  --outdir reports/sep-20/
```

**Using test fixtures:**
```bash
npm run check -- --before fixtures/before.json --after fixtures/after.json --outdir out/
```

### CLI Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--before` | ✅ Yes | Path to "before" bookings JSON | - |
| `--after` | ✅ Yes | Path to "after" bookings JSON | - |
| `--outdir` | No | Output directory | `./out` |
| `--day` | No | Target day (YYYY-MM-DD) for context | - |
| `--help` | No | Show help message | - |

## Input Format

### Bookings JSON

**Format:** Array of booking objects (compatible with `browns-nightsbridge-bookings-adapter` output)

```json
[
  {
    "id": "optional-explicit-id",
    "guestName": "Sarah & Tom Henderson",
    "suiteOrUnit": "Luxury Suite 1",
    "status": "arriving",
    "checkInDate": "2026-09-20",
    "checkOutDate": "2026-09-22",
    "adults": 2,
    "children": 0,
    "phone": "+27 82 555 1234",
    "notes": "Anniversary celebration"
  }
]
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (optional) | Explicit booking ID (preferred for matching) |
| `guestName` | string | Guest name(s) |
| `suiteOrUnit` | string (optional) | Suite assignment |
| `status` | string (optional) | Booking status |
| `checkInDate` | string (optional) | Check-in date (YYYY-MM-DD) |
| `checkOutDate` | string (optional) | Check-out date (YYYY-MM-DD) |
| `phone` | string (optional) | Contact phone |
| `notes` | string (optional) | Special requests, remarks |
| `adults` | number (optional) | Adult count |
| `children` | number (optional) | Child count |

## Matching Logic

The tool matches bookings across snapshots using this priority:

1. **Explicit `id` field** (if present and identical)
2. **Normalized composite key:** `guestName|checkInDate|checkOutDate|suiteOrUnit`
   - Guest name: lowercased, whitespace normalized
   - Dates: trimmed
   - Suite: lowercased, trimmed

**Example matches:**
- `"Sarah & Tom Henderson|2026-09-20|2026-09-22|luxury suite 1"`
- `"the mbeki family|2026-09-20|2026-09-24|family suite 3"`

## Output Files

All outputs are written to `--outdir` (default: `./out`):

### 1. `changes.json`

**Structured change records** for downstream tools or scripts.

**Schema:**
```json
{
  "summary": {
    "adds": 1,
    "removes": 1,
    "updates": 2,
    "total": 4,
    "beforeHash": "a1b2c3d4e5f6g7h8",
    "afterHash": "h8g7f6e5d4c3b2a1"
  },
  "changes": [
    {
      "type": "add",
      "key": "emma thompson|2026-09-20|2026-09-22|garden suite 2",
      "after": { ... }
    },
    {
      "type": "remove",
      "key": "patricia van der merwe|2026-09-18|2026-09-21|garden suite 2",
      "before": { ... }
    },
    {
      "type": "update",
      "key": "sarah & tom henderson|2026-09-20|2026-09-22|luxury suite 1",
      "before": { ... },
      "after": { ... },
      "fields": ["notes"]
    }
  ]
}
```

### 2. `changes.md`

**Primary deliverable:** Human-readable numbered digest for CoS review.

**Contents:**
- Summary (adds/removes/updates)
- ➕ Additions (with guest name, suite, dates, phone, notes)
- ➖ Removals (with guest name, suite, dates)
- 🔄 Updates (with changed fields and before → after values)
- Safety notes

**Example snippet:**
```markdown
# Booking Change Report

**Target Day:** 2026-09-20

**Summary:** 1 add(s), 1 removal(s), 2 update(s)

## ➕ Additions

### 1. Emma Thompson

- **Suite:** Garden Suite 2
- **Check-in:** 2026-09-20
- **Check-out:** 2026-09-22
- **Phone:** +27 83 777 9999
- **Notes:** Vegetarian breakfast requested

## ➖ Removals

### 1. Patricia van der Merwe

- **Suite:** Garden Suite 2
- **Check-in:** 2026-09-18
- **Check-out:** 2026-09-21

## 🔄 Updates

### 1. Sarah & Tom Henderson

**Changed fields:** notes

- **notes:** Anniversary celebration → Anniversary celebration. Champagne arranged.

---

⚠️ **Safety Notes:**
- Never invented rates or amounts
- Missing fields flagged as "Unknown" or blank
- Review before posting to WhatsApp Admin
```

### 3. `APPROVAL.md`

Human-readable approval checklist with:
- Summary stats
- File inventory
- Pre-post checklist (verify names, check notes, confirm timing)
- Safety rules
- Usage context (CT-pack workflow)
- Approval phrase template

### 4. `manifest.json`

Machine-readable file inventory.

```json
[
  { "filename": "changes.json", "type": "changes-json", "recordCount": 4 },
  { "filename": "changes.md", "type": "changes-md", "recordCount": 4 },
  { "filename": "APPROVAL.md", "type": "approval" },
  { "filename": "manifest.json", "type": "manifest" }
]
```

## Workflow: CT-Pack Change Check

CoS SA Ops uses this tool before every WhatsApp Admin post for guest-comms or daily-ops.

### Typical Workflow

**Before snapshot (e.g., 19:00 SAST):**
1. Export bookings from Nightsbridge
2. Save as `bookings-before.json`

**After CT-pack prep (e.g., 20:45 SAST):**
1. Export bookings from Nightsbridge again
2. Save as `bookings-after.json`

**Run the diff:**
```bash
cd tools/browns-booking-change-check
npm run check -- \
  --before ../../exports/bookings-before.json \
  --after ../../exports/bookings-after.json \
  --day 2026-09-20 \
  --outdir ../../reports/change-check-2026-09-20/
```

**Review outputs:**
1. Open `changes.md` - review numbered change list
2. Check for:
   - New arrivals (need welcome messages?)
   - Removals (cancellations - remove from ops brief?)
   - Updated notes (late arrivals, special requests, room changes)
3. Update guest-comms drafts if needed
4. Update daily-ops brief if needed
5. Review `APPROVAL.md` checklist

**Post to WhatsApp Admin:**
- Copy approved messages
- Manual send (CoS owns the send path)

### When to Run

- **Always before 20:00 / 09:00 / 21:00 WhatsApp Admin posts**
- After CT-pack prep and before final posting
- When Nightsbridge shows changes during the prep window
- As final verification step in CoS workflow

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- Matching key generation
- Change detection (adds, removes, updates)
- Field-level diff tracking
- Report generation

### Test with Fixtures

```bash
npm run test:fixtures
```

Uses `fixtures/before.json` and `fixtures/after.json`.

**Expected detection:**
- 1 addition (Emma Thompson)
- 1 removal (Patricia van der Merwe)
- 2 updates (Sarah & Tom notes, Mbeki Family notes)

**Expected output:**
- `test-out/changes.json` - 4 change records
- `test-out/changes.md` - Numbered digest
- `test-out/APPROVAL.md` - Checklist
- `test-out/manifest.json` - Metadata

### Clean Up Test Artifacts

```bash
npm run clean
```

Removes `dist/`, `test-out/`, and `out/` directories.

## Example Daily Routine (CoS SA Ops)

**Pre-CT-pack snapshot (19:00 SAST):**
```bash
# Export from Nightsbridge → bookings-before.json
```

**Post-CT-pack snapshot (20:45 SAST):**
```bash
# Export from Nightsbridge → bookings-after.json
cd tools/browns-booking-change-check
npm run check -- \
  --before ../../exports/bookings-before.json \
  --after ../../exports/bookings-after.json \
  --day $(date +%Y-%m-%d) \
  --outdir ../../reports/change-check-$(date +%Y-%m-%d)/
```

**Review and update:**
```bash
# Open changes.md
# Update guest-comms drafts if needed
# Update daily-ops brief if needed
# Review APPROVAL.md
```

**Post approved:**
```bash
# Manual WhatsApp Admin send (CoS owns send path)
```

## Project Structure

```
tools/browns-booking-change-check/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript interfaces
│   ├── parser.ts               # JSON parsing, hash computation, matching key
│   ├── differ.ts               # Diff logic (adds, removes, updates)
│   ├── report-generator.ts     # Markdown report generation
│   └── output-writer.ts        # File writing, approval doc
├── fixtures/
│   ├── before.json             # Pre-CT-pack snapshot
│   ├── after.json              # Post-CT-pack snapshot
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

- ❌ **No Nightsbridge writes** - Read-only workflow (manual export step)
- ❌ **No invented data** - Missing fields flagged, never fabricated
- ❌ **No rates or amounts** - Not in scope (never generates pricing)
- ❌ **No auto-send** - All outputs are drafts for manual review
- ❌ **No WhatsApp/email API** - Offline only

### What This Tool Does

- ✅ **Compares snapshots** - Detects adds, removes, updates
- ✅ **Reports field changes** - Shows which fields changed and how
- ✅ **Flags unknowns** - Missing fields are explicitly marked
- ✅ **Generates numbered digest** - Human-readable change report
- ✅ **Provides approval docs** - Pre-post checklist and safety rules

### Data Privacy

- **Never commit real guest data to git**
- Keep actual export files local only (e.g., `bookings-2026-09-20-before.json`)
- `.gitignore` already excludes `out/` directory
- Fixtures use fictional names for testing

## Troubleshooting

### "File not found"

Check the path:
```bash
ls -l bookings-before.json
npm run check -- --before ./bookings-before.json --after ./bookings-after.json
```

### "must contain an array of bookings"

Bookings file must be JSON array format:
```json
[
  { "guestName": "...", ... },
  { "guestName": "...", ... }
]
```

Not an object:
```json
{ "bookings": [...] }  ❌ Wrong format
```

### Many updates detected for unchanged bookings

**Cause:** Field values differ only in whitespace or formatting.

**Solution:**
- Ensure consistent date format (YYYY-MM-DD)
- Trim whitespace from guest names and notes
- Use same export format for both snapshots

### "No changes detected" but changes exist

**Cause:** Matching keys don't align due to:
- Different guest name spelling/capitalization
- Different date formats
- Different suite names

**Solution:**
- Ensure guest names match exactly (before normalization)
- Use consistent date format (YYYY-MM-DD)
- Check suite names are consistent

## Exit Codes

- **0** - Ran successfully (even if changes found)
- **1** - Bad input or parse failure

**Important:** Exit code 0 does not mean "no changes". Check the summary in console output or `changes.json`.

## Future Enhancements (Not in v1)

Possible future work (requires approval and API access):

- **Nightsbridge API integration** - Auto-fetch snapshots
- **Scheduled diffs** - Automated snapshot collection at preset times
- **Multi-property support** - Rivendell, other Browns properties
- **Webhook alerts** - Notify CoS when changes detected
- **Integration with guest-comms pipeline** - Auto-update drafts when changes occur

**For now:** v1 is offline, manual export, and provides the diff report CoS needs to verify CT-pack materials before posting.

## Related Tools

- **browns-nightsbridge-bookings-adapter** - Converts Nightsbridge exports to bookings.json
- **browns-daily-ops-brief** - Generates team WhatsApp briefs from bookings
- **browns-guest-comms-draft** - Generates guest welcome messages

## Browns Pipeline Integration

```
Nightsbridge (before CT-pack)
    ↓
Export → bookings-before.json
    ↓
CT-pack preparation (guest-comms, ops brief)
    ↓
Nightsbridge (after CT-pack)
    ↓
Export → bookings-after.json
    ↓
browns-booking-change-check (this tool)
    ↓
changes.md (review)
    ↓
Update drafts if needed
    ↓
WhatsApp Admin post (manual, CoS approval)
```

The change checker sits at the end of CT-pack workflow, providing last-minute verification before WhatsApp Admin posts.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

---

**Remember:** All outputs are **DRAFTS ONLY**. Review `APPROVAL.md` and `changes.md` before every WhatsApp Admin post. CoS owns the send path.
