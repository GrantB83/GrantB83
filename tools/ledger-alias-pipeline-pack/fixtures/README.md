# Fixtures README

This directory contains test fixtures for `ledger-alias-pipeline-pack`.

## Fixtures

### suggest-out/

Sample output from `ledger-merchant-alias-suggest` tool:

- **suggestions.json** - Structured merchant→alias suggestions with scores
- **suggestions.md** - Human-readable suggestions organized by confidence
- **no-match.md** - Merchants with no matches (manual research required)
- **APPROVAL.md** - Approval gates and workflow guidance

This fixture is used to test the pipeline pack assembly without requiring the actual suggest tool to run.

## Usage

```bash
# Run fixture test
npm run test:fixtures

# This will:
# 1. Build the TypeScript code
# 2. Run pipeline with fixtures/suggest-out as input
# 3. Generate output in test-out/
# 4. Verify PACK.md, manifest.json, and other files are created
```

## Expected Output

When run with the fixture, the tool should generate:

```
test-out/ledger-alias-pack/
├── PACK.md
├── suggestions.json
├── suggestions.md
├── no-match.md
├── APPROVAL.md
└── manifest.json
```

The test validates that all required files are copied and the pipeline pack is correctly assembled.
