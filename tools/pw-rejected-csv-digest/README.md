# pw-rejected-csv-digest

**One-line:** Digest rejected.csv files into human review pack WITHOUT pasting quantities/amounts into prose.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-rejected-csv-digest/`

## Purpose

Digest one or more `rejected.csv` files (produced by sibling normalizers: pw-grv-csv-normalize, pw-stocktake-csv-normalize, pw-bank-csv-normalize, pw-ordered-vs-sold-diff, etc.) into a structured human review pack. NEVER pastes quantities or monetary amounts into prose - keeps them in files only.

## Install and Run

```bash
cd tools/pw-rejected-csv-digest
npm install
npm run build

# Single file
npm run digest -- --csv rejected.csv --outdir out/

# Multiple files with custom labels
npm run digest -- \
  --csv grv-rejected.csv --label "GRV August" \
  --csv stocktake-rejected.csv --label "Stocktake LT" \
  --outdir out/

# Directory scan (all rejected*.csv files)
npm run digest -- --dir exports/ --outdir out/

# Required headers check
npm run digest -- --csv rejected.csv --outdir out/ \
  --require-headers "Store,SKU,ReceivedQty,Unit"

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

## Command-Line Arguments

### Required (one of)

- `--csv` - Path to rejected CSV file (repeatable)
- `--dir` - Directory containing rejected*.csv files

### Output

- `--outdir` - Output directory (default: `out/`)

### Options

- `--label` - Custom label for a specific CSV (use immediately after `--csv`)
- `--require-headers` - Comma-separated list of required headers for blank field detection

## Behavior

1. **Parse CSV headers and rows** - Auto-detect delimiter (comma, semicolon, tab)
2. **Classify rejection reasons** - Heuristically from common columns (RejectionReason, Error, Notes) OR from blank required fields if `--require-headers` provided
3. **Output structured reports** - Numbered findings with counts only
4. **NEVER print amounts** - Monetary amounts and quantities stay in files, NOT in DIGEST.md prose
5. **Exit 1 on error** - Unreadable CSV or zero inputs

## Classification Heuristics

The tool classifies rejection reasons by checking columns in order:

1. **Explicit reason columns:**
   - `RejectionReason`, `RejectReason`, `Reason`
   - `Error`, `error`
   - `Notes`, `notes` (if contains "missing", "blank", "invalid", "unparseable")

2. **Required headers check (if `--require-headers` provided):**
   - Blank required fields → "Missing required fields: Store, SKU"

3. **Heuristic blank detection:**
   - Blank required-looking columns (qty, amount, sku, item, store) → "Missing or blank fields: Qty, Store"

4. **Fallback:**
   - "Unknown rejection"

## Output Files

### DIGEST.md

Numbered findings with:
- Filename and custom label
- Total row count
- Rejection reason buckets (counts only, no amounts)
- Warning: amounts stay in files

**Critical:** DIGEST.md NEVER contains actual monetary amounts or quantity values in prose.

### reasons.json

Machine-readable reason → count mapping with:
- Reason string
- Count
- Sample row indices (first 3 per reason, NOT full amount cells)

### missing-headers.md

Files with unexpected or empty headers:
- Store/Location
- Item/SKU
- Qty/Amount
- Unit

### APPROVAL.md

Safety checklist:
- Perfect Water owns inventory/recon decisions
- Amounts stay in files (offline only)
- No Loyverse/Xero write-back
- Read-only tool
- Human approval gates (H2, H3)

### manifest.json

Machine-readable metadata:
- Tool name and version
- Timestamp
- Files processed
- Output directory

## Exit Codes

- **0** - Success (at least one file processed)
- **1** - Error:
  - Missing or unreadable input file(s)
  - Empty input file (no data rows)
  - Zero inputs (no --csv or --dir files found)

## Critical Safety Notes

- ✅ **Offline only** - No APIs or network calls
- ✅ **Amounts stay in files** - NEVER pasted into DIGEST.md prose
- ✅ **Read-only** - No write-back to Loyverse, Xero, or source systems
- ✅ **File-based** - All quantities stay in files
- ✅ **Exit 1 on bad input** - Malformed or empty CSVs rejected
- ⚠️ **Perfect Water owns ops decisions** - This tool does not auto-upload or modify inventory systems
- ⚠️ **Bots must not paste amounts** - When referencing this digest, bots refer to files, not inline amounts

## Integration with Perfect Water Workflow

### Step 1: Run normalizers

From various sources (Loyverse, bank, supplier exports) → rejected.csv files:

```bash
# GRV normalizer
cd tools/pw-grv-csv-normalize
npm run normalize -- --in grv.csv --outdir out/
# Produces: out/rejected.csv

# Stocktake normalizer
cd tools/pw-stocktake-csv-normalize
npm run normalize -- --in stocktake.csv --outdir out/
# Produces: out/rejected.csv

# Bank normalizer
cd tools/pw-bank-csv-normalize
npm run normalize -- --in bank.csv --outdir out/
# Produces: out/rejected.csv
```

### Step 2: Digest rejected files

```bash
cd tools/pw-rejected-csv-digest
npm run digest -- \
  --csv ../pw-grv-csv-normalize/out/rejected.csv --label "GRV August" \
  --csv ../pw-stocktake-csv-normalize/out/rejected.csv --label "Stocktake LT" \
  --csv ../pw-bank-csv-normalize/out/rejected.csv --label "Bank Sept" \
  --outdir digest-out/
```

### Step 3: Human review

1. Open `digest-out/DIGEST.md` for summary (counts only)
2. Open each source `rejected.csv` file to see actual amounts/quantities
3. Review `missing-headers.md` for structural issues
4. Check `APPROVAL.md` checklist

### Step 4: Corrective action

- Fix data quality issues at source (supplier exports, manual entry, Loyverse)
- Re-run normalizers
- Verify rejected row counts decrease

### Step 5: Archive

Keep digest packs in Perfect Water Drive:
```
30_PerfectWater/RejectedReviews/YYYY-MM/YYYY-MM-DD__digest/
```

## Use Cases

1. **Multi-source reconciliation** - Digest rejected rows from GRV, stocktake, bank, and ordered-vs-sold in one pack
2. **Data quality auditing** - Identify common rejection patterns across sources
3. **Human review workflow** - Structured pack without hunting through multiple rejected.csv files
4. **Bot-safe reporting** - Ensures bots don't paste amounts into chat/prose

## Examples

### Example 1: Single File

**Input:** `grv-rejected.csv`
```csv
Store,Item,Qty,Unit,RejectionReason
,Water 5L,10,bottle,Missing or blank Store
LT,,5,unit,Missing or blank SKU/Item
LT,Filter,abc,unit,Unparseable ReceivedQty: "abc"
```

**Command:**
```bash
npm run digest -- --csv grv-rejected.csv --outdir out/
```

**Output:** `out/DIGEST.md`
```markdown
# Rejected CSV Digest

**Generated:** 2026-09-02T16:30:00.000Z

## Summary

Total files processed: 1

### 1. grv-rejected

**Filename:** `grv-rejected.csv`

**Total rows:** 3

**Rejection reason buckets:**

- **Missing or blank Store**: 1 row(s)
- **Missing or blank SKU/Item**: 1 row(s)
- **Unparseable ReceivedQty: "abc"**: 1 row(s)

**⚠️ Amounts/quantities:** See file `grv-rejected.csv` for actual values. Do not paste into prose.
```

### Example 2: Multiple Files with Labels

**Command:**
```bash
npm run digest -- \
  --csv grv-rejected.csv --label "GRV August" \
  --csv stocktake-rejected.csv --label "Stocktake LT" \
  --outdir out/
```

**Output:** `out/DIGEST.md` (excerpt)
```markdown
### 1. GRV August

**Filename:** `grv-rejected.csv`
**Total rows:** 5
**Rejection reason buckets:**
- **Missing or blank Store**: 2 row(s)
- **Unparseable ReceivedQty**: 1 row(s)

### 2. Stocktake LT

**Filename:** `stocktake-rejected.csv`
**Total rows:** 3
**Rejection reason buckets:**
- **Missing or blank CountedQty**: 1 row(s)
```

### Example 3: Directory Scan

**Directory structure:**
```
exports/
  rejected-grv-001.csv
  rejected-stocktake-lt.csv
  rejected-bank-sept.csv
  some-other-file.csv  (ignored)
```

**Command:**
```bash
npm run digest -- --dir exports/ --outdir out/
```

**Behavior:**
- Scans `exports/` for files starting with `rejected` and ending with `.csv`
- Processes: `rejected-grv-001.csv`, `rejected-stocktake-lt.csv`, `rejected-bank-sept.csv`
- Ignores: `some-other-file.csv`
- Labels: Uses filename (without `.csv`) as label

### Example 4: Required Headers Check

**Input:** `rejected.csv` (minimal headers, no explicit RejectionReason column)
```csv
Store,SKU,Qty
,Water,10
LT,,5
```

**Command:**
```bash
npm run digest -- --csv rejected.csv --outdir out/ \
  --require-headers "Store,SKU,Qty"
```

**Output:** `reasons.json` (excerpt)
```json
{
  "rejected": {
    "filename": "rejected.csv",
    "totalRows": 2,
    "buckets": [
      {
        "reason": "Missing required fields: Store",
        "count": 1,
        "sampleIndices": [0]
      },
      {
        "reason": "Missing required fields: SKU",
        "count": 1,
        "sampleIndices": [1]
      }
    ]
  }
}
```

### Example 5: Empty File Handling

**Input:** `empty-rejected.csv`
```csv
Store,SKU,Qty
```
(No data rows)

**Command:**
```bash
npm run digest -- --csv empty-rejected.csv --outdir out/
```

**Output:** Exit code 1, error message:
```
Error reading file: Input file is empty or contains no data rows
```

## Related Tools

- **pw-grv-csv-normalize** - Normalize GRV CSVs (produces rejected.csv)
- **pw-stocktake-csv-normalize** - Normalize stocktake CSVs (produces rejected.csv)
- **pw-bank-csv-normalize** - Normalize bank CSVs (produces rejected.csv)
- **pw-ordered-vs-sold-diff** - Compare ordered vs sold (produces rejected.csv)
- **csv-fixture-harness** - Validate CSV fixtures for blanks and currency violations

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** inventory-alerts, stock-take-variance, bank-recon-exceptions

## Quality Gates

- **H2** - Before any Google Sheet writes
- **H3** - Before any Drive file moves outside `_Inbox`
- **Offline only** - This tool generates drafts; no auto-uploads
- **Amounts stay in files** - Bots must not paste quantities into chat

## Contributing

When updating this tool:
1. Maintain heuristic classification logic
2. Add new rejection reason patterns as needed
3. Update fixtures and tests
4. Run `npm run test:fixtures` and `npm test`
5. Update this README and tools catalog
6. Conventional commit: `feat(tools): update pw-rejected-csv-digest`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
