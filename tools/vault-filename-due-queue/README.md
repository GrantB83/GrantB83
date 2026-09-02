# Vault Filename Due Queue CLI

An offline command-line tool that extracts due date and category hints from CIPC, SARS, and trust document filenames **without opening file bodies**. Built for Vault / CoS compliance tracking.

## Purpose

Vault indexes CIPC/SARS/trust filenames without opening bodies (see `attachment-filename-index`). This tool builds a due-oriented research queue: from a filename list or directory of basenames, extract likely due/action hints (annual return, tax return, provisional, BEE affidavit, etc.) into a prioritized queue.

**Critical constraints:**
- Never opens file bodies
- Never invents due dates
- Never invents legal positions or amounts
- Heuristic classification only

## Features

- 📁 **Two input modes** - Filename list or directory scan (basenames only)
- 📅 **Date extraction** - Parse dates from common filename patterns (ISO, compact, European)
- 🏷️ **21 document categories** - CIPC, SARS, BEE, Trust, Property, Insurance, Forex, Attorney
- 🚦 **Due status classification** - has-date, unknown-due, no-date-pattern
- 📊 **Priority queue** - Files with dates listed first
- 📝 **5 output files** - queue.json, queue.md, missing-signals.md, APPROVAL.md, manifest.json
- ✅ **Fully tested** - Automated tests with synthetic fixtures
- 🔒 **Offline only** - No APIs, no file body reads, no secrets

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/vault-filename-due-queue
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

### Mode 1: Filename List

Process filenames from a text file (one per line):

```bash
npm run queue -- --files <filenames.txt> --outdir <dir>
```

**Example:**

```bash
npm run queue -- --files vault-filenames.txt --outdir out/
```

### Mode 2: Directory Scan

Scan a directory and process all file basenames (no file body reads):

```bash
npm run queue -- --dir <directory> --outdir <dir>
```

**Example:**

```bash
npm run queue -- --dir /vault/documents --outdir reports/
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--files` | `-f` | Path to text file with filenames (one per line) | * | - |
| `--dir` | `-d` | Path to directory (basenames only, no file body reads) | * | - |
| `--outdir` | `-o` | Output directory | No | `./out` |
| `--help` | `-h` | Show help message | No | - |

\* Either `--files` or `--dir` is required (but not both)

## Document Categories

The tool classifies filenames into 21 categories using keyword heuristics:

### CIPC (Companies and Intellectual Property Commission)
- `cipc-annual-return` - Annual returns (AR2024, CoS2024)
- `cipc-change-form` - Change forms (CK1, CK2, CM29)
- `cipc-certificate` - Certificates (incorporation, good standing)

### SARS (South African Revenue Service)
- `sars-annual-tax-return` - Annual tax returns (ITR12)
- `sars-provisional-tax` - Provisional tax (ITR14)
- `sars-vat-return` - VAT returns (VAT201)
- `sars-emp-return` - Employer returns (EMP201, EMP501, PAYE, UIF)
- `sars-correspondence` - Letters, notices, tax clearance

### BEE (Broad-Based Black Economic Empowerment)
- `bee-affidavit` - BEE affidavits
- `bee-certificate` - BEE certificates

### Trust
- `trust-distribution` - Distribution resolutions
- `trust-resolution` - Trustee/board resolutions
- `trust-compliance` - Trust compliance returns

### Property
- `property-rates` - Municipal rates
- `property-levies` - HOA levies, body corporate fees

### Other
- `insurance-renewal` - Insurance renewal notices
- `forex-application` - Forex applications (SDA, FIA)
- `bank-statement` - Bank statements
- `attorney-letter` - Attorney letters and legal correspondence
- `other-compliance` - General compliance documents
- `unknown` - No category keywords detected

## Date Extraction

The tool extracts dates from filenames using these patterns:

- **ISO format:** `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Compact format:** `YYYYMMDD` (e.g., `20240315`)
- **Year-month:** `YYYY-MM` (e.g., `2024-06`)
- **European format:** `DD-MM-YYYY` (e.g., `15-03-2024`)
- **US format:** `DD/MM/YYYY` (e.g., `15/03/2024`)
- **Year only:** `20XX` (e.g., `2024`)

All extracted dates are normalized to ISO format.

## Due Status Classification

Each file is classified into one of three due statuses:

1. **has-date** - Date token(s) found in filename
2. **unknown-due** - Action keywords present (due, deadline, return, filing) but no date
3. **no-date-pattern** - No date or action keywords detected

## Output Files

The CLI generates five files in the specified output directory:

### 1. queue.json

Machine-readable JSON with structured queue data:

```json
{
  "entries": [
    {
      "filename": "CIPC-Annual-Return-2024-AR2024-GABTrust.pdf",
      "category": "cipc-annual-return",
      "dateTokens": ["2024"],
      "dueStatus": "has-date",
      "confidence": "high",
      "signals": ["cipc-annual-return", "keyword:return"],
      "notes": ""
    }
  ],
  "summary": {
    "totalFiles": 20,
    "byCategory": { ... },
    "filesWithDates": 17,
    "filesUnknownDue": 1,
    "filesNoDatePattern": 2
  }
}
```

### 2. queue.md

Human-readable numbered list with categories and dates:

```markdown
# Vault Filename Due Queue

## Summary
- **Total Files:** 20
- **Files with Dates:** 17
- **Files with Unknown Due:** 1

## Priority Queue (Files with Dates)

### 1. CIPC-Annual-Return-2024-AR2024-GABTrust.pdf
- **Category:** cipc-annual-return
- **Date Tokens:** 2024
- **Confidence:** high

### 2. SARS-ITR14-Provisional-Tax-2024-06-30.pdf
...

## Research Queue (Unknown Due Dates)

### 18. Municipal-Rates-Due-Invoice.pdf
- **Category:** property-rates
- **Notes:** Action keywords present but no date found
```

### 3. missing-signals.md

Files without category or date pattern:

```markdown
# Missing Signals Report

Files with no category or date pattern detected.

## Files Without Signals (2)

1. `random-document-xyz.pdf`
   - No category or date signals detected

**Recommendation:** Review these filenames manually.
```

### 4. APPROVAL.md

Safety gates and Vault ownership notice:

```markdown
# APPROVAL — Vault Filename Due Queue

## Safety Rules
- ✅ Filename heuristics only — No file bodies opened
- ✅ No invented dates — Date tokens extracted from filenames only
- ✅ No legal positions — Category hints are heuristic, not advice

## Vault Ownership
Vault owns next actions on all CIPC/SARS/trust filings:
- Never auto-submit — All statutory filings require human approval (N2 gate)
- Never invent amounts — This tool does not extract monetary values
```

### 5. manifest.json

Run metadata and statistics:

```json
{
  "generatedAt": "2026-09-02T12:00:00.000Z",
  "mode": "files",
  "inputPath": "vault-filenames.txt",
  "summary": { ... }
}
```

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes 20 synthetic test filenames:

```bash
npm run test:fixtures
```

This will:
1. Build the tool
2. Process `fixtures/sample-filenames.txt`
3. Generate output in `test-out/`
4. Verify outputs were created successfully

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/vault-filename-due-queue/
├── src/
│   ├── index.ts                # CLI entry point
│   ├── types.ts                # TypeScript type definitions
│   ├── filename-parser.ts      # Category and date extraction
│   ├── filename-parser.test.ts # Parser tests
│   └── queue-generator.ts      # Output file generation
├── fixtures/
│   ├── sample-filenames.txt    # 20 synthetic filenames
│   └── README.md               # Fixture documentation
├── dist/                       # Compiled JavaScript (generated)
├── test-out/                   # Test output (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                   # This file
```

## Heuristics & Tuning

### Category Keywords

Category classification is based on case-insensitive keyword matching. Keywords are defined in `src/filename-parser.ts` in the `CATEGORY_PATTERNS` constant.

**To add a new category:**

1. Add the category type to `DocumentCategory` in `src/types.ts`
2. Add keyword patterns in `CATEGORY_PATTERNS` in `src/filename-parser.ts`
3. Initialize the counter in `buildQueueResult()` in `src/queue-generator.ts`
4. Rebuild and test

### Date Patterns

Date extraction patterns are defined in `src/filename-parser.ts` in the `DATE_PATTERNS` array. Add new regex patterns as needed for additional date formats.

### Due Date Keywords

Action keywords (due, deadline, submit, filing, return, renewal) are defined in `src/filename-parser.ts` in the `DUE_DATE_KEYWORDS` array.

## Constraints & Limitations

- ✅ **Offline only** - No APIs or network calls
- ✅ **No file body reads** - Only processes basenames/filenames
- ✅ **No secrets** - No credentials or tokens stored
- ✅ **No invented dates** - Date tokens extracted from filenames only
- ✅ **No invented amounts** - Never handles monetary values
- ✅ **No legal positions** - Category hints are heuristic, not advice
- ✅ **Read-only** - Does not move, rename, or modify files
- ✅ **Heuristic-based** - Category tagging may have false positives/negatives

## Use Cases

### For Vault / CoS Compliance Tracking

Build a due-oriented research queue from CIPC/SARS/trust filenames:

```bash
npm run queue -- --files vault-attachments.txt --outdir vault-queue/
```

### For Trust Administration

Extract due dates from GAB Trust documents:

```bash
npm run queue -- --dir /drive/50_GABTrust --outdir trust-due-dates/
```

### For Missing Due Dates

Identify files that need manual research:

```bash
npm run queue -- --files cipc-sars-filenames.txt --outdir reports/
# Review reports/missing-signals.md for files without date hints
```

## Example Output

### Terminal Output

```
Vault Filename Due Queue CLI

Mode: Filename list

Reading filename list: fixtures/sample-filenames.txt
  ✓ Loaded 20 filenames

Parsing filenames...
  ✓ Parsed 20 files
  ✓ Files with dates: 17
  ✓ Files with unknown due: 1
  ✓ Files with no signals: 2

Generating reports in: test-out
  ✓ Queue JSON: test-out/queue.json
  ✓ Queue Markdown: test-out/queue.md
  ✓ Missing Signals: test-out/missing-signals.md
  ✓ Approval doc: test-out/APPROVAL.md
  ✓ Manifest: test-out/manifest.json

✅ Queue generation complete!

📊 Category breakdown:
   cipc-annual-return: 2
   sars-provisional-tax: 1
   sars-vat-return: 1
   bee-affidavit: 1
   trust-resolution: 2
   property-rates: 2
   insurance-renewal: 1
   unknown: 1
```

## Integration with Other Tools

### With attachment-filename-index

1. Use `attachment-filename-index` to index all Drive/mail attachments
2. Extract CIPC/SARS/trust filenames from the index
3. Run `vault-filename-due-queue` on those filenames to extract due dates

```bash
# Step 1: Index all attachments
cd tools/attachment-filename-index
npm run index -- --dir /vault --output vault-index/

# Step 2: Extract compliance filenames (manual or script)
grep -E "cipc|sars|tax|trust" vault-index/index.csv > compliance-files.txt

# Step 3: Build due queue
cd ../vault-filename-due-queue
npm run queue -- --files compliance-files.txt --outdir due-queue/
```

### With compliance-register.yaml

Update `docs/automation/compliance-register.yaml` with extracted due dates from `queue.json`.

## Troubleshooting

### "Empty filename list" error

Ensure your text file has:
- At least one filename per line
- No completely empty file

### No dates extracted (all "no-date-pattern")

- Verify filenames contain dates in supported formats
- See "Date Extraction" section for supported patterns
- Add custom date patterns to `DATE_PATTERNS` if needed

### No categories detected (all "unknown")

- Check that filenames contain category keywords (case-insensitive)
- Review `CATEGORY_PATTERNS` in `src/filename-parser.ts`
- Add custom keywords if needed and rebuild

### Files marked "unknown-due"

These files have action keywords (due, deadline, return, filing) but no date in the filename. Manual research required.

## Who This Is For

- **Vault / CoS hub** - Track CIPC/SARS/trust due dates from filename-only indexes
- **Trust administration** - Identify GAB Trust compliance deadlines
- **Grok Bot builders** - Pre-classify filenames for compliance digest generation
- **Document librarians** - Organize compliance documents by due date without opening bodies

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
