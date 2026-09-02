# Attachment Filename Index — Test Fixtures

This directory contains synthetic test data for the attachment filename index CLI. All filenames and mail subjects are fictional and do not contain real client information.

## Fixtures Overview

### `sample-filenames.txt`
A text file containing 20 synthetic filenames representing common document types across:
- **Vault entities:** Plimmer, Charisse, GAB Trust
- **Tax & compliance:** SARS, CIPC, tax emigration, share sales
- **Owned businesses:** Perfect Water, Heavy Metal, The Browns, Rivendell
- **Household:** AISD school, banking (FNB, Standard Bank, WesBank), utilities (Eskom, municipal)
- **Accounting systems:** Xero, Loyverse, Monarch, Budget
- **Edge case:** Unknown document (no entity keywords)

### `sample-subjects.csv`
A CSV file with 20 synthetic mail subject lines and dates. Column structure:
- `Subject` (required)
- `Date` (optional, ISO format YYYY-MM-DD)

Each subject is designed to match semantically with a corresponding filename from `sample-filenames.txt` using common token matching.

### `sample-files/`
An empty directory that can be populated with actual empty files (e.g., via `touch`) for directory-scan mode testing. Not required for text-based fixture tests.

## Creating Sample Files

To test directory-scan mode, populate `sample-files/` with the filenames from `sample-filenames.txt`:

```bash
cd fixtures/sample-files/
while IFS= read -r filename; do
  touch "$filename"
done < ../sample-filenames.txt
```

## Expected Test Results

When running the CLI against these fixtures:

- **Total files:** 20
- **Files with dates:** ~17 (most filenames contain date patterns)
- **Files with subjects matched:** ~19 (high match rate due to common tokens)
- **Entity tags detected:** sars, cipc, plimmer, charisse, tax-emigration, share-sale, perfect-water, xero, loyverse, heavy-metal, fnb, standard-bank, wesbank, aisd, eskom, municipal, hospitality, budget, monarch, unknown

## No Real Data

- No actual PDF, CSV, or binary file bodies are included
- No client names, amounts, account numbers, or secrets
- All filenames follow common naming patterns but use synthetic references
- Safe to commit to public repository

## Usage in Tests

See `package.json` scripts:
- `npm run test:fixtures:dir` — Directory scan mode
- `npm run test:fixtures:list` — Filename list mode
- `npm run test:fixtures:subjects` — Subject matching mode
