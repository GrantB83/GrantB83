# Test Fixtures

This directory contains sample data for testing the family-morning-digest-pack CLI.

## Fixtures

### subjects-sample.txt
Mixed family and school email subjects for testing the full pack assembly workflow.

Contains:
- School items (AISD, Mills, bus, PTA)
- Family admin items (bills, medical, car payments)
- Items with and without due dates
- Items with and without snippets

## Usage

Run fixture tests:
```bash
npm run test:fixtures
```

This will generate test output in `test-out-basic/` showing the complete pack assembly.
