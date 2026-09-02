# Family School Due Queue CLI

An offline command-line tool that extracts due dates and deadline signals from school email subjects or attachment filenames for **Family Command Center** / **CoS** morning digest assembly. Built for AISD / Kids School workflows without opening email bodies or attachments.

## Purpose

Family morning digest needs a prioritized queue of school items that require parent action. This tool processes email subject lines and/or attachment filenames to extract:

1. **Due dates** - ISO dates, US dates, or inferred from "due Friday" patterns
2. **Action keywords** - permission slip, form, RSVP, volunteer, sign, picture day, etc.

**Critical constraints:**
- Never opens email bodies or attachments
- Never invents due dates (uncertain → missing-signals.md)
- Heuristic extraction only (no LLM)
- Offline only (no Gmail API)
- DRAFT outputs only (no auto-send)

## Features

- 📧 **Two input modes** - Email subjects, attachment filenames, or both
- 📅 **Multiple date formats** - ISO (YYYY-MM-DD), US (M/D, MM/DD/YYYY), relative days
- 🎯 **Action keyword detection** - 20+ school-specific keywords
- 📊 **5 output files** - queue.json, queue.md, missing-signals.md, APPROVAL.md, manifest.json
- ✅ **Fully tested** - Automated tests with 25 synthetic fixtures
- 🔒 **Offline only** - No APIs, no email body reads, no secrets

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/family-school-due-queue
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

### Mode 1: Email Subjects Only

Process email subject lines (one per line):

```bash
npm run queue -- --subjects <path> --outdir <dir>
```

**Example:**

```bash
npm run queue -- --subjects subjects.txt --outdir out/
```

### Mode 2: Filenames Only

Process attachment filenames (one per line):

```bash
npm run queue -- --files <path> --outdir <dir>
```

**Example:**

```bash
npm run queue -- --files filenames.txt --outdir out/
```

### Mode 3: Both Subjects and Filenames

Process both input types together:

```bash
npm run queue -- --subjects <subjects> --files <files> --outdir <dir>
```

**Example:**

```bash
npm run queue -- --subjects subjects.txt --files filenames.txt --outdir out/
```

### Mode 4: Custom As-of Date

Specify a reference date for relative date calculations (default: today):

```bash
npm run queue -- --subjects subjects.txt --as-of 2026-09-15 --outdir out/
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--subjects` | Path to subjects.txt (one subject per line) | * | - |
| `--files` | Path to filenames.txt (one filename per line) | * | - |
| `--as-of` | Reference date (YYYY-MM-DD) for relative dates | No | Today |
| `--outdir` | Output directory | No | `./out` |
| `--help`, `-h` | Show help message | No | - |

\* Either `--subjects` or `--files` is required (or both)

## Input File Format

### subjects.txt

One email subject per line:

```
AISD Parent Newsletter - Week of September 2, 2026
Permission slip for field trip due Friday 9/6
Picture Day reminder - September 10, 2026
Parent-Teacher Conference sign-up by 09/15/2026
Volunteer form - return by Monday
```

### filenames.txt

One attachment filename per line:

```
permission-slip-field-trip-2026-09-06.pdf
picture-day-form.pdf
volunteer-signup-due-monday.docx
emergency-contacts-form-deadline-9-12.pdf
```

**Note:** Lines starting with `#` are treated as comments and ignored. Empty lines are also ignored.

## Heuristic Extraction Patterns

### Date Patterns

| Pattern | Example | Extracted Date |
|---------|---------|----------------|
| **ISO date** | `2026-09-20` | `2026-09-20` |
| **US date full** | `09/15/2026` | `2026-09-15` |
| **US date short** | `9/6` | `2026-09-06` (current year) |
| **Due Friday** | `due Friday` | Next Friday from as-of date |
| **By Monday** | `by Monday` | Next Monday from as-of date |

### Action Keywords

- `due`, `deadline`, `by`, `before`
- `permission slip`, `form`, `rsvp`, `sign`
- `picture day`, `photo day`
- `volunteer`, `field trip`
- `registration`, `enrollment`
- `parent conference`, `teacher conference`
- `report card`, `grades`
- `reminder`, `urgent`
- `last day`, `final day`
- `submission`, `submit`, `return by`

## Output Structure

The tool generates the following files in `<outdir>`:

```
<outdir>/
├── queue.json              # Structured queue data
├── queue.md                # Numbered human-readable list
├── missing-signals.md      # Items with no due/deadline signals
├── APPROVAL.md             # Safety gates and ownership
└── manifest.json           # Run metadata
```

### Output Files

#### 1. queue.json

Structured JSON with all extracted entries:

```json
{
  "asOf": "2026-09-02",
  "entries": [
    {
      "text": "Permission slip for field trip due Friday 9/6",
      "source": "subject",
      "dueDate": "2026-09-06",
      "signals": [
        "us-date:9/6",
        "keyword:permission slip",
        "keyword:due",
        "day:friday"
      ],
      "confidence": "high"
    }
  ],
  "missingSignals": [
    "School newsletter for parents"
  ]
}
```

#### 2. queue.md

Human-readable numbered list with two sections:

1. **Items with Due Dates** - Sorted by due date (earliest first)
2. **Items without Due Dates (Action Keywords)** - Items with action keywords but no extracted date

**Example:**

```markdown
# Family School Due Queue

**As of:** 2026-09-02

**Total Items:** 10

## Items with Due Dates

### 1. Permission slip for field trip due Friday 9/6
- **Due Date:** 2026-09-06
- **Source:** subject
- **Confidence:** high
- **Signals:** us-date:9/6, keyword:permission slip, keyword:due, day:friday

### 2. Parent-Teacher Conference sign-up by 09/15/2026
- **Due Date:** 2026-09-15
- **Source:** subject
- **Confidence:** high
- **Signals:** us-date:09/15/2026, keyword:by

## Items without Due Dates (Action Keywords)

### 11. Volunteer form - return by Monday
- **Source:** subject
- **Confidence:** medium
- **Signals:** keyword:volunteer, keyword:form, keyword:return by, day:monday
```

#### 3. missing-signals.md

Items with no recognized due/deadline signals:

```markdown
# Missing Signals

**Count:** 2

The following items had no recognized due/deadline signals:

1. School newsletter for parents
2. Lunch menu for September 2026

## Recommendations

- Review items manually for due dates in body text (if available)
- Check if items are informational only (no action required)
- Consider updating keyword patterns if common signals are missed
```

#### 4. APPROVAL.md

Safety gates and ownership notice:

```markdown
# APPROVAL — Family School Due Queue

## Ownership

- **Family** owns WhatsApp posting for family morning digest
- **CoS** posts to WhatsApp Admin for family coordination
- **Never auto-send** - All outputs are DRAFT only

## Safety Rules

- ✅ **Subjects/filenames only** - Never opens email bodies or attachments
- ✅ **No invented dates** - Only extracts dates explicitly present in text
- ✅ **Heuristic extraction** - Date/keyword signals may have false positives
- ✅ **Offline only** - No Gmail API or network calls
- ✅ **DRAFT ONLY** - Never sends WhatsApp or email automatically

## Review Checklist

Before posting family morning digest:

- [ ] Review `queue.md` for accuracy
- [ ] Check `missing-signals.md` for items needing manual review
- [ ] Verify due dates are reasonable and not past dates
- [ ] Confirm items are relevant to current school year
- [ ] Family bot or CoS manually posts to WhatsApp Admin
```

#### 5. manifest.json

Run metadata:

```json
{
  "generatedAt": "2026-09-02T12:30:00.000Z",
  "mode": "subjects",
  "asOf": "2026-09-02",
  "inputs": {
    "subjects": "subjects.txt"
  },
  "summary": {
    "totalInputs": 15,
    "withSignals": 13,
    "missingSignals": 2
  }
}
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes 25 synthetic school subjects and filenames:

```bash
npm run test:fixtures
```

This will:
1. Build the tool
2. Process `fixtures/sample-subjects.txt` and `fixtures/sample-filenames.txt`
3. Generate outputs in `test-out/`
4. Verify outputs were created successfully

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/family-school-due-queue/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── types.ts                 # TypeScript type definitions
│   ├── parser.ts                # Due date extraction logic
│   ├── parser.test.ts           # Parser unit tests
│   └── generator.ts             # Output file generation
├── fixtures/
│   ├── sample-subjects.txt      # 15 synthetic email subjects
│   ├── sample-filenames.txt     # 10 synthetic filenames
│   └── README.md                # Fixture documentation
├── dist/                        # Compiled JavaScript (generated)
├── test-out/                    # Test output (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                    # This file
```

## Integration with family-morning-digest-pack

This tool is designed to feed into `family-morning-digest-pack` for automated morning digest assembly:

```bash
# Step 1: Extract due queue from subjects/filenames
cd tools/family-school-due-queue
npm run queue -- --subjects subjects.txt --outdir due-queue/

# Step 2: Assemble morning digest pack
cd ../family-morning-digest-pack
npm run pack -- --date 2026-09-02 --subjects ../family-school-due-queue/due-queue/queue.json

# Step 3: Review and post to WhatsApp Admin
```

**Note:** The wire into `family-morning-digest-pack` is optional. This tool can be used standalone for due date extraction without full digest assembly.

## Use Cases

### For Family Command Center

Extract due dates from AISD / Kids School emails:

```bash
npm run queue -- --subjects aisd-subjects.txt --outdir family-queue/
```

### For CoS Morning Digest

Process both subjects and attachment filenames:

```bash
npm run queue -- \
  --subjects school-subjects.txt \
  --files school-filenames.txt \
  --outdir morning-digest/
```

### For Custom Date Windows

Extract due dates as of a specific date (e.g., for testing or historical analysis):

```bash
npm run queue -- --subjects subjects.txt --as-of 2026-09-15 --outdir historical/
```

## Constraints & Limitations

- ✅ **Offline only** - No Gmail API or network calls
- ✅ **Subjects/filenames only** - Never opens email bodies or attachments
- ✅ **No secrets** - No credentials or tokens stored
- ✅ **No invented dates** - Uncertain → missing-signals.md
- ✅ **Heuristic-based** - Date extraction may have false positives/negatives
- ✅ **Read-only** - Does not modify emails or files
- ✅ **DRAFT only** - Never sends WhatsApp or email automatically

## Example Terminal Output

```
Family School Due Queue CLI

Loading subjects: subjects.txt
  ✓ Loaded 15 subjects

Loading filenames: filenames.txt
  ✓ Loaded 10 filenames

Extracting due date signals...
  ✓ Extracted signals from 23 items
  ✓ 2 items with no signals

Generating outputs in: out
  ✓ queue.json
  ✓ queue.md
  ✓ missing-signals.md
  ✓ APPROVAL.md
  ✓ manifest.json

✅ Queue generation complete!

📊 Summary:
   Total inputs: 25
   With signals: 23
   Missing signals: 2
```

## Troubleshooting

### "No valid inputs found" error

Ensure your input files:
- Are not empty
- Have one item per line
- Don't have all lines commented out with `#`

### All items in missing-signals.md

If no items have extracted signals:
- Verify input text contains dates or action keywords
- Check that dates are in supported formats (ISO, US M/D)
- Review action keyword list in this README

### Inferred dates are wrong

Relative dates like "due Friday" are calculated from `--as-of` date (default: today). Specify `--as-of` explicitly if processing historical emails.

## Who This Is For

- **Family Command Center** - Extract school due dates for morning digest
- **CoS hub** - Process AISD / Kids School emails for family coordination
- **Family bot builders** - Pre-extract due dates before digest assembly
- **Grok Bot workflows** - Prepare school action queue for WhatsApp posting

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
