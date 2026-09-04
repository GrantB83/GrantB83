# Fixtures for browns-inquiry-quote-pipeline-pack

## Test Scenarios

### sample-inquiry.txt
Basic inquiry text without amounts.
- Guest: Sarah and Michael Thompson
- Dates: 2026-12-15 to 2026-12-18
- Suite: Luxury Suite 1
- Guests: 2 adults
- Late check-in mentioned
- **NO AMOUNTS** — Tests [RATE CARD REQUIRED] path

### sample-inquiry-with-amounts.json
Complete inquiry JSON with amounts pre-filled.
- Guest: Emma Wilson
- Dates: 2027-01-20 to 2027-01-24
- Suite: Garden Suite
- Guests: 2 adults, 1 child
- Amounts included (nightly rate, total, deposit)
- Tests complete quote generation

## Usage

```bash
# Test with text inquiry (no amounts)
npm run pack -- \\
  --outdir test-out/ \\
  --run-intake --text fixtures/sample-inquiry.txt

# Test with pre-filled amounts
npm run pack -- \\
  --outdir test-out-with-amounts/ \\
  --inquiry fixtures/sample-inquiry-with-amounts.json

# Run automated fixture test
npm run test:fixtures
```

## Expected Outcomes

**sample-inquiry.txt:**
- PACK.md shows "⚠️  NO AMOUNTS PROVIDED"
- APPROVAL.md shows "[RATE CARD REQUIRED]"
- Quote drafts will be availability-only

**sample-inquiry-with-amounts.json:**
- PACK.md shows all amounts
- APPROVAL.md shows "✅ From inquiry"
- Quote drafts include full pricing

## Safety Checks

Both fixtures must:
- ✅ Never invent rates or amounts
- ✅ Never send mail/WhatsApp
- ✅ Include H7 gate reminder in APPROVAL.md
- ✅ Work offline
- ✅ For Dullstroom / The Browns only
