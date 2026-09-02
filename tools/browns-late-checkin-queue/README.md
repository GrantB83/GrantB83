# Browns Late Check-In Queue

Offline CLI that generates late check-in coordination queue from bookings JSON for **The Browns Luxury Guest Suites** in Dullstroom.

**⚠️ CRITICAL: DRAFT ONLY. Never sends WhatsApp/email. Never invents times/phones.**

## Purpose

Generate late check-in coordination queue for CoS SA Ops timed CT-pack workflow. Identifies bookings with late check-in flags or unknown arrival times, producing structured queue files for manual review and WhatsApp coordination.

Scope: **Dullstroom only** (Rivendell sold).

## Features

- 📝 **Offline-only** - No Gmail/WhatsApp/NightsBridge APIs; no browser
- 🕐 **Late check-in detection** - Flags bookings with late arrival indicators
- 📋 **Structured queue** - Numbered list format ready for CoS review
- ⚠️ **Unknown time tracking** - Separate file for bookings without confirmed times
- ✅ **Approval gates** - APPROVAL.md in every job folder
- 🧪 **Fully tested** - TypeScript tests for queue generation, filtering, validation
- 🔒 **No secrets** - Synthetic fixtures only in git; safe for public repo

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
npm run queue -- --bookings <bookings-json> --day YYYY-MM-DD [--outdir <dir>]
```

### Required Arguments

- `--bookings, -b` - Path to bookings JSON file
- `--day, -d` - Target date in YYYY-MM-DD format

### Optional Arguments

- `--outdir, -o` - Output directory for queue files (default: `./out`)

### Examples

**Basic usage with fixtures:**

```bash
npm run queue -- --bookings fixtures/sample-bookings.json --day 2026-09-20 --outdir out/
```

**Production usage (SA Ops box):**

```bash
npm run queue -- \
  --bookings /workspace/bookings/2026-09-20.json \
  --day 2026-09-20 \
  --outdir /workspace/ct-packs/2026-09-20/
```

## Bookings JSON Schema

Required fields:

```json
[
  {
    "guestName": "string (required)",
    "checkInDate": "YYYY-MM-DD (required)",
    "suiteOrUnit": "string (required)",
    "lateCheckIn": "boolean (optional, default: false)",
    "checkInTime": "HH:MM (optional)",
    "adults": "number (required)",
    "notes": "string (optional)"
  }
]
```

**Example:**

```json
[
  {
    "guestName": "Alex Johnson",
    "checkInDate": "2026-09-20",
    "suiteOrUnit": "The Browns Suite",
    "lateCheckIn": true,
    "checkInTime": "21:30",
    "adults": 2
  },
  {
    "guestName": "Sarah Miller",
    "checkInDate": "2026-09-20",
    "suiteOrUnit": "Garden Suite",
    "lateCheckIn": true,
    "adults": 2,
    "notes": "Arriving late, no specific time confirmed"
  }
]
```

### Late Check-In Detection

Bookings are flagged as late check-in when:
- `lateCheckIn: true` is explicitly set, OR
- `checkInTime` is after 18:00, OR
- Notes contain keywords: "late", "after hours", "evening arrival"

Bookings with late check-in but no confirmed `checkInTime` are separated into `unknown-time.md`.

## Output Files

Each run creates outputs in the specified directory:

| File | Description |
|------|-------------|
| `queue.md` | Late check-in queue with confirmed times |
| `unknown-time.md` | Late check-ins with unknown/unconfirmed times |
| `APPROVAL.md` | Approval gate reminder (never auto-send) |
| `manifest.json` | Job metadata |

## Testing

### Run automated tests:

```bash
npm run build
npm test
```

Tests cover:
- Late check-in detection logic
- Queue generation and ordering
- Unknown time separation
- Missing field validation

### Test with fixtures:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Generate queue from `fixtures/sample-bookings.json`
3. Output to `out/` directory
4. Exit with success code

Inspect the `out/` folder to review generated queue files.

### Clean up:

```bash
npm run clean
```

## Project Structure

```
tools/browns-late-checkin-queue/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── queue-generator.ts    # Generate queue files
│   ├── output-writer.ts      # Write job folder outputs
│   └── queue-generator.test.ts # Automated tests
├── fixtures/
│   ├── sample-bookings.json  # Example bookings with late check-ins
│   └── README.md
├── dist/                     # Compiled JavaScript (generated)
├── out/                      # Default output directory (generated)
├── package.json
├── tsconfig.json
└── README.md                 # This file
```

## Safety & Constraints

### ✅ What this tool DOES:

- Reads bookings JSON
- Detects late check-in indicators
- Generates DRAFT queue files
- Creates approval reminder
- Runs 100% offline

### ❌ What this tool NEVER does:

- Send WhatsApp messages
- Send emails
- Access Gmail/WhatsApp/NightsBridge APIs
- Invent check-in times or phone numbers
- Confirm availability
- Access live booking systems
- Store secrets in git

### Approval gates:

All late check-in coordination requires:
- Manual review of queue files
- CoS WhatsApp coordination (Coexistence of Service)
- Never auto-send

See: `docs/automation/approval-gates.md`

## For SA Ops / CoS

### How to run:

1. Export bookings from NightsBridge or adapter
2. Run CLI:
   ```bash
   cd /workspace/GrantB83/tools/browns-late-checkin-queue
   npm run queue -- \
     --bookings /path/to/bookings.json \
     --day 2026-09-20 \
     --outdir /workspace/ct-packs/2026-09-20/
   ```
3. Review queue.md and unknown-time.md
4. Coordinate via WhatsApp Admin - The Browns (manual paste)
5. Never auto-send

### Integration with browns-ct-pack-assemble

This tool is designed to be called by `browns-ct-pack-assemble`:

```bash
npm run assemble -- \
  --day 2026-09-20 \
  --bookings bookings.json \
  --run-late-checkin \
  --outdir out/ct-2026-09-20/
```

The assembler will:
1. Invoke this tool with `--bookings` and `--day`
2. Copy `queue.md` and `unknown-time.md` into the pack
3. Include late check-in files in the 20:00 CT checklist

## Troubleshooting

### "Missing required bookings fields" error

Check that bookings JSON has all required fields per booking:
- guestName
- checkInDate (YYYY-MM-DD)
- suiteOrUnit
- adults (number >= 1)

### "No late check-ins found"

This is informational. The tool will generate placeholder files when no late check-ins are detected for the target date.

## Future Enhancements (Not in v1)

- Direct NightsBridge integration (requires G2 approval)
- Automated guest phone extraction
- Multi-property support

For now: **offline, draft-only, approval-gated.**

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
