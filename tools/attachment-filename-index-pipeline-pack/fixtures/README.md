# Fixtures for attachment-filename-index-pipeline-pack

This directory contains synthetic test fixtures (no real client data).

## Files

### sample-filenames.txt

20 synthetic filenames covering various entity categories:
- Vault entities (SARS, CIPC, Plimmer, Charisse, Tax-Emigration, Share-Sale)
- Business entities (Perfect Water, Heavy Metal, Hospitality)
- Household entities (AISD, WesBank, FNB, Standard Bank, Eskom, Municipal)
- Other entities (NightsBridge, Budget, Monarch)
- Unknown entity

All filenames include dates in various formats for date extraction testing.

## Usage

```bash
npm run test:fixtures
```

This runs the pipeline pack with `sample-filenames.txt` as input and generates outputs in `test-out/`.

## Expected Output

- `test-out/PACK.md` - Pipeline pack index
- `test-out/index.csv` - CSV index from attachment-filename-index
- `test-out/index.md` - Markdown index from attachment-filename-index
- `test-out/APPROVAL.md` - Review workflow gates
- `test-out/manifest.json` - Pipeline metadata

All outputs should be generated successfully with no errors.
