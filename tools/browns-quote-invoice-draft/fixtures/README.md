# Browns Quote Invoice Draft — Test Fixtures

This folder contains synthetic test fixtures for the Browns quote and invoice draft generator.

## Purpose

These fixtures test the CLI's critical safety requirement: **never invent rates or totals**.

## Fixtures

### `sample-quote.json` — Full booking with amounts

Complete quote with all pricing information provided.

- **Guest:** Sarah and Michael Thompson
- **Dates:** Dec 15-18, 2026 (3 nights)
- **Suite:** Luxury Suite 1
- **Amounts:** R2,800/night, R8,400 total, R4,200 deposit
- **Expected:** Full quote drafts with all amounts displayed

### `sample-quote-no-amounts.json` — Availability inquiry only

Quote request without any pricing information.

- **Guest:** Emma Wilson
- **Dates:** Jan 20-24, 2027 (4 nights)
- **Suite:** Garden Suite
- **Amounts:** NONE provided
- **Expected:** Availability confirmation only; NO invented amounts

### `sample-booking-with-deposit.json` — Proforma invoice required

Booking confirmation with deposit and proforma flag.

- **Guest:** David and Laura Chen
- **Dates:** Nov 10-13, 2026 (3 nights)
- **Suite:** Presidential Suite
- **Amounts:** R3,500/night, R10,500 total, R5,250 deposit
- **Expected:** Quote + proforma invoice drafts

## Running Tests

### Quick test with all fixtures:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run draft generation on all fixtures
3. Verify no errors occur
4. Create output in `test-out/` and `test-out-no-amounts/`

### Manual testing:

```bash
npm run build

# Full amounts
npm run draft -- --quote fixtures/sample-quote.json --outdir out/full

# No amounts (critical test)
npm run draft -- --quote fixtures/sample-quote-no-amounts.json --outdir out/no-amounts

# With proforma
npm run draft -- --quote fixtures/sample-booking-with-deposit.json --outdir out/proforma
```

## Validation Criteria

For each fixture, verify:

1. ✅ CLI runs without errors
2. ✅ All expected files generated
3. ✅ `APPROVAL.md` flags whether amounts are present
4. ✅ When amounts missing: drafts NEVER show invented numbers
5. ✅ When amounts present: all amounts match input exactly
6. ✅ Tone is warm, professional, matches Browns brand

## Critical Safety Test

The `sample-quote-no-amounts.json` fixture is the **most important test**:

```bash
npm run draft -- --quote fixtures/sample-quote-no-amounts.json --outdir safety-test
```

Then verify:
- ❌ NO `R` currency amounts in `draft-quote-whatsapp.txt`
- ❌ NO `R` currency amounts in `draft-quote-email.txt`
- ✅ Text indicates "availability can be confirmed"
- ✅ `APPROVAL.md` shows `⚠️ NO AMOUNTS PROVIDED`

If ANY amounts appear in the safety test, the tool has failed its primary requirement.

## Expected Output Structure

Each run creates:

```
<outdir>/
├── draft-quote-whatsapp.txt      # WhatsApp message
├── draft-quote-email.txt         # Email quote
├── draft-proforma-email.txt      # Proforma (if applicable)
├── APPROVAL.md                   # Approval checklist
└── manifest.json                 # Generation metadata
```

## Tone & Style Reference

All drafts follow Browns brand guidelines:
- Short, warm sentences
- "Kind regards" / "Kindest regards" + Grant Brown
- Professional but friendly
- Rare emoji use (default: none)
- English default; Afrikaans optional via `language: "af"`
- Property: The Browns Luxury Guest Suites Dullstroom

## Adding New Fixtures

When adding fixtures, ensure:
1. JSON structure matches `QuoteInput` type
2. Required fields: `guestName`, `checkInDate`, `checkOutDate`, `suiteOrUnit`
3. Test both with-amounts and without-amounts scenarios
4. Include edge cases (partial amounts, proforma variations)
