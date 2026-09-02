# Fixtures

Test fixtures for career-hunt-run-log CLI.

## Files

- `run-sample.json` - Complete hunt run with scored/applied/skipped/rejected entries
- `scored.json` - Standalone scored entries (for --scored flag)
- `applied.json` - Standalone applied entries (for --applied flag)
- `skipped.json` - Standalone skipped entries (for --skipped flag)

## Usage

Run fixture tests:
```bash
npm run test:fixtures
```

This executes all test scenarios including:
1. Structured run.json mode
2. Individual flag files mode
3. Append idempotency
4. Validation error handling
