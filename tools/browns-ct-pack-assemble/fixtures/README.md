# Browns CT Pack Assembler Fixtures

Test data for `npm run test:fixtures`.

## Files

- `sample-bookings.json` - 2 bookings (1 arriving, 1 in-house)
- `sample-before.json` - Booking state before changes
- `sample-after.json` - Booking state after changes (name, suite, checkout date modified)
- `sample-facts.json` - Optional daily facts (weather, notes)

## Usage

```bash
cd tools/browns-ct-pack-assemble
npm run test:fixtures
```

Generates output in `test-out/` directory.

## Fictional Data

All guest names and details are fictional for testing purposes only.
