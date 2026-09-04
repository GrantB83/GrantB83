# Fixtures for pw-bank-rejected-pipeline-pack

This directory contains synthetic test fixtures for the pipeline pack tool.

## Fixture Structure

### prebuilt-normalized/

Simulated output from `pw-bank-csv-normalize` tool:

- `xero-bank-normalized.csv` - Successfully normalized bank transactions
- `rejected.csv` - Rows that failed validation
- `missing-fields.md` - Report of missing fields
- `report.md` - Normalization summary
- `manifest.json` - Metadata from normalization run

## Testing

Fixtures are used by `npm run test:fixtures` to validate:
1. Prebuilt normalized input mode
2. PACK.md generation with accurate counts
3. APPROVAL.md safety checklist
4. manifest.json with PR #116 accuracy

## Safety

All fixtures use synthetic data:
- ✅ No real account numbers
- ✅ No real transaction amounts
- ✅ No PII or business secrets
- ✅ Placeholder dates and references
