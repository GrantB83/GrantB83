# Test Fixtures

This directory contains sample data for testing the `browns-welcome-draft-pack` tool.

## Files

### `sample-bookings.json`

Sample bookings array with various scenarios:
- Emma Thompson: Complete data (phone + rate)
- John Smith: Missing phone and rate
- Sarah Williams: Has phone, missing rate
- Peter van der Berg: Missing phone and rate, check-in outside default window
- Empty guest name: Should be skipped

### `sample-facts.json`

Sample guest facts for testing fact merging:
- Emma Thompson: Known preferences
- Sarah Williams: Dietary restrictions

## Testing

Run fixture tests:

```bash
npm run test:fixtures
```

This will generate three output directories:
- `out/basic/` — Basic run without facts
- `out/facts/` — Run with guest facts
- `out/window/` — Custom date window (2-day window from Sep 3)
