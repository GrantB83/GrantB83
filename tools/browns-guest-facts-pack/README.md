# Browns Guest Facts Pack

**One-line:** Extract structured guest facts from markdown knowledge files into JSON and snippet files for downstream draft communications.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-guest-facts-pack/`

## Purpose

SA Ops identified gaps in guest welcome seed data: directions, late check-in instructions, Wi-Fi details, and Blue Crane restaurant information. Brand facts live in markdown knowledge files (e.g., `stay-knowledge/the-browns.md`).

This CLI extracts ONLY stated facts from markdown into:
- Structured `facts.json` for programmatic consumption
- Individual snippet `*.txt` files for manual paste workflows
- A report of missing expected fields

**Critical:** This tool NEVER invents rates, times, amenities, or passwords. If a fact is not explicitly present in the source markdown, it is flagged as missing.

## Install and Run

```bash
cd tools/browns-guest-facts-pack
npm install
npm run build

# Basic usage
npm run pack -- --facts stay-knowledge/the-browns.md --outdir out/

# With seed samples (for tone reference only)
npm run pack -- \
  --facts stay-knowledge/the-browns.md \
  --seeds seeds/ \
  --outdir out/

# Test with fixture
npm run test:fixtures
```

## CLI Usage

```bash
npm run pack -- --facts <markdown-file> [--seeds <dir>] [--outdir <dir>]
```

### Required Arguments

- `--facts, -f` — Path to markdown knowledge file (e.g., `stay-knowledge/the-browns.md`)

### Optional Arguments

- `--seeds, -s` — Directory containing redacted sample snippets (`*.txt` files). Seeds are for tone labels only; no new facts are extracted from seeds.
- `--outdir, -o` — Output directory for facts pack (default: `./out`)
- `--help, -h` — Show help message

## Expected Markdown Sections

The tool uses heuristic extraction based on section headings and content. It looks for:

| Expected Field | Heading Patterns |
|----------------|------------------|
| `directions` | "Directions", "Getting Here", "How to Find Us" |
| `wifi` | "Wi-Fi", "WiFi", "Internet" (extracts network name) |
| `wifiPassword` | Found in Wi-Fi section with "Password:" label |
| `lateCheckIn` | "Late Check-in", "Late Arrival", "After Hours" |
| `blueCrane` | "Blue Crane", "Restaurant", "Dining" (when mentions Blue Crane) |
| `checkInTime` | "Check-in" (extracts time pattern like "2:00 PM") |
| `checkOutTime` | "Check-out", "Checkout" |
| `address` | "Address", "Location" |
| `parking` | "Parking" |
| `contact` | "Contact", "Phone", "Email" |
| `breakfast` | "Breakfast" |

## Output Files

All outputs are written to a timestamped job folder: `out/facts-pack-YYYY-MM-DD/`

| File | Purpose |
|------|---------|
| `facts.json` | Structured key-value facts (JSON) |
| `snippets/*.txt` | Individual snippet files per fact (paste-ready) |
| `missing-fields.md` | Report of expected fields not found in source |
| `APPROVAL.md` | Approval gate reminder (draft/facts only; no send) |
| `manifest.json` | Pack metadata (version, timestamp, source file, counts) |

### Example `facts.json`

```json
{
  "directions": "From Johannesburg, take the N4 highway east...",
  "wifi": "BrownsGuest",
  "wifiPassword": "Trout2026!",
  "checkInTime": "2:00 PM",
  "checkOutTime": "10:00 AM",
  "address": "12 Tedder Street, Dullstroom, 1110",
  "parking": "Secure off-street parking is available...",
  "contact": "Phone: +27 82 555 1234, Email: stay@thebrowns.co.za",
  "blueCrane": "The Blue Crane is our on-site restaurant...",
  "breakfast": "Breakfast is served daily from 7:00 AM to 10:00 AM...",
  "lateCheckIn": "For arrivals after 6:00 PM, please contact us..."
}
```

### Example `missing-fields.md`

```markdown
# Missing Fields Report

**Generated:** 2026-09-02T04:52:00.000Z

⚠️ The following expected fields were NOT found in the source markdown:

- **wifiPassword**

## Action Required

Please review the source markdown file and add the missing information.
```

## Downstream Usage

The `browns-guest-comms-draft` tool can consume the facts pack:

```bash
cd tools/browns-guest-comms-draft
npm run draft -- \
  --booking booking.json \
  --facts ../browns-guest-facts-pack/out/facts-pack-2026-09-02/facts.json \
  --outdir drafts/
```

Or pass the original markdown directly:

```bash
npm run draft -- \
  --booking booking.json \
  --facts /workspace/stay-knowledge/the-browns.md \
  --outdir drafts/
```

## Pipeline Integration

```
stay-knowledge/the-browns.md
    ↓
browns-guest-facts-pack (this tool)
    ↓
facts.json + snippets/
    ↓
browns-guest-comms-draft (consumes facts)
```

## Fixtures

Two test fixtures are provided:

1. **`fixtures/the-browns-like.md`** — Full-featured sample with all expected fields present
2. **`fixtures/sparse.md`** — Sparse sample with only some fields (tests missing-field reporting)

Run fixture tests:

```bash
npm run test:fixtures
```

Unit tests:

```bash
npm test
```

## Critical Safety Notes

- ✅ **Offline only** — No APIs or network calls
- ✅ **Never invents facts** — Missing fields are explicitly flagged
- ✅ **No fabricated passwords** — If Wi-Fi password is not in source, it is omitted and reported as missing
- ✅ **No rates or amounts** — This tool does not extract or handle pricing
- ✅ **Source-faithful extraction** — Heuristic parsing of stated facts only
- ✅ **Read-only** — Does not modify source markdown
- ⚠️ **For draft communications only** — Outputs are for `browns-guest-comms-draft`, which generates DRAFT-only messages

## Approval Gates

- **Gate:** S1 (Standing approval for facts extraction from approved knowledge files)
- **Scope:** Facts extraction only
- **No send:** This tool does not send any messages
- **Downstream:** Any drafts generated using these facts require H1/H2 approval before send

See `docs/automation/approval-gates.md` for full gate definitions.

## Troubleshooting

### Missing fields reported but facts are in the markdown

- Check that section headings match expected patterns (case-insensitive)
- Ensure content is present under the heading (not just the heading alone)
- Review heuristic extraction logic in `src/parser.ts`

### Wi-Fi password not extracted

- Verify the password line follows the pattern: `Password: <value>`
- Check that it appears within a section with "Wi-Fi", "WiFi", or "Internet" in the heading

### Times not extracted

- Ensure times follow common patterns: `2:00 PM`, `14:00`, `2 PM`
- Check that the time appears in the relevant section (e.g., "Check-in", "Check-out")

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test              # Run unit tests
npm run test:fixtures # Run fixture tests
```

### Clean

```bash
npm run clean         # Remove dist/ and out/
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
