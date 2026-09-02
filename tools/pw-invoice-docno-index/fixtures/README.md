# Fixtures for pw-invoice-docno-index

## Purpose

Synthetic test data for Perfect Water / CoS invoice Doc No indexer. **No real client data or invoice numbers.**

## Files

### sample-names.txt

20 synthetic filenames with a mix of:
- Valid Doc Nos (e.g., IN236058)
- Uppercase, lowercase, and mixed case patterns
- Duplicate Doc Nos (IN236058 appears twice, IN444444 appears twice)
- Files without Doc Nos (no-doc-number.txt, random-file.pdf, etc.)
- Various filename formats and extensions

### sample-pdfs/

Directory structure for testing directory scan mode. Create sample files with:

```bash
cd fixtures/sample-pdfs
while IFS= read -r filename; do touch "$filename"; done < ../sample-names.txt
cd ../..
```

### known-index.md

Sample "already uploaded" index in markdown format. Contains 5 known Doc Nos that overlap with sample-names.txt to test comparison functionality.

## Expected Test Results

### From sample-names.txt (20 files)

- **Total files:** 20
- **Matched:** 18 (with Doc Nos)
- **No match:** 2 (random-file.pdf, no-doc-number.txt)
- **Unique Doc Nos:** 16
- **Duplicates in batch:** 2 (IN236058, IN444444)

### With known-index.md comparison

- **Already known:** 5 (IN236058, IN123456, IN999999, IN111111, IN222222)
- **New Doc Nos:** 11

## Safety Note

All Doc Nos are synthetic. Never use real Perfect Water invoice numbers in fixtures or tests.
