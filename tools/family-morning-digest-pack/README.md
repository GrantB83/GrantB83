# family-morning-digest-pack

**One-line:** Offline CLI assembler for Family / CoS weekday morning digest pack with clear school/family separation.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-morning-digest-pack/`

## Purpose

Assemble a dated morning digest pack folder for posting to **WhatsApp Admin - Grant & Liana Private**. Takes school/admin subject exports (or outputs from `family-school-subject-digest`) and produces numbered open items with **CLEAR separation** of Kids School vs Family list (no repeats).

**No sending. No WhatsApp API. DRAFT only. Family / CoS owns send workflow.**

## Install and Run

```bash
cd tools/family-morning-digest-pack
npm install
npm run build

# Option 1: Let this tool call family-school-subject-digest
npm run pack -- --date 2026-09-02 --subjects subjects.txt --outdir out/ --run-subject-digest

# Option 2: Provide pre-generated items.json from family-school-subject-digest
npm run pack -- --date 2026-09-02 --subjects digest-output/items.json --outdir out/

# Test with fixtures
npm run test:fixtures
```

## Command Line Options

```
OPTIONS:
  --date, -d            Date label (YYYY-MM-DD) [REQUIRED]
  --subjects, -s        Path to subjects file (for subject digest)
  --outdir, -o          Output directory [default: ./out]
  --run-subject-digest  Shell out to ../family-school-subject-digest
  --school-subjects     Optional pre-split school subjects file
  --help, -h            Show this help message
```

## Workflow Options

### Option 1: Run subject digest from raw subjects

Provide a subjects text file and use `--run-subject-digest` to call the sibling tool:

```bash
npm run pack -- \
  --date 2026-09-02 \
  --subjects subjects.txt \
  --outdir out/ \
  --run-subject-digest
```

This will:
1. Shell out to `../family-school-subject-digest`
2. Process subjects into classified items
3. Split into school and family sections
4. Generate pack outputs

### Option 2: Use pre-generated items.json

If you've already run `family-school-subject-digest`, provide its `items.json`:

```bash
npm run pack -- \
  --date 2026-09-02 \
  --subjects path/to/digest-output/items.json \
  --outdir out/
```

### Option 3: Pre-split school subjects

If you have a separate school-only subjects file:

```bash
npm run pack -- \
  --date 2026-09-02 \
  --school-subjects school.txt \
  --outdir out/
```

_(Note: This option requires future implementation)_

## Output Files

All outputs are written to: `<outdir>/pack-YYYY-MM-DD/`

### PACK.md
Index and checklist with:
- Pack contents summary
- Item counts per section
- Review checklist
- Safety reminders

### school.md
Kids School items only:
- Full sentences
- Numbered open items
- Due dates (if present)
- No family admin items

### family.md
Family Admin items only:
- Full sentences
- Numbered open items (continuing from school numbering)
- Due dates (if present)
- **No school items** (no repeats)

### APPROVAL.md
Review document with:
- Accuracy checklist
- Safety gates
- Approval statement
- DRAFT reminder

### manifest.json
Machine-readable metadata:
```json
{
  "tool": "family-morning-digest-pack",
  "version": "1.0.0",
  "date": "2026-09-02",
  "timezone": "America/Chicago",
  "generatedAt": "2026-09-02T11:20:00.000Z",
  "schoolItemCount": 5,
  "familyItemCount": 5,
  "totalItemCount": 10,
  "files": ["PACK.md", "school.md", "family.md", "APPROVAL.md", "manifest.json"]
}
```

## Section Separation Rules

**Kids School** section includes items tagged as `school`:
- AISD and campus mail
- Teacher communications
- School forms and permissions
- PTA and volunteer requests
- Bus schedules and school calendars

**Family Admin** section includes all other items:
- Household bills and finance
- Medical appointments
- Car payments
- Utilities
- General household admin

**No item appears in both sections.** Each numbered item appears exactly once.

## Example Output

Input subjects:
```
AISD School Closure Notice | No school Friday
Parent-Teacher Conference | Sign up by 9/15
Tesla Payment Due | $789.45 due 9/20
Medical Appointment | Checkup on 9/18
```

Generated `school.md`:
```markdown
# Kids School — 2026-09-02

Open items from AISD and school administration:

1. AISD School Closure Notice — No school Friday
2. Parent-Teacher Conference — Sign up by 9/15 (Due: 9/15)
```

Generated `family.md`:
```markdown
# Family Admin — 2026-09-02

Open items from household, medical, finance, and other family administration:

3. Tesla Payment Due — $789.45 due 9/20 (Due: 9/20)
4. Medical Appointment — Checkup on 9/18 (Due: 9/18)
```

## Integration with family-school-subject-digest

This tool preferably consumes outputs from `family-school-subject-digest`:

```bash
# Step 1: Run subject digest
cd tools/family-school-subject-digest
npm run digest -- --input subjects.txt --outdir digest-out/

# Step 2: Assemble morning pack
cd ../family-morning-digest-pack
npm run pack -- \
  --date 2026-09-02 \
  --subjects ../family-school-subject-digest/digest-out/digest-TIMESTAMP/items.json
```

Or use `--run-subject-digest` to do both in one command.

## Tests

```bash
# Run unit tests
npm test

# Run fixture tests (generates sample packs)
npm run test:fixtures

# Clean generated artifacts
npm run clean
```

Unit tests cover:
- Section splitting (school vs family)
- Item formatting
- Markdown generation
- Empty section handling

Fixture tests generate complete pack outputs from:
- `fixtures/subjects-sample.txt` - mixed school and family items

## Critical Safety Notes

- ✅ **Offline only** - No API calls of any kind
- ✅ **DRAFT ONLY** - Never sends to WhatsApp
- ✅ **No WhatsApp API** - WhatsApp posting stays on CoS
- ✅ **Clear separation** - Kids School and Family Admin lists are distinct
- ✅ **No duplication** - Each item appears exactly once
- ✅ **Full sentences** - Per Family skill tone
- ✅ **No invented data** - Never fabricates school facts or due dates
- ⚠️ **Family / CoS owns send** - WhatsApp Admin posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review APPROVAL.md before every post

## Workflow

1. Export email subjects from Gmail (manual copy-paste or script)
2. Save to text file
3. Run: `npm run pack -- --date YYYY-MM-DD --subjects subjects.txt --run-subject-digest`
4. Review generated pack directory
5. Check PACK.md checklist
6. Verify school.md and family.md for accuracy
7. Read APPROVAL.md
8. Family bot or CoS posts to WhatsApp Admin - Grant & Liana Private

## Entity Context

- **Lane:** family
- **Target:** WhatsApp Admin - Grant & Liana Private
- **Frequency:** Weekday mornings ~06:20 CT
- **Owners:** Grant + Liana (review), Family bot / CoS (send)
- **Approval Gate:** Manual review before every post

## Quality Gates

Before using in production:

1. **Test with fixtures** - `npm run test:fixtures`
2. **Review sample outputs** - Check school.md and family.md
3. **Verify separation** - No items in both sections
4. **No invented data** - All due dates from source
5. **NEVER auto-send** - Manual review required

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
