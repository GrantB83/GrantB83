# Test Fixtures

This directory contains synthetic test data for the vault-entity-due-pack CLI.

## Files

### sample-queue.json

A synthetic queue.json file mimicking the output from `vault-filename-due-queue` tool.

**Contents:**
- 10 queue entries
- 7 files with dates
- 3 files without date patterns
- Entity distribution:
  - GAB Trust: 3 items
  - B Group Holdings: 2 items
  - CIPC: 2 items (cross-entity)
  - SARS: 3 items (cross-entity)
  - Plimmer: 1 item
  - Charisse: 1 item
  - Unknown: 1 item

### sample-filenames.txt

A plain text file with one filename per line (same filenames as queue.json).

**Purpose:** Test the `--filenames` input mode.

## Expected Entity Classification

Based on default keyword heuristics:

| Filename | Expected Entity | Keywords Matched |
|----------|----------------|------------------|
| CIPC-Annual-Return-2024-AR2024-GABTrust.pdf | gab-trust | "trust", "gab" |
| SARS-ITR14-Provisional-Tax-GAB-Trust-2024-06-30.pdf | gab-trust | "trust", "gab" |
| SARS-VAT201-Return-BGroup-Holdings-2024-03.pdf | b-group | "bgroup", "holdings" |
| CIPC-Certificate-Good-Standing-B-Group-Holdings.pdf | b-group | "b group", "holdings" |
| Attorney-Letter-15-03-2024-Plimmer-Estate.pdf | plimmer | "plimmer" |
| Trust-Distribution-Resolution-GAB-2024-01.pdf | gab-trust | "trust", "gab" |
| Municipal-Rates-Invoice-Charisse-Property-2024-02-15.pdf | charisse | "charisse" |
| SARS-Tax-Clearance-Letter-CIPC-Filing.pdf | sars | "sars", "tax" |
| Insurance-Renewal-Notice-GAB-Trust-20241215.pdf | gab-trust | "trust", "gab" |
| random-document-xyz.pdf | unknown | (no matches) |

## Usage

Run the fixture test:

```bash
cd tools/vault-entity-due-pack
npm run test:fixtures
```

This will process `sample-queue.json` and generate entity packs in `test-out/`.

## Safety Note

All filenames are synthetic. No real CIPC/SARS/trust documents are included.
