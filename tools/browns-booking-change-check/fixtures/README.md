# Fixtures - Browns Booking Change Check

Test fixtures for the booking change checker tool.

## Files

### `before.json`
Snapshot taken at 19:00 SAST - before CT-pack preparation.

**Contents:**
- 3 bookings
- Sarah & Tom Henderson (Luxury Suite 1, arriving)
- Patricia van der Merwe (Garden Suite 2, in-house)
- The Mbeki Family (Family Suite 3, arriving, late check-in)

### `after.json`
Snapshot taken at 20:45 SAST - after CT-pack preparation.

**Contents:**
- 3 bookings
- Sarah & Tom Henderson (Luxury Suite 1, arriving) - **UPDATED** notes
- The Mbeki Family (Family Suite 3, arriving) - **UPDATED** notes
- Emma Thompson (Garden Suite 2, arriving) - **NEW**
- Patricia van der Merwe - **REMOVED** (checked out)

## Expected Changes

Running `npm run check -- --before before.json --after after.json` should detect:

1. **1 Addition:** Emma Thompson (new booking)
2. **1 Removal:** Patricia van der Merwe (checked out)
3. **2 Updates:**
   - Sarah & Tom Henderson: notes changed (champagne arranged)
   - The Mbeki Family: notes changed (confirmed timing + bedding)

## Use in Tests

```bash
npm run test:fixtures
```

This command:
1. Builds the tool
2. Runs the diff on before.json → after.json
3. Generates outputs in `test-out/`
4. Verifies the tool runs successfully (exit code 0)

## Fictional Data

All guest names are fictional. These fixtures are for testing only.
