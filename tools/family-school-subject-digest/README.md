# family-school-subject-digest

**One-line:** Generate family school/admin morning digest from email subject lines.

**Owning desk(s):** Family Command Center

**Location:** `tools/family-school-subject-digest/`

## Purpose

Family desk builds a morning school/admin digest from AISD and other email subjects. This offline CLI packages pasted email subjects (and optional snippets) into a numbered open-items markdown digest matching Family digest shape.

**No sending.** **No invented school facts.**

## Install and Run

```bash
cd tools/family-school-subject-digest
npm install
npm run build

# Basic usage
npm run digest -- --input subjects.txt --outdir out/

# With custom date and timezone
npm run digest -- --input subjects.txt --date 2026-09-15 --timezone America/Chicago

# Test with fixtures
npm run test:fixtures
```

## Input Format

Flexible input supporting multiple formats:

### 1. One subject per line
```
AISD School Closure Notice
Parent-Teacher Conference Sign Up
Payment due for summer camp
```

### 2. Subject with snippet
```
AISD Bus Schedule | Route changes effective Monday
Report Card Available | View on Skyward
Payment Due | $50 by Friday
```

### 3. Markdown bullet list
```
- AISD School Closure Notice
- Parent-Teacher Conference Sign Up
- Payment due for summer camp
```

## Classification Heuristics

Items are automatically tagged using **keyword-based classification only** (no LLM):

- **school** - AISD, school, teacher, homework, report card, PTA, bus, cafeteria, enrollment, Skyward, ParentSquare, etc.
- **forms** - form, consent, permission, sign, signature, document, waiver
- **calendar** - calendar, event, schedule, meeting, appointment, reminder, RSVP
- **payment** - payment, invoice, bill, due, fee, charge, $, amount, balance
- **sports** - sports, practice, game, team, coach, tournament, athletic
- **other** - anything not matching above

**Due dates and amounts are NEVER invented.** If present in subject/snippet text, they are copied through as stated. Otherwise fields remain blank.

## Output Files

All outputs are written to timestamped directory: `<outdir>/digest-YYYY-MM-DDTHH-MM-SS/`

### `digest.md`
Grant/Liana-facing digest with full sentences and numbered open items.

Structure:
- **Kids School** section for school-tagged items
- **Family Admin** section for all other items (no duplication)
- No dollar amounts invented
- Due dates shown if present in subject

### `items.json`
Structured data array:
```json
[
  {
    "n": 1,
    "tag": "school",
    "subject": "AISD School Closure Notice",
    "snippet": "No school on Friday",
    "dueDate": "9/15/2026",
    "notes": "Due: 9/15/2026"
  }
]
```

### `missing-fields.md`
Checklist of items lacking:
- Clear action verb
- Due date (when expected)
- Other metadata

### `APPROVAL.md`
Approval document. **This is a DRAFT digest only.**

Family bot owns WhatsApp send path. This CLI never sends.

### `manifest.json`
Metadata about generation:
- Tool version
- Date/timezone
- Item counts by tag
- Generation timestamp

## Command Line Options

```
OPTIONS:
  --input, -i       Path to subjects file [REQUIRED]
  --outdir, -o      Output directory [default: ./out]
  --date, -d        Date label (YYYY-MM-DD) [default: today UTC]
  --timezone, -t    Timezone for date label [default: America/Chicago]
  --help, -h        Show this help message
```

Date and timezone are used **for labeling only** - they do not affect date parsing or classification.

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
- Classification heuristics
- Due date extraction
- Action verb detection
- Input parsing (all formats)

Fixture tests generate complete output sets from:
- `fixtures/subjects-mixed.txt` - mixed school/admin items
- `fixtures/subjects-school-only.txt` - school-only items
- `fixtures/subjects-sparse.txt` - sparse/vague items

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **No LLM** - Keyword classification heuristics only
- ✅ **No invented data** - Due dates and amounts only extracted if explicitly present
- ✅ **DRAFT ONLY** - Never sends WhatsApp or email
- ✅ **No school facts** - Never invents teacher names, school policies, or deadlines
- ⚠️ **Family bot owns send path** - WhatsApp digest sending via Family bot / CoS only
- ⚠️ **For Grant/Liana only** - Not for automated client/school communication

## Workflow

1. Export email subjects from Gmail (manual copy-paste or saved search)
2. Save to text file (any supported format)
3. Run: `npm run digest -- --input subjects.txt --outdir out/`
4. Review generated `digest.md` for accuracy
5. Check `missing-fields.md` for items needing clarification
6. Update `items.json` with any additional metadata
7. Family bot can consume `digest.md` or `items.json` for WhatsApp workflow

## Integration Points

This tool is **standalone** and produces **human-readable outputs only**.

Future integration:
- Family bot could consume `digest.md` for WhatsApp send workflow
- `items.json` could feed into Family Command Center dashboard
- Manual copy-paste from `digest.md` to morning routine checklist

**Current state: Manual workflow only.**

## Example Output

Input:
```
AISD School Closure Notice | No school Friday
Parent-Teacher Conference | Sign up by 9/20
Payment Due | $150 for camp by 9/15
Soccer Practice Schedule | Tuesdays at 4pm
```

Generated `digest.md`:
```markdown
# Family Digest - 2026-09-02

## Kids School

1. AISD School Closure Notice — No school Friday
2. Parent-Teacher Conference (Due: 9/20) — Sign up by 9/20

## Family Admin

3. Payment Due (Due: 9/15) — $150 for camp by 9/15 [payment]
4. Soccer Practice Schedule — Tuesdays at 4pm [sports]
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
