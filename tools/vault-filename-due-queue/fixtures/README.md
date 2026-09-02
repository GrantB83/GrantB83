# Vault Filename Due Queue — Fixtures

This directory contains synthetic test fixtures for the vault-filename-due-queue CLI tool.

## Files

### sample-filenames.txt

20 synthetic filenames covering:
- CIPC documents (annual returns, certificates, change forms)
- SARS documents (tax returns, VAT, EMP, provisional)
- BEE documents (affidavits, certificates)
- Trust documents (resolutions, distributions, compliance)
- Property documents (rates, levies)
- Insurance renewals
- Forex applications
- Attorney letters
- Bank statements
- Unknown/uncategorized files

**Safety:** All filenames are synthetic. No real client data, no real entity names (except the approved entity names from entity-map.yaml), no real account numbers.

## Testing

Run tests with fixtures:

```bash
npm run test:fixtures
```

This will:
1. Build the tool
2. Process `fixtures/sample-filenames.txt`
3. Generate output in `test-out/`
4. Verify outputs were created successfully

## What the Fixtures Test

1. **Date extraction** - ISO dates, compact dates, European formats, year-only
2. **Category classification** - All 21 document categories
3. **Due status** - has-date, unknown-due, no-date-pattern
4. **Confidence levels** - high, medium, low
5. **Edge cases** - Files with no signals, multiple dates, action keywords without dates
