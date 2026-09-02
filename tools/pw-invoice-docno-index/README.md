# Perfect Water / CoS Invoice Doc No Index CLI

An offline command-line tool that extracts invoice document numbers (Doc Nos) from filenames to prevent duplicate PDF uploads during At-PET Drive operations.

## Purpose

**Problem:** Tonight's At-PET Drive uploads risk duplicate PDFs when the same invoice is uploaded multiple times.

**Solution:** Build a basename-only index of invoice Doc Nos (e.g., `IN236058`) from a folder or filename list, with optional comparison against an existing index to flag already-uploaded vs new invoices.

## Features

- 📄 **Basename-only extraction** - Never opens PDF bodies, only reads filenames
- 🔍 **Pattern matching** - Extracts Doc Nos using `/IN\d+/i` regex (case-insensitive)
- 📁 **Directory scan mode** - Recursively scan a directory
- 📝 **Filename list mode** - Read filenames from a text file
- 🔍 **Known index comparison** - Compare against existing index (markdown/CSV) to identify duplicates
- 📊 **Multiple outputs** - Generates JSON, Markdown, and manifest files
- ⚠️ **Duplicate detection** - Flags Doc Nos that appear multiple times in batch
- ✅ **Offline only** - No Drive API, no secrets, no PDF body reads
- 🚫 **Never invents data** - Only extracts Doc Nos that exist in filenames

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

```bash
cd tools/pw-invoice-docno-index
npm install
npm run build
```

## Usage

### Mode 1: Directory Scan

Scan a directory and extract Doc Nos from all filenames (never opens PDFs):

```bash
npm run index -- --dir ./pdfs/ --outdir out/
```

**Example:**

```bash
npm run index -- --dir /vault/pw-invoices --outdir reports/
```

### Mode 2: Filename List

Extract Doc Nos from a text file with one filename per line:

```bash
npm run index -- --files names.txt --outdir out/
```

**Example:**

```bash
npm run index -- --files invoice-names.txt --outdir reports/
```

### Mode 3: Compare Against Known Index

Compare extracted Doc Nos against a known index to identify already-uploaded vs new invoices:

```bash
npm run index -- --dir ./pdfs/ --known known-index.md --outdir out/
```

**Example:**

```bash
npm run index -- --dir ./new-invoices --known uploaded-2024.md --outdir reports/
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--dir` | Path to directory containing PDFs (basenames only) | * | - |
| `--files` | Path to text file with one filename per line | * | - |
| `--known` | Path to known index file (markdown/CSV) for comparison | No | - |
| `--outdir` | Output directory for index files | No | `./out` |
| `--help`, `-h` | Show help message | No | - |

\* Either `--dir` or `--files` is required (but not both)

## Output Files

The CLI generates the following files in the specified output directory:

### Always Generated

1. **`index.json`** - Machine-readable Doc No → filenames mapping
   ```json
   {
     "IN236058": ["invoice1.pdf", "invoice1-copy.pdf"],
     "IN123456": ["invoice2.pdf"]
   }
   ```

2. **`index.md`** - Human-readable index with summary and Doc No sections
   - Total files, unique Doc Nos, duplicates count
   - Index organized by Doc No with all matching filenames

3. **`manifest.json`** - Run metadata and statistics
   - Mode, input path, timestamps
   - Total files, matched, no-match counts
   - Unique Doc Nos, duplicates, known vs new counts

### Conditional Outputs

4. **`dupes-in-batch.md`** - Generated if duplicate Doc Nos found in batch
   - Lists Doc Nos that appear in multiple files
   - Helps prevent uploading the same invoice twice

5. **`already-known.md`** - Generated if `--known` provided and matches found
   - Doc Nos that were in the known index (already uploaded)
   - Helps skip re-uploading existing invoices

6. **`new.md`** - Generated if `--known` provided and new Doc Nos found
   - Doc Nos not in the known index (safe to upload)
   - Prioritize these for tonight's upload batch

## Doc No Pattern

The tool extracts invoice document numbers matching this pattern:

- **Regex:** `/IN\d+/i`
- **Format:** `IN` followed by one or more digits (case-insensitive)
- **Examples:**
  - `IN236058` ✅
  - `in123456` ✅ (normalized to `IN123456`)
  - `Invoice-In999999.pdf` ✅ (extracts `IN999999`)
  - `PW_IN345678_final.pdf` ✅ (extracts `IN345678`)
  - `random-file.pdf` ❌ (no Doc No)
  - `IN.pdf` ❌ (no digits)

All extracted Doc Nos are normalized to uppercase.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

### Test with Fixtures

The tool includes synthetic test fixtures (no real invoice data):

**Directory scan mode:**

```bash
cd fixtures/sample-pdfs
while IFS= read -r filename; do touch "$filename"; done < ../sample-names.txt
cd ../..
npm run test:fixtures:dir
```

**Filename list mode:**

```bash
npm run test:fixtures:list
```

**Known index comparison mode:**

```bash
npm run test:fixtures:known
```

All fixture tests generate reports in `test-out-*` directories.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Project Structure

```
tools/pw-invoice-docno-index/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── types.ts                    # TypeScript type definitions
│   ├── doc-no-extractor.ts         # Doc No extraction logic
│   ├── doc-no-extractor.test.ts    # Extractor tests
│   ├── output-generator.ts         # JSON and Markdown generation
│   └── output-generator.test.ts    # Generator tests
├── fixtures/
│   ├── sample-names.txt            # 20 synthetic filenames
│   ├── sample-pdfs/                # Directory for scan mode testing
│   ├── known-index.md              # Sample known index
│   └── README.md                   # Fixture documentation
├── dist/                           # Compiled JavaScript (generated)
├── out/                            # Default report output (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md                       # This file
```

## Use Cases

### For Perfect Water / CoS At-PET Drive Uploads

Index invoice PDFs before uploading to Drive to prevent duplicates:

```bash
# Step 1: Index new invoices
npm run index -- --dir ./tonight-batch --outdir pre-upload-check/

# Step 2: Review dupes-in-batch.md
# Remove duplicate files before upload

# Step 3: Compare against uploaded invoices
npm run index -- --dir ./tonight-batch --known uploaded-aug-2024.md --outdir final-check/

# Step 4: Review new.md
# Only upload files with new Doc Nos

# Step 5: After upload, append new Doc Nos to uploaded-aug-2024.md
```

### For Invoice Archive Cleanup

Identify duplicate invoice PDFs in existing archives:

```bash
npm run index -- --dir /drive/pw-invoices-2024 --outdir cleanup-report/
# Review dupes-in-batch.md to find and remove duplicates
```

### For Monthly Reconciliation

Build a comprehensive index of all invoices for a month:

```bash
npm run index -- --dir ./invoices-aug-2024 --outdir aug-index/
# Use index.json for reconciliation with accounting system
```

## Example Output

### Terminal Output

```
Perfect Water / CoS Invoice Doc No Index CLI

Mode: Directory scan

Scanning directory: ./fixtures/sample-pdfs
  ✓ Found 20 files

Reading known index: ./fixtures/known-index.md
  ✓ Loaded 5 known Doc Nos

Extracting Doc Nos from filenames...
  ✓ Extracted 18 Doc Nos
  ⚠ 2 files had no Doc No match

Building index...
  ✓ Unique Doc Nos: 16
  ⚠ Duplicates in batch: 2
  ✓ Already known: 5
  ✓ New Doc Nos: 11

Generating reports in: out/
  ✓ index.json
  ✓ index.md
  ✓ dupes-in-batch.md
  ✓ already-known.md
  ✓ new.md
  ✓ manifest.json

✅ Indexing complete!
```

### index.json Sample

```json
{
  "IN236058": [
    "IN236058-Invoice-Final.pdf",
    "duplicate-IN236058.pdf"
  ],
  "IN123456": [
    "IN123456-Receipt.pdf"
  ],
  "IN999999": [
    "IN999999-Statement-2024.pdf"
  ]
}
```

### dupes-in-batch.md Sample

```markdown
# Duplicates in Batch

**Generated:** 2024-09-02T10:00:00.000Z

⚠️ **Warning:** The following Doc Nos appear multiple times in this batch.

## IN236058 (2 files)

- `IN236058-Invoice-Final.pdf`
- `duplicate-IN236058.pdf`

## IN444444 (2 files)

- `IN444444.pdf`
- `another-IN444444-copy.pdf`
```

### new.md Sample

```markdown
# New Doc Nos

**Generated:** 2024-09-02T10:00:00.000Z

✅ These Doc Nos are new (not in known index).

## IN234567

- `invoice-IN234567.pdf`

## IN345678

- `PW_IN345678_final.pdf`
```

## Constraints & Limitations

- ✅ **Offline only** - No Drive API, no OAuth, no network calls
- ✅ **Basename-only** - Never opens or reads PDF file bodies
- ✅ **Read-only** - Does not move, rename, or modify files
- ✅ **No secrets** - No credentials or tokens stored
- ✅ **Never invents Doc Nos** - Only extracts what exists in filenames
- ✅ **Pattern-based** - Simple regex extraction, no OCR or PDF parsing
- ⚠️ **Filename must contain Doc No** - If Doc No is only inside PDF, it won't be extracted
- ⚠️ **First match only** - If filename has multiple IN patterns, only first is extracted

## Troubleshooting

### "Empty filename list" error

Ensure your text file has:
- At least one filename per line
- No blank file
- UTF-8 encoding

### No Doc Nos extracted (all files in "no match")

- Check that filenames contain the pattern `IN` followed by digits
- Verify filenames aren't using alternative patterns (e.g., `INV123` instead of `IN123`)
- Review actual filenames with `ls` or `dir` command

### "Directory not found" or "File not found" error

- Verify path is correct and accessible
- Use absolute paths if relative paths aren't resolving
- Check file permissions

## Integration with At-PET Drive Workflow

This tool is designed for Perfect Water / CoS At-PET Drive upload operations:

1. **Before upload:**
   - Run indexer on tonight's invoice batch
   - Review `dupes-in-batch.md` and remove duplicates
   - Compare against known index to identify already-uploaded files
   - Only upload files listed in `new.md`

2. **After upload:**
   - Append new Doc Nos to your known index file
   - Keep known index updated for next upload batch

3. **Monthly reconciliation:**
   - Generate comprehensive index of all uploaded invoices
   - Cross-reference with accounting system
   - Identify any gaps or missing invoices

## Safety Notes

- ✅ **No Drive API** - Pure offline operation
- ✅ **No file body reads** - Only basenames processed
- ✅ **No invented data** - Only extracts existing patterns
- ✅ **Read-only** - Never modifies source files
- ⚠️ **Review outputs before upload** - Always check `dupes-in-batch.md` and `new.md`
- ⚠️ **Keep known index updated** - Update after each upload batch

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
