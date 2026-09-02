# Fixtures for browns-late-checkin-queue

This directory contains test fixtures for the late check-in queue CLI.

## Files

### sample-bookings.json

A realistic sample day (2026-09-20) with:
- **4 arrivals** on target day
- **2 late check-ins** (16:30 and 19:00 - both at/after 15:00 threshold)
- **1 unknown-time arrival** with late keyword flag
- **1 normal check-in** (14:00 - before threshold)
- **1 in-house** guest (not an arrival)
- **1 departure** (not an arrival)

## Expected Test Output

When running with default settings (`--day 2026-09-20 --after-hour 15`):

- **queue.json/queue.md** should contain:
  1. Sarah & Tom Henderson (16:30 check-in)
  2. Patricia van der Merwe (19:00 check-in with late keyword)

- **unknown-time.md** should contain:
  1. The Mbeki Family (no check-in time, but "after-hours" keyword in notes)

- **Not included** (filtered out):
  - David Johnson (14:00 is before 15:00 threshold, no late keyword)
  - Chen & Wang (status is "inhouse", not "arriving")
  - Emma Wilson (status is "departing", not "arriving")

## Usage

```bash
cd tools/browns-late-checkin-queue
npm run test:fixtures
```

## Notes

- Guest names and phone numbers are fictional
- Dates and times are plausible for SA hospitality operations
- Fixture tests the three queue inclusion rules:
  1. Check-in time at/after threshold
  2. Late/after-hours keyword flags
  3. Missing check-in time → unknown-time.md
