# Attachment Filename Index CLI

An offline command-line tool that indexes attachment and Drive filenames into structured checklists **without opening file bodies**. Built for Vault, CoS hub mail, and Perfect Water document management.

## Purpose

Bots currently burn browser tokens opening Drive/mail to find Plimmer/Charisse/tax-emigration files and missing share-sale emails. Filename-only indexing cuts that toil and keeps sensitive contents out of chat.

## Features

- 📁 **Directory scanning** - Recursively index all files in a directory (basenames only)
- 📄 **Filename list mode** - Read filenames from text or CSV file
- 📧 **Mail subject matching** - Optionally match filenames with mail subject lines
- 🏷️ **Entity tagging** - Heuristic classification into 21 entity categories
- 📅 **Date extraction** - Parse dates from common filename patterns
- 📊 **Dual output** - Generates both CSV (for spreadsheets) and Markdown (for readable reports)
- ✅ **Fully tested** - Includes automated tests and synthetic fixtures
- 🔒 **Offline only** - No APIs, no OAuth, no file body reading, no secrets
- 🚫 **No amounts** - Never invents or extracts monetary values

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/attachment-filename-index
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

### Mode 1: Directory Scan

Scan a directory and index all file basenames (no file body reads):

```bash
npm run index -- --dir <directory> --output <output-dir>
```

**Example:**

```bash
npm run index -- --dir /vault/documents --output reports/
```

### Mode 2: Filename List

Index filenames from a text file (one per line) or CSV file (with `Filename` column):

```bash
npm run index -- --files <filename-list> --output <output-dir>
```

**Example:**

```bash
npm run index -- --files exported-filenames.txt --output reports/
```

### Mode 3: With Mail Subject Matching

Match filenames with mail subject lines from a CSV (with `Subject` and optional `Date` columns):

```bash
npm run index -- --files <filename-list> --subjects <subjects-csv> --output <output-dir>
```

**Example:**

```bash
npm run index -- --files filenames.txt --subjects mail-subjects.csv --output reports/
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--dir` | `-d` | Path to directory to scan (basenames only) | * | - |
| `--files` | `-f` | Path to text/CSV file with filename list | * | - |
| `--subjects` | `-s` | Path to CSV/TXT file with mail subjects | No | - |
| `--output` | `-o` | Output directory for index files | No | `./out` |
| `--help` | `-h` | Show help message | No | - |

\* Either `--dir` or `--files` is required (but not both)

### Output Files

The CLI generates two files in the specified output directory:

1. **`index.csv`** - Machine-readable CSV with all indexed files
   - Columns: Filename, Inferred Entities, Inferred Dates, Extension, Path, Matched Subjects, Notes

2. **`index.md`** - Human-readable Markdown report
   - Summary statistics
   - Entity tag counts
   - Detailed file index with all metadata

## Entity Tags

The tool classifies filenames into these entity categories using keyword heuristics:

### Vault & Personal
- `plimmer` - Plimmer & Associates
- `charisse` - Charisse-related documents
- `tax-emigration` - Tax clearance and emigration paperwork

### Tax & Compliance
- `sars` - South African Revenue Service
- `cipc` - Companies and Intellectual Property Commission
- `share-sale` - Share sale agreements and transactions

### Accounting Systems
- `xero` - Xero accounting exports
- `loyverse` - Loyverse POS data
- `budget` - Budget documents
- `monarch` - Monarch financial data

### Owned Businesses
- `perfect-water` - Perfect Water / BVR
- `heavy-metal` - Heavy Metal Sand & Stone
- `hospitality` - The Browns / Rivendell guest suites

### Household
- `aisd` - Austin ISD school documents
- `wesbank` - WesBank vehicle finance
- `fnb` - First National Bank
- `standard-bank` - Standard Bank
- `eskom` - Eskom electricity
- `municipal` - Municipal rates and taxes

### Other
- `nightsbridge` - NightsBridge reservations
- `unknown` - No entity keywords detected

## Date Extraction

The tool extracts dates from filenames using these patterns:

- **ISO format:** `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Compact format:** `YYYYMMDD` (e.g., `20240315`)
- **Year-month:** `YYYY-MM` (e.g., `2024-06`)
- **European format:** `DD-MM-YYYY` (e.g., `15-03-2024`)
- **US format:** `DD/MM/YYYY` (e.g., `15/03/2024`)

All extracted dates are normalized to ISO format (`YYYY-MM-DD` or `YYYY-MM`).

## Subject Matching

When a subjects file is provided, the tool matches filenames with mail subjects using token-based matching:

- **Tokenization:** Normalizes text to lowercase, removes punctuation, filters short words
- **Minimum common tokens:** At least 2 shared meaningful tokens required for a match
- **Date inclusion:** If the subject has a date, it's included in the matched subject line

**Subjects CSV format:**

```csv
Subject,Date
"SARS Tax Return Reminder",2024-01-15
"Invoice from Plimmer Associates",2024-02-10
```

**Subjects TXT format:**

```
SARS Tax Return Reminder
Invoice from Plimmer Associates
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test fixtures (no real client data):

**Filename list mode:**

```bash
npm run test:fixtures:list
```

**Directory scan mode:**

First create sample files:

```bash
cd fixtures/sample-files
while IFS= read -r filename; do touch "$filename"; done < ../sample-filenames.txt
cd ../..
npm run test:fixtures:dir
```

**Subject matching mode:**

```bash
npm run test:fixtures:subjects
```

All fixture tests generate reports in `test-out-*` directories.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/attachment-filename-index/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── types.ts                    # TypeScript type definitions
│   ├── filename-parser.ts          # Entity and date extraction
│   ├── filename-parser.test.ts     # Parser tests
│   ├── subject-matcher.ts          # Subject matching logic
│   ├── subject-matcher.test.ts     # Subject matcher tests
│   ├── index-generator.ts          # CSV and Markdown generation
│   └── index-generator.test.ts     # Generator tests
├── fixtures/
│   ├── sample-filenames.txt        # 20 synthetic filenames
│   ├── sample-subjects.csv         # 20 synthetic mail subjects
│   ├── sample-files/               # Directory for scan mode testing
│   └── README.md                   # Fixture documentation
├── dist/                           # Compiled JavaScript (generated)
├── out/                            # Default report output (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                       # This file
```

## Heuristics & Tuning

### Entity Keywords

Entity tags are assigned based on case-insensitive keyword matching. Keywords are defined in `src/filename-parser.ts` in the `ENTITY_KEYWORDS` constant.

**To add a new entity:**

1. Add the entity type to `EntityTag` in `src/types.ts`
2. Add keyword mappings in `ENTITY_KEYWORDS` in `src/filename-parser.ts`
3. Initialize the counter in `buildIndexResult()` in `src/index-generator.ts`
4. Rebuild and test

### Date Patterns

Date extraction patterns are defined in `src/filename-parser.ts` in the `DATE_PATTERNS` array. Add new regex patterns as needed for additional date formats.

### Subject Matching

Token matching threshold (minimum common tokens) is currently set to 2. This can be adjusted in the `hasCommonTokens()` function in `src/subject-matcher.ts`.

## Constraints & Limitations

- ✅ **Offline only** - No Google Drive/Gmail API OAuth
- ✅ **No file body reads** - Only processes basenames/filenames
- ✅ **No browser automation** - Pure CLI operation
- ✅ **No secrets** - No credentials or tokens stored
- ✅ **No amounts** - Never extracts or invents monetary values
- ✅ **Read-only** - Does not move, rename, or modify files
- ✅ **Heuristic-based** - Entity tagging may have false positives/negatives

## Use Cases

### For Vault / CoS Hub Mail

Index attachment filenames from mail exports to quickly locate Plimmer/Charisse/tax-emigration files without opening Drive:

```bash
npm run index -- --files vault-attachments.txt --subjects vault-mail-subjects.csv --output vault-index/
```

### For Perfect Water

Index PW document filenames to find Xero exports, Loyverse data, and franchise correspondence:

```bash
npm run index -- --dir /drive/perfect-water --output pw-index/
```

### For Document Cleanup

Quickly identify files with missing dates or unknown entity tags for manual review:

```bash
npm run index -- --dir /downloads --output cleanup-review/
# Review cleanup-review/index.md for "No dates found" and "unknown" entities
```

## Example Output

### Terminal Output

```
Attachment Filename Index CLI

Mode: Filename list

Reading filename list: fixtures/sample-filenames.txt
  ✓ Loaded 20 filenames

Reading mail subjects: fixtures/sample-subjects.csv
  ✓ Loaded 20 subjects

Matching subjects with filenames...
  ✓ Matched 19 files

Building index...
  ✓ Indexed 20 files
  ✓ Files with dates: 17
  ✓ Files with subjects: 19

Generating reports in: test-out-subjects
  ✓ CSV index: test-out-subjects/index.csv
  ✓ Markdown index: test-out-subjects/index.md

✅ Indexing complete!

📊 Entity breakdown:
   sars: 1
   cipc: 1
   plimmer: 1
   charisse: 1
   tax-emigration: 1
   share-sale: 1
   perfect-water: 1
   xero: 1
   loyverse: 1
   heavy-metal: 1
```

### CSV Sample

```csv
Filename,Inferred Entities,Inferred Dates,Extension,Path,Matched Subjects,Notes
SARS-Tax-Return-2024-01-15.pdf,sars,2024-01-15,.pdf,,SARS Annual Tax Return Reminder (2024-01-15),
Plimmer-Invoice-2024-02-10.pdf,plimmer,2024-02-10,.pdf,,Invoice from Plimmer & Associates (2024-02-10),
Unknown-Document-XYZ123.txt,unknown,,.txt,,"Important Document Attached (2024-05-01)","No entity keywords detected; No dates found"
```

### Markdown Sample

```markdown
# Attachment Filename Index

**Generated:** 2024-09-02T02:00:00.000Z

## Summary

- **Total Files:** 20
- **Files with Dates:** 17
- **Files with Matched Subjects:** 19

## Counts by Entity

- **sars:** 1
- **cipc:** 1
- **plimmer:** 1
...

## File Index

### SARS-Tax-Return-2024-01-15.pdf

- **Entities:** sars
- **Dates:** 2024-01-15
- **Extension:** .pdf
- **Matched Subjects:**
  - SARS Annual Tax Return Reminder (2024-01-15)
```

## Troubleshooting

### "Empty filename list" error

Ensure your text file has:
- At least one filename per line
- No blank file

For CSV mode, include a `Filename` column header or have one filename per line.

### "CSV must have a Subject column" error

When using a subjects CSV, ensure:
- First row is a header row
- `Subject` column exists (case-insensitive)
- At least one data row

### No entities detected (all "unknown")

- Check that filenames contain entity keywords (case-insensitive)
- Review `ENTITY_KEYWORDS` in `src/filename-parser.ts`
- Add custom keywords if needed and rebuild

### No dates extracted

- Verify filenames contain dates in supported formats
- See "Date Extraction" section for supported patterns
- Add custom date patterns to `DATE_PATTERNS` if needed

## Who This Is For

- **Vault / CoS hub mail admins** - Quickly locate sensitive files without opening bodies
- **Perfect Water ops** - Index PW documents, Xero exports, Loyverse data
- **Document librarians** - Organize Drive/attachment filenames before bulk operations
- **Grok Bot builders** - Pre-classify filenames to reduce browser automation token burn

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
