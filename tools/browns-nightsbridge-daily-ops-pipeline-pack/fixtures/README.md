# Fixtures

Test data for the Browns Nightsbridge Daily Ops Pipeline Pack.

## Files

### `nightsbridge-sample.csv`

Sample Nightsbridge day-sheet export with 3 arriving guests on 2026-09-20.

**Contents:**
- Sarah & Tom Henderson - Luxury Suite 1 (standard arrival)
- The Mbeki Family - Family Suite 3 (late arrival flagged)
- Emma Thompson - Garden Suite 2 (vegetarian breakfast note)

**Use with:**
```bash
npm run pack -- --input fixtures/nightsbridge-sample.csv --day 2026-09-20 --outdir test-out
```

## Testing Scenarios

### Scenario 1: Basic Pipeline (Adapter + Brief)
```bash
npm run pack -- \
  --input fixtures/nightsbridge-sample.csv \
  --day 2026-09-20 \
  --outdir test-out
```

**Expected outputs:**
- `bookings.json` (3 arrivals)
- `daily-ops-brief.txt` (team WhatsApp draft)
- `PACK.md` (pipeline index)
- `APPROVAL.md` (approval checklist)

### Scenario 2: With Late Queue
```bash
npm run pack -- \
  --input fixtures/nightsbridge-sample.csv \
  --day 2026-09-20 \
  --run-late \
  --outdir test-out-with-late
```

**Expected additional outputs:**
- `late-queue.md` (1 late check-in: The Mbeki Family)
- `late-queue.json` (machine-readable)

### Scenario 3: With Change Check
First create a "before" snapshot by running the adapter separately, then use it:

```bash
# Create before snapshot
cd ../browns-nightsbridge-bookings-adapter
npm run adapt -- --input ../browns-nightsbridge-daily-ops-pipeline-pack/fixtures/nightsbridge-sample.csv --day 2026-09-20 --outdir ../browns-nightsbridge-daily-ops-pipeline-pack/fixtures/before
cp out/bookings.json ../browns-nightsbridge-daily-ops-pipeline-pack/fixtures/bookings-before.json

# Run pipeline with change check
cd ../browns-nightsbridge-daily-ops-pipeline-pack
npm run pack -- \
  --input fixtures/nightsbridge-sample.csv \
  --day 2026-09-20 \
  --prior-bookings fixtures/bookings-before.json \
  --outdir test-out-with-check
```

**Expected additional outputs:**
- `change-check-changes.md` (booking changes report)
- `change-check-changes.json` (machine-readable)

## Data Safety

- All fixture data uses fictional guest names
- Never commit real guest data to git
- Keep actual Nightsbridge exports local only
