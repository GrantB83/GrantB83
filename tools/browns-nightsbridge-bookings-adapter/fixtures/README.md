# Test Fixtures

This directory contains synthetic Nightsbridge-like data for testing the adapter.

**⚠️ No real PII** - All guest names and data are fictional.

## Fixtures

### `nightsbridge-good.csv`
- **Purpose:** Happy-path test case
- **Format:** CSV with varied but common header names
- **Records:** 5 bookings (2 arrivals, 2 in-house, 1 departure for 2026-09-20)
- **Notes:** Includes late check-in flag, varied guest counts, anniversary note

### `nightsbridge-tsv.tsv`
- **Purpose:** Tab-separated format test
- **Format:** TSV with alias headers (name, room, arrive, depart, kids)
- **Records:** 3 bookings
- **Notes:** Tests delimiter auto-detection and header alias mapping

### `nightsbridge-paste.csv`
- **Purpose:** Pasted table with alternative header aliases
- **Format:** CSV with guestName, Unit, Arrival Date, Departure Date, Comments
- **Records:** 3 bookings
- **Notes:** Tests flexible header mapping (Arrival Date → checkInDate, etc.)

### `nightsbridge-sparse.csv`
- **Purpose:** Missing-fields edge case
- **Format:** CSV with incomplete data
- **Records:** 4 bookings with various missing fields
- **Issues:**
  - Row 2: Missing suite assignment
  - Row 3: Missing guest name
  - Row 4: Missing check-in date
  - Row 5: Missing check-out date
- **Expected:** All issues flagged in missing-fields.md

## Usage

Run the adapter on any fixture:

```bash
npm run build
npm run adapt -- --day 2026-09-20 --input fixtures/nightsbridge-good.csv --outdir test-out
```

Check outputs:

```bash
cat test-out/bookings.json
cat test-out/missing-fields.md
```

## Fixture Test

The `npm run test:fixtures` script uses `nightsbridge-good.csv` by default.
